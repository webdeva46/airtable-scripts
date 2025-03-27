// 1) Get the table and load its records
let table = base.getTable("automation");
console.log("Initialized automation table:", table.name);
const query = await table.selectRecordsAsync();
console.log("Selected records count:", query.records.length);

const record = await input.recordAsync(
  'Pick a record to process',  // Label shown to the user
  table                        // The table you're working with
);
console.log("Selected record:", record ? `ID: ${record.id}` : "No record selected");
if (!record) {
    output.text("⚠️ No record passed from button field.");
}

// Get the input from the "Input Scratch" column
const inputText = record?.getCellValue("Response");
console.log("Input text length:", inputText?.length || 0);

// Define your Anthropic API key and endpoint
const anthropicApiKey = "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"; // Replace with your actual API key
const apiEndpoint = "https://api.anthropic.com/v1/messages";

// Set up the request payload, replacing the message with the value from "Input Scratch"
const requestBody = {
    model: "claude-3-7-sonnet-20250219",
    max_tokens: 20000,
    temperature: 1,
    system: `You are a strategic growth advisor helping launch a movement through petitions.
Based on the petition provided, create a structured go-to-market (GTM) plan to maximize awareness, engagement, and sharing. 

YOUR RESPONSE MUST BE VALID JSON FOLLOWING THIS EXACT STRUCTURE:
{
  "shortDescription": "string (max 500 characters)",
  "targetAudiences": ["string", "string", ...],
  "messageFraming": "string",
  "specificChannels": ["string", "string", ...],
  "supportingAssets": ["string", "string", ...],
  "viralHooks": ["string", "string", ...],
  "gtmDeeperDivePrompt": "string",
  "gtmChecklist": ["string", "string", ...],
}

DO NOT include markdown formatting, comments, or any other text outside the JSON object.
DO NOT use backticks or code blocks. Just output the raw JSON object.

Based on the petition, fill in each field with:
- shortDescription: Brief overview of the petition and why the speakers/topic are relevant
- targetAudiences: Who will be most likely to sign/share this petition and why
- messageFraming: The core narrative, memes & messaging hooks to drive engagement
- specificChannels: Where to distribute this petition (URLs for X accounts, Subreddits, newsletters, Discords). Be thorough.
- viralHooks: 3-5 variations for marketing copy with CTAs
- gtmDeeperDivePrompt: Prompt for a different LLM to dive deeper into the GTM strategy
- gtmChecklist: Todo list of all GTM tasks to execute on this GTM strategy. Make sure to be very specific with any assets that we need to create.
`,
    messages: [
        {
            role: "user",
            content: [
                {
                    type: "text",
                    text: inputText,
                },
            ],
        },
    ],
};

