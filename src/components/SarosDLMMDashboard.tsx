import React, { useState, useEffect, useMemo } from 'react';
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar 
} from 'recharts';
import { 
  TrendingUp, TrendingDown, DollarSign, Target, AlertTriangle,
  RefreshCw, Settings, BarChart3, PieChart as PieChartIcon,
  Zap, Shield, Activity, Clock, ArrowUpRight, ArrowDownRight,
  Info, ChevronDown, ChevronUp, Eye, EyeOff
} from 'lucide-react';
import type { 
  PortfolioData, 
  Position, 
  RebalanceRecommendation,
  SimulationResult 
} from '../types';
import { RealSarosService } from '../services/sarosService';

interface DashboardProps {
  portfolioData: PortfolioData;
  sarosService: RealSarosService;
  onRefresh: () => Promise<void>;
  loading: boolean;
}

interface ShowDetailsState {
  [key: string]: boolean;
}

const SarosDLMMDashboard: React.FC<DashboardProps> = ({ 
  portfolioData, 
  sarosService, 
  onRefresh, 
  loading 
}) => {
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [showDetails, setShowDetails] = useState<ShowDetailsState>({});
  const [activeTab, setActiveTab] = useState<'overview' | 'positions' | 'analytics' | 'rebalance'>('overview');
  const [simulationMode, setSimulationMode] = useState(false);
  const [rebalanceRecommendations, setRebalanceRecommendations] = useState<RebalanceRecommendation[]>([]);
  const [simulationResults, setSimulationResults] = useState<{ [key: string]: SimulationResult }>({});
  const [refreshing, setRefreshing] = useState(false);

  // Load rebalancing recommendations when portfolio data changes
  useEffect(() => {
    if (portfolioData && sarosService) {
      loadRebalanceRecommendations();
    }
  }, [portfolioData, sarosService]);

  const loadRebalanceRecommendations = async (): Promise<void> => {
    try {
      const recommendations = await sarosService.generateRebalanceRecommendations(portfolioData.positions);
      setRebalanceRecommendations(recommendations);
    } catch (error) {
      console.error('Error loading rebalance recommendations:', error);
    }
  };

  const handleRefresh = async (): Promise<void> => {
    setRefreshing(true);
    try {
      await onRefresh();
      await loadRebalanceRecommendations();
    } finally {
      setRefreshing(false);
    }
  };

  const handleSimulateStrategy = async (position: Position, strategy: 'conservative' | 'aggressive' | 'balanced'): Promise<void> => {
    try {
      const result = await sarosService.simulateStrategy(position, strategy);
      setSimulationResults(prev => ({
        ...prev,
        [`${position.id}_${strategy}`]: result
      }));
    } catch (error) {
      console.error('Error simulating strategy:', error);
    }
  };

  const toggleDetails = (id: string): void => {
    setShowDetails(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Memoized calculations for performance
  const portfolioMetrics = useMemo(() => {
    const totalPositions = portfolioData.positions.length;
    const activePositions = portfolioData.positions.filter(p => p.health !== 'Poor').length;
    const totalFeesThisWeek = portfolioData.positions.reduce((sum, pos) => sum + (pos.feesEarned || 0) * 0.3, 0);
    const avgHealthScore = portfolioData.positions.reduce((sum, pos) => {
      const healthScores = { 'Excellent': 4, 'Good': 3, 'Fair': 2, 'Poor': 1 };
      return sum + healthScores[pos.health];
    }, 0) / Math.max(totalPositions, 1);

    return {
      totalPositions,
      activePositions,
      totalFeesThisWeek,
      avgHealthScore,
      portfolioHealth: avgHealthScore >= 3.5 ? 'Excellent' : avgHealthScore >= 2.5 ? 'Good' : avgHealthScore >= 1.5 ? 'Fair' : 'Poor'
    };
  }, [portfolioData]);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatPercent = (value: number): string => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  // Convert portfolio data to work with chart components
  const chartData = portfolioData.performanceData.map(item => ({
    ...item,
    value: item.value,
    fees: item.fees
  }));

  const pieChartData = portfolioData.positions.map((pos, index) => ({
    name: pos.pair,
    value: pos.totalLiquidity || pos.value || 0,
    fill: COLORS[index % COLORS.length]
  }));

  const OverviewTab: React.FC = () => (
    <div className="space-y-6">
      {/* Portfolio Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(portfolioData.totalValue)}</p>
              <p className={`text-sm ${portfolioData.totalValueChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercent((portfolioData.totalValueChange / Math.max(portfolioData.totalValue, 1)) * 100)} 24h
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Fees Earned</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(portfolioData.totalFeesEarned)}</p>
              <p className="text-sm text-green-600">{formatCurrency(portfolioMetrics.totalFeesThisWeek)} this week</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average APY</p>
              <p className="text-2xl font-bold text-gray-900">{portfolioData.avgApy.toFixed(1)}%</p>
              <p className="text-sm text-blue-600">{portfolioMetrics.activePositions} active positions</p>
            </div>
            <Target className="h-8 w-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Portfolio Health</p>
              <p className="text-2xl font-bold text-gray-900">{portfolioMetrics.portfolioHealth}</p>
              <p className="text-sm text-gray-600">{portfolioMetrics.totalPositions} total positions</p>
            </div>
            <Shield className={`h-8 w-8 ${
              portfolioMetrics.portfolioHealth === 'Excellent' ? 'text-green-500' :
              portfolioMetrics.portfolioHealth === 'Good' ? 'text-blue-500' :
              portfolioMetrics.portfolioHealth === 'Fair' ? 'text-yellow-500' : 'text-red-500'
            }`} />
          </div>
        </div>
      </div>

      {/* Performance Chart */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Portfolio Performance</h3>
          <div className="flex space-x-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip 
                formatter={(value: number, name: string) => [formatCurrency(value), name]}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#3B82F6" 
                fill="#3B82F6" 
                fillOpacity={0.1} 
                name="Portfolio Value" 
              />
              <Line 
                type="monotone" 
                dataKey="fees" 
                stroke="#10B981" 
                name="Fees Earned" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            onClick={() => setActiveTab('rebalance')}
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center"
          >
            <Zap className="h-8 w-8 text-blue-500 mx-auto mb-2" />
            <p className="font-medium text-gray-900">Rebalance Portfolio</p>
            <p className="text-sm text-gray-600">Optimize your positions</p>
          </button>
          
          <button 
            onClick={() => setSimulationMode(!simulationMode)}
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors text-center"
          >
            <Activity className="h-8 w-8 text-purple-500 mx-auto mb-2" />
            <p className="font-medium text-gray-900">Strategy Simulator</p>
            <p className="text-sm text-gray-600">Test different approaches</p>
          </button>
          
          <button 
            onClick={() => setActiveTab('analytics')}
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors text-center"
          >
            <BarChart3 className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="font-medium text-gray-900">Advanced Analytics</p>
            <p className="text-sm text-gray-600">Deep dive into metrics</p>
          </button>
        </div>
      </div>
    </div>
  );

  const PositionsTab: React.FC = () => (
    <div className="space-y-6">
      {portfolioData.positions.map((position) => (
        <div key={position.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div 
            className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => toggleDetails(position.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`w-3 h-3 rounded-full ${
                  position.health === 'Excellent' ? 'bg-green-500' :
                  position.health === 'Good' ? 'bg-blue-500' :
                  position.health === 'Fair' ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{position.pair}</h3>
                  <p className="text-sm text-gray-600">{position.strategy} • Last rebalanced {new Date(position.lastRebalance).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center space-x-6">
                <div className="text-right">
                  <p className="text-lg font-semibold text-gray-900">{formatCurrency(position.totalLiquidity || position.value)}</p>
                  <p className={`text-sm ${position.change24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercent(position.change24h)} 24h
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-gray-900">{(position.currentAPY || position.apy).toFixed(1)}%</p>
                  <p className="text-sm text-gray-600">APY</p>
                </div>
                {showDetails[position.id] ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
              </div>
            </div>
          </div>

          {showDetails[position.id] && (
            <div className="px-6 pb-6 border-t border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Liquidity</p>
                  <p className="text-lg font-semibold text-gray-900">{formatCurrency(position.totalLiquidity || position.liquidity)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Fees Earned</p>
                  <p className="text-lg font-semibold text-gray-900">{formatCurrency(position.feesTotal || position.feesEarned)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Bins</p>
                  <p className="text-lg font-semibold text-gray-900">{position.binCount || position.binRange?.active}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Health</p>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    position.health === 'Excellent' ? 'bg-green-100 text-green-800' :
                    position.health === 'Good' ? 'bg-blue-100 text-blue-800' :
                    position.health === 'Fair' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {position.health}
                  </span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded">
                  <h4 className="font-medium text-gray-900 mb-2">Token Distribution</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">{position.tokenA}</span>
                      <span className="text-sm font-medium">{position.distribution?.tokenA?.toFixed(1) || '50.0'}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">{position.tokenB}</span>
                      <span className="text-sm font-medium">{position.distribution?.tokenB?.toFixed(1) || '50.0'}%</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded">
                  <h4 className="font-medium text-gray-900 mb-2">Price Range</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Lower Bound</span>
                      <span className="text-sm font-medium">${(position.priceRange?.min || position.binRange?.lower || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Upper Bound</span>
                      <span className="text-sm font-medium">${(position.priceRange?.max || position.binRange?.upper || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {simulationMode && (
                <div className="mt-4 bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Strategy Simulation</h4>
                  <div className="flex space-x-2 mb-3">
                    {(['conservative', 'balanced', 'aggressive'] as const).map((strategy) => (
                      <button
                        key={strategy}
                        onClick={() => handleSimulateStrategy(position, strategy)}
                        className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors capitalize"
                      >
                        {strategy}
                      </button>
                    ))}
                  </div>
                  {Object.entries(simulationResults)
                    .filter(([key]) => key.startsWith(position.id))
                    .map(([key, result]) => (
                      <div key={key} className="mt-2 p-3 bg-white rounded border">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-900">{result.strategy} Strategy</span>
                          <span className="text-sm text-gray-600">{(result.confidence * 100).toFixed(0)}% confidence</span>
                        </div>
                        <div className="mt-1 text-sm text-gray-600">
                          Expected Return: {(result.expectedReturn * 100).toFixed(1)}% • 
                          Risk Score: {result.riskScore ? result.riskScore.toFixed(1) : 'N/A'}/10 • 
                          Timeline: {result.timeHorizon}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const AnalyticsTab: React.FC = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Position Distribution Pie Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Position Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={(entry: any) => `${entry.name} ${((entry.value / portfolioData.totalValue) * 100).toFixed(0)}%`}
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* APY Comparison */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">APY Comparison</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={portfolioData.positions}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="pair" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => [`${value.toFixed(1)}%`, 'APY']}
                />
                <Bar dataKey="apy" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Performance Metrics Table */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Performance Metrics</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">24h Change</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">APY</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fees Earned</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Health</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {portfolioData.positions.map((position) => (
                <tr key={position.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-3 ${
                        position.health === 'Excellent' ? 'bg-green-500' :
                        position.health === 'Good' ? 'bg-blue-500' :
                        position.health === 'Fair' ? 'bg-yellow-500' : 'bg-red-500'
                      }`} />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{position.pair}</div>
                        <div className="text-sm text-gray-500">{position.strategy}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(position.totalLiquidity || position.value)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`inline-flex items-center ${
                      position.change24h >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {position.change24h >= 0 ? <ArrowUpRight className="h-4 w-4 mr-1" /> : <ArrowDownRight className="h-4 w-4 mr-1" />}
                      {formatPercent(position.change24h)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {(position.currentAPY || position.apy).toFixed(1)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(position.feesTotal || position.feesEarned)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      position.health === 'Excellent' ? 'bg-green-100 text-green-800' :
                      position.health === 'Good' ? 'bg-blue-100 text-blue-800' :
                      position.health === 'Fair' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {position.health}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const RebalanceTab: React.FC = () => (
    <div className="space-y-6">
      {/* Rebalance Recommendations */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Rebalance Recommendations</h3>
          <button
            onClick={loadRebalanceRecommendations}
            disabled={loading}
            className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors disabled:opacity-50"
          >
            Refresh
          </button>
        </div>

        {rebalanceRecommendations.length === 0 ? (
          <div className="text-center py-8">
            <Shield className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">Portfolio Looking Good!</h4>
            <p className="text-gray-600">No immediate rebalancing recommendations at this time.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {rebalanceRecommendations.map((rec) => {
              const position = portfolioData.positions.find(p => p.id === rec.positionId);
              if (!position) return null;

              return (
                <div 
                  key={rec.positionId} 
                  className={`border rounded-lg p-4 ${
                    rec.priority === 'high' ? 'border-red-200 bg-red-50' :
                    rec.priority === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                    'border-blue-200 bg-blue-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <AlertTriangle className={`h-5 w-5 ${
                          rec.priority === 'high' ? 'text-red-500' :
                          rec.priority === 'medium' ? 'text-yellow-500' :
                          'text-blue-500'
                        }`} />
                        <h4 className="font-medium text-gray-900">{position.pair}</h4>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          rec.priority === 'high' ? 'bg-red-100 text-red-800' :
                          rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {rec.priority.charAt(0).toUpperCase() + rec.priority.slice(1)} Priority
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{rec.reason}</p>
                      <p className="text-sm text-gray-600 mb-3">{rec.suggestedAction}</p>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Expected Fees Increase:</span>
                          <span className="ml-1 font-medium text-green-600">+{(rec.expectedImpact.feesIncrease * 100).toFixed(1)}%</span>
                        </div>
                        <div>
                          <span className="text-gray-600">IL Reduction:</span>
                          <span className="ml-1 font-medium text-green-600">-{(rec.expectedImpact.ilReduction * 100).toFixed(1)}%</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Confidence:</span>
                          <span className="ml-1 font-medium text-gray-900">{(rec.expectedImpact.confidenceScore * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2 ml-4">
                      <button className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                        Simulate
                      </button>
                      <button className={`px-3 py-1 text-sm rounded transition-colors ${
                        rec.type === 'exit' ? 'bg-red-600 text-white hover:bg-red-700' :
                        'bg-blue-600 text-white hover:bg-blue-700'
                      }`}>
                        {rec.type === 'exit' ? 'Exit Position' : 'Execute'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rebalancing History */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Rebalancing Activity</h3>
        <div className="space-y-3">
          {portfolioData.positions.slice(0, 3).map((position) => (
            <div key={position.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
              <div className="flex items-center space-x-3">
                <Clock className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{position.pair}</p>
                  <p className="text-xs text-gray-600">Last rebalanced {new Date(position.lastRebalance).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-900">{position.strategy}</p>
                <p className="text-xs text-green-600">+{formatCurrency((position.feesTotal || position.feesEarned) * 0.1)} fees since</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header with Tabs */}
      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Portfolio Dashboard</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setSimulationMode(!simulationMode)}
                className={`px-3 py-1 text-sm rounded transition-colors flex items-center ${
                  simulationMode 
                    ? 'bg-purple-100 text-purple-800' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {simulationMode ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                <span className="ml-1">Simulation {simulationMode ? 'On' : 'Off'}</span>
              </button>
              <button
                onClick={handleRefresh}
                disabled={refreshing || loading}
                className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors disabled:opacity-50 flex items-center"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="ml-1">Refresh</span>
              </button>
            </div>
          </div>
        </div>
        
        <div className="px-6">
          <nav className="flex space-x-8">
            {[
              { key: 'overview', label: 'Overview', icon: BarChart3 },
              { key: 'positions', label: 'Positions', icon: Target },
              { key: 'analytics', label: 'Analytics', icon: PieChartIcon },
              { key: 'rebalance', label: 'Rebalance', icon: Zap }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as typeof activeTab)}
                  className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'positions' && <PositionsTab />}
        {activeTab === 'analytics' && <AnalyticsTab />}
        {activeTab === 'rebalance' && <RebalanceTab />}
      </div>
    </div>
  );
};

export default SarosDLMMDashboard;