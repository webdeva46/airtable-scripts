// 1) Get the table and load its records
let table = base.getTable("automation");
console.log("Initialized automation table:", table.name);

const query = await table.selectRecordsAsync();
console.log("Selected records count:", query.records.length);

const record = await input.recordAsync(
  "Pick a record to process",  // Label shown to the user
  table                        // The table you're working with
);
console.log("Selected record:", record ? `ID: ${record.id}` : "No record selected");

if (!record) {
    console.error("No record passed from button field");
    output.text("⚠️ No record passed from button field.");
} else {
    // Get the input from the "Input Scratch" column
    const inputText = record?.getCellValue("Input Scratch");
    console.log("Input text length:", inputText?.length || 0);
    console.log("Input text preview:", inputText?.substring(0, 100));

    // Define your Anthropic API key and endpoint
    console.log("Setting up API request...");
    const anthropicApiKey = ""; // Replace with your actual API key
    const apiEndpoint = "https://api.anthropic.com/v1/messages";

    // Set up the request payload, replacing the message with the value from "Input Scratch"
    const requestBody = {
        model: "claude-3-7-sonnet-20250219",
        max_tokens: 20000,
        temperature: 1,
        system: `dLogos enables people to bring their dream conversations to life by signing, sharing, and financially backing petitions for specific dialogues. Your role is to **generate high-quality petitions** for dream conversations that are culturally relevant, clear, compelling and have viral potential.

Note that for some petitions I will give you some of my own notes for context on which petition(s) to create. For example, I may feed you just a topic, some ideas for speakers, some URLs or even some specific context/copy that you will use as input for creating the petition. Make sure the output is in JSON.

VERY IMPORTANT: Your response MUST be valid JSON format WITHOUT any markdown formatting or explanation text. Do not wrap your JSON in code blocks. Just return pure valid JSON.

The JSON structure must follow this exact format:
{
  "title": "string",
  "topics": ["topic1", "topic2", "topic3", "topic4", "topic5"],  // Include up to 5 relevant topics
  "hook": "string",
  "whyThisMatters": "string",
  "thumbnailPrompt": "string",  // A detailed description for generating a thumbnail image
  "speakers": [
    {
      "name": "Speaker One",
      "background": "string",
      "relevance": "string",
      "keyArguments": "string"
    },
    {
      "name": "Speaker Two",
      "background": "string",
      "relevance": "string",
      "keyArguments": "string"
    },
    {
      "name": "Speaker Three",
      "background": "string",
      "relevance": "string",
      "keyArguments": "string"
    },
    {
      "name": "Speaker Four",
      "background": "string",
      "relevance": "string",
      "keyArguments": "string"
    }
  ],  // Include 2-4 speakers
  "potentialFacilitators": [
    {
      "name": "Facilitator One",
      "background": "string"
    },
    {
      "name": "Facilitator Two",
      "background": "string"
    },
    {
      "name": "Facilitator Three",
      "background": "string"
    }
  ],  // Optional, include up to 3 facilitators
  "potentialSponsors": [
    {
      "name": "Sponsor One",
      "background": "string"
    },
    {
      "name": "Sponsor Two",
      "background": "string"
    },
    {
      "name": "Sponsor Three",
      "background": "string"
    }
  ],  // Include up to 3 sponsors
  "potentialBeneficiaries": [
    {
      "name": "Beneficiary One",
      "background": "string"
    },
    {
      "name": "Beneficiary Two",
      "background": "string"
    },
    {
      "name": "Beneficiary Three",
      "background": "string"
    }
  ]  // Include up to 3 beneficiaries
}

For the thumbnailPrompt field, generate a description that transforms the speakers into a stylized ancient Greek 'dialogos' scene. The description should:
- MUST include the names of all nominated speakers
- MUST maintain facial likeness and unique expressions
- MUST follow the specific art style of modern vector illustration with a vibrant duotone/gradient palette featuring warm oranges, pinks, purples, and deep blues
- Compose the scene with the figures in dialogue, rendered in a clean, modern vector style with bold shapes and smooth gradients
- Include a dramatic sky and stylized clouds
- Feature classical Greek architectural elements (columns, ruins) in a simplified, geometric style
- Include olive branches or scrolls as decorative elements
- Depict figures in flowing classical robes (himation, chiton) with clean, modern line work
- Maintain facial likeness while stylizing features in a contemporary illustration style
- Use dramatic lighting with warm highlights and cool shadows
- Frame the scene in a 16:9 aspect ratio (1920x1080) for optimal display
- Composition should feel balanced with figures on each side of the frame`,
        messages: [
            {
                role: "user",
                content: inputText || "No input provided"
            }
        ]
    };

    // Make the API request using fetch
    console.log("Making API request to Claude...");
    console.log("Request body:", {
        model: requestBody.model,
        max_tokens: requestBody.max_tokens,
        temperature: requestBody.temperature,
        messages: requestBody.messages
    });

    const response = await remoteFetchAsync(apiEndpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": anthropicApiKey,
            "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(requestBody),
    });
    console.log("API response status:", response.status);

    // Parse the JSON response
    const responseData = await response.json();
    console.log("Response data structure:", Object.keys(responseData));
    
    if (response.status !== 200) {
        console.error("Claude API error:", responseData);
        console.error("Full error details:", JSON.stringify(responseData, null, 2));
        output.text(`Error from Claude API: ${responseData.error?.message || 'Unknown error'}`);
        
        // Save the error response
        if (record && record.id) {
            await table.updateRecordAsync(record.id, {
                "Response": `API Error: ${JSON.stringify(responseData, null, 2)}`
            });
        }
    } else {
        // Extract the generated content from the response
        const generatedContent = responseData.content && responseData.content.length > 0
            ? responseData.content[0].text
            : "No content generated.";

        console.log("Generated content length:", generatedContent.length);
        console.log("Generated content preview:", generatedContent.substring(0, 100));

        // Try to parse the response as JSON
        let parsedContent;
        try {
            console.log("Attempting to parse content as JSON...");
            
            // First, check if we have any content at all
            if (!generatedContent || generatedContent === "No content generated.") {
                console.error("No content received from API");
                throw new Error("No content received from API");
            }
            
            // First try direct parsing - Claude might return clean JSON
            try {
                parsedContent = JSON.parse(generatedContent.trim());
                console.log("Direct JSON parsing successful");
                console.log("Parsed content structure:", Object.keys(parsedContent));
            } catch (directParseError) {
                console.log("Direct JSON parsing failed, attempting to extract JSON from text");
                
                // Try to find JSON-like content with various patterns
                let jsonContent = null;
                const codeBlockMatch = generatedContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                if (codeBlockMatch && codeBlockMatch[1]) {
                    console.log("Found JSON in code block");
                    jsonContent = codeBlockMatch[1].trim();
                } else {
                    console.log("No code block found, looking for JSON object pattern");
                    const jsonObjectMatch = generatedContent.match(/(\{[\s\S]*\})/);
                    if (jsonObjectMatch && jsonObjectMatch[1]) {
                        console.log("Found JSON object pattern");
                        jsonContent = jsonObjectMatch[1].trim();
                    }
                }
                
                if (!jsonContent) {
                    console.error("Could not find JSON content in response");
                    throw new Error("Could not find JSON content in response");
                }
                
                console.log("Attempting to parse extracted JSON content");
                parsedContent = JSON.parse(jsonContent);
                console.log("Successfully parsed extracted JSON");
            }
            
            console.log("Final parsed content structure:", Object.keys(parsedContent));

            if (parsedContent) {
                console.log("Creating update fields object");
                const updateFields = {
                    "Response": generatedContent
                };

                // Add extracted fields if they exist in the parsed content
                if (parsedContent.title) {
                    console.log("Adding title:", parsedContent.title);
                    updateFields["title"] = parsedContent.title;
                }

                if (parsedContent.topics && Array.isArray(parsedContent.topics)) {
                    console.log("Adding topics:", parsedContent.topics);
                    updateFields["topics"] = parsedContent.topics.join(", "); // Convert array to comma-separated string
                }

                if (parsedContent.hook) {
                    console.log("Adding hook:", parsedContent.hook);
                    updateFields["hook"] = parsedContent.hook;
                }

                if (parsedContent.whyThisMatters) {
                    console.log("Adding why this matters:", parsedContent.whyThisMatters);
                    updateFields["why this matters"] = parsedContent.whyThisMatters;
                }

                if (parsedContent.thumbnailPrompt) {
                    console.log("Adding thumbnail prompt:", parsedContent.thumbnailPrompt);
                    updateFields["thumbnail prompt"] = parsedContent.thumbnailPrompt + "\n\n- MUST maintain facial likeness and unique expressions\n- MUST follow the specific art style of modern vector illustration with a vibrant duotone/gradient palette featuring warm oranges, pinks, purples, and deep blues\n- Compose the scene with the figures in dialogue, rendered in a clean, modern vector style with bold shapes and smooth gradients\n- Include a dramatic sky and stylized clouds\n- Feature classical Greek architectural elements (columns, ruins) in a simplified, geometric style\n- Include olive branches or scrolls as decorative elements\n- Depict figures in flowing classical robes (himation, chiton) with clean, modern line work\n- Maintain facial likeness while stylizing features in a contemporary illustration style\n- Use dramatic lighting with warm highlights and cool shadows\n- Frame the scene in a 16:9 aspect ratio (1920x1080) for optimal display\n- Composition should feel balanced with figures on each side of the frame";
                }

                // Handle speakers - assuming speakers field in Airtable wants a string
                if (parsedContent.speakers && Array.isArray(parsedContent.speakers)) {
                    console.log("Adding speakers:", parsedContent.speakers);
                    updateFields["speakers"] = JSON.stringify(parsedContent.speakers);
                }

                // Handle potential facilitators
                if (parsedContent.potentialFacilitators && Array.isArray(parsedContent.potentialFacilitators)) {
                    console.log("Adding potential facilitators:", parsedContent.potentialFacilitators);
                    updateFields["potential facilitators"] = JSON.stringify(parsedContent.potentialFacilitators);
                }

                // Handle potential beneficiaries
                if (parsedContent.potentialBeneficiaries && Array.isArray(parsedContent.potentialBeneficiaries)) {
                    console.log("Adding potential beneficiaries:", parsedContent.potentialBeneficiaries);
                    updateFields["potential beneficiaries"] = JSON.stringify(parsedContent.potentialBeneficiaries);
                }

                if (record.id) {
                    console.log("Updating automation record with fields:", Object.keys(updateFields));
                    await table.updateRecordAsync(record.id, updateFields);
                    console.log("Successfully updated automation record");

                    // Get the linked record from the Petitions table using the Petition Title field
                    console.log("Getting linked petition record");
                    const linkedPetition = record?.getCellValue("Petition Title");
                    console.log("Linked petition:", linkedPetition);

                    if (linkedPetition && Array.isArray(linkedPetition) && linkedPetition.length > 0) {
                        const petitionRecordId = linkedPetition[0].id;
                        console.log("Petition record ID:", petitionRecordId);

                        if (petitionRecordId) {
                            // Get the Petitions table
                            const petitionsTable = base.getTable("Petitions");
                            console.log("Got Petitions table");

                            // Create petition fields object
                            console.log("Creating petition fields object");
                            const petitionFields = {};

                            // Add fields from parsed content
                            if (parsedContent.topics && Array.isArray(parsedContent.topics)) {
                                console.log("Adding topics to petition:", parsedContent.topics);
                                petitionFields["Suggested Topics"] = parsedContent.topics.join(", ");
                            }

                            if (parsedContent.hook) {
                                console.log("Adding hook to petition:", parsedContent.hook);
                                petitionFields["Hook"] = parsedContent.hook;
                            }

                            if (parsedContent.whyThisMatters) {
                                console.log("Adding why this matters to petition:", parsedContent.whyThisMatters);
                                petitionFields["Why This Matters"] = parsedContent.whyThisMatters;
                            }

                            if (parsedContent.thumbnailPrompt) {
                                console.log("Adding thumbnail prompt to petition:", parsedContent.thumbnailPrompt);
                                petitionFields["Thumbnail Prompt"] = parsedContent.thumbnailPrompt;
                            }

                            // Handle speakers - format as a string with speaker info
                            if (parsedContent.speakers && Array.isArray(parsedContent.speakers)) {
                                console.log("Adding speaker info to petition:", parsedContent.speakers);
                                const speakerInfo = parsedContent.speakers.map(speaker => 
                                    `${speaker.name}\nBackground: ${speaker.background}\nRelevance: ${speaker.relevance}\nKey Arguments: ${speaker.keyArguments}`
                                ).join('\n\n');
                                petitionFields["Speaker Info"] = speakerInfo;
                            }

                            // Handle potential facilitators
                            if (parsedContent.potentialFacilitators && Array.isArray(parsedContent.potentialFacilitators)) {
                                console.log("Adding potential facilitators to petition:", parsedContent.potentialFacilitators);
                                const facilitatorInfo = parsedContent.potentialFacilitators.map(facilitator => 
                                    `${facilitator.name}\nBackground: ${facilitator.background}`
                                ).join('\n\n');
                                petitionFields["Potential Facilitators"] = facilitatorInfo;
                            }

                            // Handle potential sponsors
                            if (parsedContent.potentialSponsors && Array.isArray(parsedContent.potentialSponsors)) {
                                console.log("Adding potential sponsors to petition:", parsedContent.potentialSponsors);
                                const sponsorInfo = parsedContent.potentialSponsors.map(sponsor => 
                                    `${sponsor.name}\nBackground: ${sponsor.background}`
                                ).join('\n\n');
                                petitionFields["Potential Sponsors"] = sponsorInfo;
                            }

                            // Handle potential beneficiaries
                            if (parsedContent.potentialBeneficiaries && Array.isArray(parsedContent.potentialBeneficiaries)) {
                                console.log("Adding potential beneficiaries to petition:", parsedContent.potentialBeneficiaries);
                                const beneficiaryInfo = parsedContent.potentialBeneficiaries.map(beneficiary => 
                                    `${beneficiary.name}\nBackground: ${beneficiary.background}`
                                ).join('\n\n');
                                petitionFields["Potential Beneficiaries"] = beneficiaryInfo;
                            }

                            console.log("Final petition fields to update:", Object.keys(petitionFields));
                            await petitionsTable.updateRecordAsync(petitionRecordId, petitionFields);
                            console.log("Successfully updated petition record");
                            output.text("Successfully updated record in Petitions table.");
                        } else {
                            console.error("Invalid petition record ID");
                            output.text("Invalid linked petition record.");
                        }
                    } else {
                        console.error("No valid petition link found");
                        output.text("No Petition Title linked to this record.");
                    }
                } else {
                    console.error("No valid record to update");
                    output.text("No valid record to update");
                }
            } else {
                console.error("No valid parsed content available");
                output.text("No valid content to update with.");
            }
        } catch (error) {
            console.error("JSON parsing error:", error);
            console.error("Error details:", error.message);
            output.text(`Error: Could not parse the response as JSON. Error details: ${error.message}. Please check the format.`);
            
            if (record) {
                console.log("Saving raw response to record");
                await table.updateRecordAsync(record.id, {
                    "Response": generatedContent
                });
            }
        }
    }
}
