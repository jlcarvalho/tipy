import { describe, it, expect, beforeEach, vi, beforeAll } from "vitest";
import { openai } from "@ai-sdk/openai";
import {
  ContextRelevancyMetric,
  ContextualRecallMetric,
  ContextPrecisionMetric,
  HallucinationMetric,
  PromptAlignmentMetric,
  AnswerRelevancyMetric,
} from "@mastra/evals/llm";
import { CompletenessMetric } from "@mastra/evals/nlp";
import { RuntimeContext } from "@mastra/core/di";
import { getUserTool } from "../mastra/tools/tipspace/getUserTool";
import { mastra } from "../mastra";
import { Agent } from "@mastra/core";
import { subDays } from "date-fns";

// Mock the getUserTool only
vi.mock("../mastra/tools/tipspace/getUserTool", () => ({
  getUserTool: {
    id: "Get User Information",
    description: "Fetches the user information for a given email",
    execute: vi.fn(),
  },
}));

const queries: Array<{
  query: string;
  context?: string[];
  instructions?: string[];
  minRelevancyScore?: number;
  minPrecisionScore?: number;
  maxHallucinationScore?: number;
  minPromptAlignmentScore?: number;
}> = [
  {
    query: "Meu saque não caiu",
    context: [
      `O usuário tem um saque de R$ 50 solicitado`,
      "O saque foi solicitado há 1 dia e está dentro do prazo normal de processamento",
      "Os saques na Tipspace são processados em até 3 dias úteis",
      "O usuário ainda tem tempo para aguardar o processamento antes de entrar em contato com o suporte",
      "Os pagamentos costumam ser feitos por volta das 19h",
      "Se algo der errado com o saque, o valor será devolvido automaticamente para a carteira do usuário e o saque cancelado",
      "Se o saque não for processado até o final do prazo, o usuário deve entrar em contato com o suporte",
    ],
    instructions: [
      "Responda em Português brasileiro",
      "Responda com links de referência para a base de conhecimento",
      "Responda com links formatados: [clicando aqui](url)",
    ],
    minRelevancyScore: 0.8,
    minPrecisionScore: 0.8,
    maxHallucinationScore: 0.2,
    minPromptAlignmentScore: 1,
  },
  // {
  //   query: "Minha odd para vencer a partida antes era 1.73 e agora está 1.53",
  //   context: [],
  //   instructions: [
  //     "Responda em Português brasileiro",
  //     "Responda com links de referência para a base de conhecimento",
  //     "Responda com links formatados: [clicando aqui](url)",
  //   ],
  //   minRelevancyScore: 0.8,
  //   minPrecisionScore: 0.8,
  //   maxHallucinationScore: 0.2,
  //   minPromptAlignmentScore: 1,
  // },
  // {
  //   query: "minhas odds caíram",
  //   context: [],
  //   instructions: [
  //     "Responda em Português brasileiro",
  //     "Responda com links de referência para a base de conhecimento",
  //     "Responda com links formatados: [clicando aqui](url)",
  //   ],
  //   minRelevancyScore: 0.8,
  //   minPrecisionScore: 0.8,
  //   maxHallucinationScore: 0.2,
  //   minPromptAlignmentScore: 1,
  // },
  // {
  //   query: "fiz uma tip de 100 e voltou só 57 de lucro, os 100 sumiram",
  //   context: [],
  //   instructions: [
  //     "Responda em Português brasileiro",
  //     "Responda com links de referência para a base de conhecimento",
  //     "Responda com links formatados: [clicando aqui](url)",
  //   ],
  //   minRelevancyScore: 0.8,
  //   minPrecisionScore: 0.8,
  //   maxHallucinationScore: 0.2,
  //   minPromptAlignmentScore: 1,
  // },
  {
    query: "minha tip expirou",
    context: [
      `O usuário realizou uma tip no TFT com o valor de R$ 10 feita em ${subDays(new Date(), 3).toISOString()} que foi expirada`,
      `A tip realizada pelo usuário tinha o critério "TOP 1, Causar (200+) dano em oponentes"`,
      "Cada tip tem um prazo de validade que varia de acordo com o jogo",
      "Se a partida não for jogada dentro do prazo, a tip expira automaticamente",
      "Para o TFT, o prazo de expiração é de 2 horas",
      "Tips expiradas são consideradas como derrota",
      "Se o usuário não pôde jogar por um problema técnico, ele pode solicitar um reembolso, mas precisará enviar evidências",
      "O valor não é reembosável em caso de expiração",
      "Deve-se ter recomendações de artigos que possam ajudar o usuário a evitar o problema",
    ],
    instructions: [
      "Responda em Português brasileiro",
      "Responda com links de referência para a base de conhecimento",
    ],
    minRelevancyScore: 0.75,
    minPrecisionScore: 0.75,
    maxHallucinationScore: 0.25,
    minPromptAlignmentScore: 1,
  },
  // {
  //   query: "fui banido indevidamente",
  //   context: [],
  //   instructions: [
  //     "Responda em Português brasileiro",
  //     "Responda com links de referência para a base de conhecimento",
  //     "Responda com links formatados: [clicando aqui](url)",
  //   ],
  //   minRelevancyScore: 0.8,
  //   minPrecisionScore: 0.8,
  //   maxHallucinationScore: 0.2,
  //   minPromptAlignmentScore: 1,
  // },
  // {
  //   query: "bati o kda e perdi",
  //   context: [],
  //   instructions: [
  //     "Responda em Português brasileiro",
  //     "Responda com links de referência para a base de conhecimento",
  //     "Responda com links formatados: [clicando aqui](url)",
  //   ],
  //   minRelevancyScore: 0.8,
  //   minPrecisionScore: 0.8,
  //   maxHallucinationScore: 0.2,
  //   minPromptAlignmentScore: 1,
  // },
];

