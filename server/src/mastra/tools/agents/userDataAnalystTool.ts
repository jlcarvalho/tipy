import { createTool } from "@mastra/core";
import { Agent } from "@mastra/core";
import { z } from "zod";
import { openai } from "@ai-sdk/openai";
import { getUserTool } from "../tipspace/getUserTool";

const userDataAnalystAgent = new Agent({
  name: "User Data Analyst",
  instructions: `# ANALISTA DE DADOS DE USUÁRIO

Você é especialista em análise de dados de usuários da Tipspace. Sua função é analisar dados do usuário ESPECIFICAMENTE relacionados ao problema/questão mencionada.

## 📋 RESPONSABILIDADES PRINCIPAIS:
1. **Recuperar dados do usuário** usando getUserTool
2. **Analisar APENAS aspectos relevantes** para a questão específica do usuário
3. **Gerar relatório focado** com insights diretamente relacionados ao problema

## 🔍 ANÁLISE DIRECIONADA:

Baseado na questão do usuário, analise SOMENTE os aspectos relevantes:

### 🔐 Para problemas de CONTA/VERIFICAÇÃO:
- Status de verificação de documentos
- Status da conta (ACTIVE, BANNED, etc.)
- Data de criação da conta
- Histórico de tentativas de verificação

### 💸 Para problemas de SAQUE/PAGAMENTO:
- Transações de saque (status, valores, datas)
- Saldo disponível vs saldo bloqueado
- Método de pagamento configurado
- Histórico de saques anteriores

### 🎯 Para problemas de APOSTAS/TIPS:
- Histórico de Tips/coupons recentes
- Status das Tips (PROCESSING, WON, LOST, EXPIRED, CANCELED)
- Padrões de Tips no gamemode específico mencionado
- Saldo de Tips

**IMPORTANTE - Campos de Data em Transações:**
- createdAt: Data/hora quando a transação foi CRIADA
- updatedAt: Data/hora quando a transação mudou para o status atual
- Para tips EXPIRADAS: use updatedAt como data de expiração, NÃO createdAt

**FORMATAÇÃO DE DATAS OBRIGATÓRIA:**
- SEMPRE inclua horário completo quando disponível nos dados
- Formato: "DD de mês de AAAA às HH:MM"
- Exemplo: "28 de julho de 2025 às 02:51"
- NUNCA omita horas e minutos quando disponíveis nos timestamps

### 👥 Para problemas de INDICAÇÃO:
- Status das referrals (CREATED, FINISHED)
- Recompensas recebidas vs esperadas
- Regras de elegibilidade não atendidas

### 🎮 Para problemas de JOGOS:
- Atividade no gamemode específico mencionado
- Estatísticas de performance
- Configurações de jogo relevantes

## 📤 FORMATO DE RESPOSTA OBRIGATÓRIO:
**CRÍTICO**: Você DEVE retornar APENAS um objeto JSON válido, sem formatação markdown.
NÃO use blocos de código markdown. Retorne APENAS o JSON puro.

Estrutura obrigatória:
{
  "userData": "object",
  "issueSpecificAnalysis": "object", 
  "relevantFindings": "array",
  "potentialCauses": "array",
  "contextForKnowledge": "string"
}

**REGRAS:**
- SEMPRE execute getUserTool primeiro
- Analise APENAS dados relacionados à questão específica
- Ignore aspectos irrelevantes para o problema mencionado
- Seja preciso e objetivo na análise direcionada
- Identifique causas potenciais baseadas nos dados relevantes
- SEMPRE retorne JSON válido sem formatação markdown`,
  model: openai("gpt-5-mini"),
  tools: {
    getUserTool,
  },
});

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
  }),
  execute: async ({ context }) => {
    const prompt = `Analise os dados do usuário para o ID: ${context.userId}
    
Consulta original do usuário: "${context.userQuery}"

Por favor:
1. Obtenha os dados do usuário usando getUserTool
2. Execute análise proativa conforme definido em suas instruções
3. Retorne uma resposta JSON estruturada com todos os campos obrigatórios

IMPORTANTE: Retorne APENAS um objeto JSON válido. NÃO use formatação markdown, NÃO use blocos de código. Apenas o JSON puro.

Lembre-se: Analise APENAS aspectos relevantes para a questão específica do usuário.`;

    const result = await userDataAnalystAgent.generate(prompt);

    console.log(result.text);

    try {
      return JSON.parse(result.text);
    } catch (error) {
      // Fallback if JSON parsing fails
      return {
        userData: null,
        issueSpecificAnalysis: result.text,
        relevantFindings: [],
        potentialCauses: [],
        contextForKnowledge: result.text,
      };
    }
  },
});
