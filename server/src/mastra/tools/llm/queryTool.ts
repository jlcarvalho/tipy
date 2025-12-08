import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import crypto from "crypto";
import { pgVector } from "../../storage";
import { embed } from "ai";
import { openai } from "@ai-sdk/openai";

// Cache em memória com TTL de 10 minutos
interface CacheEntry {
  data: any;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos (otimizado para melhor performance)

// Função para gerar hash da query
const hashQuery = (query: string): string => {
  return crypto
    .createHash("sha256")
    .update(query.toLowerCase().trim())
    .digest("hex");
};

// Implementação manual do tipyQueryTool
export const tipyQueryTool = createTool({
  id: "tipyQueryTool",
  description: "Access the knowledge base to find information needed to answer user questions.",
  inputSchema: z.object({
    queryText: z.string().describe("The search query"),
    topK: z.number().optional().default(10).describe("Number of top results to retrieve"),
    filter: z.record(z.any()).optional().describe("Filter for the query"),
  }),
  outputSchema: z.any(),
  execute: async (context) => {
    const { queryText, topK = 10, filter } = context;

    // Gerar hash do contexto completo para usar como chave do cache
    // Ordenar chaves para garantir consistência
    const contextStr = JSON.stringify(
      { queryText, topK, filter },
      Object.keys({ queryText, topK, filter }).sort()
    );
    const cacheKey = hashQuery(contextStr);
    const now = Date.now();

    // Verificar cache
    const cached = cache.get(cacheKey);
    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      console.log(`Cache hit for vector query: ${cacheKey.substring(0, 8)}...`);
      return cached.data;
    }

    try {
      // 1. Gerar embedding da query usando o mesmo modelo da ingestão
      const { embedding } = await embed({
        model: openai.embedding("text-embedding-3-small"),
        value: queryText,
      });

      // 2. Consultar o vector store diretamente
      const results = await pgVector.query({
        indexName: "tipy",
        queryVector: embedding,
        topK: topK,
        filter: filter as any
      });

      // Armazenar no cache
      cache.set(cacheKey, {
        data: results,
        timestamp: now,
      });

      // Limpar entradas expiradas
      if (cache.size > 100) {
        for (const [key, entry] of cache.entries()) {
          if (now - entry.timestamp >= CACHE_TTL_MS) {
            cache.delete(key);
          }
        }
      }

      return results;
    } catch (error) {
      console.error("Error executing vector query:", error);
      throw error;
    }
  },
});
