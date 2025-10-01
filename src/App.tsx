import React, { useState, useEffect, useCallback } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { WalletService } from './services/walletService';
import { createSarosApiService } from './services/sarosAPIService';
import { SarosDLMMDashboard } from './components/SarosDLMMDashboard';
import { WalletState, PortfolioData } from './types';
import './App.css';

const App: React.FC = () => {
  const [walletService] = useState(() => new WalletService());
  const [sarosService] = useState(() => {
    const connection = new Connection(
      process.env.REACT_APP_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
      'confirmed'
    );
    return createSarosApiService(walletService, connection);
  });

  const [walletState, setWalletState] = useState<WalletState>({
    connected: false,
    publicKey: null,
    connecting: false,
    error: null, // Added missing error property
  });

  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const connectWallet = async (): Promise<void> => {
    try {
      setWalletState(prev => ({ ...prev, connecting: true, error: null }));
      await walletService.connect();
      
      const publicKey = walletService.getPublicKey();
      
      setWalletState({
        connected: walletService.isConnected(),
        publicKey: publicKey ? publicKey.toString() : null, // Convert PublicKey to string
        connecting: false,
        error: null,
      });
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to connect wallet';
      setError(errorMessage);
      setWalletState(prev => ({ 
        ...prev, 
        connecting: false,
        error: errorMessage,
      }));
    }
  };

  const loadPortfolioData = useCallback(async (): Promise<void> => {
    if (!walletState.connected || !walletState.publicKey) return;

    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Fetching portfolio from Saros API...');
      
      // Convert string back to PublicKey for the API call
      const publicKey = new PublicKey(walletState.publicKey);
      const data = await sarosService.getPortfolioData(publicKey);
      setPortfolioData(data);
      
      console.log('✅ Portfolio loaded:', data);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to load portfolio';
      setError(errorMessage);
      console.error('❌ Error:', err);
    } finally {
      setLoading(false);
    }
  }, [sarosService, walletState.connected, walletState.publicKey]);

  useEffect(() => {
    if (walletState.connected && walletState.publicKey) {
      loadPortfolioData();
    }
  }, [walletState.connected, walletState.publicKey, loadPortfolioData]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Saros DLMM Portfolio Dashboard</h1>
        <p>Real-time DLMM position tracking with Saros REST API</p>
      </header>

      <main className="app-main">
        {!walletState.connected ? (
          <div className="wallet-connect">
            <button onClick={connectWallet} disabled={walletState.connecting}>
              {walletState.connecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
            {walletState.error && (
              <div className="error" style={{ marginTop: '10px' }}>
                {walletState.error}
              </div>
            )}
          </div>
        ) : (
          <>
            {loading && <div className="loading">Loading portfolio...</div>}
            {error && <div className="error">{error}</div>}
            {portfolioData && (
              <SarosDLMMDashboard
                portfolioData={portfolioData}
                sarosService={sarosService}
                onRefresh={loadPortfolioData}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default App;