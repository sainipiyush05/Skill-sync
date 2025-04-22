import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiLinkedin, FiStar, FiAlertCircle, FiCheck, FiSearch } from 'react-icons/fi';
import { useAuth } from '../hooks/useAuth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// API base URL - fallback to localhost if environment variable is not set
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

interface Improvement {
  type: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  action: string;
}

interface ProfileStats {
  connections: number;
  posts: number;
  views: number;
  articles: number;
  followers: number;
}

interface ProfileAnalysis {
  urlQuality: number;
  profileCompleteness: number;
  engagement: number;
  networkStrength: number;
  improvements: Improvement[];
}

interface ProfileData {
  profile: {
    username: string;
    url: string;
    views: number;
    followers: number;
    name?: string;
    headline?: string;
  };
  activity: {
    posts: Array<{id: number, title: string}>;
    articles: Array<{id: number, title: string}>;
  };
  connections: {
    count: number;
    new: number;
    pending: number;
  };
  engagement: {
    score: number;
    likes: number;
    comments: number;
    shares: number;
  };
  analysis: ProfileAnalysis;
}

const LinkedInImprovement = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkedInUrl, setLinkedInUrl] = useState('');
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [profileScore, setProfileScore] = useState(0);
  const navigate = useNavigate();

  // Load user's previously analyzed LinkedIn data if available
  useEffect(() => {
    const loadSavedData = async () => {
      if (!user?.uid) return;

      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          // Check if user has a LinkedIn profile URL
          if (userData?.linkedInUrl) {
            setLinkedInUrl(userData.linkedInUrl);
            
            // If they have profile data already, use it
            if (userData?.linkedInStats) {
              setProfileData(userData.linkedInStats);
              setProfileScore(userData.linkedInStats.analysis?.profileStrength || 0);
            }
          }
        }
      } catch (err) {
        console.error('Error loading saved data:', err);
      }
    };

    loadSavedData();
  }, [user]);

  const handleProfileUpdate = async () => {
    if (!linkedInUrl.trim()) return;
    
    const urlPattern = /^https?:\/\/(www\.)?linkedin\.com\/in\/[\w-]+\/?$/;
    if (!urlPattern.test(linkedInUrl)) {
      setError('Please enter a valid LinkedIn profile URL');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('Analyzing LinkedIn profile:', linkedInUrl);
      console.log('Request URL:', `${API_BASE_URL}/api/linkedin/scrape`);
      
      // Call our backend API to analyze the LinkedIn profile
      const response = await axios.post(`${API_BASE_URL}/api/linkedin/scrape`, {
        profileUrl: linkedInUrl
      });
      
      if (!response.data) {
        throw new Error('Failed to fetch profile data');
      }
      
      console.log('Profile data received:', response.data);
      
      setProfileData(response.data);
      setProfileScore(response.data.analysis.profileStrength);
      
      // Save to Firestore
      if (user?.uid) {
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, {
          linkedInUrl: linkedInUrl,
          linkedInUsername: response.data.profile.username,
          linkedInStats: response.data,
          lastUpdated: new Date().toISOString()
        }, { merge: true });
      }
      
    } catch (error: any) {
      console.error('Error analyzing profile:', error);
      let errorMessage = 'Failed to analyze profile. Please try again.';
      
      // Extract more detailed error information if available
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        
        if (error.response.data && error.response.data.detail) {
          errorMessage = `Error: ${error.response.data.detail}`;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0077B5]/10 to-primary p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        <h1 className="text-3xl font-bold text-white mb-8">LinkedIn Profile Enhancement</h1>
        
        <div className="bg-primary/30 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">Analyze LinkedIn Profile</h2>
          <p className="text-gray-300 mb-4">
            Enter your LinkedIn profile URL to get personalized improvement recommendations
          </p>
          <div className="space-y-4">
            <div className="flex items-center bg-primary/20 rounded-xl overflow-hidden">
              <input
                type="text"
                value={linkedInUrl}
                onChange={(e) => setLinkedInUrl(e.target.value)}
                placeholder="https://linkedin.com/in/your-username"
                className="w-full p-4 bg-transparent text-white placeholder-gray-400 border-none focus:outline-none focus:ring-0"
              />
              <button
                onClick={handleProfileUpdate}
                disabled={loading || !linkedInUrl.trim()}
                className="px-6 py-4 bg-accent hover:bg-accent-dark disabled:bg-gray-700 disabled:cursor-not-allowed text-white transition-colors duration-200"
              >
                <FiSearch className="w-5 h-5" />
              </button>
            </div>
            
            {error && (
              <p className="text-red-500 flex items-center gap-2">
                <FiAlertCircle className="flex-shrink-0" />
                <span>{error}</span>
              </p>
            )}
            
            {loading && (
              <div className="flex items-center gap-3 text-white">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                <span>Analyzing profile...</span>
              </div>
            )}
          </div>
        </div>

        {profileData && (
          <div className="space-y-8 mt-8">
            <div className="bg-primary/30 rounded-xl p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white mb-2">
                    {profileData.profile.name || profileData.profile.username}
                  </h2>
                  {profileData.profile.headline && (
                    <p className="text-gray-300">{profileData.profile.headline}</p>
                  )}
                </div>
                <div className="bg-primary/40 rounded-xl p-3">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white">{profileScore}%</div>
                    <div className="text-sm text-gray-400">Profile Strength</div>
                  </div>
                </div>
              </div>
              
              <div className="w-full bg-primary/20 rounded-full h-2 mb-6">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${profileScore}%` }}
                  className="bg-[#00A0DC] h-2 rounded-full"
                />
              </div>

              {profileData.analysis.improvements && profileData.analysis.improvements.length > 0 && (
                <div className="mt-6 space-y-4">
                  <h3 className="text-lg font-semibold text-white">Suggested Improvements</h3>
                  {profileData.analysis.improvements.map((improvement: Improvement, index: number) => (
                    <div 
                      key={index} 
                      className={`bg-primary/20 p-4 rounded-lg border-l-4 ${
                        improvement.type === 'critical' ? 'border-red-500' :
                        improvement.type === 'high' ? 'border-yellow-500' :
                        improvement.type === 'medium' ? 'border-blue-500' :
                        'border-green-500'
                      }`}
                    >
                      <p className="text-white font-medium">{improvement.message}</p>
                      <p className="text-gray-400 text-sm mt-1">{improvement.action}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6">
                <h3 className="text-lg font-semibold text-white mb-3">Profile Stats</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-primary/20 p-4 rounded-lg">
                    <p className="text-2xl font-bold text-white">
                      {profileData.connections.count}
                    </p>
                    <p className="text-gray-400">Connections</p>
                  </div>
                  <div className="bg-primary/20 p-4 rounded-lg">
                    <p className="text-2xl font-bold text-white">
                      {profileData.activity.posts.length}
                    </p>
                    <p className="text-gray-400">Posts</p>
                  </div>
                  <div className="bg-primary/20 p-4 rounded-lg">
                    <p className="text-2xl font-bold text-white">
                      {profileData.profile.views}
                    </p>
                    <p className="text-gray-400">Profile Views</p>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-semibold text-white mb-3">Profile Analysis</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-primary/20 p-4 rounded-lg">
                    <p className="text-gray-400">URL Quality</p>
                    <p className="text-2xl font-bold text-white">
                      {profileData.analysis.urlQuality}%
                    </p>
                  </div>
                  <div className="bg-primary/20 p-4 rounded-lg">
                    <p className="text-gray-400">Profile Completeness</p>
                    <p className="text-2xl font-bold text-white">
                      {profileData.analysis.profileCompleteness}%
                    </p>
                  </div>
                  <div className="bg-primary/20 p-4 rounded-lg">
                    <p className="text-gray-400">Engagement Score</p>
                    <p className="text-2xl font-bold text-white">
                      {profileData.analysis.engagement}%
                    </p>
                  </div>
                  <div className="bg-primary/20 p-4 rounded-lg">
                    <p className="text-gray-400">Network Strength</p>
                    <p className="text-2xl font-bold text-white">
                      {profileData.analysis.networkStrength}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default LinkedInImprovement; 