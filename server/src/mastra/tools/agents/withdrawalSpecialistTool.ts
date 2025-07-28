import { createTool } from "@mastra/core";
import { z } from "zod";
import { withdrawalSpecialistAgent } from "../../agents/withdrawalSpecialistAgent";

export const withdrawalSpecialistTool = createTool({
  id: "withdrawal-specialist",
  description:
    "Analyzes withdrawal/payout situations and provides precise time-based assessments.",
  inputSchema: z.object({
    userAnalysisResult: z
      .any()
      .describe(
        "Complete result from user data analyst including userData and full analysis"
      ),
    userQuery: z.string().describe("Original user query for context"),
  }),
  outputSchema: z.object({
    hasWithdrawals: z.boolean().describe("Whether user has withdrawals"),
    withdrawalStatus: z.string().describe("Status of withdrawals found"),
    timeAnalysis: z
      .string()
      .describe("Time analysis of withdrawals in processing"),
    recommendation: z
      .string()
      .describe("Specific recommendation based on analysis"),
    contextForSupport: z
      .string()
      .describe("Context if support contact is needed"),
  }),
  execute: async ({ context }) => {
    const prompt = `Analyze the withdrawal situation for this user:

User Analysis Result: ${JSON.stringify(context.userAnalysisResult, null, 2)}
Original Query: "${context.userQuery}"

Please:
1. Analyze all withdrawal/payout data from the user analysis result
2. Calculate time elapsed for any PROCESSING withdrawals
3. Determine if withdrawals are within or outside normal timeframe (≤3 days)
4. Provide specific recommendations
5. Return a structured JSON response with all required fields

Remember: NEVER speculate about automatic cancellation or what happens after deadlines.`;

    const result = await withdrawalSpecialistAgent.generate(prompt);

    try {
      return JSON.parse(result.text);
    } catch (error) {
      // Fallback if JSON parsing fails
      return {
        hasWithdrawals: false,
        withdrawalStatus: "ANALYSIS_ERROR",
        timeAnalysis: result.text,
        recommendation: result.text,
        contextForSupport: "",
      };
    }
  },
});
