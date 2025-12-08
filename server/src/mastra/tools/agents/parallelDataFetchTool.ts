import { createTool } from "@mastra/core";
import { z } from "zod";
import { userDataAnalystTool } from "./userDataAnalystTool";
import { tipyQueryTool } from "../llm/queryTool";

export const parallelDataFetchTool = createTool({
  id: "parallel-data-fetch",
  description:
    "Fetches user data analysis and knowledge base query in parallel for optimal performance. Always use this tool first to get both user-specific data and general knowledge base information simultaneously.",
  inputSchema: z.object({
    userId: z.string().describe("User ID to analyze"),
    userQuery: z
      .string()
      .describe("Original user query for context and knowledge base search"),
  }),
  outputSchema: z.object({
    userAnalysis: z
      .object({
        issueSpecificAnalysis: z.string(),
        relevantFindings: z.array(z.string()),
        potentialCauses: z.array(z.string()),
        contextForKnowledge: z.string(),
        payoutTransactions: z.array(z.any()).optional(),
      })
      .describe("Result from user data analysis"),
    knowledgeBase: z.any().describe("Result from knowledge base vector query"),
  }),
  execute: async ({ context, runtimeContext }) => {
    const { userId, userQuery } = context;

    // Executar ambas as ferramentas em paralelo
    const [userAnalysisResult, knowledgeBaseResult] = await Promise.all([
      userDataAnalystTool.execute({
        context: { userId, userQuery },
        runtimeContext,
      }),
      tipyQueryTool.execute({
        context: { queryText: userQuery },
        runtimeContext,
      }),
    ]);

    return {
      userAnalysis: userAnalysisResult,
      knowledgeBase: knowledgeBaseResult,
    };
  },
});
