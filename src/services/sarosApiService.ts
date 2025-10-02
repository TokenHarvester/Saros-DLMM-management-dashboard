import { PublicKey, Connection } from '@solana/web3.js';
import axios from 'axios';
import {
  Position,
  PortfolioData,
  RebalanceRecommendation,
  StrategySimulationResult,
  StrategyType,
  HistoricalPriceData,
  ISarosService,
  BinDistribution
} from '../types';
import { WalletService } from './walletService';

// Saros API Base URL 
const SAROS_API_BASE_URL = process.env.REACT_APP_SAROS_API_URL || 'https://api.saros.xyz';

// Enable mock data during development if API is unavailable
const USE_MOCK_DATA = process.env.REACT_APP_USE_MOCK_DATA === 'true';

interface SarosBinData {
  binId: number;
  price: number;
  liquidityX: number;
  liquidityY: number;
  supply: number;
}

interface SarosPoolInfo {
  poolAddress: string;
  tokenX: string;
  tokenY: string;
  activeBinId: number;
  binStep: number;
}

export class SarosApiService implements ISarosService {
  private connection: Connection;
  private wallet: WalletService;
  private apiBaseUrl: string;

  constructor(walletService: WalletService, connection?: Connection) {
    this.wallet = walletService;
    this.connection = connection || new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
    this.apiBaseUrl = SAROS_API_BASE_URL;
  }

  /**
   * Fetch bin data for a specific pool
   * Endpoint format: /api/dex-v3/pool/{poolAddress}/bin?binArrayIndex[]={index}
   */
  private async fetchPoolBinData(poolAddress: string, binArrayIndices: number[]): Promise<SarosBinData[]> {
    try {
      const params = new URLSearchParams();
      binArrayIndices.forEach(index => {
        params.append('binArrayIndex[]', index.toString());
      });

      const url = `${this.apiBaseUrl}/api/dex-v3/pool/${poolAddress}/bin?${params.toString()}`;
      console.log('Fetching bin data:', url);

      const response = await axios.get(url);
      
      if (response.status !== 200) {
        throw new Error('Failed to fetch bin data');
      }

      return response.data;
    } catch (error) {
      console.error('Error fetching bin data:', error);
      throw error;
    }
  }

  /**
   * NOTE: The Saros API structure is different from documentation.
   * The team provided an endpoint for pool bins, not user positions.
   * 
   * For actual user positions, we may need to:
   * 1. Use the Saros DLMM SDK directly (@saros-finance/dlmm-sdk)
   * 2. Query on-chain data via Solana RPC
   * 3. Wait for proper user position endpoints
   * 
   * For now, using mock data for demonstration.
   */
  async getPortfolioData(publicKey: PublicKey): Promise<PortfolioData> {
    // If mock data is enabled, return it immediately
    if (USE_MOCK_DATA) {
      console.log('📦 Using mock data (REACT_APP_USE_MOCK_DATA=true)');
      return this.getMockPortfolioData(publicKey);
    }

    try {
      const userId = publicKey.toString();

      console.log('🔄 Attempting to fetch portfolio data...');
      console.log(`📊 User: ${userId}`);
      console.log(`🌐 API URL: ${this.apiBaseUrl}`);

      // The API endpoint provided is for pool bins, not user positions
      // We would need to know which pools the user has positions in
      // This requires either:
      // 1. On-chain query to find user's positions
      // 2. Different API endpoint for user positions
      // 3. Using the DLMM SDK instead

      console.warn('⚠️ User position endpoints not available in current API');
      console.warn('📝 The provided endpoint is for pool bin data, not user positions');
      console.warn('💡 Consider using @saros-finance/dlmm-sdk for direct on-chain queries');
      console.warn('\nFalling back to mock data for demonstration...');
      
      return this.getMockPortfolioData(publicKey);

    } catch (error: any) {
      console.error('❌ Error fetching portfolio data:', error);
      console.warn('Falling back to mock data...');
      return this.getMockPortfolioData(publicKey);
    }
  }

  /**
   * Example of how to fetch pool data (if you know the pool address)
   */
  async getPoolData(poolAddress: string): Promise<any> {
    try {
      // Example: Fetch bins around the active bin
      // binArrayIndex 32775 is just an example - would need to calculate based on position
      const binArrayIndices = [32774, 32775, 32776];
      
      const binData = await this.fetchPoolBinData(poolAddress, binArrayIndices);
      
      return {
        poolAddress,
        bins: binData
      };
    } catch (error) {
      console.error('Error fetching pool data:', error);
      throw error;
    }
  }

  private async getTokenSymbol(mintAddress: string): Promise<string> {
    const tokenMap: { [key: string]: string } = {
      'So11111111111111111111111111111111111111112': 'SOL',
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT',
      '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R': 'RAY',
      'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': 'mSOL',
      'SARoSrBFZnGJmfSNvCwbx8j6sbXYTaomyKbvX6bhfHu': 'SAROS',
    };

    return tokenMap[mintAddress] || mintAddress.slice(0, 4).toUpperCase();
  }

