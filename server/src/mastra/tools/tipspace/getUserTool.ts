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

export const getUserData = async (userId: string) => {
  // Verificar cache
  const cached = cache.get(userId);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    console.log(`Cache hit for ${userId}`);
    return cached.data;
  }

  console.log(`Fetching user data for ${userId}...`);

  try {
    const { data } = await api.get<ISearchUserResponse>(`/users/search`, {
      params: { q: userId },
    });

    console.log(`Fetched ${data.transactions?.length || 0} transactions`);

    // Ensure all required fields are present with defaults
    const response = {
      banned: data.banned ?? false,
      user: {
        name: data.user?.firstname || "",
        createdAt: data.user?.createdAt || "",
        verifiedDocument: data.user?.verifiedDocument ?? false,
        verifiedDocNumber: data.user?.verifiedDocNumber ?? false,
        status: data.user?.status || "",
      },
      referrals: (data.referrals || []).map(
        ({ createdAt, referred, reward, transactionAmount, status }) => ({
          createdAt: createdAt || "",
          referred: referred || { displayName: "", matchesFinished: 0 },
          reward: reward || "",
          transactionAmount: transactionAmount || "",
          status: status || "",
        })
      ),
      transactions: (data.transactions || []).map(
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
          createdAt: createdAt || "",
          updatedAt: updatedAt || "",
          type: type || "",
          status:
            status === "FINISHED" &&
            isNull(coupon?.couponItems?.[0]?.externalMatchId)
              ? "EXPIRED"
              : status || "",
          amount: amount || "",
          odd: coupon?.odd || "",
          criteriaLabel: criteriaLabel || "",
          gamemode: gamemode || "",
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
  } catch (error: any) {
    console.error(`Error fetching user data for ${userId}:`, error);
    throw new Error(
      `Failed to fetch user data: ${error?.message || "Unknown error"}`
    );
  }
};

export const getUserTool = createTool({
  id: "getUserTool",
  description: `Fetches the user information for a given User id (that can be an uuid or email)`,
  inputSchema: z.object({
    userId: z.string().describe("User id"),
  }),
  outputSchema: outputSchema,
  execute: async ({ userId }) => {
    if (!userId) {
      throw new Error("userId is required");
    }
    console.log("Using tool to fetch user information for", userId);
    return await getUserData(userId);
  },
});
