import { createTool } from "@mastra/core";
import { z } from "zod";
import { knowledgeRetrievalAgent } from "../../agents/knowledgeRetrievalAgent";

export const knowledgeRetrievalTool = createTool({
  id: "knowledge-retrieval",
  description:
    "Searches the knowledge base with enriched context from user analysis.",
  inputSchema: z.object({
    originalQuery: z.string().describe("Original user query"),
    contextForQuery: z.string().describe("User context to enrich the search"),
  }),
  outputSchema: z.object({
    retrievedContent: z
      .string()
      .describe("Relevant content found in knowledge base"),
    relevantLinks: z
      .array(z.string())
      .describe("Specific links found (only if retrieved)"),
    keyPolicies: z.string().describe("Key policies/rules related to the query"),
    actionableInfo: z
      .string()
      .describe("Practical information user can act on"),
    confidenceLevel: z
      .enum(["HIGH", "MEDIUM", "LOW"])
      .describe("Confidence in response completeness"),
  }),
  execute: async ({ context }) => {
    const query = `${context.originalQuery} ${context.contextForQuery}`;

    const prompt = `Execute tipyQueryTool with: "${query}"
    
Return JSON with:
- retrievedContent: what you found
- relevantLinks: any URLs found
- keyPolicies: key rules/policies
- actionableInfo: practical steps
- confidenceLevel: HIGH/MEDIUM/LOW`;

    const result = await knowledgeRetrievalAgent.generate(prompt);

    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(result.text);
    } catch (error) {
      return {
        retrievedContent:
          result.text || "Busca realizada na base de conhecimento",
        relevantLinks: [],
        keyPolicies: "Informações específicas da base de conhecimento",
        actionableInfo: result.text || "Consulte suporte se necessário",
        confidenceLevel: "MEDIUM" as const,
      };
    }
  },
});
