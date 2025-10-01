import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { WalletInterface } from '../components/WalletInterface';
import { RewardSystem } from '../components/RewardSystem';
import { Leaderboard } from '../components/Leaderboard';
import { Toaster, toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Game constants - 8-bit style
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const GRID_SIZE = 32; // 8-bit grid size
const FROG_SIZE = GRID_SIZE - 2; // Slightly smaller than grid
const GRID_ROWS = Math.floor(GAME_HEIGHT / GRID_SIZE);
const GRID_COLS = Math.floor(GAME_WIDTH / GRID_SIZE);

// 8-bit color palette
const COLORS = {
  water: '#4ECDC4', // Vibrant teal
  grass: '#2E8B57', // Dark green
  grassBorder: '#1E5C2F', // Darker green border
  lilyPad: '#32CD32', // Lime green
  lilyPadPattern: '#90EE90', // Light green pattern
  log: '#8B4513', // Saddle brown
  logPattern: '#DEB887', // Burlywood for wood grain
  frog: '#9932CC', // Dark orchid (Purpe's color)
  frogEyes: '#FFFFFF', // White eyes
  frogPupils: '#000000', // Black pupils
  rocks: '#696969', // Dim gray
  text: '#FFFFFF' // White text
};

// Level configurations
const LEVELS = {
  1: {
    name: "Lilly Pad Lagoon",
    theme: "pond",
    background: "#2563eb",
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
    background: "#1e3a8a",
    obstacles: [
      { type: "fish", y: 180, speed: 2.5, width: 50, spacing: 160 },
      { type: "turtle", y: 220, speed: -1.8, width: 70, spacing: 200 },
      { type: "crocodile", y: 260, speed: 3, width: 80, spacing: 220 },
      { type: "log", y: 300, speed: -2, width: 120, spacing: 180 },
      { type: "fish", y: 340, speed: 2.8, width: 50, spacing: 140 }
    ]
  }
};

export const GamePage = () => {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  
  // Game state
  const [gameState, setGameState] = useState('menu'); // menu, playing, paused, game_over, level_complete
  const [currentLevel, setCurrentLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [frogPosition, setFrogPosition] = useState({ x: GAME_WIDTH / 2 - FROG_SIZE / 2, y: GAME_HEIGHT - 80 });
  const [obstacles, setObstacles] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [levelStartTime, setLevelStartTime] = useState(null);
  
  // UI state
  const [activeTab, setActiveTab] = useState('game');
  const [walletReady, setWalletReady] = useState(false);
  const [tokenBalance, setTokenBalance] = useState(null);
  const [authToken, setAuthToken] = useState(localStorage.getItem('auth_token'));
  const [userStats, setUserStats] = useState(null);

  // Input handling
  const [keys, setKeys] = useState({});
  const [lastMoveTime, setLastMoveTime] = useState(0);

  // Initialize obstacles for current level
  const initializeLevel = useCallback((level) => {
    const levelConfig = LEVELS[level];
    if (!levelConfig) return [];

    const newObstacles = [];
    levelConfig.obstacles.forEach((obstacleConfig, index) => {
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

  // Handle wallet readiness
  const handleWalletReady = (ready) => {
    setWalletReady(ready);
  };

  // Handle reward earned
  const handleRewardEarned = (reward) => {
    toast.success(
      `🎉 Reward Earned! +${reward.amount.toFixed(2)} PURPE`,
      {
        description: `Transaction: ${reward.signature?.slice(0, 16)}...`,
        duration: 5000,
      }
    );
  };

  // Handle stats update
  const handleStatsUpdate = (stats) => {
    setUserStats(stats);
  };

  // Start new game session
  const startGameSession = async () => {
    if (!authToken) {
      toast.error('Please authenticate your wallet first');
      return;
    }

    try {
      const response = await axios.post(`${API}/game/start`, {}, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if (response.data.success) {
        setSessionId(response.data.session_id);
        initializeGame();
        
        if (!response.data.eligible_for_rewards) {
          toast.info(response.data.eligibility_reason);
        }
      }
    } catch (error) {
      console.error('Failed to start game session:', error);
      if (localStorage.getItem('demo_mode') === 'true') {
        setSessionId('demo_session');
        initializeGame();
      } else {
        toast.error('Failed to start game session. Please try again.');
      }
    }
  };

  // Initialize game state
  const initializeGame = () => {
    setCurrentLevel(1);
    setScore(0);
    setLives(3);
    setFrogPosition({ x: GAME_WIDTH / 2 - FROG_SIZE / 2, y: GAME_HEIGHT - 80 });
    setObstacles(initializeLevel(1));
    setLevelStartTime(Date.now());
    setGameState('playing');
  };

  // Force start game
  const forceStartGame = () => {
    setSessionId('demo_session');
    initializeGame();
    toast.success('Game started! Use arrow keys, WASD, or click to move.');
  };

  // Complete game session
  const completeGameSession = async (finalScore, levelsCompleted) => {
    if (!sessionId || !authToken || sessionId === 'demo_session') return;

    try {
      const response = await axios.post(`${API}/game/complete`, {
        session_id: sessionId,
        score: finalScore,
        levels_completed: levelsCompleted
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if (response.data.success && response.data.reward_awarded) {
        handleRewardEarned({
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
      e.preventDefault();
      setKeys(prev => ({ ...prev, [e.key.toLowerCase()]: true }));
    };

    const handleKeyUp = (e) => {
      e.preventDefault();
      setKeys(prev => ({ ...prev, [e.key.toLowerCase()]: false }));
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Handle mouse clicks on canvas
  useEffect(() => {
    const handleCanvasClick = (e) => {
      if (gameState !== 'playing') return;
      
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Scale coordinates to game size
      const gameX = (x / rect.width) * GAME_WIDTH;
      const gameY = (y / rect.height) * GAME_HEIGHT;
      
      // Calculate movement direction based on click position relative to frog
      const frogCenterX = frogPosition.x + FROG_SIZE / 2;
      const frogCenterY = frogPosition.y + FROG_SIZE / 2;
      
      const dx = gameX - frogCenterX;
      const dy = gameY - frogCenterY;
      
      // Move frog in direction of click
      moveFrog(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
    };

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('click', handleCanvasClick);
      return () => canvas.removeEventListener('click', handleCanvasClick);
    }
  }, [gameState, frogPosition]);

  // Handle frog movement with throttling
  const moveFrog = useCallback((direction) => {
    const currentTime = Date.now();
    if (currentTime - lastMoveTime < 150) return; // Throttle movement
    
    setLastMoveTime(currentTime);
    
    setFrogPosition(prev => {
      let newX = prev.x;
      let newY = prev.y;

      switch (direction) {
        case 'left':
          newX = Math.max(0, prev.x - GRID_SIZE);
          break;
        case 'right':
          newX = Math.min(GAME_WIDTH - FROG_SIZE, prev.x + GRID_SIZE);
          break;
        case 'up':
          newY = Math.max(0, prev.y - GRID_SIZE);
          if (newY < prev.y) {
            setScore(s => s + 10); // Score for moving forward
          }
          break;
        case 'down':
          newY = Math.min(GAME_HEIGHT - FROG_SIZE, prev.y + GRID_SIZE);
          break;
        default:
          return prev;
      }

      return { x: newX, y: newY };
    });
  }, [lastMoveTime]);

  // Handle keyboard movement
  useEffect(() => {
    if (gameState !== 'playing') return;

    const moveInterval = setInterval(() => {
      if (keys['arrowleft'] || keys['a']) {
        moveFrog('left');
      }
      if (keys['arrowright'] || keys['d']) {
        moveFrog('right');
      }
      if (keys['arrowup'] || keys['w']) {
        moveFrog('up');
      }
      if (keys['arrowdown'] || keys['s']) {
        moveFrog('down');
      }
    }, 50);

    return () => clearInterval(moveInterval);
  }, [keys, gameState, moveFrog]);

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
            setFrogPosition({ x: GAME_WIDTH / 2 - FROG_SIZE / 2, y: GAME_HEIGHT - 80 });
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
          setFrogPosition({ x: GAME_WIDTH / 2 - FROG_SIZE / 2, y: GAME_HEIGHT - 80 });
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
    const render = () => {
      ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      if (gameState === 'menu') {
        // Menu screen
        const gradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
        gradient.addColorStop(0, '#4a5568');
        gradient.addColorStop(1, '#1a202c');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px Inter';
        ctx.textAlign = 'center';
        ctx.fillText("Purpe's Leap", GAME_WIDTH / 2, 120);
        
        ctx.font = '18px Inter';
        ctx.fillText('Web3 Frogger on Solana', GAME_WIDTH / 2, 160);
        
        // Game preview frog
        const previewGradient = ctx.createRadialGradient(
          GAME_WIDTH / 2, 200, 0,
          GAME_WIDTH / 2, 200, 20
        );
        previewGradient.addColorStop(0, '#c084fc');
        previewGradient.addColorStop(1, '#7c3aed');
        ctx.fillStyle = previewGradient;
        ctx.beginPath();
        ctx.ellipse(GAME_WIDTH / 2, 200, 20, 20, 0, 0, Math.PI * 2);
        ctx.fill();
        
        if (walletReady) {
          ctx.fillStyle = '#10b981';
          ctx.font = '16px Inter';
          ctx.fillText('✅ Ready to Play!', GAME_WIDTH / 2, 280);
          ctx.fillText('Click buttons below or press SPACE', GAME_WIDTH / 2, 305);
          
          const isDemoMode = localStorage.getItem('demo_mode') === 'true';
          if (isDemoMode) {
            ctx.fillStyle = '#ff6900';
            ctx.fillText('🎮 Demo Mode - No Rewards', GAME_WIDTH / 2, 330);
          } else {
            ctx.fillStyle = '#fcb900';
            ctx.fillText('💰 Earn up to 10 PURPE tokens!', GAME_WIDTH / 2, 330);
          }
        } else {
          ctx.fillStyle = '#ef4444';
          ctx.font = '16px Inter';
          ctx.fillText('❌ Connect wallet or try quick start', GAME_WIDTH / 2, 280);
          ctx.fillText('Need $10 USD in PURPE tokens for rewards', GAME_WIDTH / 2, 305);
        }

        ctx.fillStyle = '#a0aec0';
        ctx.font = '14px Inter';
        ctx.fillText('Controls: Arrow Keys, WASD, or Click/Tap', GAME_WIDTH / 2, 420);
        ctx.fillText('Goal: Reach the top while avoiding obstacles!', GAME_WIDTH / 2, 440);
        
        return;
      }

      // Game background
      const levelConfig = LEVELS[currentLevel];
      if (levelConfig) {
        ctx.fillStyle = levelConfig.background;
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

      // Draw frog (Purpe) with enhanced graphics
      const frogGradient = ctx.createRadialGradient(
        frogPosition.x + FROG_SIZE/2, frogPosition.y + FROG_SIZE/2, 0,
        frogPosition.x + FROG_SIZE/2, frogPosition.y + FROG_SIZE/2, FROG_SIZE/2
      );
      frogGradient.addColorStop(0, '#c084fc');
      frogGradient.addColorStop(0.5, '#a855f7');
      frogGradient.addColorStop(1, '#7c3aed');
      
      ctx.fillStyle = frogGradient;
      ctx.beginPath();
      ctx.ellipse(frogPosition.x + FROG_SIZE/2, frogPosition.y + FROG_SIZE/2,
                 FROG_SIZE/2, FROG_SIZE/2, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Frog eyes
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      
      ctx.beginPath();
      ctx.ellipse(frogPosition.x + FROG_SIZE/3, frogPosition.y + FROG_SIZE/3, 5, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      ctx.beginPath();
      ctx.ellipse(frogPosition.x + 2*FROG_SIZE/3, frogPosition.y + FROG_SIZE/3, 5, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      // Pupils
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.ellipse(frogPosition.x + FROG_SIZE/3, frogPosition.y + FROG_SIZE/3, 2, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(frogPosition.x + 2*FROG_SIZE/3, frogPosition.y + FROG_SIZE/3, 2, 3, 0, 0, Math.PI * 2);
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
    };

    render();
    animationRef.current = requestAnimationFrame(() => {
      if (canvasRef.current) render();
    });

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
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

  // Update auth token
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    setAuthToken(token);
  }, []);

  const isDemoMode = localStorage.getItem('demo_mode') === 'true';

  return (
    <div className="game-page min-h-screen" style={{background: 'linear-gradient(135deg, rgb(74, 234, 220) 0%, rgb(151, 120, 209) 20%, rgb(207, 42, 186) 40%, rgb(238, 44, 130) 60%, rgb(251, 105, 98) 80%, rgb(254, 248, 76) 100%)'}}>
      <Toaster position="top-right" richColors />
      
      {/* Header */}
      <header className="py-4" style={{background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(10px)'}}>
        <div className="container mx-auto px-6 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center space-x-2 px-4 py-2 text-white rounded-xl transition-all duration-300"
            style={{background: 'linear-gradient(135deg, #00d084 0%, #0693e3 100%)'}}
          >
            <span>← Back to Home</span>
          </button>
          <h1 className="text-3xl font-bold" style={{color: '#ffffff'}}>🎮 Purpe's Leap Game</h1>
          <div></div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
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

        {/* Content */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-2">
            {activeTab === 'game' && (
              <div className="space-y-6">
                {/* Game Canvas */}
                <div className="flex flex-col items-center space-y-4">
                  <canvas
                    ref={canvasRef}
                    width={GAME_WIDTH}
                    height={GAME_HEIGHT}
                    className="border-4 border-white/30 rounded-xl shadow-2xl bg-black cursor-pointer"
                    style={{maxWidth: '100%', height: 'auto'}}
                  />
                  
                  {/* Game Controls */}
                  <div className="flex flex-col items-center space-y-4">
                    {gameState === 'menu' && (
                      <div className="flex space-x-4">
                        <button
                          onClick={startGameSession}
                          disabled={!walletReady}
                          className="px-8 py-3 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg"
                          style={{background: walletReady ? 'linear-gradient(135deg, #00d084 0%, #0693e3 100%)' : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)'}}
                          data-testid="start-game-btn"
                        >
                          {walletReady ? 'Start Your Leap! 🐸' : 'Connect Wallet to Play'}
                        </button>
                        
                        <button
                          onClick={forceStartGame}
                          className="px-6 py-3 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg"
                          style={{background: 'linear-gradient(135deg, #ff6900 0%, #cf2e2e 100%)'}}
                          data-testid="force-start-btn"
                        >
                          🎮 Quick Start
                        </button>
                      </div>
                    )}

                    {gameState === 'game_over' && (
                      <button
                        onClick={() => setGameState('menu')}
                        className="px-8 py-3 text-white font-bold rounded-xl transition-all duration-300 shadow-lg"
                        style={{background: 'linear-gradient(135deg, #00d084 0%, #7bdcb5 100%)'}}
                      >
                        Play Again
                      </button>
                    )}

                    {gameState === 'playing' && (
                      <div className="flex space-x-4">
                        <button
                          onClick={() => setGameState('paused')}
                          className="px-6 py-2 text-white font-semibold rounded-lg transition-all duration-300"
                          style={{background: 'linear-gradient(135deg, #fcb900 0%, #ff6900 100%)'}}
                        >
                          Pause
                        </button>
                        <button
                          onClick={() => setGameState('menu')}
                          className="px-6 py-2 text-white font-semibold rounded-lg transition-all duration-300"
                          style={{background: 'linear-gradient(135deg, #cf2e2e 0%, #ff6900 100%)'}}
                        >
                          Exit
                        </button>
                      </div>
                    )}

                    {gameState === 'paused' && (
                      <button
                        onClick={() => setGameState('playing')}
                        className="px-6 py-2 text-white font-semibold rounded-lg transition-all duration-300"
                        style={{background: 'linear-gradient(135deg, #00d084 0%, #7bdcb5 100%)'}}
                      >
                        Resume
                      </button>
                    )}
                  </div>

                  {/* Level info */}
                  {gameState === 'playing' && LEVELS[currentLevel] && (
                    <div className="text-center rounded-xl p-4 border border-white/30" style={{background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(10px)'}}>
                      <h3 className="text-white font-bold text-lg">{LEVELS[currentLevel].name}</h3>
                      <p className="text-white/80 text-sm mt-1">
                        Guide Purpe across the {LEVELS[currentLevel].theme.replace('_', ' ')}!
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'rewards' && (
              <RewardSystem
                authToken={authToken}
                onStatsUpdate={handleStatsUpdate}
              />
            )}

            {activeTab === 'leaderboard' && (
              <Leaderboard />
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Wallet Interface */}
            <WalletInterface
              onWalletReady={handleWalletReady}
              tokenBalance={tokenBalance}
              setTokenBalance={setTokenBalance}
            />

            {/* User Stats */}
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
                    <span style={{color: '#ffffff'}}>Today's Rewards:</span>
                    <span className="font-bold" style={{color: '#ffffff'}}>
                      {userStats.daily_rewards_claimed}/{isDemoMode ? '0' : '10'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{color: '#ffffff'}}>PURPE Earned Today:</span>
                    <span className="text-green-300 font-bold">{userStats.total_amount_today.toFixed(2)} PURPE</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{color: '#ffffff'}}>Total PURPE:</span>
                    <span className="text-green-300 font-bold">{userStats.total_rewards_earned.toFixed(2)} PURPE</span>
                  </div>
                </div>
              </div>
            )}

            {/* Controls Guide */}
            <div className="rounded-2xl border border-white/20 p-6 shadow-2xl" style={{background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(20px)'}}>
              <h3 className="text-xl font-bold mb-4" style={{color: '#ffffff'}}>🎮 Controls</h3>
              <div className="space-y-2 text-sm" style={{color: '#ffffff'}}>
                <div>• Arrow Keys or WASD to move</div>
                <div>• Click anywhere on canvas to move toward cursor</div>
                <div>• Space bar to start game (when wallet connected)</div>
                <div>• Avoid red obstacles (fish, crocodiles, dragonflies)</div>
                <div>• Use green platforms (lily pads, logs) to cross safely</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};