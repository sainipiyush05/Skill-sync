import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FiGithub, 
  FiLinkedin, 
  FiCode, 
  FiTrendingUp, 
  FiCheckCircle, 
  FiClock,
  FiAward
} from 'react-icons/fi';
import { useAuth } from '../hooks/useAuth';
import type { CustomUser } from '../hooks/useAuth';
import axios from 'axios';

// Platform stats interfaces
interface PlatformSubmission {
  problem: string;
  timestamp: string;
  difficulty?: string;
  status?: string;
}

interface PlatformStats {
  leetcode: {
    solved: number;
    total: number;
    rating: number;
    recentSubmissions: PlatformSubmission[];
  };
  hackerrank: {
    solved: number;
    total: number;
    rating: number;
    recentSubmissions: PlatformSubmission[];
  };
  codechef: {
    solved: number;
    total: number;
    rating: number;
    recentSubmissions: PlatformSubmission[];
  };
}

const INITIAL_PLATFORM_STATS = {
  leetcode: {
    solved: 0,
    total: 0,
    rating: 0,
    recentSubmissions: []
  },
  hackerrank: {
    solved: 0,
    total: 0,
    rating: 0,
    recentSubmissions: []
  },
  codechef: {
    solved: 0,
    total: 0,
    rating: 0,
    recentSubmissions: []
  }
};

const Home = () => {
  const { user } = useAuth();
  const [platformStats, setPlatformStats] = useState<PlatformStats>(INITIAL_PLATFORM_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlatformStats = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const fetchPlatformData = async (platform: string, username?: string) => {
          if (!username) return INITIAL_PLATFORM_STATS[platform as keyof PlatformStats];
          try {
            const response = await axios.get(`http://localhost:5001/api/${platform}/${username}`);
            return response.data;
          } catch (err) {
            console.warn(`Failed to fetch ${platform} stats:`, err);
            return INITIAL_PLATFORM_STATS[platform as keyof PlatformStats];
          }
        };
        
        const [leetcodeData, hackerrankData, codechefData] = await Promise.all([
          fetchPlatformData('leetcode', user.leetcodeUsername),
          fetchPlatformData('hackerrank', user.hackerrankUsername),
          fetchPlatformData('codechef', user.codechefUsername)
        ]);

        setPlatformStats({
          leetcode: leetcodeData,
          hackerrank: hackerrankData,
          codechef: codechefData
        });
      } catch (err) {
        console.error('Error fetching platform stats:', err);
        setError('Failed to fetch platform statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchPlatformStats();
  }, [user]);

  const getTotalSolved = () => {
    return (
      platformStats.leetcode.solved +
      platformStats.hackerrank.solved +
      platformStats.codechef.solved
    );
  };

  const getSkillGrowth = () => {
    const total = getTotalSolved();
    const growth = (total / 300) * 100;
    return `${Math.min(Math.round(growth), 100)}%`;
  };

  const stats = [
    { 
      label: 'Total Problems Solved', 
      value: getTotalSolved().toString(), 
      icon: FiCheckCircle,
      color: 'text-success'
    },
    { 
      label: 'Active Days Streak', 
      value: '12',
      icon: FiClock,
      color: 'text-warning'
    },
    { 
      label: 'Coding Rating', 
      value: platformStats.leetcode.rating.toString() || 'N/A', 
      icon: FiAward,
      color: 'text-accent'
    },
    { 
      label: 'Skill Growth', 
      value: getSkillGrowth(), 
      icon: FiTrendingUp,
      color: 'text-info'
    }
  ];

  const getAllRecentSubmissions = () => {
    if (!platformStats) return [];

    const allSubmissions = [
      ...(platformStats.leetcode.recentSubmissions || []).map(sub => ({
        ...sub,
        platform: 'LeetCode'
      })),
      ...(platformStats.hackerrank.recentSubmissions || []).map(sub => ({
        ...sub,
        platform: 'HackerRank'
      })),
      ...(platformStats.codechef.recentSubmissions || []).map(sub => ({
        ...sub,
        platform: 'CodeChef'
      }))
    ];

    return allSubmissions
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);
  };

  const formatTimeAgo = (timestamp: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(timestamp).getTime()) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + ' years ago';
    
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + ' months ago';
    
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + ' days ago';
    
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + ' hours ago';
    
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + ' minutes ago';
    
    return Math.floor(seconds) + ' seconds ago';
  };

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        {/* Welcome Section */}
        <div className="bg-secondary rounded-2xl p-8 mb-8 shadow-glow">
          <h1 className="text-3xl font-display font-bold text-white mb-4">
            Welcome back, {user?.displayName || 'Developer'}! 👋
          </h1>
          <p className="text-gray-400">
            Track your progress and improve your developer presence across platforms.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => (
            <motion.div
              key={stat.label}
              whileHover={{ scale: 1.02 }}
              className="bg-secondary rounded-xl p-6 shadow-soft"
            >
              <div className="flex items-center justify-between">
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
                <span className="text-2xl font-bold text-white">{stat.value}</span>
              </div>
              <p className="mt-2 text-sm text-gray-400">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="bg-secondary rounded-2xl p-8 shadow-soft">
          <h2 className="text-xl font-display font-bold text-white mb-6">
            Recent Activity
          </h2>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent"></div>
            </div>
          ) : error ? (
            <div className="text-error text-center py-4">{error}</div>
          ) : (
            <div className="space-y-4">
              {getAllRecentSubmissions().map((submission, index) => (
                <div
                  key={index}
                  className="flex items-center p-4 bg-primary-light rounded-lg"
                >
                  <div className="flex-shrink-0">
                    <FiCode className="h-6 w-6 text-accent" />
                  </div>
                  <div className="ml-4 flex-grow">
                    <p className="text-sm font-medium text-white">
                      Solved "{submission.problem}" on {submission.platform}
                    </p>
                    <p className="text-sm text-gray-400">
                      {formatTimeAgo(submission.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Home;