// Define runtime context type
type TipyRuntimeContext = {
  "user-id": string;
};

const genAnswer = (tipyAgent: Agent, query: string) => {
  const runtimeContext = new RuntimeContext<TipyRuntimeContext>();
  runtimeContext.set("user-id", "test-user-123");

  return tipyAgent.generate(query, {
    runtimeContext,
  });
};

describe("Tipy Agent Evaluation Tests", () => {
  let tipyAgent: Agent;

  // Sample user data for mocking
  const mockUserData = {
    banned: false,
    user: {
      name: "João Silva",
      createdAt: "2024-01-15T10:30:00Z",
      verifiedDocument: true,
      verifiedDocNumber: true,
      status: "ACTIVE",
    },
    referrals: [
      {
        createdAt: "2024-01-16T14:20:00Z",
        referred: { displayName: "Maria Santos", matchesFinished: 5 },
        reward: "10.00",
        transactionAmount: "100.00",
        status: "PENDING",
      },
    ],
    transactions: [
      {
        createdAt: subDays(new Date(), 1).toISOString(),
        type: "PAYOUT",
        status: "PROCESSING",
        amount: "50.00",
        odd: null,
        criteriaLabel: null,
        gamemode: null,
      },
      {
        createdAt: subDays(new Date(), 2).toISOString(),
        type: "COUPON",
        status: "FINISHED",
        amount: "10.00",
        odd: "3.96",
        criteriaLabel: "TOP 1, Causar (200+) dano em oponentes",
        gamemode: "TFTEXTERNALRANKED",
      },
      {
        createdAt: subDays(new Date(), 3).toISOString(),
        type: "COUPON",
        status: "EXPIRED",
        amount: "10.00",
        odd: "3.96",
        criteriaLabel: "TOP 1, Causar (200+) dano em oponentes",
        gamemode: "TFTEXTERNALRANKED",
      },
    ],
  };

  beforeAll(() => {
    tipyAgent = mastra.getAgent("tipyAgent");
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock getUserTool to return sample data
    vi.mocked(getUserTool.execute).mockResolvedValue(mockUserData);
  });

  queries.forEach(
    ({
      query,
      context,
      instructions,
      minRelevancyScore = 0,
      minPrecisionScore = 0,
      maxHallucinationScore = 0,
      minPromptAlignmentScore = 0,
    }) => {
      describe(`Evaluation for query: ${query}`, () => {
        let response: Awaited<ReturnType<typeof genAnswer>> | null = null;

        const getResponse = async () => {
          if (!response) {
            // Generate the response once and reuse across all test cases
            response = await genAnswer(tipyAgent, query);
            console.log("Agent Response:", response.text);
          }

          return response;
        };

        if (context) {
          it("should use relevant context from knowledge base for withdrawal queries", async () => {
            const response = await getResponse();
            const metric = new ContextRelevancyMetric(
              await tipyAgent.getModel(),
              {
                context,
              }
            );

            const result = await metric.measure(query, response.text.trim());

            console.log("Context Relevancy Score:", result.score);
            console.log("Context Relevancy Reason:", result.info.reason);

            expect(result.score).toBeGreaterThanOrEqual(minRelevancyScore);
            expect(result.info.reason).toBeDefined();
          }, 60000);

          it("should use precise context from knowledge base", async () => {
            const response = await getResponse();
            const metric = new ContextPrecisionMetric(
              await tipyAgent.getModel(),
              {
                context,
              }
            );

            const result = await metric.measure(query, response.text.trim());

            console.log("Context Precision Score:", result.score);
            console.log("Context Precision Reason:", result.info.reason);

            expect(result.score).toBeGreaterThanOrEqual(minPrecisionScore);
          }, 60000);

          it("should not hallucinate information not in knowledge base", async () => {
            const response = await getResponse();
            const metric = new HallucinationMetric(await tipyAgent.getModel(), {
              context: context,
            });

            const result = await metric.measure(query, response.text.trim());

            // Should score well (low hallucination) for not inventing information
            console.log("Hallucination Score (lower is better):", result.score);
            console.log("Hallucination Reason:", result.info.reason);

            expect(result.score).toBeLessThanOrEqual(maxHallucinationScore);
          }, 60000);
        }

        if (instructions) {
          it("should follow prompt guidelines from agent instructions", async () => {
            const response = await getResponse();
            const metric = new PromptAlignmentMetric(
              await tipyAgent.getModel(),
              {
                instructions,
              }
            );

            const result = await metric.measure(query, response.text.trim());

            console.log("Prompt Alignment Score:", result.score);
            console.log("Prompt Alignment Reason:", result.info.reason);

            expect(result.score).toBeGreaterThanOrEqual(
              minPromptAlignmentScore
            );
          }, 60000);
        }
      });
    }
  );

  describe("Agent Workflow Compliance", () => {
    it("should verify agent has required tools available", async () => {
      expect(getUserTool.execute).toBeDefined();

      // Verify the agent has the correct tools
      expect(tipyAgent.tools.getUserTool).toBeDefined();
      expect(tipyAgent.tools.tipyQueryTool).toBeDefined();

      console.log("Agent workflow tools verified");
    });

    it("should verify agent basic structure", async () => {
      expect(tipyAgent.name).toBe("Tipspace Agent");
      expect(typeof tipyAgent.getInstructions).toBe("function");
      expect(tipyAgent.model).toBeDefined();
      expect(tipyAgent.tools).toBeDefined();

      // Verify tools are accessible correctly
      expect(tipyAgent.tools.getUserTool).toBeDefined();
      expect(tipyAgent.tools.tipyQueryTool).toBeDefined();

      expect(tipyAgent.name).toBeTruthy();
      expect(tipyAgent.model).toBeTruthy();
      expect(Object.keys(tipyAgent.tools)).toContain("getUserTool");
      expect(Object.keys(tipyAgent.tools)).toContain("tipyQueryTool");

      console.log("Agent structure compliance verified");
    });
  });
});
