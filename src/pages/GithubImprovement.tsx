import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiGithub, FiStar, FiGitBranch, FiUsers, FiCheck, FiLoader, FiTrendingUp, FiAward, FiRefreshCw } from 'react-icons/fi';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

const GITHUB_TOKEN = process.env.REACT_APP_GITHUB_TOKEN; // Add your GitHub token in .env

interface GitHubStats {
  publicRepos: number;
  followers: number;
  following: number;
  contributions: number;
  contributionsThisWeek: number;
  contributionStreak: number;
  recentCommits: number;
  stars: number;
  lastUpdated: string;
  username: string;
  bio: string;
  location: string;
  totalPullRequests: number;
  totalIssues: number;
  contributionsLastYear: number;
}

interface Suggestion {
  title: string;
  description: string;
  icon: any;
  status: 'Todo' | 'In Progress' | 'Completed';
  metric: number;
  target: number;
  actionItems: string[];
}

const GithubImprovement = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<GitHubStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [githubUsername, setGithubUsername] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const loadUserData = async () => {
      if (!user?.uid) return;

      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData?.githubUsername) {
            setGithubUsername(userData.githubUsername);
            if (userData.githubStats) {
              setStats(userData.githubStats);
            }
          }
        } else {
          // Create initial user document
          try {
            await setDoc(userDocRef, {
              email: user.email,
              githubUsername: '',
              githubStats: null,
              createdAt: new Date().toISOString()
            });
          } catch (initError) {
            console.error('Error creating initial user document:', initError);
          }
        }
      } catch (err) {
        console.error('Error loading user data:', err);
        setError('Failed to load user data. Please try again.');
      }
    };

    if (user) {
      loadUserData();
    }
  }, [user]);

  const fetchContributionsData = async (username: string) => {
    const query = `
      query($username: String!) {
        user(login: $username) {
          contributionsCollection {
            contributionCalendar {
              totalContributions
              weeks {
                contributionDays {
                  contributionCount
                  date
                }
              }
            }
          }
        }
      }
    `;

    try {
      const response = await axios.post(
        'https://api.github.com/graphql',
        { query, variables: { username } },
        {
          headers: {
            Authorization: `bearer ${GITHUB_TOKEN}`,
          },
        }
      );

      const data = response.data.data.user.contributionsCollection.contributionCalendar;
      const weeks = data.weeks;
      
      // Calculate this week's contributions
      const thisWeek = weeks[weeks.length - 1].contributionDays.reduce(
        (sum: number, day: any) => sum + day.contributionCount,
        0
      );

      // Calculate streak
      let currentStreak = 0;
      let maxStreak = 0;
      let counting = true;

      for (let i = weeks.length - 1; i >= 0; i--) {
        const week = weeks[i];
        for (let j = week.contributionDays.length - 1; j >= 0; j--) {
          const day = week.contributionDays[j];
          if (day.contributionCount > 0 && counting) {
            currentStreak++;
            maxStreak = Math.max(maxStreak, currentStreak);
          } else {
            counting = false;
          }
        }
      }

      return {
        totalContributions: data.totalContributions,
        contributionsThisWeek: thisWeek,
        contributionStreak: currentStreak,
      };
    } catch (error) {
      console.error('Error fetching contributions:', error);
      throw error;
    }
  };

  const fetchGitHubDetailedData = async (username: string) => {
    if (!username || !user?.uid) return;
    
    try {
      setLoading(true);
      setError(null);

      // Fetch basic user data
      const userResponse = await axios.get(`https://api.github.com/users/${username}`);
      
      // Fetch user's repositories
      const reposResponse = await axios.get(
        `https://api.github.com/users/${username}/repos?per_page=100`
      );

      // Fetch recent events
      const eventsResponse = await axios.get(
        `https://api.github.com/users/${username}/events/public?per_page=100`
      );

      // Fetch contributions data
      const contributionsData = await fetchContributionsData(username);

      // Calculate total stars
      const totalStars = reposResponse.data.reduce(
        (sum: number, repo: any) => sum + repo.stargazers_count,
        0
      );

      // Calculate recent commits
      const recentCommits = eventsResponse.data
        .filter((event: any) => event.type === 'PushEvent')
        .reduce((total: number, event: any) => total + event.payload.commits.length, 0);

      // Calculate pull requests and issues
      const pullRequests = eventsResponse.data
        .filter((event: any) => event.type === 'PullRequestEvent').length;

      const issues = eventsResponse.data
        .filter((event: any) => event.type === 'IssuesEvent').length;

      // Calculate contributions (approximation)
      const contributions = contributionsData.totalContributions;

      const newStats: GitHubStats = {
        publicRepos: userResponse.data.public_repos,
        followers: userResponse.data.followers,
        following: userResponse.data.following,
        contributions: contributions,
        contributionsThisWeek: contributionsData.contributionsThisWeek,
        contributionStreak: contributionsData.contributionStreak,
        recentCommits,
        stars: totalStars,
        lastUpdated: new Date().toISOString(),
        username: username,
        bio: userResponse.data.bio || '',
        location: userResponse.data.location || '',
        totalPullRequests: pullRequests,
        totalIssues: issues,
        contributionsLastYear: contributionsData.totalContributions,
      };

      // Update Firestore
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        githubStats: newStats,
        lastSync: new Date().toISOString()
      }, { merge: true });

      setStats(newStats);
      return newStats;
    } catch (err: any) {
      console.error('Error fetching GitHub data:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!githubUsername || loading) return;
    
    try {
      setLoading(true);
      await fetchGitHubDetailedData(githubUsername);
      setError(null);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError('GitHub username not found');
      } else if (err.response?.status === 403) {
        setError('API rate limit exceeded. Please try again later.');
      } else {
        setError('Failed to sync data. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUsernameChange = async () => {
    if (!githubUsername.trim() || !user?.uid) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Save username to Firestore
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        githubUsername: githubUsername.trim(),
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Fetch initial data
      await fetchGitHubDetailedData(githubUsername.trim());
      setIsEditing(false);
    } catch (err: any) {
      console.error('Error saving username:', err);
      setError('Failed to save username. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calculateSuggestions = (stats: GitHubStats): Suggestion[] => {
    return [
      {
        title: 'Daily Commit Challenge',
        description: 'Build a consistent coding habit with daily contributions.',
        icon: FiTrendingUp,
        status: stats.recentCommits >= 5 ? 'Completed' : 
               stats.recentCommits >= 2 ? 'In Progress' : 'Todo',
        metric: stats.recentCommits,
        target: 5,
        actionItems: [
          'Set up a daily coding schedule',
          'Work on side projects',
          'Contribute to open source projects',
        ],
      },
      {
        title: 'Grow Your Repository Collection',
        description: 'Showcase your projects and contribute to open source.',
        icon: FiStar,
        status: stats.publicRepos >= 10 ? 'Completed' :
               stats.publicRepos >= 5 ? 'In Progress' : 'Todo',
        metric: stats.publicRepos,
        target: 10,
        actionItems: [
          'Create portfolio projects',
          'Fork interesting repositories',
          'Contribute to existing projects',
        ],
      },
      {
        title: 'Increase Contributions',
        description: 'Make regular contributions to repositories.',
        icon: FiGitBranch,
        status: stats.contributions >= 100 ? 'Completed' :
               stats.contributions >= 50 ? 'In Progress' : 'Todo',
        metric: stats.contributions,
        target: 100,
        actionItems: [
          'Find beginner-friendly issues',
          'Submit pull requests',
          'Review others\' code',
        ],
      },
      {
        title: 'Build Your Network',
        description: 'Connect with other developers in your field.',
        icon: FiUsers,
        status: stats.followers >= 50 ? 'Completed' :
               stats.followers >= 20 ? 'In Progress' : 'Todo',
        metric: stats.followers,
        target: 50,
        actionItems: [
          'Follow active developers',
          'Engage in discussions',
          'Share your work',
        ],
      },
    ];
  };

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 min-h-screen bg-gradient-to-b from-secondary/50 to-primary">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto space-y-8"
      >
        {/* Header Section */}
        <div className="bg-secondary/80 backdrop-blur-xl rounded-2xl p-8 shadow-glow border border-accent/10">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-4xl font-display font-bold text-white bg-gradient-to-r from-accent to-accent-light bg-clip-text text-transparent">
              GitHub Profile Analytics
            </h1>
            {stats && !isEditing && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSync}
                disabled={loading}
                className="px-4 py-2 bg-accent/20 rounded-lg text-accent hover:bg-accent/30 transition-all duration-200 flex items-center gap-2"
              >
                <FiRefreshCw className={`${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Syncing...' : 'Sync Data'}
              </motion.button>
            )}
          </div>

          {/* Username Section */}
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            {isEditing ? (
              <div className="w-full space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <input
                    type="text"
                    placeholder="Enter GitHub username"
                    value={githubUsername}
                    onChange={(e) => setGithubUsername(e.target.value)}
                    className="flex-1 bg-primary/50 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent/50 border border-accent/20"
                  />
                  <div className="flex gap-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleUsernameChange}
                      disabled={loading || !githubUsername.trim()}
                      className="px-6 py-3 bg-accent rounded-lg text-white font-medium hover:bg-accent-light transition-all duration-200 disabled:opacity-50 flex items-center gap-2"
                    >
                      {loading ? (
                        <>
                          <FiLoader className="animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <FiCheck />
                          Save
                        </>
                      )}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setIsEditing(false);
                        setError(null);
                      }}
                      disabled={loading}
                      className="px-6 py-3 bg-gray-700 rounded-lg text-white font-medium hover:bg-gray-600 transition-all duration-200 disabled:opacity-50"
                    >
                      Cancel
                    </motion.button>
                  </div>
                </div>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-error/10 border border-error/20 text-error rounded-xl p-4"
                  >
                    {error}
                  </motion.div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between w-full">
                <div className="flex-1">
                  <p className="text-gray-400">GitHub Username</p>
                  <p className="text-white font-medium text-lg">
                    {githubUsername || 'Not set'}
                  </p>
                  {stats && (
                    <p className="text-gray-400 text-sm mt-1">
                      Last updated: {new Date(stats.lastUpdated).toLocaleString()}
                    </p>
                  )}
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsEditing(true)}
                  className="px-6 py-3 bg-accent rounded-lg text-white font-medium hover:bg-accent-light transition-all duration-200"
                >
                  Change Username
                </motion.button>
              </div>
            )}
          </div>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-error/10 border border-error/20 text-error rounded-xl p-4"
          >
            {error}
          </motion.div>
        )}

        {stats && !error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
          >
            {/* Enhanced Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { label: 'Total Contributions', value: stats.contributions, icon: FiTrendingUp },
                { label: 'This Week', value: stats.contributionsThisWeek, icon: FiTrendingUp },
                { label: 'Contribution Streak', value: stats.contributionStreak, icon: FiAward },
                { label: 'Repositories', value: stats.publicRepos, icon: FiGithub },
                { label: 'Stars', value: stats.stars, icon: FiStar },
                { label: 'Followers', value: stats.followers, icon: FiUsers },
                { label: 'Pull Requests', value: stats.totalPullRequests, icon: FiGitBranch },
                { label: 'Recent Commits', value: stats.recentCommits, icon: FiCheck },
              ].map((stat) => (
                <motion.div
                  key={stat.label}
                  whileHover={{ scale: 1.02, y: -5 }}
                  className="bg-secondary/80 backdrop-blur-xl rounded-xl p-6 shadow-lg border border-accent/10"
                >
                  <div className="flex items-center space-x-3">
                    <stat.icon className="h-6 w-6 text-accent" />
                    <h3 className="text-lg font-medium text-white">{stat.label}</h3>
                  </div>
                  <p className="text-3xl font-bold text-accent mt-4">{stat.value}</p>
                </motion.div>
              ))}
            </div>

            {/* Suggestions Grid */}
            <div className="bg-secondary/80 backdrop-blur-xl rounded-2xl p-8 shadow-lg border border-accent/10">
              <h2 className="text-2xl font-display font-bold text-white mb-6 flex items-center">
                <FiTrendingUp className="mr-3 text-accent" />
                Growth Recommendations
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {calculateSuggestions(stats).map((suggestion) => (
                  <motion.div
                    key={suggestion.title}
                    whileHover={{ scale: 1.02 }}
                    className="bg-primary/50 backdrop-blur-xl rounded-xl p-6 border border-accent/10"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <suggestion.icon className="h-6 w-6 text-accent" />
                      <span className={`text-sm px-3 py-1 rounded-full ${
                        suggestion.status === 'Completed' 
                          ? 'bg-success/20 text-success' 
                          : suggestion.status === 'In Progress'
                          ? 'bg-warning/20 text-warning'
                          : 'bg-gray-700 text-gray-300'
                      }`}>
                        {suggestion.status}
                      </span>
                    </div>
                    <h3 className="text-lg font-medium text-white mb-2">
                      {suggestion.title}
                    </h3>
                    <p className="text-gray-400 text-sm mb-4">
                      {suggestion.description}
                    </p>
                    <div className="mb-4">
                      <div className="flex justify-between text-sm text-gray-400 mb-2">
                        <span>Progress</span>
                        <span>{suggestion.metric}/{suggestion.target}</span>
                      </div>
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (suggestion.metric / suggestion.target) * 100)}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="h-full bg-accent rounded-full"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      {suggestion.actionItems.map((item, index) => (
                        <div key={index} className="flex items-center text-sm text-gray-400">
                          <FiCheck className="h-4 w-4 text-accent mr-2" />
                          {item}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default GithubImprovement;