export interface Position {
  id: string;
  pair: string;
  tokenA: string;
  tokenB: string;
  liquidity: number;
  value: number;
  change24h: number;
  apy: number;
  feesEarned: number;
  binRange: {
    lower: number;
    upper: number;
    active: number;
  };
  distribution: {
    tokenA: number;
    tokenB: number;
  };
  strategy: string;
  lastRebalance: string;
  health: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  
  // Additional properties for Saros API compatibility
  totalLiquidity: number;
  fees24h: number;
  feesTotal: number;
  currentAPY: number;
  impermanentLoss?: number;
  priceRange: {
    min: number;
    max: number;
    current: number;
  };
  binCount: number;
  binDistribution: BinDistribution[];
  rawPosition?: any;
  
  // Properties used in sarosApiService
  pairName: string;
  tokenX: string;
  tokenY: string;
  lowerBinId: number;
  upperBinId: number;
  unclaimedFees: number;
  currentValue: number;
  pnl: number;
  pnlPercentage: number;
  apr: number;
}

export interface BinDistribution {
  id: number;
  binId: number;
  price: number;
  liquidityX: number;
  liquidityY: number;
  feeAPR: number;
  percentage?: number;
}

export interface PerformanceDataPoint {
  date: string;
  value: number;
  fees: number;
  il?: number;
}

export interface PortfolioData {
  totalValue: number;
  totalValueChange: number;
  totalFeesEarned: number;
  totalIL?: number;
  totalPnL?: number;
  totalPnLPercentage?: number;
  avgApy: number;
  positions: Position[];
  performanceData: PerformanceDataPoint[];
  summary?: {
    totalActivePositions: number;
    totalUnclaimedFees: number;
    averageAPR: number;
  };
}

export interface RebalanceRecommendation {
  id?: string;
  positionId: string;
  type: 'rebalance' | 'expand' | 'narrow' | 'exit';
  priority: 'high' | 'medium' | 'low';
  reason: string;
  expectedImpact: {
    feesIncrease: number;
    ilReduction: number;
    confidenceScore: number;
  };
  suggestedAction: string;
  executionParams?: {
    type: 'shift_up' | 'shift_down' | 'add_liquidity';
    currentRange?: PriceRange;
    suggestedRange?: PriceRange;
  };
}

export interface PriceRange {
  min: number;
  max: number;
  lowerBinId?: number;
  upperBinId?: number;
}

export interface WalletState {
  connected: boolean;
  publicKey: string | null;
  connecting: boolean;
  error?: string | null;
}

export interface MarketData {
  tokenA: {
    symbol: string;
    price: number;
    change24h: number;
  };
  tokenB: {
    symbol: string;
    price: number;
    change24h: number;
  };
  volume24h: number;
  tvl: number;
  feeRate: number;
}

export interface SimulationResult {
  strategy: string;
  expectedReturn: number;
  riskScore: number;
  timeHorizon: string;
  confidence: number;
  details: {
    feesProjected: number;
    ilProjected: number;
    capitalEfficiency: number;
  };
}

export interface StrategySimulationResult {
  strategy: string;
  expectedReturn: number;
  timeHorizon: string;
  confidence: number;
  details: {
    feesProjected: number;
    ilProjected: number;
    capitalEfficiency: number;
  };
  riskScore?: number;
  risk?: number;
}

export type StrategyType = 'narrow' | 'wide' | 'balanced';

export interface HistoricalPriceData {
  timestamp: number;
  price: number;
  volume: number;
  liquidity: number;
}

export interface ISarosService {
  getPortfolioData(publicKey: any): Promise<PortfolioData>;
  generateRebalanceRecommendations(positions: Position[]): Promise<RebalanceRecommendation[]>;
  simulateStrategy(
    position: Position,
    strategy: StrategyType,
    timeHorizon?: string,
    marketConditions?: any
  ): Promise<StrategySimulationResult>;
  executeRebalance(recommendation: RebalanceRecommendation): Promise<string>;
  getHistoricalData(pair: string, timeframe: string): Promise<HistoricalPriceData[]>;
}

export interface WalletAdapter {
  publicKey: any;
  connected: boolean;
  signTransaction: (transaction: any) => Promise<any>;
  signAllTransactions: (transactions: any[]) => Promise<any[]>;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

// SDK type declarations
declare module '@saros-finance/sdk' {
  export default class SarosSDK {
    constructor(connection: any);
  }
}

declare module '@saros-finance/dlmm-sdk' {
  export class LiquidityBookServices {
    constructor();
  }
  
  export const ACTIVE_ID: any;
  export const BASE_FACTOR: any;
  export const BASIS_POINT_MAX: any;
  export const BIN_ARRAY_INDEX: any;
  export const BIN_ARRAY_SIZE: any;
  export const BIN_STEP: any;
  export const BIN_STEP_CONFIGS: any;
  export const CCU_LIMIT: any;
  export const CONFIG: any;
  export const DECAY_PERIOD: any;
  export const FILTER_PERIOD: any;
  export const FIXED_LENGTH: any;
  export enum LiquidityShape {}
  export const MAX_BASIS_POINTS: any;
  export const MAX_VOLATILITY_ACCUMULATOR: any;
  export const MODE: any;
  export const ONE: any;
  export const PRECISION: any;
  export const PROTOCOL_SHARE: any;
  export const REDUCTION_FACTOR: any;
  export const REWARDS_DURATION: any;
  export const REWARDS_PER_SECOND: any;
  export enum RemoveLiquidityType {}
  export const SCALE_OFFSET: any;
  export const START_TIME: any;
  export const UNIT_PRICE_DEFAULT: any;
  export const VARIABLE_FEE_CONTROL: any;
  export const VARIABLE_FEE_PRECISION: any;
  export const WRAP_SOL_ADDRESS: any;
  export const __esModule: any;
  export function createUniformDistribution(...args: any[]): any;
  export function findPosition(...args: any[]): any;
  export function getBinRange(...args: any[]): any;
  export function getGasPrice(...args: any[]): any;
  export function getMaxBinArray(...args: any[]): any;
  export function getMaxPosition(...args: any[]): any;
}