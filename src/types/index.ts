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
  
  // Additional properties that the service expects
  totalLiquidity: number;
  fees24h: number;
  feesTotal: number;
  currentAPY: number;
  impermanentLoss?: number;
  priceRange: {
    min: number;
    max: number;
    current: number;  // Make current required instead of optional
  };
  binCount: number;
  binDistribution: BinDistribution[];
  rawPosition?: any; // For SDK position data
}

export interface BinDistribution {
  id: number;
  price: number;
  liquidityX: number;
  liquidityY: number;
  feeAPR: number;
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
  avgApy: number;
  positions: Position[];
  performanceData: PerformanceDataPoint[];
}

export interface RebalanceRecommendation {
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
}

export interface WalletState {
  connected: boolean;
  publicKey: string | null;
  connecting: boolean;
  error: string | null;
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
}

// Wallet adapter type (simplified)
export interface WalletAdapter {
  publicKey: any;
  connected: boolean;
  signTransaction: (transaction: any) => Promise<any>;
  signAllTransactions: (transactions: any[]) => Promise<any[]>;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

// SDK type declarations - Fix export issues
declare module '@saros-finance/sdk' {
  class SarosSDK {
    constructor(connection: any);
    // Add other methods as they become available
  }
}

declare module '@saros-finance/dlmm-sdk' {
  export class LiquidityBookServices {
    constructor();
    // Add DLMM methods as they become available
  }
  
  // Other available exports based on the error message
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
  export enum LiquidityShape {
    // Add enum values as needed
  }
  export const MAX_BASIS_POINTS: any;
  export const MAX_VOLATILITY_ACCUMULATOR: any;
  export const MODE: any;
  export const ONE: any;
  export const PRECISION: any;
  export const PROTOCOL_SHARE: any;
  export const REDUCTION_FACTOR: any;
  export const REWARDS_DURATION: any;
  export const REWARDS_PER_SECOND: any;
  export enum RemoveLiquidityType {
    // Add enum values as needed
  }
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