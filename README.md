# Saros DLMM Portfolio Analytics Dashboard

A portfolio management dashboard for Saros DLMM (Dynamic Liquidity Market Maker) positions built as part of the Saros SDK Demo Bounty. This application demonstrates understanding of DLMM concepts and provides a production-ready UI for position tracking and management.

## 🚀 Live Demo

**Demo URL**: [https://saros-dlmm-dashboard.vercel.app/]

**GitHub Repository**: [https://github.com/TokenHarvester/Saros-DLMM-management-dashboard]

## 🏆 Features

### Portfolio Overview

- Real-time portfolio value display
- Position health monitoring
- Fee tracking and APY calculations
- Performance metrics dashboard

### Position Management

- Detailed view of all DLMM positions
- Bin range visualization
- Liquidity distribution analysis
- Position health indicators

### Rebalancing Recommendations

- Automated analysis of position status
- Actionable recommendations for optimization
- Risk assessment for out-of-range positions
- Expected impact calculations

### Strategy Simulation

- Compare different liquidity provision strategies
- Risk/reward analysis
- Capital efficiency calculations

## 🛠 Technical Implementation

### Architecture

- **Frontend:** React with TypeScript
- **State Management:** React Hooks
- **Styling:** CSS with responsive design
- **Wallet Integration:** Solana wallet adapters
- **Data Layer:** Service-based architecture

### Data Source Implementation
Currently uses mock data for demonstration purposes due to API/SDK limitations discovered during development:

#### API Research:

- Investigated REST API endpoints (/api/bin-position, /api/pool-position)
- Found https://api.saros.xyz base URL returns 404 for user position endpoints
- Team provided pool-level endpoint: https://api.saros.xyz/api/dex-v3/pool/91DFpQkaS7rSLyru9an5Pt8pff3WVKyiRBxEa2CBuuT4/bin?binArrayIndex[]=32775
- This requires knowing pool addresses beforehand, not suitable for user portfolio discovery

#### SDK Exploration:

- Installed @saros-finance/dlmm-sdk
- Available exports: LiquidityBookServices, findPosition, getMaxPosition
- No clear user-level position query methods documented
- Methods appear to require pool addresses as input parameters

#### Current Approach:
Mock data implementation allows full feature demonstration while awaiting:

- Complete SDK documentation with user position query examples
- REST API endpoints for user position discovery
- Team guidance on recommended implementation approach

## Code Structure
```
src/
├── components/
│   └── SarosDLMMDashboard.tsx    # Main dashboard component
├── services/
│   ├── sarosApiService.ts         # Service layer with mock data
│   ├── walletService.ts           # Wallet connection handling
│   └── sarosSdkService.ts         # SDK integration attempt
├── types/
│   └── index.ts                   # TypeScript type definitions
├── App.tsx                        # Main application component
└── App.css                        # Styling
```

## Mock Data Structure

The application demonstrates realistic data structures matching Saros DLMM format:
```
interface Position {
  id: string;
  pairName: string;
  tokenX: string;
  tokenY: string;
  lowerBinId: number;
  upperBinId: number;
  currentValue: number;
  apr: number;
  unclaimedFees: number;
  pnl: number;
  binDistribution: BinDistribution[];
  health: 'Excellent' | 'Good' | 'Fair' | 'Poor';
}
```

## 🏗 Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- Solana wallet (Phantom, Solflare, etc.)
- Basic knowledge of DeFi and liquidity provision

### Local Development
```bash
# Clone the repository
git clone https://github.com/TokenHarvester/Saros-DLMM-management-dashboard.git
cd saros-dlmm-dashboard

# Install dependencies
npm install

# Install Saros SDKs
npm install @saros-finance/dlmm-sdk @saros-finance/sdk

# Set up environment variables
cp .env.example .env

# Start development server
npm start
```

### Environment Configuration
Create .env file:
```
REACT_APP_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
REACT_APP_SAROS_API_URL=https://api.saros.xyz
REACT_APP_USE_MOCK_DATA=true
```

### Production Deployment
```bash
# Build for production
npm run build

# Deploy to your hosting platform
npm run deploy
```

## 🎯 Production Implementation Path
### For Real Data Integration
Once proper Saros SDK documentation or API endpoints are available:

### Option 1: SDK Integration
```
import { LiquidityBookServices } from '@saros-finance/dlmm-sdk';

const fetchUserPositions = async (publicKey: PublicKey) => {
  const sdk = new LiquidityBookServices();
  // Awaiting documented method for user position queries
  const positions = await sdk.getUserPositions(publicKey);
  return positions;
};
```

### Option 2: REST API
```
const fetchUserPositions = async (userId: string) => {
  // When endpoint becomes available
  const response = await fetch(
    `${API_URL}/api/users/${userId}/positions`
  );
  return response.json();
};
```

### Option 3: On-chain RPC Queries
```
const fetchUserPositions = async (publicKey: PublicKey) => {
  // Query Solana blockchain directly for position accounts
  const accounts = await connection.getProgramAccounts(
    DLMM_PROGRAM_ID,
    {
      filters: [
        { dataSize: POSITION_ACCOUNT_SIZE },
        { memcmp: { offset: 8, bytes: publicKey.toBase58() }}
      ]
    }
  );
  return parsePositionAccounts(accounts);
};
```

All UI components are production-ready and will work seamlessly once data integration is completed.

## 🔧 Features Implementation
### Portfolio Overview Dashboard

- Total portfolio value
- Profit/Loss tracking
- Active positions count
- Average APR calculation

### Position Details

- Token pair information
- Liquidity range (bin IDs)
- Current value and fees earned
- Position health status
- Bin distribution visualization

### Rebalancing System

- Out-of-range detection
- High fees compound suggestions
- Loss position exit recommendations
- Expected impact calculations

### Analytics

- 30-day performance history
- Fee generation tracking
- Impermanent loss estimates

## 📈 Real-World Applications

### For Liquidity Providers
- **Portfolio Optimization**: Maximize fee generation through optimal bin placement
- **Risk Management**: Monitor and mitigate impermanent loss across positions
- **Automated Management**: Set-and-forget liquidity provision with smart rebalancing

### For DeFi Protocols
- **Integration Template**: Reference implementation for DLMM integration
- **Analytics Framework**: Reusable components for liquidity analytics
- **User Onboarding**: Educational tools for new DLMM users

### For Developers
- **SDK Usage Examples**: Comprehensive examples of Saros DLMM SDK integration
- **Best Practices**: Production-ready patterns for DeFi application development
- **Architecture Reference**: Scalable frontend architecture for DeFi dashboards

## 🔧 Configuration & Customization

### Supported Pools
The dashboard supports all Saros DLMM pools, including:
- SOL/USDC
- SAROS/SOL  
- RAY/USDC
- mSOL/SOL
- Custom token pairs

### Rebalancing Strategies
- **Conservative**: Wide price ranges, lower fees, reduced risk
- **Aggressive**: Narrow price ranges, higher fees, increased risk  
- **Dynamic**: Adaptive ranges based on market volatility
- **Custom**: User-defined parameters and triggers

### Analytics Customization
- Configurable time periods (1d, 7d, 30d, 90d)
- Custom risk metrics and thresholds
- Personalized notification settings
- Portfolio performance benchmarking

## 🎯 Hackathon Scalability

This demo is designed to be hackathon-ready and easily extensible:

### Potential Extensions
- **Cross-Chain Support**: Expand to other Solana-based DEXs
- **Mobile App**: React Native version for on-the-go management
- **Telegram Bot Integration**: Automated notifications and basic management
- **Advanced Order Types**: Limit orders, stop-loss, DCA strategies
- **Social Features**: Community strategies and leaderboards

### API Integration Points
- **Notification Services**: Discord, Telegram, email alerts
- **External Analytics**: TradingView charts, DeFiPulse data
- **Portfolio Tracking**: Integration with Zapper, DeBank
- **Tax Reporting**: Export for tax calculation tools

## 📚 Documentation
### For Developers
#### Integrating Real Data:

1. Update `src/services/sarosApiService.ts`
2. Replace `getMockPortfolioData()` with actual API/SDK calls
3. Set `REACT_APP_USE_MOCK_DATA=false`
4. All components will work without modification

**Note:** This is a demonstration application built with mock data. All features and UI components are production-ready and designed for easy integration with real Saros DLMM data once proper SDK documentation or API endpoints become available.

## 🤝 Contributing

We welcome contributions from the community! Please see our contributing guidelines and code of conduct.

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Implement your changes with tests
4. Submit a pull request with detailed description

## 📄 License

MIT License - see LICENSE file for details
