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

// Get the Campaigns table
const campaignsTable = base.getTable("Campaigns");
console.log("Campaigns table retrieved:", campaignsTable.name);

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
            "Outreach Templates",
            "Telegram Post"
        ];
        
        // Object to store each asset's content
        const generatedAssets = {};
        
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
            const anthropicApiKey = "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"; // Replace with your actual API key
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
- If it's a **Telegram Post**: Provide an announcement post for our community. Make it exciting and use a few relevant emojis.

For any tweets or telegram posts: NO hashtags; NO URLs in first tweet.`,
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
                
                // Store the asset content in our object
                generatedAssets[assetType] = assetContent;
                
                // Show progress
                output.markdown(`### ${assetType} completed`);
                console.log(`${assetType} completed, length: ${assetContent.length} characters`);
                
            } catch (assetError) {
                console.error(`Error processing ${assetType}:`, assetError);
                output.text(`⚠️ Could not generate ${assetType}: ${assetError.message || "Unknown error"}`);
                // Continue with the next asset
            }
        }
        
        // Return the object containing all assets
        return generatedAssets;
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
    const generatedAssets = await processInChunks();
    
    if (!record) {
        console.log("Error: No record found to update");
        output.text("No record found.");
    } else {
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
                
                // Find the Campaign record that has this Petition in its Petitions field
                console.log("Finding Campaign record with this Petition...");
                console.log("Petition record ID to search for:", petitionRecordId);
                
                // Get all campaign records
                console.log("Loading all Campaign records...");
                const campaignQuery = await campaignsTable.selectRecordsAsync();
                console.log("Total campaign records:", campaignQuery.records.length);
                
                // Manually filter to find campaigns that contain this petition
                const matchingCampaigns = campaignQuery.records.filter(campaignRecord => {
                    const petitions = campaignRecord.getCellValue("Petitions");
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
                    
                    // Update the campaign record with each asset type
                    const fieldsToUpdate = {};
                    
                    // Add each asset type to its respective field
                    for (const assetType in generatedAssets) {
                        fieldsToUpdate[assetType] = generatedAssets[assetType];
                    }
                    
                    // Update the existing record in the Campaigns table
                    await campaignsTable.updateRecordAsync(campaignRecordId, fieldsToUpdate);
                    console.log("Campaign record successfully updated");
                    
                    output.text("✅ Successfully created all marketing assets and saved to existing Campaign record!");
                } else {
                    console.log("No Campaign record found with this Petition");
                    output.text("⚠️ No matching Campaign record found. Please ensure the Petition is linked to a Campaign.");
                }
            }
        } else {
            console.log("No linked Petition found");
            output.text("⚠️ No linked Petition found in the record. Please link a Petition first.");
        }
        
        // Save all generated content to the original record as backup
        console.log("Saving all content to LLM-Created Content field as backup...");
        // Combine all assets into a formatted string
        let allGeneratedContent = "";
        for (const assetType in generatedAssets) {
            allGeneratedContent += `\n\n## ${assetType}\n\n${generatedAssets[assetType]}`;
        }
        
        // Update the original record with both status and content
        await table.updateRecordAsync(record.id, {
            "LLM-Created Content": allGeneratedContent
        });
        console.log("Backup content saved to automation record");
    }
} catch (error) {
    console.error("Error during content generation:", error);
    output.text(`Error: ${error.message || "Unknown error occurred"}`);
} 