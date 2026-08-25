/**
 * Shapes returned by the Trade-Agent API.
 *
 * `lib/api.ts` returns loosely-typed responses, so these live here and are
 * applied at the call site — enough structure for the screens to be safe
 * without pretending the client validates anything.
 */

export type ExecutionMode = "paper" | "approval" | "auto";

export interface TradePolicy {
  mode: ExecutionMode;
  killSwitch: boolean;
  maxOrderValue: number;
  maxDailyLoss: number;
  maxOpenPositions: number;
  allowedSegments: string[];
  allowNakedOptions: boolean;
  marginBuffer: number;
  maxTokensPerRun: number;
  maxTokensPerDay: number;
}

export interface CircuitBreakerState {
  consecutiveFailures: number;
  threshold: number;
  open: boolean;
}

export interface SessionInfo {
  istDate: string;
  phase: string;
  tradingDay: boolean;
  weekend: boolean;
  holiday: boolean;
  marketOpen: boolean;
  holidayListConfigured: boolean;
  warning: string | null;
}

export interface BrokerPosition {
  trading_symbol?: string;
  quantity?: number;
  net_price?: number;
  realised_pnl?: number;
  product?: string;
  exchange?: string;
  segment?: string;
}

export interface BrokerHolding {
  trading_symbol?: string;
  quantity?: number;
  average_price?: number;
}

export interface PositionSnapshot {
  id: string;
  capturedAt: string;
  positions: BrokerPosition[];
  holdings: BrokerHolding[];
  margin: { clear_cash?: number; net_margin_used?: number };
  realisedPnl: number;
  unrealisedPnl: number;
  openPositionCount: number;
}

export interface DeskOverview {
  ready: boolean;
  blockers: string[];
  mode: ExecutionMode;
  policy: TradePolicy;
  session: SessionInfo;
  gemini: {
    configured: boolean;
    masterModel: string;
    workerModel: string;
    status: string;
    reason: string;
  };
  groww: {
    configured: boolean;
    canSelfRenew: boolean;
    authFlow: string;
    tokenValid: boolean;
    tokenExpiresAt: string | null;
    status: string;
    reason: string;
  };
  instruments: { size: number; loadedAt: string | null; ready: boolean };
  circuitBreaker: CircuitBreakerState;
  running: boolean;
  snapshot: PositionSnapshot | null;
  tokens: {
    spentToday: number;
    dailyBudget: number;
    perRunBudget: number;
  };
}

export interface WorkerSummary {
  worker: string;
  status: string;
  durationMs: number;
  signals: number;
  summary: string;
  error?: string;
}

export interface TradeAgentRun {
  id: string;
  trigger: string;
  mode: ExecutionMode;
  status: string;
  startedAt: string;
  finishedAt?: string;
  iterations: number;
  tokenUsage: Record<string, number>;
  workerSummaries: WorkerSummary[];
  summary?: string;
  error?: string;
}

export interface AgentMessage {
  id: string;
  runId: string;
  agent: string;
  seq: number;
  model: string;
  request: Record<string, unknown>;
  responseContent: Record<string, unknown>[];
  stopReason?: string;
  usage: Record<string, number>;
  durationMs: number;
  error?: string;
}

export interface TradeSignal {
  id: string;
  worker: string;
  tradingSymbol: string;
  direction: string;
  horizon: string;
  confidence: number;
  rationale: string;
}

export interface RiskGate {
  gate: string;
  passed: boolean;
  message: string;
}

export interface OrderIntent {
  id: string;
  runId: string;
  tradingSymbol: string;
  exchange: string;
  segment: string;
  transactionType: "BUY" | "SELL";
  orderType: string;
  product: string;
  validity: string;
  quantity: number;
  price: number;
  triggerPrice: number;
  notional: number;
  rationale: string;
  status: string;
  statusReason?: string;
  riskVerdict?: { approved: boolean; gates: RiskGate[]; blockedBy?: string };
  createdAt: string;
}

export interface TradeOrder {
  id: string;
  intentId: string;
  growwOrderId?: string;
  simulated: boolean;
  tradingSymbol: string;
  segment: string;
  product: string;
  transactionType: "BUY" | "SELL";
  quantity: number;
  price: number;
  status: string;
  filledQuantity: number;
  averagePrice: number;
  placedAt?: string;
}

export interface RunDetail {
  run: TradeAgentRun;
  transcript: AgentMessage[];
  signals: TradeSignal[];
  intents: OrderIntent[];
}

export interface PolicyResponse {
  policy: TradePolicy;
  circuitBreaker: CircuitBreakerState;
  session: SessionInfo;
}

export interface DecisionResult {
  skipped?: boolean;
  reason?: string;
  simulated?: boolean;
}

export interface ReconcileResult {
  skipped: boolean;
  reason?: string;
  checked?: number;
  updated?: number;
}

export interface RunStartResult {
  started: boolean;
  runId?: string;
  status?: string;
  summary?: string;
  reason?: string;
}

/** Total across the usage buckets we record per run. */
export function totalTokens(usage: Record<string, number> | undefined) {
  return Object.values(usage || {}).reduce(
    (sum, value) => sum + Number(value || 0),
    0,
  );
}
