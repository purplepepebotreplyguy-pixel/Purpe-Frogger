import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { WalletInterface } from '../components/WalletInterface';

export const LandingPage = () => {
  const navigate = useNavigate();
  const [walletReady, setWalletReady] = useState(false);
  const [tokenBalance, setTokenBalance] = useState(null);

  const handleWalletReady = (ready) => {
    setWalletReady(ready);
  };

  const handlePlayNow = () => {
    navigate('/game');
  };

  return (
    <div className="landing-page min-h-screen" style={{background: 'linear-gradient(135deg, rgb(74, 234, 220) 0%, rgb(151, 120, 209) 20%, rgb(207, 42, 186) 40%, rgb(238, 44, 130) 60%, rgb(251, 105, 98) 80%, rgb(254, 248, 76) 100%)'}}>
      
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20">
        <div className="absolute inset-0" style={{background: 'linear-gradient(135deg, rgba(0, 208, 130, 0.3) 0%, rgba(6, 147, 227, 0.3) 50%, rgba(155, 81, 224, 0.3) 100%)', backdropFilter: 'blur(10px)'}}></div>
        <div className="relative container mx-auto px-6 text-center">
          
          {/* Main Title with Characters */}
          <div className="flex justify-center items-center space-x-8 mb-8">
            <img 
              src="https://customer-assets.emergentagent.com/job_leap-game-1/artifacts/98rfagje_image.png"
              alt="Diamond Purpe - Wealthy Frog Character"
              className="w-32 h-32 md:w-40 md:h-40 rounded-full shadow-2xl border-4 border-white/50 hover:scale-110 transition-transform duration-300"
            />
            <div className="text-center">
              <h1 className="text-7xl md:text-9xl font-bold mb-4" style={{background: 'linear-gradient(135deg, #00d084 0%, #0693e3 50%, #9b51e0 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'}}>
                Purpe's Leap
              </h1>
            </div>
            <img 
              src="https://customer-assets.emergentagent.com/job_leap-game-1/artifacts/b0u4h0la_image.png"
              alt="Mystic Purpe - Mystical Frog Character"
              className="w-32 h-32 md:w-40 md:h-40 rounded-full shadow-2xl border-4 border-white/50 hover:scale-110 transition-transform duration-300"
            />
          </div>

          <p className="text-2xl md:text-3xl mb-4 font-semibold" style={{color: '#ffffff'}}>
            The First Web3 Frogger Game on Solana
          </p>
          <p className="text-xl max-w-4xl mx-auto mb-12" style={{color: '#ffffff'}}>
            Guide Purpe the purple frog through perilous waters and earn real PURPE token rewards! 
            Experience classic arcade gaming powered by Solana blockchain technology.
          </p>

          {/* Call to Action Buttons */}
          <div className="flex flex-col md:flex-row justify-center items-center space-y-4 md:space-y-0 md:space-x-6 mb-16">
            <button
              onClick={handlePlayNow}
              className="px-12 py-4 text-xl font-bold text-white rounded-2xl transition-all duration-300 shadow-2xl hover:scale-105"
              style={{background: 'linear-gradient(135deg, #00d084 0%, #0693e3 100%)'}}
            >
              🎮 Play Now
            </button>
            <button
              onClick={handlePlayNow}
              className="px-8 py-3 text-lg font-semibold text-white rounded-xl transition-all duration-300 shadow-lg"
              style={{background: 'linear-gradient(135deg, #ff6900 0%, #cf2e2e 100%)'}}
            >
              🆓 Try Demo Mode
            </button>
          </div>
        </div>
      </section>

      {/* Game Features */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <h2 className="text-5xl font-bold text-center mb-16" style={{color: '#ffffff'}}>
            🎯 Game Features
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div style={{background: 'linear-gradient(135deg, rgba(0, 208, 130, 0.95) 0%, rgba(122, 220, 180, 0.95) 100%)', backdropFilter: 'blur(15px)'}} className="rounded-2xl p-8 border border-white/30 shadow-2xl text-center">
              <div className="text-6xl mb-6">🎮</div>
              <h3 className="text-2xl font-bold mb-4" style={{color: '#ffffff'}}>Classic Frogger Gameplay</h3>
              <p className="text-lg" style={{color: '#ffffff'}}>Navigate through themed levels including Lilly Pad Lagoon and Perilous Pond with retro arcade mechanics</p>
            </div>
            
            <div style={{background: 'linear-gradient(135deg, rgba(6, 147, 227, 0.95) 0%, rgba(155, 81, 224, 0.95) 100%)', backdropFilter: 'blur(15px)'}} className="rounded-2xl p-8 border border-white/30 shadow-2xl text-center">
              <div className="text-6xl mb-6">💰</div>
              <h3 className="text-2xl font-bold mb-4" style={{color: '#ffffff'}}>Earn PURPE Tokens</h3>
              <p className="text-lg" style={{color: '#ffffff'}}>Complete levels and claim daily bonuses to earn real PURPE tokens with up to 10 PURPE maximum per user</p>
            </div>
            
            <div style={{background: 'linear-gradient(135deg, rgba(252, 185, 0, 0.95) 0%, rgba(255, 105, 0, 0.95) 100%)', backdropFilter: 'blur(15px)'}} className="rounded-2xl p-8 border border-white/30 shadow-2xl text-center">
              <div className="text-6xl mb-6">🏆</div>
              <h3 className="text-2xl font-bold mb-4" style={{color: '#ffffff'}}>Compete & Climb</h3>
              <p className="text-lg" style={{color: '#ffffff'}}>Climb the leaderboard and show off your Frogger skills to players around the world</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20" style={{background: 'rgba(0, 0, 0, 0.3)', backdropFilter: 'blur(10px)'}}>
        <div className="container mx-auto px-6">
          <h2 className="text-5xl font-bold text-center mb-16" style={{color: '#ffffff'}}>
            🚀 How It Works
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center text-3xl font-bold" style={{background: 'linear-gradient(135deg, #00d084 0%, #0693e3 100%)', color: '#ffffff'}}>1</div>
              <h3 className="text-xl font-bold mb-4" style={{color: '#ffffff'}}>Connect Wallet</h3>
              <p className="text-lg" style={{color: '#ffffff'}}>Connect your Solana wallet (Phantom, Solflare, or Trust Wallet) to get started</p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center text-3xl font-bold" style={{background: 'linear-gradient(135deg, #0693e3 0%, #9b51e0 100%)', color: '#ffffff'}}>2</div>
              <h3 className="text-xl font-bold mb-4" style={{color: '#ffffff'}}>Hold PURPE Tokens</h3>
              <p className="text-lg" style={{color: '#ffffff'}}>Need minimum $10 USD worth of PURPE tokens to earn rewards (or try demo mode for free)</p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center text-3xl font-bold" style={{background: 'linear-gradient(135deg, #9b51e0 0%, #cf2e2e 100%)', color: '#ffffff'}}>3</div>
              <h3 className="text-xl font-bold mb-4" style={{color: '#ffffff'}}>Play & Leap</h3>
              <p className="text-lg" style={{color: '#ffffff'}}>Guide Purpe through obstacles using arrow keys, WASD, or mouse clicks</p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center text-3xl font-bold" style={{background: 'linear-gradient(135deg, #cf2e2e 0%, #ff6900 100%)', color: '#ffffff'}}>4</div>
              <h3 className="text-xl font-bold mb-4" style={{color: '#ffffff'}}>Earn Rewards</h3>
              <p className="text-lg" style={{color: '#ffffff'}}>Complete levels to earn PURPE tokens directly to your wallet</p>
            </div>
          </div>
        </div>
      </section>

      {/* Rewards Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <h2 className="text-5xl font-bold text-center mb-16" style={{color: '#ffffff'}}>
            💎 Reward System
          </h2>
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="rounded-2xl p-8 border border-white/30 shadow-2xl" style={{background: 'linear-gradient(135deg, rgba(0, 208, 130, 0.9) 0%, rgba(122, 220, 180, 0.7) 100%)', backdropFilter: 'blur(20px)'}}>
                <h3 className="text-2xl font-bold mb-6" style={{color: '#ffffff'}}>🎮 Gameplay Rewards</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span style={{color: '#ffffff'}}>Level Completion:</span>
                    <span className="font-bold" style={{color: '#ffffff'}}>0.5 PURPE</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{color: '#ffffff'}}>Game Completion:</span>
                    <span className="font-bold" style={{color: '#ffffff'}}>1.0 PURPE</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{color: '#ffffff'}}>Daily Bonus:</span>
                    <span className="font-bold" style={{color: '#ffffff'}}>2.0 PURPE</span>
                  </div>
                </div>
              </div>
              
              <div className="rounded-2xl p-8 border border-white/30 shadow-2xl" style={{background: 'linear-gradient(135deg, rgba(6, 147, 227, 0.9) 0%, rgba(155, 81, 224, 0.7) 100%)', backdropFilter: 'blur(20px)'}}>
                <h3 className="text-2xl font-bold mb-6" style={{color: '#ffffff'}}>🔒 Limits & Security</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span style={{color: '#ffffff'}}>Daily Maximum:</span>
                    <span className="font-bold" style={{color: '#ffffff'}}>10 PURPE</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{color: '#ffffff'}}>IP Address Limit:</span>
                    <span className="font-bold" style={{color: '#ffffff'}}>10 PURPE Total</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{color: '#ffffff'}}>Demo Mode:</span>
                    <span className="font-bold" style={{color: '#ffffff'}}>No Rewards</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Wallet Connection */}
      <section className="py-20" style={{background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(15px)'}}>
        <div className="container mx-auto px-6">
          <h2 className="text-5xl font-bold text-center mb-16" style={{color: '#ffffff'}}>
            🔗 Get Started
          </h2>
          <div className="max-w-2xl mx-auto">
            <WalletInterface
              onWalletReady={handleWalletReady}
              tokenBalance={tokenBalance}
              setTokenBalance={setTokenBalance}
            />
          </div>
        </div>
      </section>

      {/* Character Showcase */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <h2 className="text-5xl font-bold text-center mb-16" style={{color: '#ffffff'}}>
            🐸 Meet the Characters
          </h2>
          <div className="grid md:grid-cols-2 gap-12 max-w-4xl mx-auto">
            <div className="text-center">
              <img 
                src="https://customer-assets.emergentagent.com/job_leap-game-1/artifacts/98rfagje_image.png"
                alt="Diamond Purpe"
                className="w-48 h-48 mx-auto rounded-full border-4 border-yellow-400/50 shadow-2xl mb-6 hover:scale-105 transition-transform duration-300"
              />
              <h3 className="text-3xl font-bold mb-4" style={{color: '#fcb900'}}>Diamond Purpe</h3>
              <p className="text-lg" style={{color: '#ffffff'}}>The wealthy collector who has amassed great riches through skillful leaping. Diamond Purpe represents the ultimate achievement in the Web3 gaming world.</p>
            </div>
            <div className="text-center">
              <img 
                src="https://customer-assets.emergentagent.com/job_leap-game-1/artifacts/b0u4h0la_image.png"
                alt="Mystic Purpe"
                className="w-48 h-48 mx-auto rounded-full border-4 border-pink-400/50 shadow-2xl mb-6 hover:scale-105 transition-transform duration-300"
              />
              <h3 className="text-3xl font-bold mb-4" style={{color: '#f78da7'}}>Mystic Purpe</h3>
              <p className="text-lg" style={{color: '#ffffff'}}>The mystical shape-shifter with ethereal powers. Mystic Purpe embodies the magical essence of the blockchain and the transformative power of DeFi.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16" style={{background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(20px)'}}>
        <div className="container mx-auto px-6">
          <div className="text-center mb-8">
            <h3 className="text-3xl font-bold mb-4" style={{color: '#ffffff'}}>Join the Purpe Community</h3>
            <div className="flex justify-center space-x-8">
              <a 
                href="https://x.com/purplepepes0l" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center space-x-2 px-6 py-3 rounded-xl transition-all duration-300 hover:scale-105"
                style={{background: 'linear-gradient(135deg, #000000 0%, #1da1f2 100%)', color: '#ffffff'}}
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                <span>Follow @purplepepes0l</span>
              </a>
              <a 
                href="https://t.me/Purpe_SOL" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center space-x-2 px-6 py-3 rounded-xl transition-all duration-300 hover:scale-105"
                style={{background: 'linear-gradient(135deg, #0088cc 0%, #00d4aa 100%)', color: '#ffffff'}}
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
                <span>Join Telegram</span>
              </a>
            </div>
          </div>
          
          <div className="text-center">
            <div className="mb-4">
              <p className="text-lg" style={{color: '#ffffff'}}>
                🎮 The First Web3 Frogger Game • 💰 Earn PURPE Tokens • ⚡ Powered by Solana
              </p>
            </div>
            <div style={{color: '#abb8c3'}} className="text-sm">
              © 2025 Purpe's Leap • Built with ❤️ on Solana Devnet
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};