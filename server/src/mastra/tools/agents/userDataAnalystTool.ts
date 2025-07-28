import { createTool } from "@mastra/core";
import { z } from "zod";
import { userDataAnalystAgent } from "../../agents/userDataAnalystAgent";

export const userDataAnalystTool = createTool({
  id: "user-data-analyst",
  description:
    "Analyzes user data to identify account status, transaction patterns, and potential issues.",
  inputSchema: z.object({
    userId: z.string().describe("User ID to analyze"),
    userQuery: z.string().describe("Original user query for context"),
  }),
  outputSchema: z.object({
    userData: z.any().describe("Raw user data"),
    accountAnalysis: z.string().describe("Analysis of account status"),
    transactionAnalysis: z.string().describe("Analysis of transactions"),
    referralAnalysis: z.string().describe("Analysis of referral program"),
    gamePatternAnalysis: z.string().describe("Analysis of game patterns"),
    identifiedIssues: z
      .array(z.string())
      .describe("List of potential issues identified"),
    contextForQuery: z
      .string()
      .describe("Context to enrich knowledge base queries"),
  }),
  execute: async ({ context }) => {
    const prompt = `Analyze the user data for user ID: ${context.userId}
    
Original user query: "${context.userQuery}"

Please:
1. Get the user data using getUserTool
2. Perform proactive analysis as defined in your instructions
3. Return a structured JSON response with all required fields`;

    const result = await userDataAnalystAgent.generate(prompt);

    try {
      return JSON.parse(result.text);
    } catch (error) {
      // Fallback if JSON parsing fails
      return {
        userData: null,
        accountAnalysis: result.text,
        transactionAnalysis: "",
        referralAnalysis: "",
        gamePatternAnalysis: "",
        identifiedIssues: [],
        contextForQuery: result.text,
      };
    }
  },
});
