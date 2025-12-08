import { PgVector, PostgresStore } from "@mastra/pg";

export const pgVector = new PgVector({
  id: "pgVector",
  connectionString: process.env.POSTGRES_CONNECTION_STRING!,
});

// Initialize PostgreSQL storage for telemetry, memory, workflows, and eval data
export const pgStorage = new PostgresStore({
  id: "pgStorage",
  connectionString: process.env.POSTGRES_CONNECTION_STRING!,
});

// Initialize indices (helper function to be called at startup if needed, 
// or we can rely on index.ts executing this if we import the file)
export const initVectorIndices = async () => {
  await pgVector.createIndex({
    indexName: "tipy",
    dimension: 1536,
  });

  await pgVector.createIndex({
    indexName: "tft_academy",
    dimension: 1536,
  });
};
