import React, { useState, useEffect } from 'react';
import './App.css';
import { WalletContextProvider } from './components/WalletContextProvider';
import { WalletInterface } from './components/WalletInterface';
import { FroggerGame } from './components/FroggerGame';
import { RewardSystem } from './components/RewardSystem';
import { Leaderboard } from './components/Leaderboard';
import { Toaster, toast } from 'sonner';

function App() {
  const [walletReady, setWalletReady] = useState(false);
  const [tokenBalance, setTokenBalance] = useState(null);
  const [authToken, setAuthToken] = useState(localStorage.getItem('auth_token'));
  const [userStats, setUserStats] = useState(null);
  const [activeTab, setActiveTab] = useState('game');

  // Handle wallet readiness change
  const handleWalletReady = (ready) => {
    setWalletReady(ready);
  };

  // Handle reward earned
  const handleRewardEarned = (reward) => {
    toast.success(
      `🎉 Reward Earned! +${reward.amount.toFixed(6)} SOL`,
      {
        description: `Transaction: ${reward.signature?.slice(0, 16)}...`,
        duration: 5000,
      }
    );
    
    // Refresh stats after earning reward
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  };

  // Handle stats update
  const handleStatsUpdate = (stats) => {
    setUserStats(stats);
  };

  // Update auth token when wallet interface changes it
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    setAuthToken(token);
  }, []);

  return (
    <WalletContextProvider>
      <div className="App min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
        <Toaster position="top-right" richColors />
        
        {/* Hero Header */}
        <header className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur-sm"></div>
          <div className="relative container mx-auto px-6 py-12 text-center">
            <div className="mb-8">
              <h1 className="text-6xl md:text-8xl font-bold bg-gradient-to-r from-emerald-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
                Purpe's Leap
              </h1>
              <p className="text-xl md:text-2xl text-purple-200 mb-2">
                Web3 Frogger on Solana
              </p>
              <p className="text-lg text-purple-300 max-w-2xl mx-auto">
                Guide Purpe the purple frog through perilous waters and earn real SOL rewards! 
                Play-to-earn gaming powered by Solana blockchain.
              </p>
            </div>

            {/* Game Features */}
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-8">
              <div className="bg-black/30 backdrop-blur-lg rounded-xl p-6 border border-emerald-400/30">
                <div className="text-4xl mb-3">🎮</div>
                <h3 className="text-lg font-semibold text-emerald-300 mb-2">Classic Gameplay</h3>
                <p className="text-emerald-200 text-sm">Navigate through themed levels with retro Frogger-style mechanics</p>
              </div>
              
              <div className="bg-black/30 backdrop-blur-lg rounded-xl p-6 border border-purple-400/30">
                <div className="text-4xl mb-3">💎</div>
                <h3 className="text-lg font-semibold text-purple-300 mb-2">Earn SOL Rewards</h3>
                <p className="text-purple-200 text-sm">Complete levels and claim daily bonuses to earn real Solana tokens</p>
              </div>
              
              <div className="bg-black/30 backdrop-blur-lg rounded-xl p-6 border border-pink-400/30">
                <div className="text-4xl mb-3">🏆</div>
                <h3 className="text-lg font-semibold text-pink-300 mb-2">Compete & Win</h3>
                <p className="text-pink-200 text-sm">Climb the leaderboard and show off your Frogger skills to the world</p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-6 pb-12">
          {/* Navigation Tabs */}
          <div className="flex justify-center mb-8">
            <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-2 border border-purple-400/30">
              <div className="flex space-x-2">
                {[
                  { id: 'game', label: '🎮 Game', icon: '🎮' },
                  { id: 'rewards', label: '🎁 Rewards', icon: '🎁' },
                  { id: 'leaderboard', label: '🏆 Leaderboard', icon: '🏆' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                        : 'text-purple-300 hover:text-white hover:bg-white/10'
                    }`}
                    data-testid={`${tab.id}-tab`}
                  >
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.icon}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Content Sections */}
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content Area */}
            <div className="lg:col-span-2 space-y-8">
              {activeTab === 'game' && (
                <div className="space-y-8">
                  <FroggerGame
                    walletReady={walletReady}
                    authToken={authToken}
                    onRewardEarned={handleRewardEarned}
                    userStats={userStats}
                  />
                </div>
              )}

              {activeTab === 'rewards' && (
                <div className="space-y-8">
                  <RewardSystem
                    authToken={authToken}
                    onStatsUpdate={handleStatsUpdate}
                  />
                </div>
              )}

              {activeTab === 'leaderboard' && (
                <div className="space-y-8">
                  <Leaderboard />
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-8">
              {/* Wallet Interface */}
              <WalletInterface
                onWalletReady={handleWalletReady}
                tokenBalance={tokenBalance}
                setTokenBalance={setTokenBalance}
              />

              {/* User Stats Summary (if authenticated) */}
              {userStats && (
                <div className="bg-gradient-to-br from-blue-900/50 to-indigo-800/50 backdrop-blur-lg rounded-2xl border border-blue-400/30 p-6 shadow-2xl">
                  <h3 className="text-xl font-bold text-blue-100 mb-4">📊 Quick Stats</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-blue-200">Today's Rewards:</span>
                      <span className="text-blue-100 font-bold">{userStats.daily_rewards_claimed}/10</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-200">SOL Earned Today:</span>
                      <span className="text-green-400 font-bold">{userStats.total_amount_today.toFixed(6)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-200">Total Rewards:</span>
                      <span className="text-yellow-400 font-bold">{userStats.total_rewards_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-200">Total SOL:</span>
                      <span className="text-green-400 font-bold">{userStats.total_rewards_earned.toFixed(6)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Game Info */}
              <div className="bg-gradient-to-br from-gray-900/50 to-slate-800/50 backdrop-blur-lg rounded-2xl border border-gray-400/30 p-6 shadow-2xl">
                <h3 className="text-xl font-bold text-gray-100 mb-4">📋 How to Play</h3>
                <div className="space-y-3 text-sm text-gray-200">
                  <div className="flex items-start space-x-2">
                    <span className="text-emerald-400">1.</span>
                    <span>Connect your Solana wallet and authenticate</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-emerald-400">2.</span>
                    <span>Hold at least $10 USD worth of PURPE tokens</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-emerald-400">3.</span>
                    <span>Use arrow keys or WASD to move Purpe</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-emerald-400">4.</span>
                    <span>Avoid dangerous obstacles, use safe platforms</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-emerald-400">5.</span>
                    <span>Reach the top to complete levels and earn SOL!</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-400/20">
                  <h4 className="text-lg font-semibold text-gray-100 mb-2">🎯 Rewards</h4>
                  <div className="space-y-1 text-sm text-gray-300">
                    <div>• Level completion: 0.005 SOL</div>
                    <div>• Daily bonus: 0.01 SOL</div>
                    <div>• Daily limit: 0.1 SOL maximum</div>
                  </div>
                </div>
              </div>

              {/* PURPE Token Info */}
              {!tokenBalance?.has_minimum_balance && (
                <div className="bg-gradient-to-br from-purple-900/50 to-violet-800/50 backdrop-blur-lg rounded-2xl border border-purple-400/30 p-6 shadow-2xl">
                  <h3 className="text-xl font-bold text-purple-100 mb-4">💰 Get PURPE Tokens</h3>
                  <p className="text-purple-200 text-sm mb-4">
                    You need at least $10 USD worth of PURPE tokens to play and earn rewards.
                  </p>
                  <div className="space-y-3">
                    <a
                      href="https://jup.ag/swap/SOL-PURPE"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full text-center bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300"
                    >
                      Buy PURPE on Jupiter →
                    </a>
                    <div className="text-xs text-purple-300 text-center">
                      Contract: {process.env.REACT_APP_PURPE_MINT || 'HBoNJ5v8g71s2boRivrHnfSB5MVPLDHHyVjruPfhGkvL'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-black/30 backdrop-blur-lg border-t border-purple-400/20 py-8 mt-12">
          <div className="container mx-auto px-6 text-center">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-purple-200 mb-2">Purpe's Leap</h3>
              <p className="text-purple-300 text-sm">
                The first Web3 Frogger game on Solana • Play-to-earn gaming revolution
              </p>
            </div>
            
            <div className="flex justify-center space-x-6 mb-4">
              <a href="#" className="text-purple-400 hover:text-purple-300 transition-colors">
                🐦 Twitter
              </a>
              <a href="#" className="text-purple-400 hover:text-purple-300 transition-colors">
                💬 Discord  
              </a>
              <a href="https://solana.com" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 transition-colors">
                ⚡ Powered by Solana
              </a>
            </div>

            <div className="text-purple-400 text-xs">
              © 2025 Purpe's Leap • Built with ❤️ on Solana Devnet
            </div>
          </div>
        </footer>
      </div>
    </WalletContextProvider>
  );
}

export default App;