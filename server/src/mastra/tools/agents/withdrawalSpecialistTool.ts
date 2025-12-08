import { createTool } from "@mastra/core";
import { z } from "zod";

// Função auxiliar para calcular dias entre duas datas
const calculateDaysSince = (dateString: string): number => {
  if (!dateString) return 0;
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// Função auxiliar para formatar datas
const formatDate = (dateString: string): string => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.toLocaleString("pt-BR", { month: "long" });
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${day} de ${month} de ${year} às ${hours}:${minutes}`;
};

// Função para analisar saques diretamente
const analyzeWithdrawals = (
  userAnalysisResult: any
): {
  hasWithdrawals: boolean;
  withdrawalStatus: string;
  timeAnalysis: string;
  recommendation: string;
  contextForSupport: string;
} => {
  // Usar payoutTransactions comprimido em vez de userData completo
  const processingPayouts = userAnalysisResult.payoutTransactions || [];

  if (processingPayouts.length === 0) {
    return {
      hasWithdrawals: false,
      withdrawalStatus: "NONE",
      timeAnalysis: "Nenhum saque em processamento",
      recommendation: "Usuário não possui saques em processamento no momento",
      contextForSupport: "Nenhum saque em processamento encontrado",
    };
  }

  // Analisar cada saque em processamento
  const analyses = processingPayouts.map((payout: any) => {
    const daysSince = calculateDaysSince(payout.createdAt);
    const isWithinDeadline = daysSince <= 3;
    const status = isWithinDeadline ? "DENTRO_DO_PRAZO" : "FORA_DO_PRAZO";

    return {
      amount: payout.amount,
      createdAt: payout.createdAt,
      daysSince,
      status,
      formattedDate: formatDate(payout.createdAt),
    };
  });

  // Determinar status geral (se algum está fora do prazo, status geral é FORA_DO_PRAZO)
  const overallStatus = analyses.some((a) => a.status === "FORA_DO_PRAZO")
    ? "FORA_DO_PRAZO"
    : "DENTRO_DO_PRAZO";

  // Construir análise de tempo
  const timeAnalysisParts = analyses.map((a) => {
    return `${a.daysSince} dia(s) desde a solicitação - ${a.status}`;
  });
  const timeAnalysis = timeAnalysisParts.join("; ");

  // Construir recomendação
  let recommendation = "";
  if (overallStatus === "DENTRO_DO_PRAZO") {
    const maxDays = Math.max(...analyses.map((a) => a.daysSince));
    recommendation = `Seu(s) saque(s) está(ão) dentro do prazo normal de processamento (${maxDays} dia(s) desde a solicitação). O prazo é de até 3 dias úteis.`;
  } else {
    const overdueAnalyses = analyses.filter(
      (a) => a.status === "FORA_DO_PRAZO"
    );
    recommendation = `Seu(s) saque(s) passou(aram) do prazo normal de processamento. ${overdueAnalyses.length} saque(s) com mais de 3 dias. Recomendamos contatar o suporte.`;
  }

  // Construir contexto para suporte
  const contextParts = analyses.map((a) => {
    return `Saque de R$ ${a.amount} criado em ${a.formattedDate} (${a.daysSince} dia(s) atrás)`;
  });
  const contextForSupport = `Saque(s) em processamento: ${contextParts.join("; ")}`;

  return {
    hasWithdrawals: true,
    withdrawalStatus: "PROCESSING",
    timeAnalysis,
    recommendation,
    contextForSupport,
  };
};

export const withdrawalSpecialistTool = createTool({
  id: "withdrawal-specialist",
  description:
    "Analyzes withdrawal/payout situations and provides precise time-based assessments.",
  inputSchema: z.object({
    userAnalysisResult: z
      .any()
      .describe(
        "Result from user data analyst including analysis and payoutTransactions (if any)"
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
    // Analisar saques diretamente sem LLM
    return analyzeWithdrawals(context.userAnalysisResult);
  },
});
