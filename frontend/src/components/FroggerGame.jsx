import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Game constants
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const FROG_SIZE = 30;
const GRID_SIZE = 40;

// Level configurations
const LEVELS = {
  1: {
    name: "Lilly Pad Lagoon",
    theme: "pond",
    background: "linear-gradient(180deg, #2563eb 0%, #1e40af 50%, #059669 100%)",
    obstacles: [
      { type: "lily_pad", y: 200, speed: 1, width: 60, spacing: 120 },
      { type: "dragonfly", y: 160, speed: 2, width: 40, spacing: 180 },
      { type: "log", y: 240, speed: -1.5, width: 100, spacing: 200 },
      { type: "lily_pad", y: 280, speed: 0.8, width: 60, spacing: 140 }
    ]
  },
  2: {
    name: "Perilous Pond",
    theme: "deep_water",
    background: "linear-gradient(180deg, #1e3a8a 0%, #1e40af 30%, #0f766e  70%, #134e4a 100%)",
    obstacles: [
      { type: "fish", y: 180, speed: 2.5, width: 50, spacing: 160 },
      { type: "turtle", y: 220, speed: -1.8, width: 70, spacing: 200 },
      { type: "crocodile", y: 260, speed: 3, width: 80, spacing: 220 },
      { type: "log", y: 300, speed: -2, width: 120, spacing: 180 },
      { type: "fish", y: 340, speed: 2.8, width: 50, spacing: 140 }
    ]
  }
};

