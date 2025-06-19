export interface ISearchUserResponse {
  success: boolean;
  user: User;
  transactions: Transaction[];
  matches: Match[];
  referrals: Referral[];
  banned: boolean;
}

export interface User {
  id: string;
  createdAt: string;
  updatedAt: string;
  email: string;
  firstname: string;
  lastname: string;
  tel: string;
  docNumber: string;
  docType: string;
  region: string;
  birthday: string;
  displayName: string;
  verifiedDocument: boolean;
  verifiedDocumentAt: string;
  verifiedDocNumber: boolean;
  firstLogin: string;
  events: string[];
  affiliateRef: any;
  customerId: string;
  subscriptionToken: string;
  subscriptionTokenExpiryAt: string;
  userHadTrial: boolean;
  withoutDocumentValidation: boolean;
  gamerSaferGuildMemberId: any;
  surveySentAt: string;
  surveySent: boolean;
  bonusRolloverSentAt: any;
  bonusRolloverSent: boolean;
  firstPayInMade: boolean;
  termsRead: boolean;
  beAnonymous: boolean;
  hasSuperTipAvailable: boolean;
  twilioOptOut: boolean;
  status: string;
  account: Account;
}

export interface Account {
  id: string;
  createdAt: string;
  updatedAt: string;
  type: string;
  name: any;
  userId: string;
}

export interface Transaction {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  type: string;
  coupon: Coupon;
  criteriaLabel: string;
  couponGamemode: string;
  metadata: Metadata;
  operation: string;
  amount: string;
  description: any;
  reprocessMatchAvailable: ReprocessMatchAvailable;
}

export interface Coupon {
  amount: string;
  odd: string;
  type: string;
  id: string;
  status: string;
  couponItems: CouponItem[];
}

export interface CouponItem {
  challenge: Challenge;
  externalMatchId?: string;
}

export interface Challenge {
  name: string;
  params: Params;
  gamemode: any;
  externalGamemode: string;
  type: string;
  isSuperTip: boolean;
  id: string;
}

export interface Params {
  TOP4?: any[];
  VICTORY?: any[];
}

export interface Metadata {
  amount: string;
  prizePool: string;
  entryFee: string;
  aditionalMatchInfo: AditionalMatchInfo;
}

export interface AditionalMatchInfo {
  individualPrizePool: string;
}

export interface ReprocessMatchAvailable {
  status: boolean;
  error: string;
}

export interface Match {
  gamemode: string;
  matches: any[];
}

export interface Referral {
  createdAt: string;
  updatedAt: string;
  referrerId: string;
  referredId: string;
  type: string;
  reward: string;
  referredReward: string;
  minMatches: number;
  status: string;
  transactionAmount: string;
  version: string;
  referred: Referred;
}

export interface Referred {
  displayName: string;
  matchesFinished: number;
}
