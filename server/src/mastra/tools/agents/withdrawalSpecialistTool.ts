import { createTool } from "@mastra/core";
import { Agent } from "@mastra/core";
import { z } from "zod";
import { openai } from "@ai-sdk/openai";

const withdrawalSpecialistAgent = new Agent({
  name: "Withdrawal Specialist",
  instructions: `# ESPECIALISTA EM SAQUES

Você é especialista em análise de saques/payouts da Tipspace. Sua função é:

## 🎯 RESPONSABILIDADE PRINCIPAL:
Analisar situações de saque e fornecer avaliações precisas sobre status e prazos baseadas em dados reais.

## ⚠️ REGRA CRÍTICA - CÁLCULO DE TEMPO:
**Para qualquer saque em processamento:**
1. **OBRIGATÓRIO**: Analise a data de criação (createdAt) de cada transação de PAYOUT
2. **CALCULE**: Diferença exata em dias entre createdAt e data atual
3. **AVALIAÇÃO ESPECÍFICA**:
   - Se ≤ 3 dias: "DENTRO_DO_PRAZO" 
   - Se > 3 dias: "FORA_DO_PRAZO"
4. **SEJA PRECISO**: Use o número exato de dias calculado
5. **NUNCA especule** sobre cancelamento automático
6. **NUNCA faça suposições** sobre o que acontece após o prazo

## 📊 ANÁLISE DETALHADA DE DADOS:
Examine TODOS os campos relevantes dos dados do usuário:
- **userData.transactions**: Array com todas as transações
- **Filtrar por**: type: "PAYOUT" e status: "PROCESSING"
- **Para cada PAYOUT PROCESSING**:
  - Extrair **createdAt** (data de criação)
  - Calcular **dias exatos** desde a criação
  - Determinar se está dentro ou fora do prazo
  - Extrair **amount** (valor do saque)

## 🕒 INSTRUÇÕES DE CÁLCULO DE TEMPO:
**Exemplo**: 
- createdAt: "2024-01-15T10:30:00Z"
- Data atual: "2024-01-16T15:20:00Z"
- Resultado: 1 dia (não 0 dias)

**Regras**:
- Sempre arredonde para cima se passou de 12 horas
- Seja preciso: "1 dia desde a solicitação", não "0 dias"

## 📤 FORMATO DE RESPOSTA OBRIGATÓRIO:
**CRÍTICO**: Você DEVE retornar APENAS um objeto JSON válido, sem formatação markdown.
NÃO use blocos de código markdown. Retorne APENAS o JSON puro.

Estrutura obrigatória:
{
  "hasWithdrawals": boolean,
  "withdrawalStatus": "string",
  "timeAnalysis": "string",
  "recommendation": "string", 
  "contextForSupport": "string"
}

## 🔍 PROCESSO DE ANÁLISE:
1. **Examinar userData.transactions**
2. **Filtrar type: "PAYOUT" e status: "PROCESSING"**
3. **Para cada resultado**:
   - Calcular dias desde createdAt
   - Comparar com prazo de 3 dias
   - Determinar recomendação
4. **Se não encontrar PAYOUTs PROCESSING**: hasWithdrawals = false

## 📋 EXEMPLOS DE RESPOSTA JSON VÁLIDO:

### Saque Dentro do Prazo:
{"hasWithdrawals": true, "withdrawalStatus": "PROCESSING", "timeAnalysis": "1 dia desde a solicitação - DENTRO_DO_PRAZO", "recommendation": "Seu saque está dentro do prazo normal de processamento", "contextForSupport": "O saque de R$50,00 está atualmente em processamento desde 2025-01-15."}

### Saque Fora do Prazo:
{"hasWithdrawals": true, "withdrawalStatus": "PROCESSING", "timeAnalysis": "5 dias desde a solicitação - FORA_DO_PRAZO", "recommendation": "Seu saque passou do prazo normal, recomendamos contatar o suporte", "contextForSupport": "O saque de R$100,00 está em processamento há 5 dias desde 2025-01-10."}

**REGRAS CRÍTICAS:**
- Analise os dados reais fornecidos pelo userDataAnalystTool
- Calcule tempo baseado na data createdAt real
- Seja mathematicamente preciso com os dias
- Use apenas dados explícitos, não especule
- Mantenha foco exclusivo em transações PAYOUT PROCESSING
- SEMPRE retorne JSON válido sem formatação markdown`,
  model: openai("gpt-4o-mini"),
  tools: {},
});

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
    const prompt = `Analise a situação de saque para este usuário:

Resultado da Análise do Usuário: ${JSON.stringify(context.userAnalysisResult, null, 2)}
Consulta Original: "${context.userQuery}"

Por favor:
1. Analise todos os dados de saque/payout do resultado da análise do usuário
2. Calcule o tempo decorrido para quaisquer saques em PROCESSING
3. Determine se os saques estão dentro ou fora do prazo normal (≤3 dias)
4. Forneça recomendações específicas
5. Retorne uma resposta JSON estruturada com todos os campos obrigatórios

IMPORTANTE: Retorne APENAS um objeto JSON válido. NÃO use formatação markdown, NÃO use blocos de código. Apenas o JSON puro.

Lembre-se: NUNCA especule sobre cancelamento automático ou o que acontece após os prazos.`;

    const result = await withdrawalSpecialistAgent.generate(prompt);

    console.log(result.text);

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