export const FroggerGame = ({ walletReady, authToken, onRewardEarned, userStats }) => {
  const canvasRef = useRef(null);
  const gameLoopRef = useRef(null);
  const [gameState, setGameState] = useState('menu'); // menu, playing, paused, game_over, level_complete
  const [currentLevel, setCurrentLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [frogPosition, setFrogPosition] = useState({ x: GAME_WIDTH / 2, y: GAME_HEIGHT - 50 });
  const [obstacles, setObstacles] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [levelStartTime, setLevelStartTime] = useState(null);
  const [keys, setKeys] = useState({});

  // Initialize obstacles for current level
  const initializeLevel = useCallback((level) => {
    const levelConfig = LEVELS[level];
    if (!levelConfig) return [];

    const newObstacles = [];
    levelConfig.obstacles.forEach((obstacleConfig, index) => {
      // Create multiple obstacles per row
      const numObstacles = Math.floor(GAME_WIDTH / obstacleConfig.spacing) + 2;
      for (let i = 0; i < numObstacles; i++) {
        newObstacles.push({
          id: `${index}-${i}`,
          type: obstacleConfig.type,
          x: (i * obstacleConfig.spacing) - (Math.random() * obstacleConfig.spacing),
          y: obstacleConfig.y,
          width: obstacleConfig.width,
          height: 30,
          speed: obstacleConfig.speed,
          direction: obstacleConfig.speed > 0 ? 1 : -1
        });
      }
    });

    return newObstacles;
  }, []);

  // Start new game session
  const startGameSession = async () => {
    if (!authToken) {
      alert('Please authenticate your wallet first');
      return;
    }

    try {
      const response = await axios.post(`${API}/game/start`, {}, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if (response.data.success) {
        setSessionId(response.data.session_id);
        setGameState('playing');
        setCurrentLevel(1);
        setScore(0);
        setLives(3);
        setFrogPosition({ x: GAME_WIDTH / 2, y: GAME_HEIGHT - 50 });
        setObstacles(initializeLevel(1));
        setLevelStartTime(Date.now());
        
        if (!response.data.eligible_for_rewards) {
          alert(`Note: ${response.data.eligibility_reason}`);
        }
      }
    } catch (error) {
      console.error('Failed to start game session:', error);
      alert('Failed to start game session. Please try again.');
    }
  };

  // Complete game session
  const completeGameSession = async (finalScore, levelsCompleted) => {
    if (!sessionId || !authToken) return;

    try {
      const response = await axios.post(`${API}/game/complete`, {
        session_id: sessionId,
        score: finalScore,
        levels_completed: levelsCompleted
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if (response.data.success && response.data.reward_awarded) {
        onRewardEarned({
          amount: response.data.reward_amount,
          signature: response.data.transaction_signature,
          type: 'game_completion'
        });
      }

      return response.data;
    } catch (error) {
      console.error('Failed to complete game session:', error);
      return null;
    }
  };

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e) => {
      setKeys(prev => ({ ...prev, [e.key]: true }));
    };

    const handleKeyUp = (e) => {
      setKeys(prev => ({ ...prev, [e.key]: false }));
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Handle frog movement
  useEffect(() => {
    if (gameState !== 'playing') return;

    const moveInterval = setInterval(() => {
      setFrogPosition(prev => {
        let newX = prev.x;
        let newY = prev.y;

        if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
          newX = Math.max(0, prev.x - GRID_SIZE);
        }
        if (keys['ArrowRight'] || keys['d'] || keys['D']) {
          newX = Math.min(GAME_WIDTH - FROG_SIZE, prev.x + GRID_SIZE);
        }
        if (keys['ArrowUp'] || keys['w'] || keys['W']) {
          newY = Math.max(0, prev.y - GRID_SIZE);
          setScore(s => s + 10); // Score for moving forward
        }
        if (keys['ArrowDown'] || keys['s'] || keys['S']) {
          newY = Math.min(GAME_HEIGHT - FROG_SIZE, prev.y + GRID_SIZE);
        }

        return { x: newX, y: newY };
      });
    }, 150);

    return () => clearInterval(moveInterval);
  }, [keys, gameState]);

  // Update obstacles
  useEffect(() => {
    if (gameState !== 'playing') return;

    const updateInterval = setInterval(() => {
      setObstacles(prevObstacles => {
        return prevObstacles.map(obstacle => {
          let newX = obstacle.x + obstacle.speed;
          
          // Wrap around screen
          if (newX > GAME_WIDTH + obstacle.width) {
            newX = -obstacle.width;
          } else if (newX < -obstacle.width) {
            newX = GAME_WIDTH;
          }

          return { ...obstacle, x: newX };
        });
      });
    }, 50);

    return () => clearInterval(updateInterval);
  }, [gameState]);

  // Collision detection
  useEffect(() => {
    if (gameState !== 'playing') return;

    const checkCollisions = () => {
      const frogRect = {
        x: frogPosition.x,
        y: frogPosition.y,
        width: FROG_SIZE,
        height: FROG_SIZE
      };

      // Check obstacle collisions
      for (const obstacle of obstacles) {
        if (
          frogRect.x < obstacle.x + obstacle.width &&
          frogRect.x + frogRect.width > obstacle.x &&
          frogRect.y < obstacle.y + obstacle.height &&
          frogRect.y + frogRect.height > obstacle.y
        ) {
          // Different behavior for different obstacle types
          if (['lily_pad', 'log'].includes(obstacle.type)) {
            // Safe obstacles - frog moves with them
            setFrogPosition(prev => ({
              ...prev,
              x: Math.max(0, Math.min(GAME_WIDTH - FROG_SIZE, prev.x + obstacle.speed))
            }));
          } else {
            // Dangerous obstacles - lose life
            setLives(prev => {
              const newLives = prev - 1;
              if (newLives <= 0) {
                setGameState('game_over');
                completeGameSession(score, currentLevel - 1);
              }
              return newLives;
            });
            
            // Reset frog position
            setFrogPosition({ x: GAME_WIDTH / 2, y: GAME_HEIGHT - 50 });
            return;
          }
        }
      }

      // Check if level completed (reached top)
      if (frogPosition.y <= 50) {
        const timeBonus = Math.max(0, 5000 - (Date.now() - levelStartTime));
        setScore(s => s + 1000 + timeBonus);

        if (currentLevel < Object.keys(LEVELS).length) {
          // Next level
          setCurrentLevel(prev => prev + 1);
          setFrogPosition({ x: GAME_WIDTH / 2, y: GAME_HEIGHT - 50 });
          setObstacles(initializeLevel(currentLevel + 1));
          setLevelStartTime(Date.now());
          setGameState('level_complete');
          setTimeout(() => setGameState('playing'), 2000);
        } else {
          // Game completed
          setGameState('game_over');
          completeGameSession(score + 1000 + timeBonus, currentLevel);
        }
      }
    };

    const collisionInterval = setInterval(checkCollisions, 50);
    return () => clearInterval(collisionInterval);
  }, [gameState, frogPosition, obstacles, currentLevel, score, levelStartTime, sessionId, authToken]);

  // Render game
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    if (gameState === 'menu') {
      // Menu screen
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 40px Inter';
      ctx.textAlign = 'center';
      ctx.fillText("Purpe's Leap", GAME_WIDTH / 2, 150);
      
      ctx.font = '20px Inter';
      ctx.fillText('Web3 Frogger on Solana', GAME_WIDTH / 2, 200);
      
      if (walletReady) {
        ctx.fillStyle = '#10b981';
        ctx.fillText('✅ Ready to Play!', GAME_WIDTH / 2, 300);
        ctx.fillText('Press SPACE to start or click the button below', GAME_WIDTH / 2, 350);
      } else {
        ctx.fillStyle = '#ef4444';
        ctx.fillText('❌ Connect & authenticate wallet first', GAME_WIDTH / 2, 300);
        ctx.fillText('Need $10 USD in PURPE tokens', GAME_WIDTH / 2, 330);
      }

      // Controls
      ctx.fillStyle = '#64748b';
      ctx.font = '16px Inter';
      ctx.fillText('Controls: Arrow Keys or WASD', GAME_WIDTH / 2, 450);
      
      return;
    }

    // Game background
    const levelConfig = LEVELS[currentLevel];
    if (levelConfig) {
      const gradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
      const colors = levelConfig.background.match(/rgb\([^)]*\)|#[a-fA-F0-9]{6}|\w+/g);
      if (colors && colors.length >= 2) {
        gradient.addColorStop(0, colors[0]);
        gradient.addColorStop(1, colors[colors.length - 1]);
      }
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    }

    // Draw water sections
    ctx.fillStyle = '#1e40af80';
    ctx.fillRect(0, 150, GAME_WIDTH, 200);
    
    // Draw safe zones
    ctx.fillStyle = '#059669';
    ctx.fillRect(0, 0, GAME_WIDTH, 50); // Top safe zone
    ctx.fillRect(0, GAME_HEIGHT - 50, GAME_WIDTH, 50); // Bottom safe zone

    // Draw obstacles
    obstacles.forEach(obstacle => {
      switch (obstacle.type) {
        case 'lily_pad':
          ctx.fillStyle = '#16a34a';
          ctx.beginPath();
          ctx.ellipse(obstacle.x + obstacle.width/2, obstacle.y + obstacle.height/2, 
                     obstacle.width/2, obstacle.height/2, 0, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'log':
          ctx.fillStyle = '#92400e';
          ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
          break;
        case 'dragonfly':
          ctx.fillStyle = '#3b82f6';
          ctx.beginPath();
          ctx.ellipse(obstacle.x + obstacle.width/2, obstacle.y + obstacle.height/2,
                     obstacle.width/2, obstacle.height/2, 0, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'fish':
          ctx.fillStyle = '#f97316';
          ctx.beginPath();
          ctx.ellipse(obstacle.x + obstacle.width/2, obstacle.y + obstacle.height/2,
                     obstacle.width/2, obstacle.height/2, 0, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'turtle':
          ctx.fillStyle = '#15803d';
          ctx.beginPath();
          ctx.ellipse(obstacle.x + obstacle.width/2, obstacle.y + obstacle.height/2,
                     obstacle.width/2, obstacle.height/2, 0, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'crocodile':
          ctx.fillStyle = '#166534';
          ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
          break;
      }
    });

    // Draw frog (Purpe)
    ctx.fillStyle = '#a855f7'; // Purple color for Purpe
    ctx.beginPath();
    ctx.ellipse(frogPosition.x + FROG_SIZE/2, frogPosition.y + FROG_SIZE/2,
               FROG_SIZE/2, FROG_SIZE/2, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Frog eyes
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(frogPosition.x + FROG_SIZE/3, frogPosition.y + FROG_SIZE/3, 4, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(frogPosition.x + 2*FROG_SIZE/3, frogPosition.y + FROG_SIZE/3, 4, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // HUD
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, GAME_WIDTH, 40);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px Inter';
    ctx.textAlign = 'left';
    ctx.fillText(`Level: ${currentLevel}`, 10, 25);
    ctx.fillText(`Score: ${score}`, 150, 25);
    ctx.fillText(`Lives: ${'❤️'.repeat(lives)}`, 300, 25);
    
    if (userStats) {
      ctx.textAlign = 'right';
      ctx.fillText(`Daily: ${userStats.daily_rewards_claimed}/10`, GAME_WIDTH - 10, 25);
    }

    // Game state overlays
    if (gameState === 'level_complete') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 32px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(`${levelConfig?.name} Complete!`, GAME_WIDTH / 2, GAME_HEIGHT / 2);
      ctx.font = '18px Inter';
      ctx.fillText('Get ready for the next level...', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40);
    }

    if (gameState === 'game_over') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      
      ctx.fillStyle = lives <= 0 ? '#ef4444' : '#10b981';
      ctx.font = 'bold 32px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(lives <= 0 ? 'Game Over' : 'Victory!', GAME_WIDTH / 2, GAME_HEIGHT / 2);
      ctx.font = '18px Inter';
      ctx.fillText(`Final Score: ${score}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40);
      ctx.fillText(`Levels Completed: ${currentLevel - (lives <= 0 ? 1 : 0)}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 70);
    }

  }, [gameState, currentLevel, frogPosition, obstacles, score, lives, walletReady, userStats]);

  // Handle spacebar to start game
  useEffect(() => {
    const handleSpaceBar = (e) => {
      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        if (gameState === 'menu' && walletReady) {
          startGameSession();
        } else if (gameState === 'game_over') {
          setGameState('menu');
        }
      }
    };

    window.addEventListener('keydown', handleSpaceBar);
    return () => window.removeEventListener('keydown', handleSpaceBar);
  }, [gameState, walletReady]);

  return (
    <div className="game-container flex flex-col items-center space-y-4">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={GAME_WIDTH}
          height={GAME_HEIGHT}
          className="border-4 border-purple-400 rounded-xl shadow-2xl bg-black"
        />
        
        {/* Touch controls for mobile */}
        {gameState === 'playing' && (
          <div className="md:hidden absolute -bottom-24 left-0 right-0 flex justify-center">
            <div className="grid grid-cols-3 gap-2 bg-black/70 p-4 rounded-xl">
              <div></div>
              <button
                onTouchStart={() => setKeys(prev => ({ ...prev, 'ArrowUp': true }))}
                onTouchEnd={() => setKeys(prev => ({ ...prev, 'ArrowUp': false }))}
                className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center text-white text-xl"
              >
                ↑
              </button>
              <div></div>
              <button
                onTouchStart={() => setKeys(prev => ({ ...prev, 'ArrowLeft': true }))}
                onTouchEnd={() => setKeys(prev => ({ ...prev, 'ArrowLeft': false }))}
                className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center text-white text-xl"
              >
                ←
              </button>
              <button
                onTouchStart={() => setKeys(prev => ({ ...prev, 'ArrowDown': true }))}
                onTouchEnd={() => setKeys(prev => ({ ...prev, 'ArrowDown': false }))}
                className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center text-white text-xl"
              >
                ↓
              </button>
              <button
                onTouchStart={() => setKeys(prev => ({ ...prev, 'ArrowRight': true }))}
                onTouchEnd={() => setKeys(prev => ({ ...prev, 'ArrowRight': false }))}
                className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center text-white text-xl"
              >
                →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Game controls */}
      <div className="flex space-x-4">
        {gameState === 'menu' && (
          <button
            onClick={startGameSession}
            disabled={!walletReady}
            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg"
            data-testid="start-game-btn"
          >
            {walletReady ? 'Start Your Leap! 🐸' : 'Connect Wallet to Play'}
          </button>
        )}

        {gameState === 'game_over' && (
          <button
            onClick={() => setGameState('menu')}
            className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl transition-all duration-300 shadow-lg"
          >
            Play Again
          </button>
        )}

        {gameState === 'playing' && (
          <button
            onClick={() => setGameState('paused')}
            className="px-6 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold rounded-lg transition-all duration-300"
          >
            Pause
          </button>
        )}

        {gameState === 'paused' && (
          <button
            onClick={() => setGameState('playing')}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-all duration-300"
          >
            Resume
          </button>
        )}
      </div>

      {/* Level info */}
      {gameState === 'playing' && LEVELS[currentLevel] && (
        <div className="text-center bg-black/30 rounded-xl p-4 border border-purple-400/30">
          <h3 className="text-purple-200 font-bold text-lg">{LEVELS[currentLevel].name}</h3>
          <p className="text-purple-300 text-sm mt-1">
            Guide Purpe across the {LEVELS[currentLevel].theme.replace('_', ' ')}!
          </p>
        </div>
      )}
    </div>
  );
};