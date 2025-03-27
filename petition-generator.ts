// 1) Get the table and load its records
let table = base.getTable("automation");
const query = await table.selectRecordsAsync();

const record = await input.recordAsync(
  "Pick a record to process",  // Label shown to the user
  table                        // The table you're working with
);
if (!record) {
    output.text("⚠️ No record passed from button field.");
}

// Get the input from the "Input Scratch" column
const inputText = record?.getCellValue("Input Scratch");

// Define your Anthropic API key and endpoint
const anthropicApiKey = "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"; // Replace with your actual API key
const apiEndpoint = "https://api.anthropic.com/v1/messages";

// Set up the request payload, replacing the message with the value from "Input Scratch"
const requestBody = {
    model: "claude-3-7-sonnet-20250219",
    max_tokens: 20000,
    temperature: 1,
    system: `dLogos enables people to bring their dream conversations to life by signing, sharing, and financially backing petitions for specific dialogues. Your role is to **generate high-quality petitions** for dream conversations that are culturally relevant, clear, compelling and have viral potential.

Note that for some petitions I will give you some of my own notes for context on which petition(s) to create. For example, I may feed you just a topic, some ideas for speakers, some URLs or even some specific context/copy that you will use as input for creating the petition. Make sure the output is in JSON.

VERY IMPORTANT: Your response MUST be valid JSON format WITHOUT any markdown formatting or explanation text. Do not wrap your JSON in code blocks. Just return pure, valid JSON.

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
- Depict them as classical figures engaged in deep philosophical discourse
- MUST maintain facial likeness and unique expressions
- Render them in the style of an Attic red-figure vase painting or Hellenistic fresco
- Include dramatic lighting, flowing robes (himation, chiton), and symbolic gestures
- Feature a background with marble columns, olive trees, or scrolls
- Emphasize emotional expression and storytelling through posture and gaze
- Use a limited color palette (terracotta, black, white, gold) for authenticity
- Add a modern flair in composition and contrast
- Keep the overall look highly artistic, thoughtful, and repeatable as a thematic visual series
- Make it more in the style of modern mythology, color, pop

---
## dLogos Brand Voice Guide:

- Speak as a **sage-conductor-meets-hype-man**—wise, inspired, and energizing.
- **Lead with clarity and warmth**, but weave in intellectual rigor and spiritual undertones.
- Balance tones: **inquisitive + empowering + poetic**, with flashes of **lighthearted magic**.
- Make it feel like **a call to meaningful action**, not a dry ask—invite others into an unfolding story.
- Use inclusive language ("we," "us") to foster **a communal, potluck vibe**—every voice matters.
- Reference **dialogue as an art form**, a timeless practice being reimagined—evoke **curiosity and reverence**.
- Center **impact and possibility**—this is about catalyzing change through connection.
- Highlight how this is **more than a platform—it's a movement**, an emergent culture.
- Infuse **mini-myths and metaphors** (e.g., "lighting the fire of conversation," "gathering the roundtable").
- Stay **accessible but elevated**—speak to both everyday thinkers and thought leaders alike.
- Avoid overused corporate jargon—**favor soulful, visionary language with real human texture**.

## **Step 1: Generate the Petition**

Each petition must contain the following structured elements, **mirroring Airtable's fields for easy input.** Make the copy as human-sounding as possible.

### **Core Petition Elements**

- **Title** (Max 100 characters) → A compelling, shareable title that captures both the **topic** and the **speakers**.
- **Topics** → Up to five relevant tags for themes of the conversation.
- **Hook** (Max 200 characters) → A high-energy, shareable hook that instantly makes users want to sign and share the petition.
- **Why This Matters** (Max 800 characters) → Explain why this conversation is urgent NOW, including relevant sources and context.
- **Speakers (2-4 Required)** with:
    - **Name**
    - **Background**
    - **Relevance** (why they are timely, including recent events or trends)
    - **Key arguments / notable quotes / past discussions**
- **Potential Facilitators (Optional, Max 3)**
- **Potential Beneficiaries (Max 3, required if crowdfunded)**
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
const response = await remoteFetchAsync(apiEndpoint, {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(requestBody),
});

// Parse the JSON response
const responseData = await response.json();

// Extract the generated content from the response
const generatedContent = responseData.content && responseData.content.length > 0
    ? responseData.content[0].text
    : "No content generated.";

// Log the generated content to the console
console.log("Raw response from Claude:", generatedContent);
output.text(generatedContent);

// Try to parse the response as JSON
let parsedContent;
try {
    // First, check if we have any content at all
    if (!generatedContent || generatedContent === "No content generated.") {
        throw new Error("No content received from API");
    }
    
    // First try direct parsing - Claude might return clean JSON
    try {
        parsedContent = JSON.parse(generatedContent.trim());
        console.log("Directly parsed JSON successfully");
    } catch (directParseError) {
        console.log("Direct JSON parsing failed, trying to extract JSON from markdown or text");
        
        // Try to find JSON-like content with various patterns
        // First try standard code blocks
        let jsonContent = null;
        const codeBlockMatch = generatedContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch && codeBlockMatch[1]) {
            jsonContent = codeBlockMatch[1].trim();
        } else {
            // Try to find anything that looks like a JSON object
            const jsonObjectMatch = generatedContent.match(/(\{[\s\S]*\})/);
            if (jsonObjectMatch && jsonObjectMatch[1]) {
                jsonContent = jsonObjectMatch[1].trim();
            } else {
                // Fall back to using the whole response
                jsonContent = generatedContent.trim();
            }
        }
        
        console.log("Attempting to parse extracted JSON content:", jsonContent);
        parsedContent = JSON.parse(jsonContent);
    }
    
    console.log("Successfully parsed JSON:", parsedContent);
} catch (error) {
    console.error("Failed to parse JSON:", error);
    // More descriptive error message
    output.text(`Error: Could not parse the response as JSON. Error details: ${error.message}. Please check the format.`);
    
    // Still save the full response even if parsing failed
    if (record) {
        await table.updateRecordAsync(record.id, {
            "Response": generatedContent
        });
    }
}

// Optionally, update the record with the extracted content
if (!record) {
    output.text("No record found.");
} else {
    // Create an object for the update with all the fields we want to update
    const updateFields = {
        "Response": generatedContent // Still save the full response
    };
    
    // Add extracted fields if they exist in the parsed content
    if (parsedContent.title) {
        updateFields["title"] = parsedContent.title;
    }

    if (parsedContent.topics && Array.isArray(parsedContent.topics)) {
        updateFields["topics"] = JSON.stringify(parsedContent.topics);
    }
    
    if (parsedContent.hook) {
        updateFields["hook"] = parsedContent.hook;
    }
    
    if (parsedContent.whyThisMatters) {
        updateFields["why this matters"] = parsedContent.whyThisMatters;
    }

    if (parsedContent.thumbnailPrompt) {
        updateFields["thumbnail prompt"] = parsedContent.thumbnailPrompt;
    }
    
    // Handle speakers - assuming speakers field in Airtable wants a string
    if (parsedContent.speakers && Array.isArray(parsedContent.speakers)) {
        updateFields["speakers"] = JSON.stringify(parsedContent.speakers);
    }
    
    // Handle potential facilitators
    if (parsedContent.potentialFacilitators && Array.isArray(parsedContent.potentialFacilitators)) {
        updateFields["potential facilitators"] = JSON.stringify(parsedContent.potentialFacilitators);
    }
    
    // Handle potential beneficiaries
    if (parsedContent.potentialBeneficiaries && Array.isArray(parsedContent.potentialBeneficiaries)) {
        updateFields["potential beneficiaries"] = JSON.stringify(parsedContent.potentialBeneficiaries);
    }
    
    // Update the record with all fields
    await table.updateRecordAsync(record.id, updateFields);
    output.text("Successfully updated record with extracted JSON fields.");
}