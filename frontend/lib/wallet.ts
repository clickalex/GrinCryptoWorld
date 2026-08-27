/** MetaMask / EIP-1193 injected-provider helpers (WalletConnect adapters plug in the same interface). */

export interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] | object }): Promise<unknown>;
  on?(event: string, handler: (...args: any[]) => void): void;
  removeListener?(event: string, handler: (...args: any[]) => void): void;
  isMetaMask?: boolean;
}

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

export function hasWallet(): boolean {
  return typeof window !== 'undefined' && !!window.ethereum;
}

export async function connectWallet(): Promise<{ address: string; chainId: string }> {
  if (!hasWallet()) throw new Error('No Ethereum wallet detected. Install MetaMask and try again.');
  const accounts = (await window.ethereum!.request({ method: 'eth_requestAccounts' })) as string[];
  const chainId = (await window.ethereum!.request({ method: 'eth_chainId' })) as string;
  if (!accounts?.length) throw new Error('Wallet connection was rejected.');
  return { address: accounts[0], chainId };
}

export async function signMessage(message: string): Promise<string> {
  if (!hasWallet()) throw new Error('No Ethereum wallet detected.');
  const accounts = (await window.ethereum!.request({ method: 'eth_accounts' })) as string[];
  if (!accounts?.length) throw new Error('Please connect your wallet first.');
  return (await window.ethereum!.request({ method: 'personal_sign', params: [toHex(message), accounts[0]] })) as string;
}

function toHex(s: string): string {
  return (
    '0x' +
    Array.from(new TextEncoder().encode(s))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  );
}
