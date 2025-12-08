import { createTool } from "@mastra/core";
import { z } from "zod";
import { getUserTool } from "../tipspace/getUserTool";
import crypto from "crypto";

// Cache de resultados de análise (não apenas dados brutos)
interface AnalysisCacheEntry {
  data: any;
  timestamp: number;
}

const analysisCache = new Map<string, AnalysisCacheEntry>();
const ANALYSIS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos (mesmo TTL dos dados brutos)

// Função para gerar chave de cache da análise
const getAnalysisCacheKey = (userId: string, userQuery: string): string => {
  const normalizedQuery = userQuery.toLowerCase().trim();
  return crypto
    .createHash("sha256")
    .update(`${userId}:${normalizedQuery}`)
    .digest("hex");
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

// Função para analisar dados do usuário baseado na query
const analyzeUserData = (
  userData: any,
  userQuery: string
): {
  issueSpecificAnalysis: string;
  relevantFindings: string[];
  potentialCauses: string[];
  contextForKnowledge: string;
} => {
  const queryLower = userQuery.toLowerCase();
  const findings: string[] = [];
  const causes: string[] = [];
  let analysis = "";
  let context = "";

  // Análise para problemas de CONTA/VERIFICAÇÃO
  if (
    queryLower.includes("verific") ||
    queryLower.includes("documento") ||
    queryLower.includes("conta") ||
    queryLower.includes("ban") ||
    queryLower.includes("banimento")
  ) {
    findings.push(`Status da conta: ${userData.user.status || "N/A"}`);
    findings.push(
      `Documento verificado: ${userData.user.verifiedDocument ? "Sim" : "Não"}`
    );
    findings.push(
      `Número do documento verificado: ${userData.user.verifiedDocNumber ? "Sim" : "Não"}`
    );
    if (userData.user.createdAt) {
      findings.push(`Conta criada em: ${formatDate(userData.user.createdAt)}`);
    }
    if (userData.banned) {
      causes.push("Conta banida");
      analysis =
        "Conta está banida. Verificação de documentos pode estar relacionada ao banimento.";
    } else if (!userData.user.verifiedDocument) {
      causes.push("Documento não verificado");
      analysis =
        "Documento não foi verificado ainda. Usuário precisa completar verificação.";
    }
    context = `Conta ${userData.user.status}, documento ${userData.user.verifiedDocument ? "verificado" : "não verificado"}`;
  }

  // Análise para problemas de SAQUE/PAGAMENTO
  if (
    queryLower.includes("saque") ||
    queryLower.includes("payout") ||
    queryLower.includes("retirar") ||
    queryLower.includes("dinheiro")
  ) {
    const payouts = userData.transactions.filter(
      (t: any) => t.type === "PAYOUT"
    );
    if (payouts.length > 0) {
      const processingPayouts = payouts.filter(
        (t: any) => t.status === "PROCESSING"
      );
      findings.push(`Total de saques: ${payouts.length}`);
      findings.push(`Saques em processamento: ${processingPayouts.length}`);
      processingPayouts.forEach((payout: any) => {
        findings.push(
          `Saque de R$ ${payout.amount} criado em ${formatDate(payout.createdAt)} - Status: ${payout.status}`
        );
      });
      if (processingPayouts.length > 0) {
        analysis = `Existem ${processingPayouts.length} saque(s) em processamento.`;
        context = `Saque(s) em processamento: ${processingPayouts.map((p: any) => `R$ ${p.amount} desde ${formatDate(p.createdAt)}`).join(", ")}`;
      }
    } else {
      findings.push("Nenhum saque encontrado");
      analysis = "Usuário não possui histórico de saques.";
    }
  }

  // Análise para problemas de TIPS/APOSTAS
  if (
    queryLower.includes("tip") ||
    queryLower.includes("aposta") ||
    queryLower.includes("coupon") ||
    queryLower.includes("jogo") ||
    queryLower.includes("match")
  ) {
    const tips = userData.transactions.filter((t: any) => t.type === "COUPON");
    if (tips.length > 0) {
      tips.forEach((tip: any) => {
        const status =
          tip.status === "FINISHED" && !tip.odd ? "EXPIRED" : tip.status;
        findings.push(
          `Tip de R$ ${tip.amount} em ${tip.gamemode || "N/A"} - Status: ${status} - Criada em ${formatDate(tip.createdAt)}`
        );
      });
      const expiredTips = tips.filter(
        (t: any) => t.status === "FINISHED" && !t.odd
      );
      if (expiredTips.length > 0) {
        causes.push(`${expiredTips.length} tip(s) expirada(s)`);
        analysis = `Existem ${expiredTips.length} tip(s) expirada(s).`;
      }
      context = `Histórico de tips: ${tips.length} total, ${tips.filter((t: any) => t.status === "PROCESSING").length} em processamento`;
    } else {
      findings.push("Nenhuma tip encontrada");
      analysis = "Usuário não possui histórico de tips.";
    }
  }

  // Análise para problemas de INDICAÇÃO
  if (
    queryLower.includes("indicação") ||
    queryLower.includes("referral") ||
    queryLower.includes("indicar")
  ) {
    if (userData.referrals && userData.referrals.length > 0) {
      findings.push(`Total de indicações: ${userData.referrals.length}`);
      userData.referrals.forEach((ref: any) => {
        findings.push(
          `Indicação para ${ref.referred.displayName} - Status: ${ref.status} - Recompensa: R$ ${ref.reward}`
        );
      });
      const unfinished = userData.referrals.filter(
        (r: any) => r.status !== "FINISHED"
      );
      if (unfinished.length > 0) {
        causes.push(`${unfinished.length} indicação(ões) pendente(s)`);
        analysis = `Existem ${unfinished.length} indicação(ões) que ainda não foram finalizadas.`;
      }
      context = `Indicações: ${userData.referrals.length} total, ${userData.referrals.filter((r: any) => r.status === "FINISHED").length} finalizadas`;
    } else {
      findings.push("Nenhuma indicação encontrada");
      analysis = "Usuário não possui histórico de indicações.";
    }
  }

  return {
    issueSpecificAnalysis: analysis,
    relevantFindings:
      findings.length > 0
        ? findings
        : ["Nenhuma informação relevante encontrada"],
    potentialCauses: causes,
    contextForKnowledge: context || userQuery,
  };
};

export const userDataAnalystTool = createTool({
  id: "user-data-analyst",
  description:
    "Analyzes user data to identify account status, transaction patterns, and potential issues.",
  inputSchema: z.object({
    userId: z.string().describe("User ID to analyze"),
    userQuery: z.string().describe("Original user query for context"),
  }),
  outputSchema: z.object({
    issueSpecificAnalysis: z
      .string()
      .describe("Análise focada nos aspectos relevantes para a questão"),
    relevantFindings: z
      .array(z.string())
      .describe("Descobertas diretamente relacionadas ao problema"),
    potentialCauses: z
      .array(z.string())
      .describe("Possíveis causas identificadas nos dados"),
    contextForKnowledge: z
      .string()
      .describe("Contexto específico para consultar a base de conhecimento"),
    // Apenas transações PAYOUT para withdrawalSpecialistTool quando necessário
    payoutTransactions: z
      .array(z.any())
      .optional()
      .describe(
        "Transações PAYOUT em processamento (apenas quando houver saques)"
      ),
  }),
  execute: async ({ context, runtimeContext }) => {
    const { userId, userQuery } = context;
    const now = Date.now();

    // Verificar cache de análise
    const analysisCacheKey = getAnalysisCacheKey(userId, userQuery);
    const cachedAnalysis = analysisCache.get(analysisCacheKey);

    if (
      cachedAnalysis &&
      now - cachedAnalysis.timestamp < ANALYSIS_CACHE_TTL_MS
    ) {
      console.log(
        `Cache hit for analysis: ${analysisCacheKey.substring(0, 8)}...`
      );
      return cachedAnalysis.data;
    }

    // Buscar dados do usuário (já tem cache próprio)
    const userData = await getUserTool.execute({
      context: { userId },
      runtimeContext,
    });

    // Analisar dados diretamente sem LLM
    const analysis = analyzeUserData(userData, userQuery);

    // Extrair apenas transações PAYOUT em processamento se houver
    const payoutTransactions =
      userData.transactions?.filter(
        (t: any) => t.type === "PAYOUT" && t.status === "PROCESSING"
      ) || [];

    const result = {
      ...analysis,
      payoutTransactions:
        payoutTransactions.length > 0 ? payoutTransactions : undefined,
    };

    // Armazenar no cache de análise
    analysisCache.set(analysisCacheKey, {
      data: result,
      timestamp: now,
    });

    // Limpar entradas expiradas periodicamente
    if (analysisCache.size > 100) {
      for (const [key, entry] of analysisCache.entries()) {
        if (now - entry.timestamp >= ANALYSIS_CACHE_TTL_MS) {
          analysisCache.delete(key);
        }
      }
    }

    return result;
  },
});
