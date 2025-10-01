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

  // Check if in demo mode
  const isDemoMode = localStorage.getItem('demo_mode') === 'true';

  return (
    <WalletContextProvider>
      <div className="App min-h-screen" style={{background: 'linear-gradient(135deg, rgb(74, 234, 220) 0%, rgb(151, 120, 209) 20%, rgb(207, 42, 186) 40%, rgb(238, 44, 130) 60%, rgb(251, 105, 98) 80%, rgb(254, 248, 76) 100%)'}}>
        <Toaster position="top-right" richColors />
        
        {/* Hero Header */}
        <header className="relative overflow-hidden">
          <div className="absolute inset-0" style={{background: 'linear-gradient(135deg, rgba(0, 208, 130, 0.3) 0%, rgba(6, 147, 227, 0.3) 50%, rgba(155, 81, 224, 0.3) 100%)', backdropFilter: 'blur(10px)'}}></div>
          <div className="relative container mx-auto px-6 py-12 text-center">
            <div className="mb-8">
              {/* Frog Character Images */}
              <div className="flex justify-center items-center space-x-8 mb-6">
                <img 
                  src="https://customer-assets.emergentagent.com/job_leap-game-1/artifacts/98rfagje_image.png"
                  alt="Diamond Purpe - Wealthy Frog Character"
                  className="w-24 h-24 md:w-32 md:h-32 rounded-full shadow-2xl border-4 border-purple-400/50 hover:scale-110 transition-transform duration-300"
                />
                <div className="text-center">
                  <h1 className="text-6xl md:text-8xl font-bold mb-2" style={{background: 'linear-gradient(135deg, #00d084 0%, #0693e3 50%, #9b51e0 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'}}>
                    Purpe's Leap
                  </h1>
                </div>
                <img 
                  src="https://customer-assets.emergentagent.com/job_leap-game-1/artifacts/b0u4h0la_image.png"
                  alt="Melting Purpe - Mystical Frog Character"
                  className="w-24 h-24 md:w-32 md:h-32 rounded-full shadow-2xl border-4 border-pink-400/50 hover:scale-110 transition-transform duration-300"
                />
              </div>
              <p className="text-xl md:text-2xl mb-2" style={{color: '#8ed1fc'}}>
                Web3 Frogger on Solana
              </p>
              <p className="text-lg max-w-2xl mx-auto" style={{color: '#ffffff'}}>
                Guide Purpe the purple frog through perilous waters and earn real SOL rewards! 
                Play-to-earn gaming powered by Solana blockchain.
              </p>
            </div>

            {/* Game Features */}
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-8">
              <div style={{background: 'linear-gradient(135deg, rgba(0, 208, 130, 0.9) 0%, rgba(122, 220, 180, 0.9) 100%)', backdropFilter: 'blur(15px)'}} className="rounded-xl p-6 border border-white/20 shadow-xl">
                <div className="text-4xl mb-3">🎮</div>
                <h3 className="text-lg font-semibold mb-2" style={{color: '#ffffff'}}>Classic Gameplay</h3>
                <p className="text-sm" style={{color: '#ffffff'}}>Navigate through themed levels with retro Frogger-style mechanics</p>
              </div>
              
              <div style={{background: 'linear-gradient(135deg, rgba(6, 147, 227, 0.9) 0%, rgba(155, 81, 224, 0.9) 100%)', backdropFilter: 'blur(15px)'}} className="rounded-xl p-6 border border-white/20 shadow-xl">
                <div className="text-4xl mb-3">💎</div>
                <h3 className="text-lg font-semibold mb-2" style={{color: '#ffffff'}}>Earn SOL Rewards</h3>
                <p className="text-sm" style={{color: '#ffffff'}}>Complete levels and claim daily bonuses to earn real Solana tokens</p>
              </div>
              
              <div style={{background: 'linear-gradient(135deg, rgba(252, 185, 0, 0.9) 0%, rgba(255, 105, 0, 0.9) 100%)', backdropFilter: 'blur(15px)'}} className="rounded-xl p-6 border border-white/20 shadow-xl">
                <div className="text-4xl mb-3">🏆</div>
                <h3 className="text-lg font-semibold mb-2" style={{color: '#ffffff'}}>Compete & Win</h3>
                <p className="text-sm" style={{color: '#ffffff'}}>Climb the leaderboard and show off your Frogger skills to the world</p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-6 pb-12">
          {/* Navigation Tabs */}
          <div className="flex justify-center mb-8">
            <div style={{background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(20px)'}} className="rounded-2xl p-2 border border-white/20">
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
                        ? 'text-white shadow-lg'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                    style={activeTab === tab.id ? {background: 'linear-gradient(135deg, #0693e3 0%, #9b51e0 100%)'} : {}}
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
                <div className="rounded-2xl border border-white/20 p-6 shadow-2xl" style={{background: 'linear-gradient(135deg, rgba(6, 147, 227, 0.9) 0%, rgba(155, 81, 224, 0.7) 100%)', backdropFilter: 'blur(20px)'}}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold" style={{color: '#ffffff'}}>📊 Quick Stats</h3>
                    {isDemoMode && (
                      <span className="px-2 py-1 rounded-full text-xs font-semibold" style={{background: '#ff6900', color: '#ffffff'}}>
                        DEMO
                      </span>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-blue-200">Today's Rewards:</span>
                      <span className="text-blue-100 font-bold">
                        {userStats.daily_rewards_claimed}/{isDemoMode ? '10' : '10'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-200">PURPE Earned Today:</span>
                      <span className="text-green-400 font-bold">{userStats.total_amount_today.toFixed(2)} PURPE</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-200">Daily Limit:</span>
                      <span className="text-yellow-400 font-bold">
                        {isDemoMode ? '0' : '10'} PURPE
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-200">Total Rewards:</span>
                      <span className="text-yellow-400 font-bold">{userStats.total_rewards_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-200">Total PURPE:</span>
                      <span className="text-green-400 font-bold">{userStats.total_rewards_earned.toFixed(2)} PURPE</span>
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
                  <h4 className="text-lg font-semibold text-gray-100 mb-2">🎯 PURPE Rewards</h4>
                  <div className="space-y-1 text-sm text-gray-300">
                    <div>• Level completion: 0.5 PURPE</div>
                    <div>• Game completion: 1.0 PURPE</div>
                    <div>• Daily bonus: 2.0 PURPE</div>
                    <div>• Daily limit: 10 PURPE maximum (IP locked)</div>
                    <div>• Demo mode: No rewards earned</div>
                  </div>
                </div>
              </div>

              {/* Character Showcase */}
              <div className="bg-gradient-to-br from-indigo-900/50 to-purple-800/50 backdrop-blur-lg rounded-2xl border border-indigo-400/30 p-6 shadow-2xl">
                <h3 className="text-xl font-bold text-indigo-100 mb-4">🐸 Meet Purpe</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <img 
                      src="https://customer-assets.emergentagent.com/job_leap-game-1/artifacts/98rfagje_image.png"
                      alt="Diamond Purpe"
                      className="w-16 h-16 mx-auto rounded-full border-2 border-yellow-400/50 shadow-lg mb-2"
                    />
                    <h4 className="text-yellow-300 font-semibold text-sm">Diamond Purpe</h4>
                    <p className="text-indigo-200 text-xs">The wealthy collector</p>
                  </div>
                  <div className="text-center">
                    <img 
                      src="https://customer-assets.emergentagent.com/job_leap-game-1/artifacts/b0u4h0la_image.png"
                      alt="Mystic Purpe"
                      className="w-16 h-16 mx-auto rounded-full border-2 border-pink-400/50 shadow-lg mb-2"
                    />
                    <h4 className="text-pink-300 font-semibold text-sm">Mystic Purpe</h4>
                    <p className="text-indigo-200 text-xs">The shape-shifter</p>
                  </div>
                </div>
                <p className="text-indigo-200 text-xs mt-4 text-center">
                  Choose your character style and leap through the Web3 waters!
                </p>
              </div>

              {/* PURPE Token Info */}
              {!tokenBalance?.has_minimum_balance && !isDemoMode && (
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

              {/* Demo Mode Info */}
              {isDemoMode && (
                <div className="bg-gradient-to-br from-purple-900/50 to-pink-800/50 backdrop-blur-lg rounded-2xl border border-purple-400/30 p-6 shadow-2xl">
                  <h3 className="text-xl font-bold text-purple-100 mb-4">🎮 Demo Mode Active</h3>
                  <div className="space-y-2 text-sm text-purple-200">
                    <div className="flex items-center">
                      <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                      <span>No PURPE tokens required</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-2 h-2 bg-red-400 rounded-full mr-2"></span>
                      <span>No PURPE rewards earned</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                      <span>Full gameplay experience</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
                      <span>Perfect for testing & learning</span>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-purple-600/30 rounded-lg">
                    <p className="text-purple-100 text-xs text-center">
                      🎯 Perfect for testing gameplay mechanics!
                    </p>
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