import { z } from "zod";

export const referredSchema = z.object({
  displayName: z.string(),
  matchesFinished: z.number(),
});

export const outputSchema = z.object({
  banned: z.boolean(),
  user: z.object({
    name: z.string(),
    createdAt: z.string(),
    verifiedDocument: z.boolean(),
    verifiedDocNumber: z.boolean(),
    status: z.string(),
  }),
  referrals: z.array(
    z.object({
      createdAt: z.string(),
      referred: referredSchema,
      reward: z.string(),
      transactionAmount: z.string(),
      status: z.string(),
    })
  ),
  transactions: z.array(
    z.object({
      createdAt: z.string(),
      type: z.string(),
      status: z.string(),
      amount: z.string(),
      odd: z.string(),
      criteriaLabel: z.string(),
      gamemode: z.string(),
    })
  ),
});
