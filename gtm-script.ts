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
const inputText = record?.getCellValue("Response");

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
  "amplificationStrategy": "string",
  "specificChannels": ["string", "string", ...],
  "supportingAssets": ["string", "string", ...],
  "viralHooks": ["string", "string", ...],
  "gtmDeeperDivePrompt": "string"
}

DO NOT include markdown formatting, comments, or any other text outside the JSON object.
DO NOT use backticks or code blocks. Just output the raw JSON object.

Based on the petition, fill in each field with:
- shortDescription: Brief overview of the petition and why the speakers/topic are relevant
- targetAudiences: Who will be most likely to sign/share this petition and why
- amplificationStrategy: The core narrative, memes & messaging hooks to drive engagement
- specificChannels: Where to distribute this petition (URLs for X accounts, Subreddits, newsletters, Discords)
- supportingAssets: What to create to maximize engagement (cards, images, infographics, videos)
- viralHooks: 3-5 variations for marketing copy with CTAs
- gtmDeeperDivePrompt: Prompt for a different LLM to dive deeper into the GTM strategy`,
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
console.log(generatedContent);
output.text(generatedContent);

// Try to parse the response as JSON
let parsedContent;
try {
    // Remove any potential extra characters and whitespace
    const cleanedContent = generatedContent.trim();
    
    // Parse the JSON
    parsedContent = JSON.parse(cleanedContent);
    console.log("Successfully parsed JSON:", parsedContent);
    
    // Save the parsed content
    if (record) {
        await table.updateRecordAsync(record.id, {
            "GTM Plan": generatedContent
        });
    }
} catch (error) {
    console.error("Failed to parse JSON:", error);
    output.text("Error: Could not parse the response as JSON. Please check the format.");
    
    // Still save the full response even if parsing failed
    if (record) {
        await table.updateRecordAsync(record.id, {
            "GTM Plan": generatedContent
        });
    }
}