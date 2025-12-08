import { createVectorQueryTool } from "@mastra/rag";
import { createTool } from "@mastra/core";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import crypto from "crypto";

// Tool base sem cache
const baseTipyQueryTool = createVectorQueryTool({
  vectorStoreName: "pgVector",
  indexName: "tipy",
  model: openai.embedding("text-embedding-3-small"),
  enableFilter: true,
  maxResults: 5,
});

// Cache em memória com TTL de 60 segundos
interface CacheEntry {
  data: any;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 1000; // 60 segundos

// Função para gerar hash da query
const hashQuery = (query: string): string => {
  return crypto
    .createHash("sha256")
    .update(query.toLowerCase().trim())
    .digest("hex");
};

// Wrapper com cache
export const tipyQueryTool = createTool({
  id: baseTipyQueryTool.id,
  description: baseTipyQueryTool.description,
  inputSchema: baseTipyQueryTool.inputSchema,
  outputSchema: baseTipyQueryTool.outputSchema,
  execute: async (context) => {
    // Gerar hash do contexto completo para usar como chave do cache
    // Ordenar chaves para garantir consistência
    const contextStr = JSON.stringify(
      context.context || context,
      Object.keys(context.context || context).sort()
    );
    const cacheKey = hashQuery(contextStr);
    const now = Date.now();

    // Verificar cache
    const cached = cache.get(cacheKey);
    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      console.log(`Cache hit for vector query: ${cacheKey.substring(0, 8)}...`);
      return cached.data;
    }

    // Executar query original
    const result = await baseTipyQueryTool.execute(context);

    // Armazenar no cache
    cache.set(cacheKey, {
      data: result,
      timestamp: now,
    });

    // Limpar entradas expiradas periodicamente (apenas para evitar vazamento de memória)
    if (cache.size > 100) {
      for (const [key, entry] of cache.entries()) {
        if (now - entry.timestamp >= CACHE_TTL_MS) {
          cache.delete(key);
        }
      }
    }

    return result;
  },
});
