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

// Saros DLMM REST API Base URL
const SAROS_API_BASE_URL = process.env.REACT_APP_SAROS_API_URL || 'https://api.saros.xyz';

interface SarosBinPosition {
  bin_id: number;
  token_x_amount: number;
  token_y_amount: number;
  liquidity_shares: number;
  price: number;
}

interface SarosPoolPosition {
  pair_id: string;
  total_liquidity: number;
  total_token_x: number;
  total_token_y: number;
  token_x_mint: string;
  token_y_mint: string;
  bin_step: number;
  active_bin_id: number;
  fees_24h: number;
  apr_24h: number;
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

  private async fetchBinPositions(userId: string, pairId?: string): Promise<any> {
    try {
      const params = new URLSearchParams({
        user_id: userId,
        page_num: '1',
        page_size: '100',
      });

      if (pairId) {
        params.append('pair_id', pairId);
      }

      const response = await axios.get(`${this.apiBaseUrl}/api/bin-position?${params.toString()}`);
      
      if (response.status !== 200) {
        throw new Error('Failed to fetch bin positions');
      }

      return response.data;
    } catch (error) {
      console.error('Error fetching bin positions:', error);
      throw error;
    }
  }

  private async fetchPoolPositions(userId: string, pairId?: string): Promise<SarosPoolPosition[]> {
    try {
      const params = new URLSearchParams({
        user_id: userId,
        page_num: '1',
        page_size: '100',
      });

      if (pairId) {
        params.append('pair_id', pairId);
      }

      const response = await axios.get(`${this.apiBaseUrl}/api/pool-position?${params.toString()}`);
      
      if (response.status !== 200) {
        throw new Error('Failed to fetch pool positions');
      }

      return response.data.positions || [];
    } catch (error) {
      console.error('Error fetching pool positions:', error);
      throw error;
    }
  }

  async getPortfolioData(publicKey: PublicKey): Promise<PortfolioData> {
    try {
      const userId = publicKey.toString();

      console.log('🔄 Fetching real portfolio data from Saros API...');
      console.log(`📊 User: ${userId}`);

      const [binPositions, poolPositions] = await Promise.all([
        this.fetchBinPositions(userId),
        this.fetchPoolPositions(userId)
      ]);

      console.log(`✅ Found ${poolPositions.length} pool positions`);

      const positions = await this.convertPoolPositionsToPositions(poolPositions, binPositions);

      return this.calculatePortfolioData(positions);

    } catch (error) {
      console.error('❌ Error fetching portfolio data:', error);
      throw new Error(`Failed to fetch portfolio data: ${error}`);
    }
  }

  private async convertPoolPositionsToPositions(
    poolPositions: SarosPoolPosition[],
    binPositions: any
  ): Promise<Position[]> {
    const positions: Position[] = [];

    for (const poolPos of poolPositions) {
      try {
        const tokenXSymbol = await this.getTokenSymbol(poolPos.token_x_mint);
        const tokenYSymbol = await this.getTokenSymbol(poolPos.token_y_mint);

        const currentValue = poolPos.total_token_x + poolPos.total_token_y;
        
        const binDistribution = this.getBinDistributionForPosition(
          poolPos.pair_id,
          binPositions
        );

        const lowerBinId = binDistribution.length > 0 
          ? Math.min(...binDistribution.map(b => b.binId))
          : poolPos.active_bin_id - 10;
        const upperBinId = binDistribution.length > 0
          ? Math.max(...binDistribution.map(b => b.binId))
          : poolPos.active_bin_id + 10;

        const position: Position = {
          id: poolPos.pair_id,
          pair: `${tokenXSymbol}/${tokenYSymbol}`,
          pairName: `${tokenXSymbol}/${tokenYSymbol}`,
          tokenA: tokenXSymbol,
          tokenB: tokenYSymbol,
          tokenX: tokenXSymbol,
          tokenY: tokenYSymbol,
          liquidity: poolPos.total_liquidity,
          totalLiquidity: poolPos.total_liquidity,
          value: currentValue,
          currentValue,
          change24h: 0,
          apy: poolPos.apr_24h,
          currentAPY: poolPos.apr_24h,
          apr: poolPos.apr_24h,
          feesEarned: poolPos.fees_24h,
          fees24h: poolPos.fees_24h,
          feesTotal: poolPos.fees_24h,
          unclaimedFees: poolPos.fees_24h,
          pnl: currentValue - poolPos.total_liquidity,
          pnlPercentage: ((currentValue - poolPos.total_liquidity) / poolPos.total_liquidity) * 100,
          binRange: {
            lower: lowerBinId,
            upper: upperBinId,
            active: poolPos.active_bin_id,
          },
          lowerBinId,
          upperBinId,
          distribution: {
            tokenA: poolPos.total_token_x,
            tokenB: poolPos.total_token_y,
          },
          priceRange: {
            min: lowerBinId * poolPos.bin_step,
            max: upperBinId * poolPos.bin_step,
            current: poolPos.active_bin_id * poolPos.bin_step,
          },
          strategy: 'active',
          lastRebalance: new Date().toISOString(),
          health: this.calculateHealth(poolPos.active_bin_id, lowerBinId, upperBinId),
          binCount: upperBinId - lowerBinId + 1,
          binDistribution,
          rawPosition: poolPos
        };

        positions.push(position);
      } catch (error) {
        console.error(`Error processing position ${poolPos.pair_id}:`, error);
      }
    }

    return positions;
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

  private getBinDistributionForPosition(pairId: string, binPositions: any): BinDistribution[] {
    const distribution: BinDistribution[] = [];

    if (!binPositions || !binPositions.positions) {
      return distribution;
    }

    const positionBins = binPositions.positions.filter((bp: any) => bp.pair_id === pairId);

    for (const bin of positionBins) {
      distribution.push({
        id: bin.bin_id,
        binId: bin.bin_id,
        price: bin.price,
        liquidityX: bin.token_x_amount,
        liquidityY: bin.token_y_amount,
        feeAPR: 0,
        percentage: bin.liquidity_shares / 10000
      });
    }

    return distribution;
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

    if (tokenMap[mintAddress]) {
      return tokenMap[mintAddress];
    }

    return mintAddress.slice(0, 4).toUpperCase();
  }

  private calculatePortfolioData(positions: Position[]): PortfolioData {
    const totalValue = positions.reduce((sum, pos) => sum + pos.currentValue, 0);
    const totalPnL = positions.reduce((sum, pos) => sum + pos.pnl, 0);
    const totalUnclaimedFees = positions.reduce((sum, pos) => sum + pos.unclaimedFees, 0);
    const averageAPR = positions.length > 0
      ? positions.reduce((sum, pos) => sum + pos.apr, 0) / positions.length
      : 0;

    // Generate mock performance data
    const performanceData = this.generateMockPerformanceData(totalValue, 30);

    return {
      totalValue,
      totalValueChange: 0,
      totalFeesEarned: totalUnclaimedFees,
      totalPnL,
      totalPnLPercentage: totalValue > 0 ? (totalPnL / (totalValue - totalPnL)) * 100 : 0,
      avgApy: averageAPR,
      positions,
      performanceData,
      summary: {
        totalActivePositions: positions.length,
        totalUnclaimedFees,
        averageAPR,
      },
    };
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
}

export const createSarosApiService = (
  walletService: WalletService,
  connection?: Connection
): ISarosService => {
  return new SarosApiService(walletService, connection);
};