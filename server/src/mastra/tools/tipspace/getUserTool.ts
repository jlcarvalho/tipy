import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { api } from "../../../libs/axios";
import { ISearchUserResponse } from "./types";
import { outputSchema } from "./outputSchema";
import isNull from "lodash/isNull";

const getUserData = async (userId: string) => {
  console.log(`Fetching last coupons for ${userId}...`);

  const { data } = await api.get<ISearchUserResponse>(`/users/search`, {
    params: { q: userId },
  });

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
        type,
        status,
        amount,
        criteriaLabel,
        couponGamemode: gamemode,
        coupon,
      }) => ({
        createdAt,
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
