import { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/leaderboard?limit=10`);
      
      if (response.data.success) {
        setLeaderboard(response.data.leaderboard);
      } else {
        setError('Failed to load leaderboard');
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError('Unable to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    
    // Refresh leaderboard every minute
    const interval = setInterval(fetchLeaderboard, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="leaderboard bg-gradient-to-br from-yellow-900/50 to-orange-800/50 backdrop-blur-lg rounded-2xl border border-yellow-400/30 p-6 shadow-2xl">
        <h2 className="text-2xl font-bold text-yellow-100 mb-6">🏆 Leaderboard</h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-yellow-400 border-t-transparent"></div>
          <span className="ml-3 text-yellow-200">Loading leaderboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="leaderboard bg-gradient-to-br from-yellow-900/50 to-orange-800/50 backdrop-blur-lg rounded-2xl border border-yellow-400/30 p-6 shadow-2xl">
        <h2 className="text-2xl font-bold text-yellow-100 mb-6">🏆 Leaderboard</h2>
        <div className="text-center py-8">
          <p className="text-red-400">{error}</p>
          <button 
            onClick={fetchLeaderboard}
            className="mt-4 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="leaderboard bg-gradient-to-br from-yellow-900/50 to-orange-800/50 backdrop-blur-lg rounded-2xl border border-yellow-400/30 p-6 shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-yellow-100">🏆 Leaderboard</h2>
        <button
          onClick={fetchLeaderboard}
          className="text-yellow-300 hover:text-yellow-200 text-sm underline"
        >
          Refresh
        </button>
      </div>

      {leaderboard.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-6xl mb-4">🐸</div>
          <p className="text-yellow-200">No players yet!</p>
          <p className="text-yellow-300 text-sm mt-2">Be the first to complete a game and earn your place on the leaderboard.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {leaderboard.map((player, index) => {
            const isTop3 = index < 3;
            const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅';
            
            return (
              <div
                key={player.wallet_address}
                className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-300 ${
                  isTop3
                    ? 'bg-gradient-to-r from-yellow-600/30 to-orange-600/30 border-yellow-400/50 shadow-lg'
                    : 'bg-black/30 border-yellow-400/20 hover:border-yellow-400/40'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{rankEmoji}</span>
                    <span className={`font-bold ${isTop3 ? 'text-yellow-100' : 'text-yellow-200'}`}>
                      #{player.rank}
                    </span>
                  </div>
                  
                  <div>
                    <div className={`font-mono text-sm ${isTop3 ? 'text-yellow-100' : 'text-yellow-200'}`}>
                      {player.wallet_address}
                    </div>
                    <div className="text-yellow-400 text-xs">
                      {player.total_games} games • Last active: {new Date(player.last_activity).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className={`font-bold ${isTop3 ? 'text-green-300' : 'text-green-400'}`}>
                    {player.total_rewards.toFixed(6)} SOL
                  </div>
                  <div className="text-yellow-400 text-xs">
                    Total Rewards
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {leaderboard.length > 0 && (
        <div className="mt-6 pt-4 border-t border-yellow-400/20">
          <p className="text-yellow-300 text-sm text-center">
            🎮 Play Purpe's Leap to earn SOL and climb the leaderboard!
          </p>
        </div>
      )}
    </div>
  );
};