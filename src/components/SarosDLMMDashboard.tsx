import React from 'react';
import { PortfolioData, ISarosService } from '../types';

interface Props {
  portfolioData: PortfolioData;
  sarosService: ISarosService;
  onRefresh: () => void;
}

export const SarosDLMMDashboard: React.FC<Props> = ({
  portfolioData,
  onRefresh
}) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  // Use totalPnL if available, otherwise fallback to totalIL or 0
  const totalPnL = portfolioData.totalPnL ?? portfolioData.totalIL ?? 0;
  const summary = portfolioData.summary ?? {
    totalActivePositions: portfolioData.positions.length,
    totalUnclaimedFees: 0,
    averageAPR: portfolioData.avgApy,
  };

  return (
    <div className="dashboard">
      <div className="portfolio-overview">
        <h2>Portfolio Overview</h2>
        <div className="stats">
          <div className="stat-card">
            <h3>Total Value</h3>
            <p>{formatCurrency(portfolioData.totalValue)}</p>
          </div>
          <div className="stat-card">
            <h3>Total P&L</h3>
            <p className={totalPnL >= 0 ? 'positive' : 'negative'}>
              {formatCurrency(totalPnL)}
            </p>
          </div>
          <div className="stat-card">
            <h3>Active Positions</h3>
            <p>{summary.totalActivePositions}</p>
          </div>
          <div className="stat-card">
            <h3>Average APR</h3>
            <p>{summary.averageAPR.toFixed(2)}%</p>
          </div>
        </div>
      </div>

      <div className="positions-list">
        <h2>Your Positions</h2>
        <button onClick={onRefresh}>Refresh</button>
        
        {portfolioData.positions.length === 0 ? (
          <div className="no-positions">
            <p>No positions found. Add liquidity to a Saros DLMM pool to get started.</p>
          </div>
        ) : (
          portfolioData.positions.map(position => (
            <div key={position.id} className="position-card">
              <h3>{position.pairName || `${position.pair}`}</h3>
              <div className="position-details">
                <p>
                  <strong>Value:</strong> {formatCurrency(position.currentValue || position.value)}
                </p>
                <p>
                  <strong>APR:</strong> {(position.apr || position.apy).toFixed(2)}%
                </p>
                <p>
                  <strong>Range:</strong> {position.lowerBinId ?? position.binRange.lower} - {position.upperBinId ?? position.binRange.upper}
                </p>
                <p>
                  <strong>Unclaimed Fees:</strong> {formatCurrency(position.unclaimedFees || position.feesEarned)}
                </p>
                {position.pnl !== undefined && (
                  <p className={position.pnl >= 0 ? 'positive' : 'negative'}>
                    <strong>P&L:</strong> {formatCurrency(position.pnl)} ({position.pnlPercentage?.toFixed(2)}%)
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};