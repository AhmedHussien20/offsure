export interface AdminDashboardResponse {
  generatedAtUtc: string;
  platformHealth: {
    totalActiveCustomerProfiles: number;
    totalActiveCustomerUsers: number;
    totalValueDisbursedTodayZmw: number;
    indicator: 'GREEN' | 'AMBER' | 'RED' | string;
    health: {
      apiOk: boolean;
      redisOk: boolean;
      kafkaOk: boolean;
      vault: { status: string };
    };
  };
  batches: {
    total: number;
    totalAmountAllTime: number;
  };
  deadLetter: {
    total: number;
    last24Hours: number;
    topReasons: { reason: string; count: number }[];
  };
  reconciliation: {
    totalRuns: number;
    latest?: {
      id: number;
      batchId: number;
      runAtUtc: string;
      status: string;
      l1Variance: number;
      l2Variance: number;
    } | null;
  };

  paymentActivity: {
    batchesToday: number;
    valueTodayZmw: number;
    successRatePct: number;
    failedItemsRequiringAttention: number;
  };

  alertsStrip: {
    deadLetterCount: number;
    hmacCallbackFailuresLast24h: number;
    lockedUsers: number;
    batchesPendingApprovalOver4h: { batchId: number; customerName: string; submittedAtUtc: string; minutesWaiting: number }[];
  };
}

