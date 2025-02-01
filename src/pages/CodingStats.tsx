import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiCode, FiAward, FiTrendingUp, FiClock } from 'react-icons/fi';
import { Line } from 'react-chartjs-2';
import { useAuth } from '../hooks/useAuth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface PlatformStats {
  platform: string;
  username: string;
  solved: number;
  total: number;
  rank: string;
  rating: number;
  recentSubmissions: Array<{
    problem: string;
    difficulty: string;
    status: string;
    timestamp: string;
  }>;
  monthlyProgress: {
    [key: string]: number;
  };
}

type SyncStatus = 'syncing' | 'synced' | 'error' | null;

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

const CodingStats = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [platformStats, setPlatformStats] = useState<PlatformStats[]>([]);
  const [totalSolved, setTotalSolved] = useState(0);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [usernames, setUsernames] = useState({
    leetcode: '',
    codechef: '',
    hackerrank: ''
  });
  const [activeTab, setActiveTab] = useState<'overview' | 'leetcode' | 'codechef' | 'hackerrank'>('overview');
  const [syncStatus, setSyncStatus] = useState<Record<string, SyncStatus>>({});

  const API_CONFIG = {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    timeout: 10000,
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: FiCode },
    { id: 'leetcode', label: 'LeetCode', icon: FiAward },
    { id: 'codechef', label: 'CodeChef', icon: FiTrendingUp },
    { id: 'hackerrank', label: 'HackerRank', icon: FiClock }
  ];

  useEffect(() => {
    if (user?.uid) {
      loadUserSettings();
    } else {
      // If no user, stop loading
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (showSettings) {
      setError(null);
    }
  }, [showSettings]);

  const loadUserSettings = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user!.uid));
      const userData = userDoc.data();

      if (userData) {
        const newUsernames = {
          leetcode: userData.leetcodeUsername || '',
          codechef: userData.codechefUsername || '',
          hackerrank: userData.hackerrankUsername || ''
        };

        setUsernames(newUsernames);

        // Check if any username is configured
        const hasAnyUsername = Object.values(newUsernames).some(username => username.trim() !== '');

        if (hasAnyUsername) {
          await fetchUserStats();
        } else {
          setLoading(false);
          setShowSettings(true);
        }
      } else {
        setLoading(false);
        setShowSettings(true);
      }
    } catch (error) {
      console.error('Error loading user settings:', error);
      setError('Failed to load user settings');
      setLoading(false);
      setShowSettings(true);
    }
  };

  const fetchUserStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const cleanedUsernames = {
        leetcode: cleanUsername(usernames.leetcode, 'leetcode'),
        codechef: cleanUsername(usernames.codechef, 'codechef'),
        hackerrank: cleanUsername(usernames.hackerrank, 'hackerrank')
      };

      // Create an array of fetch promises with platform information
      const fetchPromises = [
        {
          platform: 'LeetCode',
          promise: cleanedUsernames.leetcode ? fetchLeetCodeStats(cleanedUsernames.leetcode) : null,
          username: cleanedUsernames.leetcode
        },
        {
          platform: 'CodeChef',
          promise: cleanedUsernames.codechef ? fetchCodeChefStats(cleanedUsernames.codechef) : null,
          username: cleanedUsernames.codechef
        },
        {
          platform: 'HackerRank',
          promise: cleanedUsernames.hackerrank ? fetchHackerRankStats(cleanedUsernames.hackerrank) : null,
          username: cleanedUsernames.hackerrank
        }
      ].filter(item => item.promise !== null);

      // If no valid usernames, show settings
      if (fetchPromises.length === 0) {
        setShowSettings(true);
        setLoading(false);
        return;
      }

      // Execute all valid fetch promises
      const results = await Promise.allSettled(fetchPromises.map(item => item.promise));
      
      const validStats: PlatformStats[] = [];
      const errors: string[] = [];

      results.forEach((result, index) => {
        const platform = fetchPromises[index].platform;
        const username = fetchPromises[index].username;

        if (result.status === 'fulfilled' && result.value) {
          validStats.push({
            ...result.value,
            platform,
            username: username || ''
          });
        } else {
          errors.push(`Failed to fetch ${platform} stats${username ? ` for ${username}` : ''}`);
        }
      });

      // Update state based on results
      if (validStats.length > 0) {
        setPlatformStats(validStats);
        setSelectedPlatforms(validStats.map(p => p.platform.toLowerCase()));
        setTotalSolved(validStats.reduce((acc, curr) => acc + curr.solved, 0));
        
        // If some platforms failed but others succeeded, show warning
        if (errors.length > 0) {
          console.warn('Some platforms failed:', errors);
          setError(`Successfully fetched some stats, but: ${errors.join(', ')}`);
        } else {
          setError(null);
        }
      } else {
        // If all platforms failed, show error and settings
        const errorMessage = 'Failed to fetch stats from any platform. Please check your usernames and try again.';
        setError(errorMessage);
        console.error(errorMessage, errors);
        setPlatformStats([]);
        setShowSettings(true);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch coding statistics');
      setPlatformStats([]);
      setShowSettings(true);
    } finally {
      setLoading(false);
    }
  };

  const cleanUsername = (username: string, platform: string) => {
    let cleaned = username.trim();
    
    // Remove any URL parts if present
    cleaned = cleaned
      .replace(/https?:\/\//g, '')
      .replace(/www\./g, '')
      .replace(/leetcode\.com\/(u\/)?/g, '')
      .replace(/codechef\.com\/users\//g, '')
      .replace(/hackerrank\.com\//g, '')
      .replace(/\/$/, '')
      .trim();

    // Basic validation
    if (!cleaned || cleaned.length > 39) {
      return '';
    }

    // Platform-specific validation
    switch (platform) {
      case 'leetcode':
        return cleaned.replace(/[^a-zA-Z0-9-_]/g, '');
      case 'codechef':
        return cleaned.replace(/[^a-zA-Z0-9_]/g, '');
      case 'hackerrank':
        return cleaned.replace(/[^a-zA-Z0-9-_]/g, '');
      default:
        return cleaned;
    }
  };

  const fetchLeetCodeStats = async (username: string) => {
    if (!username) return null;
    
    const cleanedUsername = cleanUsername(username, 'leetcode');
    if (!cleanedUsername) return null;

    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/leetcode/${encodeURIComponent(cleanedUsername)}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          timeout: 10000,
        }
      );

      if (response.status === 200 && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('LeetCode API Error:', error);
      return null;
    }
  };

  const fetchCodeChefStats = async (username: string) => {
    if (!username.trim()) return null;

    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/codechef/${encodeURIComponent(username.trim())}`,
        {
          ...API_CONFIG,
          validateStatus: (status) => status < 500,
        }
      );

      if (response.status === 200) {
        return response.data;
      } else {
        console.error('CodeChef API Error:', {
          status: response.status,
          data: response.data
        });
        return null;
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('CodeChef API Error:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data
        });
        
        if (error.response?.status === 431) {
          throw new Error('Username too long or contains invalid characters');
        }
      } else {
        console.error('CodeChef API Error:', error);
      }
      return null;
    }
  };

  const fetchHackerRankStats = async (username: string) => {
    if (!username.trim()) return null;

    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/hackerrank/${encodeURIComponent(username.trim())}`,
        {
          ...API_CONFIG,
          validateStatus: (status) => status < 500,
        }
      );

      if (response.status === 200) {
        return response.data;
      } else {
        console.error('HackerRank API Error:', {
          status: response.status,
          data: response.data
        });
        return null;
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('HackerRank API Error:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data
        });
        
        if (error.response?.status === 431) {
          throw new Error('Username too long or contains invalid characters');
        }
      } else {
        console.error('HackerRank API Error:', error);
      }
      return null;
    }
  };

  const saveUserSettings = async () => {
    try {
      await setDoc(doc(db, 'users', user!.uid), {
        leetcodeUsername: usernames.leetcode,
        codechefUsername: usernames.codechef,
        hackerrankUsername: usernames.hackerrank,
        lastUpdated: new Date().toISOString()
      }, { merge: true });

      setShowSettings(false);
      await fetchUserStats(); // Fetch new stats after saving
    } catch (error) {
      console.error('Error saving user settings:', error);
      setError('Failed to save user settings');
    }
  };

  const getChartData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const datasets = platformStats.map(platform => ({
      label: platform.platform,
      data: months.map(month => platform.monthlyProgress[month] || 0),
      borderColor: getPlatformColor(platform.platform),
      tension: 0.4,
    }));

    return {
      labels: months,
      datasets
    };
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'LeetCode':
        return '#FFA116';
      case 'CodeChef':
        return '#5B4638';
      case 'HackerRank':
        return '#00EA64';
      default:
        return '#6366f1';
    }
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          color: '#9ca3af'
        }
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: '#9ca3af',
        },
      },
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: '#9ca3af',
        },
      },
    },
  };

  const SettingsModal = () => {
    const [localUsernames, setLocalUsernames] = useState(usernames);
    const [saving, setSaving] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);

    const handleSave = async () => {
      setSaving(true);
      setLocalError(null);

      // Clean and validate usernames
      const cleanedUsernames = {
        leetcode: cleanUsername(localUsernames.leetcode, 'leetcode'),
        codechef: cleanUsername(localUsernames.codechef, 'codechef'),
        hackerrank: cleanUsername(localUsernames.hackerrank, 'hackerrank')
      };

      if (!cleanedUsernames.leetcode && !cleanedUsernames.codechef && !cleanedUsernames.hackerrank) {
        setLocalError('Please enter at least one valid username');
        setSaving(false);
        return;
      }

      try {
        await setDoc(doc(db, 'users', user!.uid), {
          leetcodeUsername: cleanedUsernames.leetcode,
          codechefUsername: cleanedUsernames.codechef,
          hackerrankUsername: cleanedUsernames.hackerrank,
          lastUpdated: new Date().toISOString()
        }, { merge: true });

        setUsernames(cleanedUsernames);
        setShowSettings(false);
        setPlatformStats([]);
        setError(null);
        await fetchUserStats();
      } catch (err) {
        setLocalError('Failed to save settings. Please try again.');
        console.error('Error saving settings:', err);
      } finally {
        setSaving(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-secondary p-8 rounded-2xl max-w-md w-full mx-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">Configure Platforms</h2>
            <button
              onClick={() => !saving && setShowSettings(false)}
              className="text-gray-400 hover:text-white"
              disabled={saving}
            >
              ×
            </button>
          </div>

          <div className="space-y-6">
            {/* LeetCode Input */}
            <div>
              <label className="block text-gray-400 mb-2" htmlFor="leetcode">
                LeetCode Username or Profile URL
              </label>
              <input
                id="leetcode"
                type="text"
                value={localUsernames.leetcode}
                onChange={(e) => setLocalUsernames(prev => ({
                  ...prev,
                  leetcode: e.target.value
                }))}
                placeholder="e.g., username or https://leetcode.com/username"
                className="w-full bg-primary-light rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-accent focus:outline-none"
                disabled={saving}
              />
            </div>

            {/* CodeChef Input */}
            <div>
              <label className="block text-gray-400 mb-2" htmlFor="codechef">
                CodeChef Username
              </label>
              <input
                id="codechef"
                type="text"
                value={localUsernames.codechef}
                onChange={(e) => setLocalUsernames(prev => ({
                  ...prev,
                  codechef: e.target.value
                }))}
                className="w-full bg-primary-light rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-accent focus:outline-none"
                disabled={saving}
              />
            </div>

            {/* HackerRank Input */}
            <div>
              <label className="block text-gray-400 mb-2" htmlFor="hackerrank">
                HackerRank Username
              </label>
              <input
                id="hackerrank"
                type="text"
                value={localUsernames.hackerrank}
                onChange={(e) => setLocalUsernames(prev => ({
                  ...prev,
                  hackerrank: e.target.value
                }))}
                className="w-full bg-primary-light rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-accent focus:outline-none"
                disabled={saving}
              />
            </div>

            {localError && (
              <div className="text-red-500 text-sm">
                {localError}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-4 mt-8">
            <button
              onClick={() => !saving && setShowSettings(false)}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className={`px-4 py-2 bg-accent rounded-lg hover:bg-accent/80 transition-colors ${
                saving ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {saving ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving...
                </span>
              ) : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Show settings modal if no usernames are configured
  useEffect(() => {
    if (!loading && !error && !platformStats.length) {
      setShowSettings(true);
    }
  }, [loading, error, platformStats.length]);

  const syncPlatform = async (platform: string) => {
    setSyncStatus(prev => ({ ...prev, [platform]: 'syncing' }));
    try {
      switch (platform) {
        case 'leetcode':
          await fetchLeetCodeStats(usernames.leetcode);
          break;
        case 'codechef':
          await fetchCodeChefStats(usernames.codechef);
          break;
        case 'hackerrank':
          await fetchHackerRankStats(usernames.hackerrank);
          break;
      }
      setSyncStatus(prev => ({ ...prev, [platform]: 'synced' }));
      setTimeout(() => {
        setSyncStatus(prev => ({ ...prev, [platform]: null }));
      }, 3000);
    } catch (error) {
      setSyncStatus(prev => ({ ...prev, [platform]: 'error' }));
    }
  };

  const PlatformSection = ({ platform, stats }: { platform: string; stats?: PlatformStats }) => {
    if (!stats) {
      return (
        <div className="bg-secondary rounded-2xl p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-white">{platform}</h3>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 hover:bg-primary-light rounded-lg transition-colors"
            >
              Configure
            </button>
          </div>
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-400">No data available. Please configure your username.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-secondary rounded-2xl p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold text-white">{platform}</h3>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-400">
              {syncStatus[platform.toLowerCase()] === 'syncing' && 'Syncing...'}
              {syncStatus[platform.toLowerCase()] === 'synced' && 'Synced'}
              {syncStatus[platform.toLowerCase()] === 'error' && 'Sync failed'}
            </span>
            <button
              onClick={() => syncPlatform(platform.toLowerCase())}
              className="p-2 hover:bg-primary-light rounded-lg transition-colors"
              disabled={syncStatus[platform.toLowerCase()] === 'syncing'}
            >
              <FiTrendingUp className={`w-5 h-5 ${
                syncStatus[platform.toLowerCase()] === 'syncing' 
                  ? 'animate-spin text-gray-400' 
                  : 'text-accent'
              }`} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-primary-light p-4 rounded-lg">
            <p className="text-sm text-gray-400">Solved</p>
            <p className="text-2xl font-bold text-white">{stats.solved}</p>
          </div>
          <div className="bg-primary-light p-4 rounded-lg">
            <p className="text-sm text-gray-400">Rank</p>
            <p className="text-2xl font-bold text-white">{stats.rank}</p>
          </div>
          <div className="bg-primary-light p-4 rounded-lg">
            <p className="text-sm text-gray-400">Rating</p>
            <p className="text-2xl font-bold text-white">{stats.rating}</p>
          </div>
        </div>

        {Object.keys(stats.monthlyProgress).length > 0 ? (
          <div className="h-64">
            <Line
              data={{
                labels: Object.keys(stats.monthlyProgress),
                datasets: [{
                  label: 'Problems Solved',
                  data: Object.values(stats.monthlyProgress),
                  borderColor: getPlatformColor(platform),
                  tension: 0.4
                }]
              }}
              options={chartOptions}
            />
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center">
            <p className="text-gray-400">No progress data available</p>
          </div>
        )}

        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-400">Recent Submissions</h4>
          {stats.recentSubmissions.length > 0 ? (
            stats.recentSubmissions.slice(0, 3).map((submission, index) => (
              <div key={index} className="bg-primary-light p-3 rounded-lg">
                <p className="text-sm font-medium text-white">{submission.problem}</p>
                <p className="text-xs text-gray-400">
                  {submission.difficulty} • {submission.status}
                </p>
              </div>
            ))
          ) : (
            <p className="text-gray-400">No recent submissions</p>
          )}
        </div>
      </div>
    );
  };

  // Reset function to clear all states
  const resetState = () => {
    setPlatformStats([]);
    setTotalSolved(0);
    setSelectedPlatforms([]);
    setError(null);
    setLoading(false);
  };

  // Handle retry
  const handleRetry = async () => {
    setError(null);
    setLoading(true);
    try {
      await fetchUserStats();
    } catch (error) {
      console.error('Retry failed:', error);
      setError('Failed to fetch stats. Please try configuring your usernames again.');
      setShowSettings(true);
    } finally {
      setLoading(false);
    }
  };

  // Error component
  const ErrorDisplay = () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center p-8 bg-secondary rounded-2xl max-w-md">
        <p className="text-red-500 mb-4">{error}</p>
        <div className="space-x-4">
          <button 
            onClick={handleRetry}
            className="px-4 py-2 bg-accent rounded-lg hover:bg-accent/80 transition-colors"
          >
            Retry
          </button>
          <button
            onClick={() => {
              resetState();
              setShowSettings(true);
            }}
            className="px-4 py-2 bg-primary-light rounded-lg hover:bg-primary transition-colors"
          >
            Configure Platforms
          </button>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <FiClock className="w-8 h-8 text-accent animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading your coding stats...</p>
        </div>
      </div>
    );
  }

  if (error && !showSettings) {
    return <ErrorDisplay />;
  }

  return (
    <div className="min-h-screen bg-primary py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Coding Stats</h1>
          <button
            onClick={() => {
              resetState();
              setShowSettings(true);
            }}
            className="px-4 py-2 bg-accent rounded-lg hover:bg-accent/80 transition-colors"
          >
            Configure Platforms
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-700 mb-8">
          <nav className="flex space-x-8">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  py-4 px-1 relative flex items-center space-x-2
                  ${activeTab === tab.id ? 'text-accent' : 'text-gray-400 hover:text-white'}
                `}
              >
                <tab.icon className="w-5 h-5" />
                <span>{tab.label}</span>
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent"
                  />
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'overview' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tabs.slice(1).map(tab => (
                <PlatformSection
                  key={tab.id}
                  platform={tab.label}
                  stats={platformStats.find(s => s.platform.toLowerCase() === tab.id)}
                />
              ))}
            </div>
          ) : (
            <PlatformSection
              platform={activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
              stats={platformStats.find(s => s.platform.toLowerCase() === activeTab)}
            />
          )}
        </motion.div>

        {showSettings && <SettingsModal />}
      </div>
    </div>
  );
};

export default CodingStats; 