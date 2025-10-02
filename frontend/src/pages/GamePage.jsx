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

// Sprite sheet configuration - Using actual coordinates from sprite sheet
const SPRITE_CONFIG = {
  url: 'https://raw.githubusercontent.com/purplepepebotreplyguy-pixel/Purpe-Frogger/main/character_sprites_animation_v2.png',
  frameWidth: 104, // Actual frame width
  frameHeight: 118, // Actual frame height
  startX: 56, // Starting X coordinate  
  startY: 82, // Starting Y coordinate
  totalFrames: 17,
  layout: { cols: 17, rows: 1 },
  animations: {
    idle: { startFrame: 0, endFrame: 0, duration: 1000 },
    up: { startFrame: 1, endFrame: 3, duration: 100 },
    down: { startFrame: 4, endFrame: 6, duration: 100 },
    left: { startFrame: 7, endFrame: 9, duration: 100 },
    right: { startFrame: 10, endFrame: 12, duration: 100 },
    bonus: { startFrame: 13, endFrame: 15, duration: 150 },
    splatter: { startFrame: 16, endFrame: 16, duration: 500 }
  }
};

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

// Level configurations - 8-bit style
const LEVELS = {
  1: {
    name: "Lily Pads",
    theme: "pond",
    backgroundColor: COLORS.water,
    rows: [
      { type: "safe", y: 1, color: COLORS.grass }, // Top safe zone (goal)
      { type: "rocks", y: 2, speed: 0, spacing: 4 }, // Decorative rocks
      { type: "water", y: 3 },
      { type: "lily_pad", y: 4, speed: 0, spacing: 3, offset: 0 }, // Stationary lily pads
      { type: "water", y: 5 },
      { type: "lily_pad", y: 6, speed: 0, spacing: 4, offset: 1 }, // Offset lily pads
      { type: "water", y: 7 },
      { type: "log", y: 8, speed: 1, length: 3, spacing: 6, offset: 0 }, // Moving logs
      { type: "water", y: 9 },
      { type: "lily_pad", y: 10, speed: 0, spacing: 2, offset: 0 }, // Dense lily pads
      { type: "water", y: 11 },
      { type: "log", y: 12, speed: -1, length: 4, spacing: 7, offset: 2 }, // Opposite direction logs
      { type: "water", y: 13 },
      { type: "lily_pad", y: 14, speed: 0, spacing: 3, offset: 2 }, // More lily pads
      { type: "water", y: 15 },
      { type: "water", y: 16 },
      { type: "safe", y: 17, color: COLORS.grass }, // Bottom safe zone (start)
    ]
  },
  2: {
    name: "Perilous Pond",
    theme: "deep_water",
    backgroundColor: COLORS.water,
    rows: [
      { type: "safe", y: 1, color: COLORS.grass },
      { type: "crocodile", y: 3, speed: 2, spacing: 5 },
      { type: "log", y: 5, speed: -1.5, length: 3, spacing: 6 },
      { type: "turtle", y: 7, speed: 1.2, spacing: 4 },
      { type: "log", y: 9, speed: 2, length: 4, spacing: 8 },
      { type: "fish", y: 11, speed: -2.5, spacing: 3 },
      { type: "lily_pad", y: 13, speed: 0, spacing: 5 },
      { type: "log", y: 15, speed: 1.8, length: 2, spacing: 7 },
      { type: "safe", y: 17, color: COLORS.grass }
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
  
  // Sprite animation state
  const [spriteSheet, setSpriteSheet] = useState(null);
  const [currentAnimation, setCurrentAnimation] = useState('idle');
  const [currentFrame, setCurrentFrame] = useState(0);
  const [animationStartTime, setAnimationStartTime] = useState(Date.now());
  const [lastDirection, setLastDirection] = useState(null);
  
  // UI state
  const [activeTab, setActiveTab] = useState('game');
  const [walletReady, setWalletReady] = useState(false);
  const [tokenBalance, setTokenBalance] = useState(null);
  const [authToken, setAuthToken] = useState(localStorage.getItem('auth_token'));
  const [userStats, setUserStats] = useState(null);

  // Input handling
  const [keys, setKeys] = useState({});
  const [lastMoveTime, setLastMoveTime] = useState(0);

  // Load sprite sheet
  useEffect(() => {
    const loadSpriteSheet = () => {
      const img = new Image();
      img.crossOrigin = 'anonymous'; // Enable CORS
      img.onload = () => {
        console.log(`Sprite sheet loaded successfully: ${img.width}x${img.height} pixels from ${SPRITE_CONFIG.url}`);
        console.log(`Expected frames: ${SPRITE_CONFIG.totalFrames} (${SPRITE_CONFIG.layout.cols}x${SPRITE_CONFIG.layout.rows})`);
        console.log(`Frame size: ${SPRITE_CONFIG.frameWidth}x${SPRITE_CONFIG.frameHeight}`);
        setSpriteSheet(img);
      };
      img.onerror = (error) => {
        console.error('Failed to load sprite sheet:', error);
        console.error('URL was:', SPRITE_CONFIG.url);
        // Fallback to basic rendering if sprite sheet fails
        setSpriteSheet(null);
      };
      img.src = SPRITE_CONFIG.url;
    };

    loadSpriteSheet();
  }, []);

  // Animation system
  const updateAnimation = useCallback(() => {
    if (!spriteSheet) return;

    const now = Date.now();
    const animation = SPRITE_CONFIG.animations[currentAnimation];
    if (!animation) return;

    const elapsed = now - animationStartTime;
    const frameCount = animation.endFrame - animation.startFrame + 1;
    const frameDuration = animation.duration;

    if (frameCount === 1) {
      // Single frame animation (idle, splatter)
      setCurrentFrame(animation.startFrame);
    } else {
      // Multi-frame animation
      const frameIndex = Math.floor(elapsed / frameDuration) % frameCount;
      setCurrentFrame(animation.startFrame + frameIndex);
    }
  }, [spriteSheet, currentAnimation, animationStartTime]);

  // Update animation frames
  useEffect(() => {
    const animationInterval = setInterval(updateAnimation, 50); // 20 FPS for animations
    return () => clearInterval(animationInterval);
  }, [updateAnimation]);

  // Initialize obstacles for current level - 8-bit grid system
  const initializeLevel = useCallback((level) => {
    const levelConfig = LEVELS[level];
    if (!levelConfig) return [];

    const newObstacles = [];
    
    levelConfig.rows.forEach((row, rowIndex) => {
      if (row.type === 'safe' || row.type === 'water') return;
      
      const y = row.y * GRID_SIZE;
      
      if (row.type === 'lily_pad') {
        // Create lily pads across the row
        for (let col = row.offset || 0; col < GRID_COLS; col += row.spacing || 3) {
          newObstacles.push({
            id: `lily_pad_${row.y}_${col}`,
            type: 'lily_pad',
            x: col * GRID_SIZE,
            y: y,
            gridX: col,
            gridY: row.y,
            width: GRID_SIZE,
            height: GRID_SIZE,
            speed: row.speed || 0,
            safe: true
          });
        }
      } else if (row.type === 'log') {
        // Create moving logs
        const logLength = row.length || 3;
        const numLogs = Math.ceil(GRID_COLS / (row.spacing || 6)) + 1;
        
        for (let i = 0; i < numLogs; i++) {
          const startX = (i * (row.spacing || 6) * GRID_SIZE) + ((row.offset || 0) * GRID_SIZE);
          newObstacles.push({
            id: `log_${row.y}_${i}`,
            type: 'log',
            x: startX,
            y: y,
            width: logLength * GRID_SIZE,
            height: GRID_SIZE,
            speed: row.speed || 1,
            safe: true,
            length: logLength
          });
        }
      } else if (row.type === 'rocks') {
        // Create decorative rocks
        for (let col = 0; col < GRID_COLS; col += row.spacing || 4) {
          const rockCol = col + Math.floor(Math.random() * 2); // Some randomness
          if (rockCol < GRID_COLS) {
            newObstacles.push({
              id: `rock_${row.y}_${rockCol}`,
              type: 'rock',
              x: rockCol * GRID_SIZE,
              y: y,
              gridX: rockCol,
              gridY: row.y,
              width: GRID_SIZE,
              height: GRID_SIZE,
              speed: 0,
              safe: false,
              decorative: true
            });
          }
        }
      } else {
        // Other obstacle types (fish, turtle, crocodile)
        const numObstacles = Math.ceil(GRID_COLS / (row.spacing || 4)) + 1;
        for (let i = 0; i < numObstacles; i++) {
          const startX = i * (row.spacing || 4) * GRID_SIZE;
          newObstacles.push({
            id: `${row.type}_${row.y}_${i}`,
            type: row.type,
            x: startX,
            y: y,
            width: GRID_SIZE,
            height: GRID_SIZE,
            speed: row.speed || 1,
            safe: false
          });
        }
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

  // Initialize game state - 8-bit grid positioning
  const initializeGame = useCallback(() => {
    setCurrentLevel(1);
    setScore(0);
    setLives(3);
    // Start frog in center of bottom safe zone
    const startGridX = Math.floor(GRID_COLS / 2);
    const startGridY = GRID_ROWS - 2; // Second to last row (safe zone)
    setFrogPosition({ 
      x: startGridX * GRID_SIZE + 2, 
      y: startGridY * GRID_SIZE + 2,
      gridX: startGridX,
      gridY: startGridY
    });
    setObstacles(initializeLevel(1));
    setLevelStartTime(Date.now());
    setGameState('playing');
  }, [initializeLevel]);

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

  // Handle frog movement with grid-based positioning
  const moveFrog = useCallback((direction) => {
    if (gameState !== 'playing') return;
    
    const currentTime = Date.now();
    if (currentTime - lastMoveTime < 200) return; // Slightly slower for 8-bit feel
    
    setLastMoveTime(currentTime);
    
    // Trigger movement animation
    if (direction !== lastDirection) {
      setCurrentAnimation(direction);
      setAnimationStartTime(currentTime);
      setLastDirection(direction);
    }
    
    // Reset to idle animation after movement
    setTimeout(() => {
      setCurrentAnimation('idle');
      setAnimationStartTime(Date.now());
      setLastDirection(null);
    }, 300);
    
    setFrogPosition(prev => {
      let newGridX = prev.gridX || Math.floor(prev.x / GRID_SIZE);
      let newGridY = prev.gridY || Math.floor(prev.y / GRID_SIZE);

      switch (direction) {
        case 'left':
          newGridX = Math.max(0, newGridX - 1);
          break;
        case 'right':
          newGridX = Math.min(GRID_COLS - 1, newGridX + 1);
          break;
        case 'up':
          newGridY = Math.max(1, newGridY - 1);
          if (newGridY < (prev.gridY || Math.floor(prev.y / GRID_SIZE))) {
            setScore(s => s + 10); // Score for moving forward
          }
          break;
        case 'down':
          newGridY = Math.min(GRID_ROWS - 2, newGridY + 1);
          break;
        default:
          return prev;
      }

      return { 
        x: newGridX * GRID_SIZE + 2, 
        y: newGridY * GRID_SIZE + 2,
        gridX: newGridX,
        gridY: newGridY
      };
    });
  }, [gameState, lastMoveTime, lastDirection]);

  // Handle mouse clicks on canvas - grid-based movement
  useEffect(() => {
    const handleCanvasClick = (e) => {
      if (gameState !== 'playing') return;
      
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Scale coordinates to game size and convert to grid
      const gameX = (x / rect.width) * GAME_WIDTH;
      const gameY = (y / rect.height) * GAME_HEIGHT;
      const clickGridX = Math.floor(gameX / GRID_SIZE);
      const clickGridY = Math.floor(gameY / GRID_SIZE);
      
      // Calculate movement direction based on grid position
      const dx = clickGridX - (frogPosition.gridX || Math.floor(frogPosition.x / GRID_SIZE));
      const dy = clickGridY - (frogPosition.gridY || Math.floor(frogPosition.y / GRID_SIZE));
      
      // Move one step in the direction of the click
      if (Math.abs(dx) > Math.abs(dy)) {
        moveFrog(dx > 0 ? 'right' : 'left');
      } else {
        moveFrog(dy > 0 ? 'down' : 'up');
      }
    };

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('click', handleCanvasClick);
      return () => canvas.removeEventListener('click', handleCanvasClick);
    }
  }, [gameState, frogPosition, moveFrog]);

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

  // Grid-based collision detection and water safety
  useEffect(() => {
    if (gameState !== 'playing') return;

    const checkCollisions = () => {
      const frogGridX = frogPosition.gridX;
      const frogGridY = frogPosition.gridY;
      
      // Check if frog is in water without a platform
      const levelConfig = LEVELS[currentLevel];
      const currentRow = levelConfig?.rows?.find(row => row.y === frogGridY);
      
      let isOnSafePlatform = false;
      let platformSpeed = 0;
      
      if (currentRow?.type === 'safe') {
        isOnSafePlatform = true;
      } else {
        // Check if frog is on any obstacle
        for (const obstacle of obstacles) {
          const obstacleGridX = Math.floor(obstacle.x / GRID_SIZE);
          const obstacleGridY = Math.floor(obstacle.y / GRID_SIZE);
          const obstacleWidth = Math.ceil(obstacle.width / GRID_SIZE);
          
          if (obstacleGridY === frogGridY && 
              frogGridX >= obstacleGridX && 
              frogGridX < obstacleGridX + obstacleWidth) {
            
            if (obstacle.safe) {
              isOnSafePlatform = true;
              platformSpeed = obstacle.speed || 0;
              break;
            } else if (!obstacle.decorative) {
              // Hit a dangerous obstacle - trigger death animation
              setCurrentAnimation('splatter');
              setAnimationStartTime(Date.now());
              
              setTimeout(() => {
                setLives(prev => {
                  const newLives = prev - 1;
                  if (newLives <= 0) {
                    setGameState('game_over');
                    completeGameSession(score, currentLevel - 1);
                  }
                  return newLives;
                });
                
                // Reset frog position and animation
                const startGridX = Math.floor(GRID_COLS / 2);
                const startGridY = GRID_ROWS - 2;
                setFrogPosition({ 
                  x: startGridX * GRID_SIZE + 2, 
                  y: startGridY * GRID_SIZE + 2,
                  gridX: startGridX,
                  gridY: startGridY
                });
                setCurrentAnimation('idle');
                setAnimationStartTime(Date.now());
              }, SPRITE_CONFIG.animations.splatter.duration);
              
              return;
            }
          }
        }
      }
      
      // If in water without platform, frog drowns
      if (!isOnSafePlatform && currentRow?.type !== 'safe') {
        // Trigger death animation
        setCurrentAnimation('splatter');
        setAnimationStartTime(Date.now());
        
        setTimeout(() => {
          setLives(prev => {
            const newLives = prev - 1;
            if (newLives <= 0) {
              setGameState('game_over');
              completeGameSession(score, currentLevel - 1);
            }
            return newLives;
          });
          
          // Reset frog position and animation
          const startGridX = Math.floor(GRID_COLS / 2);
          const startGridY = GRID_ROWS - 2;
          setFrogPosition({ 
            x: startGridX * GRID_SIZE + 2, 
            y: startGridY * GRID_SIZE + 2,
            gridX: startGridX,
            gridY: startGridY
          });
          setCurrentAnimation('idle');
          setAnimationStartTime(Date.now());
        }, SPRITE_CONFIG.animations.splatter.duration);
        
        return;
      }
      
      // Move frog with moving platform
      if (isOnSafePlatform && platformSpeed !== 0) {
        setFrogPosition(prev => {
          const newX = prev.x + platformSpeed;
          const newGridX = Math.floor(newX / GRID_SIZE);
          
          // Don't let frog go off screen
          if (newGridX < 0 || newGridX >= GRID_COLS) {
            // Frog falls off moving platform - trigger death animation
            setCurrentAnimation('splatter');
            setAnimationStartTime(Date.now());
            
            setTimeout(() => {
              setLives(prevLives => Math.max(0, prevLives - 1));
              const startGridX = Math.floor(GRID_COLS / 2);
              const startGridY = GRID_ROWS - 2;
              setCurrentAnimation('idle');
              setAnimationStartTime(Date.now());
            }, SPRITE_CONFIG.animations.splatter.duration);
            
            return { 
              x: startGridX * GRID_SIZE + 2, 
              y: startGridY * GRID_SIZE + 2,
              gridX: startGridX,
              gridY: startGridY
            };
          }
          
          return {
            ...prev,
            x: newX,
            gridX: newGridX
          };
        });
      }

      // Check if level completed (reached top safe zone)
      if (frogGridY <= 1) {
        const timeBonus = Math.max(0, 1000 - Math.floor((Date.now() - levelStartTime) / 1000) * 10);
        setScore(s => s + 1000 + timeBonus);

        if (currentLevel < Object.keys(LEVELS).length) {
          // Next level
          setCurrentLevel(prev => {
            const nextLevel = prev + 1;
            const startGridX = Math.floor(GRID_COLS / 2);
            const startGridY = GRID_ROWS - 2;
            setFrogPosition({ 
              x: startGridX * GRID_SIZE + 2, 
              y: startGridY * GRID_SIZE + 2,
              gridX: startGridX,
              gridY: startGridY
            });
            setObstacles(initializeLevel(nextLevel));
            setLevelStartTime(Date.now());
            return nextLevel;
          });
          setGameState('level_complete');
          setTimeout(() => setGameState('playing'), 2000);
        } else {
          // Game completed
          setGameState('game_over');
          completeGameSession(score + 1000 + timeBonus, currentLevel);
        }
      }
    };

    const collisionInterval = setInterval(checkCollisions, 100);
    return () => clearInterval(collisionInterval);
  }, [gameState, frogPosition, obstacles, currentLevel, score, levelStartTime, sessionId, authToken]);

  // 8-bit pixel art drawing functions
  const draw8BitPixel = (ctx, x, y, color, size = 4) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, size, size);
  };

  // Draw sprite from sprite sheet
  const drawSprite = (ctx, frameIndex, x, y, width = FROG_SIZE, height = FROG_SIZE) => {
    if (!spriteSheet || frameIndex < 0 || frameIndex >= SPRITE_CONFIG.totalFrames) {
      console.log(`Sprite drawing failed: spriteSheet=${!!spriteSheet}, frameIndex=${frameIndex}, totalFrames=${SPRITE_CONFIG.totalFrames}`);
      return false; // Return false if sprite drawing failed
    }

    try {
      // Calculate source position on sprite sheet
      const col = frameIndex % SPRITE_CONFIG.layout.cols;
      const row = Math.floor(frameIndex / SPRITE_CONFIG.layout.cols);
      
      const srcX = col * SPRITE_CONFIG.frameWidth;
      const srcY = row * SPRITE_CONFIG.frameHeight;

      // Debug logging for first few calls
      if (frameIndex === 0) {
        console.log(`Drawing sprite: frame=${frameIndex}, col=${col}, row=${row}, srcX=${srcX}, srcY=${srcY}, destX=${x}, destY=${y}`);
        console.log(`Sprite sheet size: ${spriteSheet.width}x${spriteSheet.height}`);
      }

      // Draw the sprite
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        spriteSheet,
        srcX, srcY, SPRITE_CONFIG.frameWidth, SPRITE_CONFIG.frameHeight, // Source
        x, y, width, height // Destination
      );
      return true;
    } catch (error) {
      console.error('Error drawing sprite:', error);
      return false;
    }
  };

  const draw8BitSprite = (ctx, x, y, width, height, primaryColor, pattern = null) => {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = primaryColor;
    ctx.fillRect(x, y, width, height);
    
    if (pattern) {
      ctx.fillStyle = pattern.color;
      switch (pattern.type) {
        case 'crosshatch':
          // Draw crosshatch pattern for lily pads
          for (let i = 0; i < width; i += 8) {
            ctx.fillRect(x + i, y, 2, height);
          }
          for (let i = 0; i < height; i += 8) {
            ctx.fillRect(x, y + i, width, 2);
          }
          break;
        case 'woodgrain':
          // Draw wood grain for logs
          for (let i = 0; i < height; i += 6) {
            ctx.fillRect(x, y + i, width, 2);
          }
          for (let i = 0; i < width; i += 12) {
            ctx.fillRect(x + i, y, 2, height);
          }
          break;
        case 'scales':
          // Draw scale pattern for creatures
          for (let i = 0; i < width; i += 6) {
            for (let j = 0; j < height; j += 6) {
              ctx.fillRect(x + i, y + j, 2, 2);
            }
          }
          break;
      }
    }
  };

  // Render game with 8-bit graphics
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false; // Keep pixels sharp
    
    const render = () => {
      ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      if (gameState === 'menu') {
        // 8-bit style menu screen
        ctx.fillStyle = COLORS.water;
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        
        // Draw grid background
        ctx.strokeStyle = '#FFFFFF20';
        ctx.lineWidth = 1;
        for (let i = 0; i <= GRID_COLS; i++) {
          ctx.beginPath();
          ctx.moveTo(i * GRID_SIZE, 0);
          ctx.lineTo(i * GRID_SIZE, GAME_HEIGHT);
          ctx.stroke();
        }
        for (let i = 0; i <= GRID_ROWS; i++) {
          ctx.beginPath();
          ctx.moveTo(0, i * GRID_SIZE);
          ctx.lineTo(GAME_WIDTH, i * GRID_SIZE);
          ctx.stroke();
        }
        
        ctx.fillStyle = COLORS.text;
        ctx.font = 'bold 28px monospace';
        ctx.textAlign = 'center';
        ctx.fillText("LEVEL 1: LILY PADS", GAME_WIDTH / 2, 120);
        
        ctx.font = '16px monospace';
        ctx.fillText('8-BIT WEB3 FROGGER', GAME_WIDTH / 2, 150);
        
        // Draw preview frog (sprite or fallback)
        const previewX = GAME_WIDTH / 2 - GRID_SIZE / 2;
        const previewY = 200;
        
        // Try to draw sprite, fallback to basic rectangle
        const spriteDrawn = drawSprite(ctx, 0, previewX, previewY, GRID_SIZE - 4, GRID_SIZE - 4);
        if (!spriteDrawn) {
          // Fallback to basic 8-bit frog
          draw8BitSprite(ctx, previewX, previewY, GRID_SIZE - 4, GRID_SIZE - 4, COLORS.frog);
          
          // Frog eyes
          ctx.fillStyle = COLORS.frogEyes;
          ctx.fillRect(previewX + 6, previewY + 6, 6, 6);
          ctx.fillRect(previewX + 16, previewY + 6, 6, 6);
          ctx.fillStyle = COLORS.frogPupils;
          ctx.fillRect(previewX + 8, previewY + 8, 2, 2);
          ctx.fillRect(previewX + 18, previewY + 8, 2, 2);
        }
        
        if (walletReady) {
          ctx.fillStyle = '#00FF00';
          ctx.font = '14px monospace';
          ctx.fillText('READY TO PLAY!', GAME_WIDTH / 2, 280);
          ctx.fillText('PRESS SPACE OR CLICK BUTTONS', GAME_WIDTH / 2, 300);
          
          const isDemoMode = localStorage.getItem('demo_mode') === 'true';
          if (isDemoMode) {
            ctx.fillStyle = '#FF6600';
            ctx.fillText('DEMO MODE - NO REWARDS', GAME_WIDTH / 2, 320);
          } else {
            ctx.fillStyle = '#FFFF00';
            ctx.fillText('EARN UP TO 10 PURPE TOKENS!', GAME_WIDTH / 2, 320);
          }
        } else {
          ctx.fillStyle = '#FF0000';
          ctx.font = '14px monospace';
          ctx.fillText('CONNECT WALLET OR TRY QUICK START', GAME_WIDTH / 2, 280);
          ctx.fillText('NEED $10 IN PURPE TOKENS', GAME_WIDTH / 2, 300);
        }

        ctx.fillStyle = '#CCCCCC';
        ctx.font = '12px monospace';
        ctx.fillText('ARROW KEYS / WASD / MOUSE CLICK', GAME_WIDTH / 2, 420);
        ctx.fillText('REACH THE TOP TO WIN!', GAME_WIDTH / 2, 440);
        
        return;
      }

      // Draw 8-bit game world
      const levelConfig = LEVELS[currentLevel];
      if (levelConfig) {
        ctx.fillStyle = levelConfig.backgroundColor;
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      }

      // Draw grid background (subtle)
      ctx.strokeStyle = '#FFFFFF10';
      ctx.lineWidth = 1;
      for (let i = 0; i <= GRID_COLS; i++) {
        ctx.beginPath();
        ctx.moveTo(i * GRID_SIZE, 0);
        ctx.lineTo(i * GRID_SIZE, GAME_HEIGHT);
        ctx.stroke();
      }
      for (let i = 0; i <= GRID_ROWS; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * GRID_SIZE);
        ctx.lineTo(GAME_WIDTH, i * GRID_SIZE);
        ctx.stroke();
      }

      // Draw level background zones
      if (levelConfig && levelConfig.rows) {
        levelConfig.rows.forEach(row => {
          const y = row.y * GRID_SIZE;
          if (row.type === 'safe') {
            ctx.fillStyle = row.color;
            ctx.fillRect(0, y, GAME_WIDTH, GRID_SIZE);
          }
        });
      }

      // Draw 8-bit obstacles
      obstacles.forEach(obstacle => {
        switch (obstacle.type) {
          case 'lily_pad':
            draw8BitSprite(ctx, obstacle.x, obstacle.y, obstacle.width, obstacle.height, 
              COLORS.lilyPad, { type: 'crosshatch', color: COLORS.lilyPadPattern });
            break;
          case 'log':
            draw8BitSprite(ctx, obstacle.x, obstacle.y, obstacle.width, obstacle.height,
              COLORS.log, { type: 'woodgrain', color: COLORS.logPattern });
            break;
          case 'rock':
            draw8BitSprite(ctx, obstacle.x, obstacle.y, obstacle.width, obstacle.height, COLORS.rocks);
            break;
          case 'fish':
            draw8BitSprite(ctx, obstacle.x, obstacle.y, obstacle.width, obstacle.height,
              '#FF6600', { type: 'scales', color: '#FFAA00' });
            break;
          case 'turtle':
            draw8BitSprite(ctx, obstacle.x, obstacle.y, obstacle.width, obstacle.height,
              '#228B22', { type: 'scales', color: '#32CD32' });
            break;
          case 'crocodile':
            draw8BitSprite(ctx, obstacle.x, obstacle.y, obstacle.width, obstacle.height,
              '#006400', { type: 'scales', color: '#228B22' });
            break;
        }
      });

      // Draw animated frog (Purpe)
      const spriteDrawn = drawSprite(ctx, currentFrame, frogPosition.x, frogPosition.y, FROG_SIZE, FROG_SIZE);
      if (!spriteDrawn) {
        // Fallback to basic 8-bit frog if sprite fails
        draw8BitSprite(ctx, frogPosition.x, frogPosition.y, FROG_SIZE, FROG_SIZE, COLORS.frog);
        
        // Frog eyes (8-bit style)
        ctx.fillStyle = COLORS.frogEyes;
        ctx.fillRect(frogPosition.x + 6, frogPosition.y + 6, 6, 6);
        ctx.fillRect(frogPosition.x + 16, frogPosition.y + 6, 6, 6);
        
        // Pupils
        ctx.fillStyle = COLORS.frogPupils;
        ctx.fillRect(frogPosition.x + 8, frogPosition.y + 8, 2, 2);
        ctx.fillRect(frogPosition.x + 18, frogPosition.y + 8, 2, 2);
      }

      // 8-bit HUD
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(0, 0, GAME_WIDTH, 32);
      
      ctx.fillStyle = COLORS.text;
      ctx.font = '14px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`LVL:${currentLevel}`, 8, 20);
      ctx.fillText(`SCORE:${score}`, 80, 20);
      ctx.fillText(`LIVES:${lives}`, 180, 20);
      
      if (userStats) {
        ctx.textAlign = 'right';
        ctx.fillText(`DAILY:${userStats.daily_rewards_claimed}/10`, GAME_WIDTH - 8, 20);
      }

      // Level title at bottom
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(0, GAME_HEIGHT - 32, GAME_WIDTH, 32);
      ctx.fillStyle = COLORS.text;
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`LEVEL ${currentLevel}: ${levelConfig?.name?.toUpperCase()}`, GAME_WIDTH / 2, GAME_HEIGHT - 10);

      // 8-bit style overlays
      if (gameState === 'level_complete') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        
        ctx.fillStyle = '#00FF00';
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${levelConfig?.name?.toUpperCase()} COMPLETE!`, GAME_WIDTH / 2, GAME_HEIGHT / 2);
        ctx.font = '16px monospace';
        ctx.fillText('LOADING NEXT LEVEL...', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40);
      }

      if (gameState === 'game_over') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        
        ctx.fillStyle = lives <= 0 ? '#FF0000' : '#00FF00';
        ctx.font = 'bold 32px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(lives <= 0 ? 'GAME OVER' : 'VICTORY!', GAME_WIDTH / 2, GAME_HEIGHT / 2);
        ctx.font = '16px monospace';
        ctx.fillText(`FINAL SCORE: ${score}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40);
        ctx.fillText(`LEVELS: ${currentLevel - (lives <= 0 ? 1 : 0)}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 70);
      }
    };

    render();
    
    // Continuous rendering loop for smooth animation
    const animate = () => {
      if (canvasRef.current && gameState === 'playing') {
        render();
      }
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState, currentLevel, frogPosition, obstacles, score, lives, walletReady, userStats, spriteSheet, currentFrame, currentAnimation]);

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