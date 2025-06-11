import "dotenv/config";

import { MDocument } from "@mastra/rag";
import { PgVector } from "@mastra/pg";
import { embedMany } from "ai";
import { openai } from "@ai-sdk/openai";

const pgVector = new PgVector({
  connectionString: process.env.POSTGRES_CONNECTION_STRING!,
});

// Initialize the vector store with error handling
try {
  await pgVector.createIndex({
    indexName: "tft_academy",
    dimension: 1536,
  });
  console.log("✅ Vector index 'tft_academy' created successfully in store");
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.warn("⚠️ Failed to create vector index in store:", errorMessage);
  console.warn("To fix this, increase your PostgreSQL maintenance_work_mem setting to at least 64MB.");
  console.warn("Continuing with data ingestion...");
}

// TFT Academy API endpoints
const TFT_ACADEMY_ENDPOINTS = {
  augments: "https://tftacademy.com/api/assets/augments?set=14",
  items: "https://tftacademy.com/api/assets/items?set=14",
  traits: "https://tftacademy.com/api/assets/traits?set=14",
  comps: "https://tftacademy.com/api/tierlist/comps?set=14",
  champions: "https://tftacademy.com/api/assets/champions?set=14",
};

// Function to fetch data from TFT Academy API
async function fetchTFTAcademyData(endpoint: string, dataType: string) {
  try {
    console.log(`📡 Fetching ${dataType} from: ${endpoint}`);
    
    const response = await fetch(endpoint, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${dataType}: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`📄 Fetched ${Array.isArray(data[dataType]) ? data[dataType].length : Object.keys(data).length} ${dataType}`);
    
    return data;
  } catch (error) {
    console.error(`❌ Error fetching ${dataType} from ${endpoint}:`, error);
    return null;
  }
}

// Main processing function
async function processTFTAcademyData() {
  for (const [dataType, endpoint] of Object.entries(TFT_ACADEMY_ENDPOINTS)) {
    const data = await fetchTFTAcademyData(endpoint, dataType);
    
    if (!data) {
      console.log(`⏭️ Skipping ${dataType} - no data received`);
      continue;
    }

    // Handle different response structures - comps uses "guides" key
    const responseKey = dataType === 'comps' ? 'guides' : dataType;
    const items = data[responseKey] || [];
    
    if (!Array.isArray(items) || items.length === 0) {
      console.log(`⏭️ Skipping ${dataType} - no items found`);
      continue;
    }

    console.log(`🔄 Processing ${items.length} ${dataType}...`);

    for (const item of items) {
      try {
        // Use Mastra's built-in JSON chunking
        const document = MDocument.fromJSON(JSON.stringify(item));

        const chunks = await document.chunk({
          strategy: "json",
          maxSize: 512,
          overlap: 100,
        });

        if (chunks.length === 0) {
          console.log(`⏭️ Skipping ${dataType} item ${item.id || "unknown"} - no chunks generated`);
          continue;
        }

        const { embeddings } = await embedMany({
          model: openai.embedding("text-embedding-3-small"),
          values: chunks.map((chunk) => chunk.text),
        });

        await pgVector.upsert({
          indexName: "tft_academy",
          vectors: embeddings,
          metadata: chunks.map((chunk, index) => ({
            text: chunk.text,
            source: `tft_academy_${dataType}`,
            data_type: dataType,
            item_id: item.id || item.apiName || "unknown",
            item_name: item.name || "Unknown",
            set: "14",
            chunk_index: index,
          })),
        });

        console.log(`✅ ${dataType} item "${item.name || item.id || "unknown"}" processed successfully with ${chunks.length} chunks!`);

        // Small delay to avoid overwhelming the system
        await new Promise((resolve) => setTimeout(resolve, 10));
      } catch (error) {
        console.error(`❌ Error processing ${dataType} item ${item.id || "unknown"}:`, error);
      }
    }

    // Delay between different data types
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

// Run the data ingestion
await processTFTAcademyData();
console.log("🎉 TFT Academy knowledge base ingestion completed!");
