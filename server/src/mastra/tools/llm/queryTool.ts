import { createVectorQueryTool } from "@mastra/rag";
import { openai } from "@ai-sdk/openai";

export const tipyQueryTool = createVectorQueryTool({
  vectorStoreName: "pgVector",
  indexName: "tipy",
  model: openai.embedding("text-embedding-3-small"),
  enableFilter: true,
});
