import { Connection, PublicKey } from '@solana/web3.js';
import type { WalletState, WalletAdapter } from '../types';

interface PhantomWallet {
  isPhantom: boolean;
  publicKey: PublicKey | null;
  isConnected: boolean;
  connect(): Promise<{ publicKey: PublicKey }>;
  disconnect(): Promise<void>;
  signTransaction(transaction: any): Promise<any>;
  signAllTransactions(transactions: any[]): Promise<any[]>;
  on(event: string, callback: (args: any) => void): void;
  off(event: string, callback: (args: any) => void): void;
}

declare global {
  interface Window {
    solana?: PhantomWallet;
  }
}

// Create a wrapper class that implements WalletAdapter interface
class PhantomWalletAdapter implements WalletAdapter {
  private phantomWallet: PhantomWallet;

  constructor(phantomWallet: PhantomWallet) {
    this.phantomWallet = phantomWallet;
  }

  get publicKey() {
    return this.phantomWallet.publicKey;
  }

  get connected() {
    return this.phantomWallet.isConnected;
  }

  async signTransaction(transaction: any): Promise<any> {
    return this.phantomWallet.signTransaction(transaction);
  }

  async signAllTransactions(transactions: any[]): Promise<any[]> {
    return this.phantomWallet.signAllTransactions(transactions);
  }

  async connect(): Promise<void> {
    await this.phantomWallet.connect();
  }

  async disconnect(): Promise<void> {
    await this.phantomWallet.disconnect();
  }
}

export class WalletService {
  private connection: Connection;
  private wallet: PhantomWallet | null = null;
  private walletAdapter: PhantomWalletAdapter | null = null;
  private listeners: Map<string, Function[]> = new Map();

  constructor() {
    this.connection = new Connection(
      process.env.REACT_APP_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
      'confirmed'
    );
    this.initializeWallet();
  }

  private initializeWallet(): void {
    if (typeof window !== 'undefined' && window.solana?.isPhantom) {
      this.wallet = window.solana;
      this.walletAdapter = new PhantomWalletAdapter(this.wallet);
      this.setupWalletListeners();
    }
  }

  private setupWalletListeners(): void {
    if (!this.wallet) return;

    const handleConnect = (publicKey: PublicKey) => {
      this.emit('connect', { publicKey: publicKey.toString() });
    };

    const handleDisconnect = () => {
      this.emit('disconnect');
    };

    const handleAccountChanged = (publicKey: PublicKey | null) => {
      if (publicKey) {
        this.emit('accountChanged', { publicKey: publicKey.toString() });
      } else {
        this.emit('disconnect');
      }
    };

    this.wallet.on('connect', handleConnect);
    this.wallet.on('disconnect', handleDisconnect);
    this.wallet.on('accountChanged', handleAccountChanged);
  }

  // Return the wallet adapter instead of the raw phantom wallet
  public getWallet(): WalletAdapter | null {
    return this.walletAdapter;
  }

  public async connect(): Promise<WalletState> {
    try {
      if (!this.wallet) {
        throw new Error('Phantom wallet not found. Please install Phantom wallet extension.');
      }

      const response = await this.wallet.connect();
      
      return {
        connected: true,
        publicKey: response.publicKey.toString(),
        connecting: false,
        error: null
      };
    } catch (error: any) {
      return {
        connected: false,
        publicKey: null,
        connecting: false,
        error: error.message || 'Failed to connect wallet'
      };
    }
  }

  public async disconnect(): Promise<void> {
    try {
      if (this.wallet) {
        await this.wallet.disconnect();
      }
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
  }

  public getCurrentWalletState(): WalletState {
    if (!this.wallet) {
      return {
        connected: false,
        publicKey: null,
        connecting: false,
        error: 'Phantom wallet not found'
      };
    }

    return {
      connected: this.wallet.isConnected,
      publicKey: this.wallet.publicKey?.toString() || null,
      connecting: false,
      error: null
    };
  }

  public async getBalance(publicKey?: string): Promise<number> {
    try {
      const pubKey = publicKey ? new PublicKey(publicKey) : this.wallet?.publicKey;
      if (!pubKey) throw new Error('No public key available');

      const balance = await this.connection.getBalance(pubKey);
      return balance / 1e9; // Convert lamports to SOL
    } catch (error) {
      console.error('Error fetching balance:', error);
      return 0;
    }
  }

  public getConnection(): Connection {
    return this.connection;
  }

  public on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  public off(event: string, callback: Function): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(callback);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => callback(data));
    }
  }

  public async signTransaction(transaction: any): Promise<any> {
    if (!this.wallet?.publicKey) {
      throw new Error('Wallet not connected');
    }

    try {
      // In a real implementation, you would sign the transaction here
      // For now, we'll simulate the signing process
      console.log('Signing transaction:', transaction);
      return transaction;
    } catch (error) {
      console.error('Error signing transaction:', error);
      throw error;
    }
  }

  public async sendTransaction(signedTransaction: any): Promise<string> {
    try {
      // In a real implementation, you would send the signed transaction here
      // For now, we'll simulate and return a mock transaction signature
      console.log('Sending transaction:', signedTransaction);
      return 'mock_transaction_signature_' + Date.now();
    } catch (error) {
      console.error('Error sending transaction:', error);
      throw error;
    }
  }
}