import React, { useState, useEffect, useCallback } from 'react';
import { WalletService } from './services/walletService';
import { RealSarosService } from './services/sarosService';
import SarosDLMMDashboard from './components/SarosDLMMDashboard';
import type { PortfolioData, WalletState } from './types';

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-red-50">
          <div className="text-center max-w-md mx-auto p-6">
            <h2 className="text-xl font-bold text-red-800 mb-4">Something went wrong</h2>
            <p className="text-red-600 mb-4">{this.state.error?.message}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Wallet Connection Component
const WalletConnection: React.FC<{
  walletState: WalletState;
  onConnect: () => void;
  onDisconnect: () => void;
  loading: boolean;
}> = ({ walletState, onConnect, onDisconnect, loading }) => {
  if (walletState.connected) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <div>
            <p className="font-medium text-gray-900">Wallet Connected</p>
            <p className="text-sm text-gray-500">
              {walletState.publicKey?.slice(0, 8)}...{walletState.publicKey?.slice(-8)}
            </p>
          </div>
        </div>
        <button
          onClick={onDisconnect}
          disabled={loading}
          className="px-4 py-2 text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 text-center">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Connect Your Wallet</h3>
      <p className="text-gray-600 mb-4">
        Connect your Phantom wallet to view your DLMM positions and portfolio analytics.
      </p>
      {walletState.error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
          <p className="text-red-700 text-sm">{walletState.error}</p>
        </div>
      )}
      <button
        onClick={onConnect}
        disabled={walletState.connecting || loading}
        className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {walletState.connecting ? 'Connecting...' : 'Connect Phantom Wallet'}
      </button>
    </div>
  );
};

// Loading Component
const LoadingSpinner: React.FC = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Loading portfolio data...</p>
    </div>
  </div>
);

// Main App Component
const App: React.FC = () => {
  const [walletService] = useState(() => new WalletService());
  const [sarosService, setSarosService] = useState<RealSarosService | null>(null);
  const [walletState, setWalletState] = useState<WalletState>({
    connected: false,
    publicKey: null,
    connecting: false,
    error: null
  });
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize wallet state and saros service when wallet connects
  useEffect(() => {
    const currentState = walletService.getCurrentWalletState();
    setWalletState(currentState);

    // Initialize Saros service when wallet is available
    if (currentState.connected && walletService.getWallet()) {
      const service = new RealSarosService(walletService.getWallet());
      setSarosService(service);
    }

    // Set up wallet event listeners
    const handleConnect = (data: { publicKey: string }) => {
      setWalletState({
        connected: true,
        publicKey: data.publicKey,
        connecting: false,
        error: null
      });
      
      // Initialize Saros service with the connected wallet
      const wallet = walletService.getWallet();
      if (wallet) {
        const service = new RealSarosService(wallet);
        setSarosService(service);
        loadPortfolioData(data.publicKey, service);
      }
    };

    const handleDisconnect = () => {
      setWalletState({
        connected: false,
        publicKey: null,
        connecting: false,
        error: null
      });
      setPortfolioData(null);
      setSarosService(null);
    };

    const handleAccountChanged = (data: { publicKey: string }) => {
      setWalletState(prev => ({
        ...prev,
        publicKey: data.publicKey
      }));
      
      if (sarosService) {
        loadPortfolioData(data.publicKey, sarosService);
      }
    };

    walletService.on('connect', handleConnect);
    walletService.on('disconnect', handleDisconnect);
    walletService.on('accountChanged', handleAccountChanged);

    // Load data if wallet is already connected
    if (currentState.connected && currentState.publicKey && sarosService) {
      loadPortfolioData(currentState.publicKey, sarosService);
    }

    return () => {
      walletService.off('connect', handleConnect);
      walletService.off('disconnect', handleDisconnect);
      walletService.off('accountChanged', handleAccountChanged);
    };
  }, []);

  const loadPortfolioData = useCallback(async (publicKey: string, service: RealSarosService) => {
    try {
      setLoading(true);
      setError(null);
      const data = await service.getPortfolioData(publicKey);
      setPortfolioData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load portfolio data');
      console.error('Error loading portfolio data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleConnect = async (): Promise<void> => {
    try {
      setWalletState(prev => ({ ...prev, connecting: true, error: null }));
      const result = await walletService.connect();
      setWalletState(result);
      
      if (result.connected && result.publicKey) {
        const wallet = walletService.getWallet();
        if (wallet) {
          const service = new RealSarosService(wallet);
          setSarosService(service);
          await loadPortfolioData(result.publicKey, service);
        }
      }
    } catch (err: any) {
      setWalletState(prev => ({
        ...prev,
        connecting: false,
        error: err.message || 'Failed to connect wallet'
      }));
    }
  };

  const handleDisconnect = async (): Promise<void> => {
    try {
      setLoading(true);
      await walletService.disconnect();
      setWalletState({
        connected: false,
        publicKey: null,
        connecting: false,
        error: null
      });
      setPortfolioData(null);
      setSarosService(null);
    } catch (err) {
      console.error('Error disconnecting wallet:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = useCallback(async (): Promise<void> => {
    if (walletState.publicKey && sarosService) {
      await loadPortfolioData(walletState.publicKey, sarosService);
    }
  }, [walletState.publicKey, sarosService, loadPortfolioData]);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Saros DLMM Portfolio Analytics
            </h1>
            <p className="text-gray-600">
              Advanced portfolio management for Dynamic Liquidity Market Making
            </p>
          </div>

          {/* Wallet Connection */}
          {!walletState.connected ? (
            <WalletConnection
              walletState={walletState}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              loading={loading}
            />
          ) : (
            <>
              {/* Connected Wallet Info */}
              <WalletConnection
                walletState={walletState}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
                loading={loading}
              />

              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">Error</h3>
                      <div className="mt-1 text-sm text-red-700">{error}</div>
                    </div>
                    <div className="ml-auto pl-3">
                      <button
                        onClick={handleRefresh}
                        className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors"
                      >
                        Retry
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Main Content */}
              {loading && !portfolioData ? (
                <LoadingSpinner />
              ) : portfolioData && sarosService ? (
                <SarosDLMMDashboard
                  portfolioData={portfolioData}
                  sarosService={sarosService}
                  onRefresh={handleRefresh}
                  loading={loading}
                />
              ) : (
                <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                  <div className="text-gray-400 mb-4">
                    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Portfolio Data</h3>
                  <p className="text-gray-600 mb-4">
                    No DLMM positions found for this wallet. Create your first position to get started.
                  </p>
                  <button
                    onClick={handleRefresh}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Refreshing...' : 'Refresh'}
                  </button>
                </div>
              )}
            </>
          )}

          {/* Footer */}
          <footer className="mt-12 text-center text-sm text-gray-500">
            <p>
              Built for the Saros DLMM Hackathon • 
              <a 
                href="https://github.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="ml-1 text-blue-600 hover:text-blue-700"
              >
                View Source Code
              </a>
            </p>
          </footer>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default App;