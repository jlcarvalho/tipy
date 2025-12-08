import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { api } from "../../../libs/axios";
import { ISearchUserResponse } from "./types";
import { outputSchema } from "./outputSchema";
import isNull from "lodash/isNull.js";

// Cache em memória com TTL de 5 minutos
interface CacheEntry {
  data: any;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos (otimizado para melhor performance)

const getUserData = async (userId: string) => {
  // Verificar cache
  const cached = cache.get(userId);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    console.log(`Cache hit for ${userId}`);
    return cached.data;
  }

  console.log(`Fetching last coupons for ${userId}...`);

  const { data } = await api.get<ISearchUserResponse>(`/users/search`, {
    params: { q: userId },
  });

  console.log(data.transactions);

  const response = {
    banned: data.banned,
    user: {
      name: data.user.firstname,
      createdAt: data.user.createdAt,
      verifiedDocument: data.user.verifiedDocument,
      verifiedDocNumber: data.user.verifiedDocNumber,
      status: data.user.status,
    },
    referrals: data.referrals.map(
      ({ createdAt, referred, reward, transactionAmount, status }) => ({
        createdAt,
        referred,
        reward,
        transactionAmount,
        status,
      })
    ),
    transactions: data.transactions.map(
      ({
        createdAt,
        updatedAt,
        type,
        status,
        amount,
        criteriaLabel,
        couponGamemode: gamemode,
        coupon,
      }) => ({
        createdAt,
        updatedAt,
        type,
        status:
          status === "FINISHED" &&
          isNull(coupon?.couponItems[0]?.externalMatchId)
            ? "EXPIRED"
            : status,
        amount,
        odd: coupon?.odd,
        criteriaLabel,
        gamemode,
      })
    ),
  };

  // Armazenar no cache
  cache.set(userId, {
    data: response,
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

  return response;
};

export const getUserTool = createTool({
  id: "Get User Information",
  description: `Fetches the user information for a given email`,
  inputSchema: z.object({
    userId: z.string().describe("User id"),
  }),
  outputSchema: outputSchema,
  execute: async ({ context: { userId } }) => {
    console.log("Using tool to fetch weather information for", userId);
    return await getUserData(userId);
  },
});
