import { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const RewardSystem = ({ authToken, onStatsUpdate }) => {
  const [userStats, setUserStats] = useState(null);
  const [rewardHistory, setRewardHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [eligibility, setEligibility] = useState(null);

  // Fetch user stats
  const fetchUserStats = async () => {
    if (!authToken) return;

    setLoading(true);
    try {
      const response = await axios.get(`${API}/user/stats`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      const stats = response.data;
      setUserStats(stats);
      onStatsUpdate(stats);
      
    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Check reward eligibility
  const checkEligibility = async () => {
    if (!authToken) return;

    try {
      const response = await axios.get(`${API}/rewards/eligibility`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      setEligibility(response.data);
      
    } catch (error) {
      console.error('Error checking eligibility:', error);
    }
  };

  // Fetch reward history
  const fetchRewardHistory = async () => {
    if (!authToken) return;

    try {
      const response = await axios.get(`${API}/user/stats`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      // For now, we'll use the stats endpoint. In a full implementation,
      // you'd have a separate rewards history endpoint
      setRewardHistory([]);
      
    } catch (error) {
      console.error('Error fetching reward history:', error);
    }
  };

  // Manual reward claim (for testing)
  const claimDailyBonus = async () => {
    if (!authToken) {
      alert('Please authenticate your wallet first');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/rewards/claim`, {
        reward_type: 'daily_bonus'
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if (response.data.success) {
        alert(`🎉 Daily bonus claimed! Received ${response.data.amount_sol} SOL`);
        fetchUserStats();
        checkEligibility();
      } else {
        alert(`❌ ${response.data.error}`);
      }
      
    } catch (error) {
      console.error('Error claiming daily bonus:', error);
      alert('Failed to claim daily bonus. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on mount and when authToken changes
  useEffect(() => {
    if (authToken) {
      fetchUserStats();
      checkEligibility();
      fetchRewardHistory();
      
      // Set up periodic refresh
      const interval = setInterval(() => {
        fetchUserStats();
        checkEligibility();
      }, 30000); // Refresh every 30 seconds

      return () => clearInterval(interval);
    }
  }, [authToken]);

  if (!authToken) {
    return (
      <div className="reward-system bg-gradient-to-br from-purple-900/50 to-pink-800/50 backdrop-blur-lg rounded-2xl border border-purple-400/30 p-6">
        <h2 className="text-2xl font-bold text-purple-100 mb-4">🎁 Reward System</h2>
        <p className="text-purple-200">Connect and authenticate your wallet to view rewards</p>
      </div>
    );
  }

  if (loading && !userStats) {
    return (
      <div className="reward-system bg-gradient-to-br from-purple-900/50 to-pink-800/50 backdrop-blur-lg rounded-2xl border border-purple-400/30 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-400 border-t-transparent"></div>
          <span className="ml-3 text-purple-200">Loading rewards...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="reward-system bg-gradient-to-br from-purple-900/50 to-pink-800/50 backdrop-blur-lg rounded-2xl border border-purple-400/30 p-6 shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-purple-100">🎁 Reward System</h2>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="text-purple-300 hover:text-purple-200 text-sm underline"
        >
          {showHistory ? 'Hide History' : 'Show History'}
        </button>
      </div>

      {userStats && (
        <div className="space-y-6">
          {/* Daily Progress */}
          <div className="bg-black/30 rounded-xl p-4 border border-purple-400/20">
            <h3 className="text-lg font-semibold text-purple-100 mb-3">📅 Daily Progress</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-purple-200">Rewards Claimed Today:</span>
                <span className="text-purple-100 font-bold">
                  {userStats.daily_rewards_claimed} / 10
                </span>
              </div>
              
              {/* Progress bar */}
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${(userStats.daily_rewards_claimed / 10) * 100}%` }}
                ></div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-purple-200">SOL Earned Today:</span>
                <span className="text-purple-100 font-bold">
                  {userStats.total_amount_today.toFixed(6)} SOL
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-purple-200">Remaining Today:</span>
                <span className="text-green-400 font-bold">
                  {Math.max(0, userStats.remaining_today).toFixed(6)} SOL
                </span>
              </div>
            </div>
          </div>

          {/* Total Stats */}
          <div className="bg-black/30 rounded-xl p-4 border border-purple-400/20">
            <h3 className="text-lg font-semibold text-purple-100 mb-3">🏆 Total Statistics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">
                  {userStats.total_rewards_count}
                </div>
                <div className="text-purple-200 text-sm">Total Rewards</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">
                  {userStats.total_rewards_earned.toFixed(6)}
                </div>
                <div className="text-purple-200 text-sm">Total SOL Earned</div>
              </div>
            </div>
          </div>

          {/* Eligibility Status */}
          {eligibility && (
            <div className="bg-black/30 rounded-xl p-4 border border-purple-400/20">
              <h3 className="text-lg font-semibold text-purple-100 mb-3">⚡ Eligibility Status</h3>
              {eligibility.eligible ? (
                <div className="text-green-400 flex items-center">
                  <span className="text-xl mr-2">✅</span>
                  <span>Ready to earn rewards!</span>
                </div>
              ) : (
                <div className="text-yellow-400">
                  <div className="flex items-center mb-2">
                    <span className="text-xl mr-2">⏳</span>
                    <span>Not currently eligible</span>
                  </div>
                  <p className="text-sm text-purple-200">{eligibility.reason}</p>
                  {eligibility.next_eligible && (
                    <p className="text-xs text-purple-300 mt-1">
                      Next eligible: {new Date(eligibility.next_eligible).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Daily Bonus Claim */}
          <div className="bg-black/30 rounded-xl p-4 border border-purple-400/20">
            <h3 className="text-lg font-semibold text-purple-100 mb-3">🎯 Daily Bonus</h3>
            <p className="text-purple-200 text-sm mb-4">
              Claim your daily bonus reward (available once per day)
            </p>
            <button
              onClick={claimDailyBonus}
              disabled={loading || (eligibility && !eligibility.eligible)}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 disabled:cursor-not-allowed"
              data-testid="claim-daily-bonus-btn"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                  Claiming...
                </div>
              ) : (
                'Claim Daily Bonus 🎁'
              )}
            </button>
          </div>

          {/* Reward History */}
          {showHistory && (
            <div className="bg-black/30 rounded-xl p-4 border border-purple-400/20">
              <h3 className="text-lg font-semibold text-purple-100 mb-3">📋 Reward History</h3>
              {rewardHistory.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {rewardHistory.map((reward, index) => (
                    <div key={index} className="flex justify-between items-center py-2 px-3 bg-purple-800/30 rounded-lg">
                      <div>
                        <div className="text-purple-100 font-medium">{reward.reward_type}</div>
                        <div className="text-purple-300 text-xs">{reward.created_at}</div>
                      </div>
                      <div className="text-green-400 font-bold">
                        +{reward.amount} SOL
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-purple-200 text-center py-4">
                  No rewards claimed yet. Start playing to earn rewards!
                </p>
              )}
            </div>
          )}

          {/* Tips */}
          <div className="bg-black/30 rounded-xl p-4 border border-blue-400/20">
            <h3 className="text-lg font-semibold text-blue-100 mb-3">💡 Earning Tips</h3>
            <div className="space-y-2 text-sm text-blue-200">
              <div className="flex items-start">
                <span className="mr-2">🎮</span>
                <span>Complete game levels to earn 0.005 SOL per completion</span>
              </div>
              <div className="flex items-start">
                <span className="mr-2">🏆</span>
                <span>Claim daily bonus for extra rewards</span>
              </div>
              <div className="flex items-start">
                <span className="mr-2">⏰</span>
                <span>Daily limit: 0.1 SOL per day to keep it fair</span>
              </div>
              <div className="flex items-start">
                <span className="mr-2">🔐</span>
                <span>Must hold minimum $10 USD in PURPE tokens</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};