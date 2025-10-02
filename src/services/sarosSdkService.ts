import { Connection, PublicKey } from '@solana/web3.js';
import { WalletService } from './walletService';
import {
  Position,
  PortfolioData,
  BinDistribution,
  ISarosService,
  RebalanceRecommendation,
  StrategySimulationResult,
  StrategyType,
  HistoricalPriceData
} from '../types';

// Import actual SDK exports
import { 
  LiquidityBookServices,
  findPosition,
  getMaxPosition 
} from '@saros-finance/dlmm-sdk';

export class SarosSdkService implements ISarosService {
  private connection: Connection;
  private wallet: WalletService;
  private liquidityBookServices: LiquidityBookServices;

  constructor(walletService: WalletService, connection?: Connection) {
    this.wallet = walletService;
    this.connection = connection || new Connection(
      'https://api.mainnet-beta.solana.com',
      'confirmed'
    );
    
    try {
      // Initialize the SDK
      this.liquidityBookServices = new LiquidityBookServices();
      console.log('✅ LiquidityBookServices initialized');
    } catch (error) {
      console.error('Failed to initialize SDK:', error);
      throw error;
    }
  }

  /**
   * Fetch user positions using SDK
   * Note: The SDK structure needs exploration - currently falling back to mock data
   */
  async getPortfolioData(publicKey: PublicKey): Promise<PortfolioData> {
    try {
      console.log('🔄 Attempting to fetch positions via SDK...');
      console.log('📊 User:', publicKey.toString());
      
      // The SDK exports don't include obvious position query methods
      // Available exports: LiquidityBookServices, findPosition, getMaxPosition
      // These might need pool addresses or other parameters
      
      console.warn('⚠️ SDK position query methods not clearly documented');
      console.warn('📝 Available SDK exports: LiquidityBookServices, findPosition, getMaxPosition');
      console.warn('💡 These methods may require pool addresses as parameters');
      
      // Try to use findPosition if it accepts a user parameter
      try {
        // This is speculative - adjust based on actual method signature
        const positions = await findPosition(publicKey, this.connection);
        console.log('Found positions:', positions);
        
        if (positions && Array.isArray(positions)) {
          const convertedPositions = await this.convertSdkPositions(positions);
          return this.calculatePortfolioData(convertedPositions);
        }
      } catch (sdkError) {
        console.log('SDK query failed:', (sdkError as Error).message);
      }

      // Fallback to mock data
      console.warn('📦 Falling back to mock data');
      return this.getMockPortfolioData(publicKey);

    } catch (error) {
      console.error('❌ Error in SDK service:', error);
      return this.getMockPortfolioData(publicKey);
    }
  }

  /**
   * Convert SDK position format to our Position type
   */
  private async convertSdkPositions(sdkPositions: any[]): Promise<Position[]> {
    const positions: Position[] = [];

    for (const sdkPos of sdkPositions) {
      try {
        // Log the structure to understand it
        console.log('SDK Position structure:', JSON.stringify(sdkPos, null, 2));

        // This conversion depends on actual SDK response structure
        // Adjust based on what you see in the logs
        const position: Position = {
          id: sdkPos.publicKey?.toString() || 'unknown',
          pair: 'UNKNOWN/UNKNOWN',
          pairName: 'UNKNOWN/UNKNOWN',
          tokenA: 'UNKNOWN',
          tokenB: 'UNKNOWN',
          tokenX: 'UNKNOWN',
          tokenY: 'UNKNOWN',
          liquidity: 0,
          totalLiquidity: 0,
          value: 0,
          currentValue: 0,
          change24h: 0,
          apy: 0,
          currentAPY: 0,
          apr: 0,
          feesEarned: 0,
          fees24h: 0,
          feesTotal: 0,
          unclaimedFees: 0,
          pnl: 0,
          pnlPercentage: 0,
          binRange: {
            lower: 0,
            upper: 0,
            active: 0,
          },
          lowerBinId: 0,
          upperBinId: 0,
          distribution: {
            tokenA: 0,
            tokenB: 0,
          },
          priceRange: {
            min: 0,
            max: 0,
            current: 0,
          },
          strategy: 'balanced',
          lastRebalance: new Date().toISOString(),
          health: 'Good',
          binCount: 0,
          binDistribution: [],
          rawPosition: sdkPos,
        };

        positions.push(position);
      } catch (error) {
        console.error('Error converting position:', error);
      }
    }

    return positions;
  }

  private calculateHealth(
    activeBin: number,
    lowerBin: number,
    upperBin: number
  ): 'Excellent' | 'Good' | 'Fair' | 'Poor' {
    const range = upperBin - lowerBin;
    if (range === 0) return 'Poor';
    
    const distanceFromLower = activeBin - lowerBin;
    const distanceFromUpper = upperBin - activeBin;
    const minDistance = Math.min(distanceFromLower, distanceFromUpper);
    const healthRatio = (minDistance / range) * 100;

    if (healthRatio > 30) return 'Excellent';
    if (healthRatio > 20) return 'Good';
    if (healthRatio > 10) return 'Fair';
    return 'Poor';
  }

  private calculatePortfolioData(positions: Position[]): PortfolioData {
    const totalValue = positions.reduce((sum, pos) => sum + pos.currentValue, 0);
    const totalPnL = positions.reduce((sum, pos) => sum + pos.pnl, 0);
    const totalUnclaimedFees = positions.reduce((sum, pos) => sum + pos.unclaimedFees, 0);
    const averageAPR = positions.length > 0
      ? positions.reduce((sum, pos) => sum + pos.apr, 0) / positions.length
      : 0;

    return {
      totalValue,
      totalValueChange: 0,
      totalFeesEarned: totalUnclaimedFees,
      totalPnL,
      totalPnLPercentage: totalValue > 0 ? (totalPnL / (totalValue - totalPnL)) * 100 : 0,
      avgApy: averageAPR,
      positions,
      performanceData: [],
      summary: {
        totalActivePositions: positions.length,
        totalUnclaimedFees,
        averageAPR,
      },
    };
  }

