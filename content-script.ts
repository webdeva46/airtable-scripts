// 1) Get the table and load its records
let table = base.getTable("automation");
console.log("Table retrieved:", table.name);
const query = await table.selectRecordsAsync();
console.log("Records loaded:", query.records.length);

const record = await input.recordAsync(
  "Pick a record to process",  // Label shown to the user
  table                        // The table you're working with
);
console.log("Selected record:", record ? record.id : "No record selected");
if (!record) {
    output.text("⚠️ No record passed from button field.");
}

// Get the input from the "Response" and "GTM Plan" columns
const responseContent = record?.getCellValue("Response") || "";
const gtmPlanContent = record?.getCellValue("GTM Plan") || "";
console.log("Response content length:", responseContent.length);
console.log("GTM Plan content length:", gtmPlanContent.length);

// Split content into manageable chunks to avoid timeouts
async function processInChunks() {
    try {
        output.text("Starting chunked processing to avoid timeouts...");
        
        // Define types of marketing assets to process separately
        const marketingAssets = [
            "Tweet Series",
            "Video Script",
            "Twitter Thread",
            "Substack Article", 
            "LinkedIn Post",
            "Newsletter Mention",
            "Outreach Templates"
        ];
        
        let allGeneratedContent = "";
        
        // Process each asset type separately
        for (let i = 0; i < marketingAssets.length; i++) {
            const assetType = marketingAssets[i];
            output.text(`Processing ${i+1}/${marketingAssets.length}: ${assetType}...`);
            
            // Create combined content with focused instructions
            const focusedPrompt = `Focus ONLY on creating the "${assetType}" marketing asset based on the following content. 
Do not create any other assets in this response.

Response Content:
${responseContent}

GTM Plan Content:
${gtmPlanContent}`;
            
            // Define your Anthropic API key and endpoint
            const anthropicApiKey = "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";
            const apiEndpoint = "https://api.anthropic.com/v1/messages";
            
            // Set up the request payload for this specific asset
            const requestBody = {
                model: "claude-3-7-sonnet-20250219",
                max_tokens: 20000,
                temperature: 1,
                system: `Create a marketing asset for a petition campaign. You are only focusing on creating a "${assetType}" in this response.
                
For reference:
- If it's a **Tweet Series**: Provide each tweet separately, clearly labeled.
- If it's a **Video Script**: Include scene descriptions and dialog.
- If it's a **Twitter Thread**: Provide tweet-by-tweet text.
- If it's a **Substack Article**: Provide a short piece with clear beginning, middle, and end.
- If it's a **LinkedIn Post**: Provide text appropriate for LinkedIn format.
- If it's a **Newsletter Mention**: Provide a snippet for a newsletter.
- If it's an **Outreach Template**: Provide email/DM sample for influencers or partners.

For any tweets: NO hashtags; NO URLs in first tweet.`,
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: focusedPrompt,
                            },
                        ],
                    },
                ],
            };
            
            // Configure the API request
            const requestOptions = {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": anthropicApiKey,
                    "anthropic-version": "2023-06-01"
                },
                body: JSON.stringify(requestBody),
            };
            
            // Make the API request for this asset
            output.text(`Requesting ${assetType} from Claude...`);
            try {
                const response = await remoteFetchAsync(apiEndpoint, requestOptions);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    output.text(`Error with ${assetType}: ${response.status} - ${errorText}`);
                    continue; // Skip this one but try the next
                }
                
                // Process the response
                const responseData = await response.json();
                
                // Extract the content
                const assetContent = responseData.content && responseData.content.length > 0
                    ? responseData.content[0].text
                    : `No content generated for ${assetType}.`;
                
                // Add a header and the content to our aggregated result
                const formattedContent = `\n\n## ${assetType}\n\n${assetContent}`;
                allGeneratedContent += formattedContent;
                
                // Show progress
                output.markdown(`### ${assetType} completed`);
                console.log(`${assetType} completed, length: ${assetContent.length} characters`);
                
                // Small delay between requests to avoid rate limits
                await new Promise(resolve => {
                    // Use a busy-wait since setTimeout isn't available
                    const startTime = new Date().getTime();
                    const waitTime = 1000; // 1 second
                    while (new Date().getTime() - startTime < waitTime) {
                        // Empty loop for waiting
                    }
                    resolve();
                });
                
            } catch (assetError) {
                console.error(`Error processing ${assetType}:`, assetError);
                output.text(`⚠️ Could not generate ${assetType}: ${assetError.message || "Unknown error"}`);
                // Continue with the next asset
            }
        }
        
        // Return the combined content from all assets
        return allGeneratedContent;
    } catch (error) {
        console.error("Error in chunked processing:", error);
        throw error;
    }
}

// Main execution
try {
    console.log("Starting chunked content generation...");
    output.text("Breaking down the request into smaller pieces to avoid timeouts...");
    
    // Process content in chunks
    const generatedContent = await processInChunks();
    
    // Update the record with all the generated content
    if (!record) {
        console.log("Error: No record found to update");
        output.text("No record found.");
    } else {
        // Update the record with the generated content
        console.log("Updating record with combined content...");
        await table.updateRecordAsync(record.id, {
            "LLM-Created Content": generatedContent
        });
        console.log("Record successfully updated");
        
        output.text("✅ Successfully created and saved all marketing assets!");
    }
} catch (error) {
    console.error("Error during content generation:", error);
    output.text(`Error: ${error.message || "Unknown error occurred"}`);
} 