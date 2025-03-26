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

// Get the input from the "Response" and "GTM Plan" columns
const responseContent = record?.getCellValue("Response") || "";
const gtmPlanContent = record?.getCellValue("GTM Plan") || "";

// Log the content to make sure it's not empty
console.log("Response content length:", responseContent.length);
console.log("GTM Plan content length:", gtmPlanContent.length);

// Combine the content
const combinedContent = `Response Content:\n${responseContent}\n\nGTM Plan Content:\n${gtmPlanContent}`;

// Define your Anthropic API key and endpoint
const anthropicApiKey = "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"; 
const apiEndpoint = "https://api.anthropic.com/v1/messages";

// Set up the request payload with the combined content
const requestBody = {
    model: "claude-3-7-sonnet-20250219",
    max_tokens: 20000,
    temperature: 1,
    system: "test prompt",
    messages: [
        {
            role: "user",
            content: [
                {
                    type: "text",
                    text: combinedContent,
                },
            ],
        },
    ],
};

// Log the request being sent
console.log("Sending request to Claude API");

try {
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
    
    // Log response status
    console.log("API response status:", response.status);
    
    // Parse the JSON response
    const responseData = await response.json();
    
    // Log the full response for debugging
    console.log("Full API response:", JSON.stringify(responseData));
    
    // Check if there was an error in the response
    if (responseData.error) {
        console.error("API Error:", responseData.error);
        output.text(`Error from API: ${JSON.stringify(responseData.error)}`);
    } else {
        // Extract the generated content from the response
        const generatedContent = responseData.content && responseData.content.length > 0
            ? responseData.content[0].text
            : "No content generated.";
        
        // Log the generated content to the console
        console.log("Response from Claude:", generatedContent);
        output.text(generatedContent);
        
        // Update the record with the generated content
        if (!record) {
            output.text("No record found.");
        } else {
            // Update the record with the generated content
            await table.updateRecordAsync(record.id, {
                "LLM-Created Content": generatedContent
            });
            
            output.text("Successfully updated record with generated content.");
        }
    }
} catch (error) {
    console.error("Error calling API:", error);
    output.text(`Error calling API: ${error.message}`);
} 