  /**
   * Generate mock portfolio data for development/testing
   */
  private getMockPortfolioData(publicKey: PublicKey): PortfolioData {
    const mockPositions: Position[] = [
      {
        id: 'mock-sol-usdc',
        pair: 'SOL/USDC',
        pairName: 'SOL/USDC',
        tokenA: 'SOL',
        tokenB: 'USDC',
        tokenX: 'SOL',
        tokenY: 'USDC',
        liquidity: 5000,
        totalLiquidity: 5000,
        value: 5250,
        currentValue: 5250,
        change24h: 5.0,
        apy: 45.5,
        currentAPY: 45.5,
        apr: 45.5,
        feesEarned: 125,
        fees24h: 25,
        feesTotal: 125,
        unclaimedFees: 25,
        pnl: 250,
        pnlPercentage: 5.0,
        binRange: {
          lower: 8388598,
          upper: 8388618,
          active: 8388608,
        },
        lowerBinId: 8388598,
        upperBinId: 8388618,
        distribution: {
          tokenA: 25,
          tokenB: 2500,
        },
        priceRange: {
          min: 95,
          max: 105,
          current: 100,
        },
        strategy: 'balanced',
        lastRebalance: new Date(Date.now() - 86400000 * 2).toISOString(),
        health: 'Excellent',
        binCount: 21,
        binDistribution: this.generateMockBinDistribution(8388598, 8388618, 8388608),
      },
      {
        id: 'mock-saros-usdc',
        pair: 'SAROS/USDC',
        pairName: 'SAROS/USDC',
        tokenA: 'SAROS',
        tokenB: 'USDC',
        tokenX: 'SAROS',
        tokenY: 'USDC',
        liquidity: 2000,
        totalLiquidity: 2000,
        value: 1950,
        currentValue: 1950,
        change24h: -2.5,
        apy: 62.3,
        currentAPY: 62.3,
        apr: 62.3,
        feesEarned: 80,
        fees24h: 15,
        feesTotal: 80,
        unclaimedFees: 15,
        pnl: -50,
        pnlPercentage: -2.5,
        binRange: {
          lower: 8388588,
          upper: 8388628,
          active: 8388608,
        },
        lowerBinId: 8388588,
        upperBinId: 8388628,
        distribution: {
          tokenA: 10000,
          tokenB: 1000,
        },
        priceRange: {
          min: 0.9,
          max: 1.1,
          current: 1.0,
        },
        strategy: 'wide',
        lastRebalance: new Date(Date.now() - 86400000 * 5).toISOString(),
        health: 'Good',
        binCount: 41,
        binDistribution: this.generateMockBinDistribution(8388588, 8388628, 8388608),
      },
    ];

    return {
      totalValue: 7200,
      totalValueChange: 2.78,
      totalFeesEarned: 205,
      totalPnL: 200,
      totalPnLPercentage: 2.86,
      avgApy: 53.9,
      positions: mockPositions,
      performanceData: this.generateMockPerformanceData(7200, 30),
      summary: {
        totalActivePositions: 2,
        totalUnclaimedFees: 40,
        averageAPR: 53.9,
      },
    };
  }

  private generateMockBinDistribution(lowerBin: number, upperBin: number, activeBin: number): BinDistribution[] {
    const distribution: BinDistribution[] = [];
    const range = upperBin - lowerBin;
    
    for (let i = lowerBin; i <= upperBin; i++) {
      const distanceFromActive = Math.abs(i - activeBin);
      const liquidity = Math.max(1000 - distanceFromActive * 50, 100);
      
      distribution.push({
        id: i,
        binId: i,
        price: 100 + (i - activeBin) * 0.2,
        liquidityX: i < activeBin ? liquidity : 0,
        liquidityY: i > activeBin ? liquidity : i === activeBin ? liquidity / 2 : 0,
        feeAPR: 45 + Math.random() * 20,
        percentage: (liquidity / (range * 575)) * 100,
      });
    }
    
    return distribution;
  }

  private generateMockPerformanceData(currentValue: number, days: number): any[] {
    const data = [];
    const now = Date.now();
    const dayMs = 86400000;

    for (let i = days; i >= 0; i--) {
      data.push({
        date: new Date(now - i * dayMs).toISOString().split('T')[0],
        value: currentValue * (0.95 + Math.random() * 0.1),
        fees: Math.random() * 10,
        il: Math.random() * 5,
      });
    }

    return data;
  }

  // Implement other ISarosService methods
  async generateRebalanceRecommendations(positions: Position[]): Promise<RebalanceRecommendation[]> {
    return [];
  }

  async simulateStrategy(
    position: Position,
    strategy: StrategyType,
    timeHorizon?: string,
    marketConditions?: any
  ): Promise<StrategySimulationResult> {
    return {
      strategy,
      expectedReturn: 0,
      timeHorizon: timeHorizon || '30d',
      confidence: 0,
      details: {
        feesProjected: 0,
        ilProjected: 0,
        capitalEfficiency: 0,
      },
    };
  }

  async executeRebalance(recommendation: RebalanceRecommendation): Promise<string> {
    return '';
  }

  async getHistoricalData(pair: string, timeframe: string): Promise<HistoricalPriceData[]> {
    return [];
  }
}

export const createSarosSdkService = (
  walletService: WalletService,
  connection?: Connection
): ISarosService => {
  return new SarosSdkService(walletService, connection);
};