  private calculateHealth(activeBin: number, lowerBin: number, upperBin: number): 'Excellent' | 'Good' | 'Fair' | 'Poor' {
    const range = upperBin - lowerBin;
    const distanceFromLower = activeBin - lowerBin;
    const distanceFromUpper = upperBin - activeBin;
    const minDistance = Math.min(distanceFromLower, distanceFromUpper);
    const healthRatio = (minDistance / range) * 100;

    if (healthRatio > 30) return 'Excellent';
    if (healthRatio > 20) return 'Good';
    if (healthRatio > 10) return 'Fair';
    return 'Poor';
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

  async generateRebalanceRecommendations(positions: Position[]): Promise<RebalanceRecommendation[]> {
    const recommendations: RebalanceRecommendation[] = [];

    for (const position of positions) {
      try {
        const binDistribution = position.binDistribution;
        const activeBinId = this.findActiveBin(binDistribution);
        
        const isOutOfRange = activeBinId < position.lowerBinId || activeBinId > position.upperBinId;
        
        if (isOutOfRange) {
          recommendations.push({
            id: `rebalance_${position.id}_${Date.now()}`,
            positionId: position.id,
            type: 'rebalance',
            priority: 'high',
            reason: `Position is out of active range. Current active bin: ${activeBinId}, Your range: ${position.lowerBinId}-${position.upperBinId}`,
            expectedImpact: {
              feesIncrease: 5.0,
              ilReduction: 2.0,
              confidenceScore: 0.85,
            },
            suggestedAction: 'Rebalance to include active bin',
            executionParams: {
              type: 'shift_up',
              suggestedRange: {
                min: activeBinId - 10,
                max: activeBinId + 10,
                lowerBinId: activeBinId - 10,
                upperBinId: activeBinId + 10
              }
            }
          });
        }

        if (position.unclaimedFees > 50) {
          recommendations.push({
            id: `fees_${position.id}_${Date.now()}`,
            positionId: position.id,
            type: 'expand',
            priority: 'medium',
            reason: `High unclaimed fees: $${position.unclaimedFees.toFixed(2)}`,
            expectedImpact: {
              feesIncrease: 2.5,
              ilReduction: 0.5,
              confidenceScore: 0.75,
            },
            suggestedAction: 'Consider compounding fees back into position',
            executionParams: {
              type: 'add_liquidity',
            }
          });
        }

        if (position.pnlPercentage < -10) {
          recommendations.push({
            id: `close_${position.id}_${Date.now()}`,
            positionId: position.id,
            type: 'exit',
            priority: 'high',
            reason: `Significant loss: ${position.pnlPercentage.toFixed(2)}%`,
            expectedImpact: {
              feesIncrease: 0,
              ilReduction: 10.0,
              confidenceScore: 0.9,
            },
            suggestedAction: 'Consider closing position and reallocating capital',
            executionParams: {
              type: 'shift_down',
            }
          });
        }

      } catch (error) {
        console.error(`Error analyzing position ${position.id}:`, error);
      }
    }

    return recommendations;
  }

  private findActiveBin(distribution: BinDistribution[]): number {
    if (distribution.length === 0) return 0;
    
    const activeBins = distribution.filter(b => b.liquidityX > 0 && b.liquidityY > 0);
    
    if (activeBins.length > 0) {
      return activeBins[0].binId;
    }
    
    return distribution[Math.floor(distribution.length / 2)].binId;
  }

  async simulateStrategy(
    position: Position,
    strategy: StrategyType,
    timeHorizon: string = '30d',
    marketConditions: any = {}
  ): Promise<StrategySimulationResult> {
    const strategyConfigs = {
      narrow: { risk: 0.8, expectedReturn: 0.12, apr: 65, binRange: 5 },
      wide: { risk: 0.3, expectedReturn: 0.06, apr: 25, binRange: 50 },
      balanced: { risk: 0.5, expectedReturn: 0.09, apr: 45, binRange: 20 }
    };

    const config = strategyConfigs[strategy];

    return {
      strategy,
      expectedReturn: config.expectedReturn,
      risk: config.risk,
      timeHorizon,
      confidence: 0.75,
      riskScore: config.risk,
      details: {
        feesProjected: config.expectedReturn * 0.8,
        ilProjected: strategy === 'narrow' ? 0.05 : 0.02,
        capitalEfficiency: strategy === 'narrow' ? 0.95 : 0.6
      }
    };
  }

  async executeRebalance(recommendation: RebalanceRecommendation): Promise<string> {
    try {
      if (!this.wallet.isConnected()) {
        throw new Error('Wallet not connected');
      }

      console.log('📝 Preparing rebalance transaction...');
      console.log('Recommendation:', recommendation);

      return `rebalance_tx_${Date.now()}`;

    } catch (error) {
      console.error('Error executing rebalance:', error);
      throw error;
    }
  }

  async getHistoricalData(pair: string, timeframe: string): Promise<HistoricalPriceData[]> {
    const data: HistoricalPriceData[] = [];
    const now = Date.now();
    const intervals = timeframe === '1h' ? 24 : timeframe === '1d' ? 30 : 90;
    const intervalMs = timeframe === '1h' ? 3600000 : 86400000;

    let basePrice = 100;

    for (let i = intervals; i >= 0; i--) {
      const timestamp = now - (i * intervalMs);
      const priceChange = (Math.random() - 0.5) * 3;
      basePrice = Math.max(basePrice + priceChange, 1);

      data.push({
        timestamp,
        price: basePrice,
        volume: 500000 + Math.random() * 1000000,
        liquidity: 2000000 + Math.random() * 3000000
      });
    }

    return data;
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
}

export const createSarosApiService = (
  walletService: WalletService,
  connection?: Connection
): ISarosService => {
  return new SarosApiService(walletService, connection);
};