// Make the API request using fetch
console.log("Making API request to Anthropic...");
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
            "GTM Plan": `API Error: ${JSON.stringify(responseData, null, 2)}`
        });
    }
} else {
    // Extract the generated content from the response
    const generatedContent = responseData.content && responseData.content.length > 0
        ? responseData.content[0].text
        : "No content generated.";

    console.log("Generated content length:", generatedContent.length);
    console.log("Generated content preview:", generatedContent.substring(0, 100));

    // Log the generated content to the console
    console.log("Generated content:", generatedContent);
    output.text(generatedContent);

    // Try to parse the response as JSON
    let parsedContent;
    try {
        // Remove any potential extra characters and whitespace
        const cleanedContent = generatedContent.trim();
        console.log("Cleaned content length:", cleanedContent.length);
        
        // Attempt to fix common JSON syntax issues
        console.log("Attempting to fix any JSON syntax issues...");
        let fixedContent = cleanedContent;
        
        // Fix common JSON array issues
        // 1. Replace invalid array patterns
        fixedContent = fixedContent.replace(/,\s*]/g, ']'); // Remove trailing commas in arrays
        fixedContent = fixedContent.replace(/,\s*,/g, ','); // Remove double commas
        
        // Log if we made any changes
        if (fixedContent !== cleanedContent) {
            console.log("Fixed potential JSON syntax issues");
        } else {
            console.log("No syntax issues detected in initial scan");
        }
        
        // Parse the JSON
        try {
            parsedContent = JSON.parse(fixedContent);
            console.log("Successfully parsed JSON with fields:", Object.keys(parsedContent));
        } catch (parseError) {
            console.error("First parse attempt failed:", parseError.message);
            
            // More aggressive fixing - try to extract and rebuild the JSON
            console.log("Attempting more aggressive JSON repair...");
            // Extract key parts from the JSON structure
            const shortDescMatch = fixedContent.match(/"shortDescription"\s*:\s*"([^"]+)"/);
            const shortDesc = shortDescMatch ? shortDescMatch[1] : "";
            
            const targetAudiencesMatch = fixedContent.match(/"targetAudiences"\s*:\s*\[(.*?)\]/s);
            const targetAudiences = targetAudiencesMatch ? 
                targetAudiencesMatch[1].split(/",\s*"/).map(s => s.replace(/^"/, '').replace(/"$/, '')) : 
                [];
            
            const messageFramingMatch = fixedContent.match(/"messageFraming"\s*:\s*"([^"]+)"/);
            const messageFraming = messageFramingMatch ? messageFramingMatch[1] : "";
            
            const specificChannelsMatch = fixedContent.match(/"specificChannels"\s*:\s*\[(.*?)\]/s);
            const specificChannels = specificChannelsMatch ? 
                specificChannelsMatch[1].split(/",\s*"/).map(s => s.replace(/^"/, '').replace(/"$/, '')) : 
                [];
            
            // Rebuild a valid JSON object
            const rebuiltJSON = {
                shortDescription: shortDesc,
                targetAudiences: targetAudiences,
                messageFraming: messageFraming,
                specificChannels: specificChannels,
                supportingAssets: [],
                viralHooks: [],
                gtmDeeperDivePrompt: "",
                gtmChecklist: []
            };
            
            console.log("Rebuilt JSON:", JSON.stringify(rebuiltJSON, null, 2));
            parsedContent = rebuiltJSON;
        }
        
        // Save the parsed content
        if (record) {
            console.log("Updating automation record with GTM Plan...");
            await table.updateRecordAsync(record.id, {
                "GTM Plan": generatedContent
            });
            console.log("Successfully updated automation record");

            // Get the linked Petition record first
            console.log("Getting linked Petition record...");
            const linkedPetition = record?.getCellValue("Petition Title");
            console.log("Linked petition:", linkedPetition ? "Found" : "Not found");
            
            if (linkedPetition && Array.isArray(linkedPetition) && linkedPetition.length > 0) {
                const petitionRecordId = linkedPetition[0].id;
                console.log("Petition record ID:", petitionRecordId);
                
                if (petitionRecordId) {
                    // Get the Petitions table
                    console.log("Getting Petitions table...");
                    const petitionsTable = base.getTable("Petitions");
                    console.log("Getting petition record...");
                    const petitionRecord = await petitionsTable.selectRecordAsync(petitionRecordId);
                    console.log("Petition record retrieved");
                    
                    // Get the Campaigns table
                    console.log("Getting Campaigns table...");
                    const campaignsTable = base.getTable("Campaigns");
                    
                    // Find the Campaign record that has this Petition in its Petitions field
                    console.log("Finding Campaign record with this Petition...");
                    console.log("Petition record ID to search for:", petitionRecordId);
                    
                    // Get all campaign records
                    console.log("Loading all Campaign records...");
                    const campaignQuery = await campaignsTable.selectRecordsAsync();
                    console.log("Total campaign records:", campaignQuery.records.length);
                    
                    // Manually filter to find campaigns that contain this petition
                    const matchingCampaigns = campaignQuery.records.filter(record => {
                        const petitions = record.getCellValue("Petitions");
                        if (Array.isArray(petitions)) {
                            return petitions.some(p => p.id === petitionRecordId);
                        }
                        return false;
                    });
                    
                    console.log("Found", matchingCampaigns.length, "matching Campaign records");
                    
                    if (matchingCampaigns.length > 0) {
                        // Log all found Campaign records for debugging
                        matchingCampaigns.forEach((camp, index) => {
                            console.log(`Campaign ${index + 1}:`, camp.id, camp.name);
                        });
                        
                        const campaignRecordId = matchingCampaigns[0].id;
                        console.log("Selected Campaign record ID for update:", campaignRecordId);
                        console.log("Selected Campaign name:", matchingCampaigns[0].name);
                        
                        // Extract specificChannels from the parsed content
                        if (parsedContent.specificChannels && Array.isArray(parsedContent.specificChannels)) {
                            console.log("Found specificChannels array with", parsedContent.specificChannels.length, "items");
                            // Update the Specific Accounts field in the Campaigns table
                            console.log("Updating Specific Accounts in Campaigns table...");
                            await campaignsTable.updateRecordAsync(campaignRecordId, {
                                "Specific Accounts": parsedContent.specificChannels.join("\n")
                            });
                            console.log("Successfully updated Specific Accounts in Campaigns table");
                        } else {
                            console.log("No specificChannels array found in parsed content");
                        }
                    } else {
                        console.log("No Campaign record found with this Petition");
                    }
                }
            }
        }
    } catch (error) {
        console.error("Failed to parse JSON:", error);
        console.error("Error details:", error.message);
        output.text(`Error: Could not parse the response as JSON. Error details: ${error.message}. Please check the format.`);
        
        // Still save the full response even if parsing failed
        if (record) {
            console.log("Saving raw response to record");
            await table.updateRecordAsync(record.id, {
                "GTM Plan": generatedContent
            });
        }
    }
}