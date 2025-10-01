import { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const WalletInterface = ({ onWalletReady, tokenBalance, setTokenBalance }) => {
  const { connection } = useConnection();
  const { publicKey, connected, wallet } = useWallet();
  const [loading, setLoading] = useState(false);
  const [authToken, setAuthToken] = useState(localStorage.getItem('auth_token'));
  const [authenticating, setAuthenticating] = useState(false);

  // Check PURPE token balance
  const checkPurpeBalance = async () => {
    if (!publicKey || !connected) return;

    setLoading(true);
    try {
      const response = await axios.get(`${API}/token/balance/${publicKey.toBase58()}`);
      const balance = response.data;
      
      setTokenBalance(balance);
      
      // Check if wallet is ready for game (has minimum balance and is authenticated)
      if (balance.has_minimum_balance && authToken) {
        onWalletReady(true);
      } else {
        onWalletReady(false);
      }
    } catch (error) {
      console.error('Error checking PURPE balance:', error);
      setTokenBalance(null);
      onWalletReady(false);
    } finally {
      setLoading(false);
    }
  };

  // Authenticate wallet with challenge-response
  const authenticateWallet = async () => {
    if (!publicKey || !wallet.adapter.signMessage) {
      alert('Wallet does not support message signing');
      return;
    }

    setAuthenticating(true);
    try {
      // Step 1: Get challenge
      const challengeResponse = await axios.post(`${API}/auth/challenge`, {
        wallet_address: publicKey.toBase58()
      });

      if (!challengeResponse.data.success) {
        throw new Error(challengeResponse.data.error);
      }

      const { challenge_key, message } = challengeResponse.data;

      // Step 2: Sign message
      const messageBytes = new TextEncoder().encode(message);
      const signature = await wallet.adapter.signMessage(messageBytes);

      // Step 3: Verify signature
      const verifyResponse = await axios.post(`${API}/auth/verify`, {
        challenge_key,
        signature: JSON.stringify(Array.from(signature)),
        wallet_address: publicKey.toBase58()
      });

      if (verifyResponse.data.success) {
        const token = verifyResponse.data.access_token;
        setAuthToken(token);
        localStorage.setItem('auth_token', token);
        
        // Recheck balance with authentication
        checkPurpeBalance();
      } else {
        throw new Error('Authentication failed');
      }

    } catch (error) {
      console.error('Authentication error:', error);
      alert('Authentication failed: ' + error.message);
    } finally {
      setAuthenticating(false);
    }
  };

  // Effect to check balance when wallet connects
  useEffect(() => {
    if (connected && publicKey) {
      checkPurpeBalance();
    } else {
      setTokenBalance(null);
      onWalletReady(false);
      // Clear auth token if wallet disconnects
      if (!connected) {
        setAuthToken(null);
        localStorage.removeItem('auth_token');
      }
    }
  }, [connected, publicKey]);

  // Effect to validate existing auth token
  useEffect(() => {
    if (authToken && publicKey) {
      // Validate token by checking user stats
      axios.get(`${API}/user/stats`, {
        headers: { Authorization: `Bearer ${authToken}` }
      }).then(() => {
        // Token is valid, recheck balance
        checkPurpeBalance();
      }).catch(() => {
        // Token is invalid, clear it
        setAuthToken(null);
        localStorage.removeItem('auth_token');
      });
    }
  }, [authToken, publicKey]);

  return (
    <div className="wallet-interface bg-gradient-to-br from-emerald-900/80 to-teal-800/80 backdrop-blur-lg rounded-2xl border border-emerald-400/30 p-6 shadow-2xl">
      <div className="flex flex-col items-center space-y-4">
        {/* Wallet Connection */}
        <div className="flex flex-col items-center space-y-3">
          <h3 className="text-xl font-bold text-emerald-100 mb-2">
            Connect Your Solana Wallet
          </h3>
          <WalletMultiButton className="!bg-gradient-to-r !from-emerald-500 !to-teal-500 hover:!from-emerald-600 hover:!to-teal-600 !border-none !rounded-xl !px-6 !py-3 !text-white !font-semibold !transition-all !duration-300 !shadow-lg hover:!shadow-emerald-500/50" />
        </div>

        {/* Wallet Info */}
        {connected && publicKey && (
          <div className="w-full space-y-4">
            <div className="bg-black/30 rounded-xl p-4 border border-emerald-400/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-emerald-200 text-sm">Connected Wallet:</span>
                <span className="text-emerald-100 font-mono text-xs">
                  {publicKey.toBase58().slice(0, 8)}...{publicKey.toBase58().slice(-8)}
                </span>
              </div>
              
              {/* Token Balance */}
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-emerald-400 border-t-transparent"></div>
                  <span className="ml-2 text-emerald-200">Checking PURPE balance...</span>
                </div>
              ) : tokenBalance ? (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-emerald-200">PURPE Balance:</span>
                    <span className="text-emerald-100 font-bold">
                      {tokenBalance.balance.toFixed(6)} PURPE
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-emerald-200">USD Value:</span>
                    <span className="text-emerald-100 font-bold">
                      ${tokenBalance.usd_value.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-200">Minimum Requirement:</span>
                    <span className={`font-bold flex items-center ${tokenBalance.has_minimum_balance ? 'text-green-400' : 'text-red-400'}`}>
                      {tokenBalance.has_minimum_balance ? '✅' : '❌'} 
                      <span className="ml-1">${10} minimum</span>
                    </span>
                  </div>
                  
                  {/* Authentication Status */}
                  <div className="mt-4 pt-4 border-t border-emerald-400/20">
                    {!authToken ? (
                      <div className="space-y-2">
                        <p className="text-amber-300 text-sm">
                          🔒 Wallet authentication required to play
                        </p>
                        <button
                          onClick={authenticateWallet}
                          disabled={authenticating}
                          className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {authenticating ? (
                            <div className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                              Authenticating...
                            </div>
                          ) : (
                            'Authenticate Wallet'
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center text-green-400">
                        ✅ <span className="ml-2">Wallet Authenticated</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-red-400">❌ No PURPE tokens found</p>
                  <p className="text-emerald-200 text-sm mt-1">
                    You need at least $10 USD worth of PURPE tokens to play
                  </p>
                </div>
              )}
            </div>

            {/* Requirements Summary */}
            {tokenBalance && (
              <div className="bg-black/30 rounded-xl p-4 border border-emerald-400/20">
                <h4 className="text-emerald-100 font-semibold mb-3">Game Requirements:</h4>
                <div className="space-y-2 text-sm">
                  <div className={`flex items-center ${tokenBalance.has_minimum_balance ? 'text-green-400' : 'text-red-400'}`}>
                    {tokenBalance.has_minimum_balance ? '✅' : '❌'}
                    <span className="ml-2">Minimum $10 USD in PURPE tokens</span>
                  </div>
                  <div className={`flex items-center ${authToken ? 'text-green-400' : 'text-yellow-400'}`}>
                    {authToken ? '✅' : '⏳'}
                    <span className="ml-2">Wallet authentication</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Get PURPE Tokens Link */}
        {connected && tokenBalance && !tokenBalance.has_minimum_balance && (
          <div className="w-full bg-purple-900/30 rounded-xl p-4 border border-purple-400/30">
            <p className="text-purple-200 text-sm mb-2">Need PURPE tokens?</p>
            <a
              href="https://jup.ag/swap/SOL-PURPE"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-purple-300 hover:text-purple-200 underline text-sm"
            >
              Get PURPE on Jupiter Exchange →
            </a>
          </div>
        )}
      </div>
    </div>
  );
};