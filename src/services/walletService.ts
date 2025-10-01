import { PublicKey } from '@solana/web3.js';

export class WalletService {
  private wallet: any = null;

  async connect(): Promise<void> {
    try {
      if (!window.solana) {
        throw new Error('Please install Phantom wallet');
      }

      const response = await window.solana.connect();
      this.wallet = window.solana;
      console.log('Wallet connected:', response.publicKey.toString());
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.wallet) {
      await this.wallet.disconnect();
      this.wallet = null;
    }
  }

  isConnected(): boolean {
    return this.wallet?.isConnected || false;
  }

  getPublicKey(): PublicKey | null {
    return this.wallet?.publicKey || null;
  }

  async signTransaction(transaction: any): Promise<any> {
    if (!this.wallet) {
      throw new Error('Wallet not connected');
    }
    return await this.wallet.signTransaction(transaction);
  }
}

// Add Phantom wallet type to window
declare global {
  interface Window {
    solana?: any;
  }
}