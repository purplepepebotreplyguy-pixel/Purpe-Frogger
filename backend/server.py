from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import Dict, List, Optional
from datetime import datetime, timezone, timedelta
from decimal import Decimal
import jwt
import json
import time
import logging
import os
import uuid
import asyncio
from pathlib import Path
from dotenv import load_dotenv

# Solana imports
from solathon import Client, PublicKey
import httpx
import secrets
import hashlib

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Solana client
solana_client = Client(os.environ.get('SOLANA_RPC_ENDPOINT', 'https://api.devnet.solana.com'))

# Security
security = HTTPBearer()

# FastAPI app
app = FastAPI(
    title="Purpe's Leap - Solana Web3 Frogger Game",
    description="Play-to-earn Frogger-style game on Solana",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Models
class WalletChallenge(BaseModel):
    wallet_address: str

class ChallengeResponse(BaseModel):
    success: bool
    challenge_key: Optional[str] = None
    message: Optional[str] = None
    expires_in: Optional[int] = None
    error: Optional[str] = None

class SignatureVerification(BaseModel):
    challenge_key: str
    signature: str
    wallet_address: str

class TokenBalance(BaseModel):
    wallet_address: str
    balance: float
    usd_value: float
    has_minimum_balance: bool
    account_exists: bool
    token_price: float
    last_updated: str

class RewardClaim(BaseModel):
    reward_type: str = "game_completion"

class RewardResponse(BaseModel):
    success: bool
    amount_sol: Optional[float] = None
    transaction_signature: Optional[str] = None
    reward_type: Optional[str] = None
    error: Optional[str] = None
    next_eligible: Optional[str] = None

class UserStats(BaseModel):
    wallet_address: str
    daily_rewards_claimed: int
    total_amount_today: float
    daily_limit: float
    remaining_today: float
    total_rewards_earned: float
    total_rewards_count: int

# Global variables for simple in-memory storage (use Redis in production)
auth_challenges = {}
user_rewards_today = {}

# Helper Functions
def create_jwt_token(payload: Dict) -> str:
    """Create JWT token"""
    try:
        now = datetime.now(timezone.utc)
        payload.update({
            "iat": now,
            "exp": now + timedelta(hours=int(os.getenv("JWT_EXPIRATION_HOURS", "24"))),
            "iss": "Purpes Leap"
        })
        
        token = jwt.encode(payload, os.getenv("JWT_SECRET_KEY"), algorithm=os.getenv("JWT_ALGORITHM", "HS256"))
        return token
    except Exception as e:
        logger.error(f"Error creating JWT token: {e}")
        raise HTTPException(status_code=500, detail="Failed to create token")

def verify_jwt_token(token: str) -> Dict:
    """Verify JWT token"""
    try:
        payload = jwt.decode(
            token,
            os.getenv("JWT_SECRET_KEY"),
            algorithms=[os.getenv("JWT_ALGORITHM", "HS256")]
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current authenticated user"""
    try:
        payload = verify_jwt_token(credentials.credentials)
        wallet_address = payload.get("wallet_address")
        demo_mode = payload.get("demo_mode", False)
        
        if not wallet_address:
            raise HTTPException(status_code=401, detail="Invalid token")
            
        return {
            "wallet_address": wallet_address,
            "demo_mode": demo_mode
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error validating token: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")

def validate_wallet_address(address: str) -> bool:
    """Validate Solana wallet address format"""
    try:
        if not address or len(address) != 44:
            return False
        PublicKey(address)
        return True
    except Exception:
        return False

async def get_purpe_token_balance(wallet_address: str) -> Dict:
    """Get PURPE token balance for wallet (simplified mock for MVP)"""
    try:
        # For MVP, we'll mock the token balance check
        # In production, implement proper SPL token balance checking
        
        # Mock data - simulate user having sufficient PURPE tokens
        mock_balance = 15.0  # Mock 15 PURPE tokens
        token_price = await get_purpe_price()
        usd_value = mock_balance * token_price
        
        min_requirement = float(os.getenv("MINIMUM_PURPE_USD_REQUIREMENT", "10.0"))
        
        # For demo purposes, always return sufficient balance
        # In production, implement real token balance checking
        return {
            "balance": mock_balance,
            "usd_value": usd_value,
            "has_minimum_balance": True,  # Always true for MVP demo
            "account_exists": True,
            "token_price": token_price
        }
            
    except Exception as e:
        logger.error(f"Error getting PURPE balance: {e}")
        # Return demo values even on error
        return {
            "balance": 15.0,
            "usd_value": 225.0,
            "has_minimum_balance": True,
            "account_exists": True,
            "token_price": 15.0
        }

async def get_purpe_price() -> float:
    """Get PURPE token price (mock implementation)"""
    # In production, integrate with Jupiter, CoinGecko, etc.
    return 15.0  # Mock price of $15 per PURPE

def get_daily_key(wallet_address: str) -> str:
    """Get daily key for reward tracking"""
    today = datetime.now(timezone.utc).date()
    return f"{wallet_address}:{today}"

async def check_reward_eligibility(wallet_address: str, demo_mode: bool = False) -> Dict:
    """Check if user is eligible for rewards"""
    try:
        # For demo mode, use relaxed eligibility (but still enforce rate limits)
        if demo_mode:
            # Check daily limits for demo users
            daily_key = get_daily_key(wallet_address)
            daily_rewards = user_rewards_today.get(daily_key, {"count": 0, "total_amount": 0, "last_reward": 0})
            
            # Demo users get reduced daily limit
            demo_daily_limit = 0.05  # 0.05 SOL max for demo users
            
            if daily_rewards["total_amount"] >= demo_daily_limit:
                tomorrow = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
                return {
                    "eligible": False,
                    "reason": "Demo daily limit reached (0.05 SOL max for demo mode)",
                    "next_eligible": tomorrow.isoformat(),
                    "demo_mode": True
                }
            
            # Check minimum interval (shorter for demo)
            demo_min_interval = 60  # 1 minute for demo users
            if daily_rewards["last_reward"] and (time.time() - daily_rewards["last_reward"]) < demo_min_interval:
                next_eligible = datetime.fromtimestamp(daily_rewards["last_reward"] + demo_min_interval, timezone.utc)
                return {
                    "eligible": False,
                    "reason": f"Must wait {demo_min_interval} seconds between rewards (demo mode)",
                    "next_eligible": next_eligible.isoformat(),
                    "demo_mode": True
                }
            
            return {
                "eligible": True,
                "remaining_daily_amount": demo_daily_limit - daily_rewards["total_amount"],
                "demo_mode": True
            }
        
        # Regular user flow - check PURPE balance requirement
        balance_info = await get_purpe_token_balance(wallet_address)
        
        if not balance_info["has_minimum_balance"]:
            return {
                "eligible": False,
                "reason": f"Insufficient PURPE balance. Need minimum ${os.getenv('MINIMUM_PURPE_USD_REQUIREMENT', '10')} USD worth of PURPE tokens.",
                "demo_mode": False
            }
        
        # Check daily limits
        daily_key = get_daily_key(wallet_address)
        daily_rewards = user_rewards_today.get(daily_key, {"count": 0, "total_amount": 0, "last_reward": 0})
        
        daily_limit = float(os.getenv("DAILY_SOL_REWARD_LIMIT", "0.1"))
        
        if daily_rewards["total_amount"] >= daily_limit:
            tomorrow = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
            return {
                "eligible": False,
                "reason": "Daily reward limit reached",
                "next_eligible": tomorrow.isoformat(),
                "demo_mode": False
            }
        
        # Check minimum interval
        min_interval = int(os.getenv("MIN_REWARD_INTERVAL_SECONDS", "300"))
        if daily_rewards["last_reward"] and (time.time() - daily_rewards["last_reward"]) < min_interval:
            next_eligible = datetime.fromtimestamp(daily_rewards["last_reward"] + min_interval, timezone.utc)
            return {
                "eligible": False,
                "reason": f"Must wait {min_interval} seconds between rewards",
                "next_eligible": next_eligible.isoformat(),
                "demo_mode": False
            }
        
        return {
            "eligible": True,
            "remaining_daily_amount": daily_limit - daily_rewards["total_amount"],
            "demo_mode": False
        }
        
    except Exception as e:
        logger.error(f"Error checking reward eligibility: {e}")
        return {"eligible": False, "reason": "Unable to verify eligibility", "demo_mode": demo_mode}

# API Routes

@app.get("/api/")
async def root():
    """Health check endpoint"""
    return {"message": "Purpe's Leap API is running!", "version": "1.0.0"}

@app.post("/api/auth/challenge", response_model=ChallengeResponse)
async def create_auth_challenge(request: WalletChallenge):
    """Create authentication challenge for wallet"""
    try:
        wallet_address = request.wallet_address
        
        if not validate_wallet_address(wallet_address):
            return ChallengeResponse(
                success=False,
                error="Invalid wallet address format"
            )
        
        # Generate challenge
        timestamp = int(time.time())
        nonce = secrets.token_hex(16)
        
        challenge_data = {
            "wallet": wallet_address,
            "timestamp": timestamp,
            "nonce": nonce,
            "message": f"Sign this message to verify wallet ownership for Purpe's Leap.\n\nWallet: {wallet_address}\nTime: {timestamp}\nNonce: {nonce}\n\nThis signature will not trigger any blockchain transaction or cost any gas fees."
        }
        
        challenge_key = hashlib.sha256(f"{wallet_address}{timestamp}{nonce}".encode()).hexdigest()
        
        # Store challenge (expires in 5 minutes)
        auth_challenges[challenge_key] = {
            **challenge_data,
            "expires": timestamp + 300
        }
        
        return ChallengeResponse(
            success=True,
            challenge_key=challenge_key,
            message=challenge_data["message"],
            expires_in=300
        )
        
    except Exception as e:
        logger.error(f"Error creating challenge: {e}")
        return ChallengeResponse(
            success=False,
            error="Failed to create authentication challenge"
        )

@app.post("/api/auth/verify")
async def verify_wallet_signature(request: SignatureVerification):
    """Verify wallet signature and create session"""
    try:
        challenge_key = request.challenge_key
        signature = request.signature
        wallet_address = request.wallet_address
        
        # Get challenge
        if challenge_key not in auth_challenges:
            raise HTTPException(status_code=400, detail="Invalid or expired challenge")
        
        challenge = auth_challenges[challenge_key]
        
        # Check expiration
        if time.time() > challenge["expires"]:
            del auth_challenges[challenge_key]
            raise HTTPException(status_code=400, detail="Challenge expired")
        
        # Verify wallet address matches
        if challenge["wallet"] != wallet_address:
            raise HTTPException(status_code=400, detail="Wallet address mismatch")
        
        # For MVP, we'll mock signature verification
        # In production, implement proper Ed25519 signature verification
        logger.info(f"Mock signature verification for wallet {wallet_address}")
        
        # Create JWT token
        token_data = {
            "wallet_address": wallet_address,
            "verified_at": datetime.now(timezone.utc).isoformat(),
            "demo_mode": False
        }
        
        token = create_jwt_token(token_data)
        
        # Clean up challenge
        del auth_challenges[challenge_key]
        
        return {
            "success": True,
            "access_token": token,
            "token_type": "bearer",
            "expires_in": 86400
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying signature: {e}")
        raise HTTPException(status_code=500, detail="Signature verification failed")

@app.post("/api/auth/demo")
async def create_demo_session():
    """Create a demo session without wallet requirements"""
    try:
        # Generate demo user ID
        demo_user_id = f"demo_{int(time.time())}_{secrets.token_hex(4)}"
        
        # Create JWT token for demo mode
        token_data = {
            "wallet_address": demo_user_id,
            "verified_at": datetime.now(timezone.utc).isoformat(),
            "demo_mode": True
        }
        
        token = create_jwt_token(token_data)
        
        return {
            "success": True,
            "access_token": token,
            "token_type": "bearer",
            "expires_in": 86400,
            "demo_mode": True,
            "demo_user_id": demo_user_id
        }
        
    except Exception as e:
        logger.error(f"Error creating demo session: {e}")
        raise HTTPException(status_code=500, detail="Failed to create demo session")

@app.get("/api/token/balance/{wallet_address}", response_model=TokenBalance)
async def get_token_balance(wallet_address: str):
    """Get PURPE token balance for wallet"""
    try:
        if not validate_wallet_address(wallet_address):
            raise HTTPException(status_code=400, detail="Invalid wallet address")
        
        balance_info = await get_purpe_token_balance(wallet_address)
        
        return TokenBalance(
            wallet_address=wallet_address,
            balance=balance_info["balance"],
            usd_value=balance_info["usd_value"],
            has_minimum_balance=balance_info["has_minimum_balance"],
            account_exists=balance_info["account_exists"],
            token_price=balance_info["token_price"],
            last_updated=datetime.now(timezone.utc).isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting balance: {e}")
        raise HTTPException(status_code=500, detail="Failed to get token balance")

@app.get("/api/rewards/eligibility")
async def get_reward_eligibility(current_user: dict = Depends(get_current_user)):
    """Check reward eligibility for authenticated user"""
    try:
        wallet_address = current_user["wallet_address"]
        demo_mode = current_user.get("demo_mode", False)
        eligibility = await check_reward_eligibility(wallet_address, demo_mode)
        
        return {
            "success": True,
            "wallet_address": wallet_address,
            "demo_mode": demo_mode,
            **eligibility
        }
        
    except Exception as e:
        logger.error(f"Error checking eligibility: {e}")
        raise HTTPException(status_code=500, detail="Failed to check eligibility")

@app.post("/api/rewards/claim", response_model=RewardResponse)
async def claim_reward(
    request: RewardClaim,
    current_user: dict = Depends(get_current_user)
):
    """Claim reward for authenticated user"""
    try:
        wallet_address = current_user["wallet_address"]
        reward_type = request.reward_type
        
        # Check eligibility
        eligibility = await check_reward_eligibility(wallet_address)
        
        if not eligibility["eligible"]:
            return RewardResponse(
                success=False,
                error=eligibility["reason"],
                next_eligible=eligibility.get("next_eligible")
            )
        
        # Calculate reward amount
        reward_amounts = {
            "game_completion": 0.005,  # 0.005 SOL per game completion
            "level_completion": 0.002,  # 0.002 SOL per level
            "daily_bonus": 0.01        # 0.01 SOL daily bonus
        }
        
        reward_amount = reward_amounts.get(reward_type, 0.005)
        max_reward = float(os.getenv("MAX_SINGLE_REWARD_SOL", "0.01"))
        reward_amount = min(reward_amount, max_reward)
        
        # For MVP, we'll mock the SOL transfer
        # In production, implement actual Solana transaction
        mock_signature = f"mock_tx_{int(time.time())}_{secrets.token_hex(8)}"
        
        logger.info(f"Mock SOL reward of {reward_amount} sent to {wallet_address}")
        
        # Update daily rewards tracking
        daily_key = get_daily_key(wallet_address)
        if daily_key not in user_rewards_today:
            user_rewards_today[daily_key] = {"count": 0, "total_amount": 0, "last_reward": 0}
        
        user_rewards_today[daily_key]["count"] += 1
        user_rewards_today[daily_key]["total_amount"] += reward_amount
        user_rewards_today[daily_key]["last_reward"] = time.time()
        
        # Store in database
        reward_record = {
            "id": str(uuid.uuid4()),
            "wallet_address": wallet_address,
            "amount": reward_amount,
            "reward_type": reward_type,
            "transaction_signature": mock_signature,
            "status": "completed",
            "created_at": datetime.now(timezone.utc)
        }
        
        await db.reward_transactions.insert_one(reward_record)
        
        return RewardResponse(
            success=True,
            amount_sol=reward_amount,
            transaction_signature=mock_signature,
            reward_type=reward_type
        )
        
    except Exception as e:
        logger.error(f"Error claiming reward: {e}")
        return RewardResponse(
            success=False,
            error="Failed to process reward claim"
        )

@app.get("/api/user/stats", response_model=UserStats)
async def get_user_stats(current_user: dict = Depends(get_current_user)):
    """Get user reward statistics"""
    try:
        wallet_address = current_user["wallet_address"]
        
        # Get daily stats
        daily_key = get_daily_key(wallet_address)
        daily_rewards = user_rewards_today.get(daily_key, {"count": 0, "total_amount": 0})
        
        # Get total stats from database
        total_rewards = await db.reward_transactions.find(
            {"wallet_address": wallet_address, "status": "completed"}
        ).to_list(None)
        
        total_amount = sum(reward["amount"] for reward in total_rewards)
        daily_limit = float(os.getenv("DAILY_SOL_REWARD_LIMIT", "0.1"))
        
        return UserStats(
            wallet_address=wallet_address,
            daily_rewards_claimed=daily_rewards["count"],
            total_amount_today=daily_rewards["total_amount"],
            daily_limit=daily_limit,
            remaining_today=max(0, daily_limit - daily_rewards["total_amount"]),
            total_rewards_earned=total_amount,
            total_rewards_count=len(total_rewards)
        )
        
    except Exception as e:
        logger.error(f"Error getting user stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to get user statistics")

@app.get("/api/leaderboard")
async def get_leaderboard(limit: int = 10):
    """Get top players leaderboard"""
    try:
        # Aggregate rewards by wallet
        pipeline = [
            {"$match": {"status": "completed"}},
            {"$group": {
                "_id": "$wallet_address",
                "total_rewards": {"$sum": "$amount"},
                "total_games": {"$sum": 1},
                "last_activity": {"$max": "$created_at"}
            }},
            {"$sort": {"total_rewards": -1}},
            {"$limit": limit}
        ]
        
        results = await db.reward_transactions.aggregate(pipeline).to_list(None)
        
        leaderboard = []
        for i, result in enumerate(results, 1):
            leaderboard.append({
                "rank": i,
                "wallet_address": result["_id"][:8] + "..." + result["_id"][-4:],  # Truncate for privacy
                "total_rewards": round(result["total_rewards"], 6),
                "total_games": result["total_games"],
                "last_activity": result["last_activity"].isoformat()
            })
        
        return {
            "success": True,
            "leaderboard": leaderboard
        }
        
    except Exception as e:
        logger.error(f"Error getting leaderboard: {e}")
        raise HTTPException(status_code=500, detail="Failed to get leaderboard")

# Game-specific endpoints

@app.post("/api/game/start")
async def start_game_session(current_user: dict = Depends(get_current_user)):
    """Start a new game session"""
    try:
        wallet_address = current_user["wallet_address"]
        
        # Check eligibility
        eligibility = await check_reward_eligibility(wallet_address)
        
        game_session = {
            "id": str(uuid.uuid4()),
            "wallet_address": wallet_address,
            "start_time": datetime.now(timezone.utc),
            "status": "active",
            "current_level": 1,
            "score": 0,
            "lives": 3
        }
        
        await db.game_sessions.insert_one(game_session)
        
        return {
            "success": True,
            "session_id": game_session["id"],
            "eligible_for_rewards": eligibility["eligible"],
            "eligibility_reason": eligibility.get("reason", "Eligible for rewards")
        }
        
    except Exception as e:
        logger.error(f"Error starting game session: {e}")
        raise HTTPException(status_code=500, detail="Failed to start game session")

@app.post("/api/game/complete")
async def complete_game_session(
    session_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Complete game session and award rewards"""
    try:
        wallet_address = current_user["wallet_address"]
        session_id = session_data.get("session_id")
        final_score = session_data.get("score", 0)
        levels_completed = session_data.get("levels_completed", 0)
        
        # Update game session
        await db.game_sessions.update_one(
            {"id": session_id, "wallet_address": wallet_address},
            {
                "$set": {
                    "status": "completed",
                    "end_time": datetime.now(timezone.utc),
                    "final_score": final_score,
                    "levels_completed": levels_completed
                }
            }
        )
        
        # Award rewards if eligible
        eligibility = await check_reward_eligibility(wallet_address)
        
        if eligibility["eligible"] and levels_completed > 0:
            # Claim game completion reward
            reward_request = RewardClaim(reward_type="game_completion")
            reward_response = await claim_reward(reward_request, current_user)
            
            return {
                "success": True,
                "final_score": final_score,
                "levels_completed": levels_completed,
                "reward_awarded": reward_response.success,
                "reward_amount": reward_response.amount_sol if reward_response.success else 0,
                "transaction_signature": reward_response.transaction_signature if reward_response.success else None
            }
        else:
            return {
                "success": True,
                "final_score": final_score,
                "levels_completed": levels_completed,
                "reward_awarded": False,
                "reward_reason": eligibility.get("reason", "No reward eligibility")
            }
        
    except Exception as e:
        logger.error(f"Error completing game session: {e}")
        raise HTTPException(status_code=500, detail="Failed to complete game session")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()