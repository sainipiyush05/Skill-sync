import axios from 'axios';
import express from 'express';

const router = express.Router();

interface HackerRankStats {
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

const validateUsername = (input: string): string => {
  // Remove any URL components and get just the username
  const cleaned = input
    .replace(/https?:\/\//g, '')
    .replace(/www\./g, '')
    .replace(/hackerrank\.com\/profile\//g, '')
    .replace(/hackerrank\.com\//g, '')
    .replace(/\/$/, '')
    .trim();

  return cleaned;
};

router.get('/:username', async (req, res) => {
  let { username } = req.params;

  try {
    // Clean username
    username = validateUsername(username);
    
    // First try to get profile data using the new endpoint
    const profileResponse = await axios.get(
      `https://www.hackerrank.com/rest/hackers/${username}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'Cookie': 'hackerrank_mixpanel_token=1',
        },
        timeout: 10000
      }
    );

    if (!profileResponse.data) {
      throw new Error('User not found');
    }

    const profileData = profileResponse.data;

    // Get submissions data from the updated endpoint
    const submissionsResponse = await axios.get(
      `https://www.hackerrank.com/rest/hackers/${username}/scores_elo`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json',
          'Cookie': 'hackerrank_mixpanel_token=1',
        },
        timeout: 10000
      }
    );

    const stats: HackerRankStats = {
      solved: profileData.solved_challenges || 0,
      total: profileData.total_challenges || 0,
      rank: profileData.rank?.toString() || 'N/A',
      rating: profileData.contest_rating || 0,
      recentSubmissions: [],
      monthlyProgress: {
        'Jan': 0, 'Feb': 0, 'Mar': 0, 'Apr': 0,
        'May': 0, 'Jun': 0, 'Jul': 0, 'Aug': 0,
        'Sep': 0, 'Oct': 0, 'Nov': 0, 'Dec': 0
      }
    };

    // Get recent submissions from the updated endpoint
    try {
      const recentResponse = await axios.get(
        `https://www.hackerrank.com/rest/hackers/${username}/recent_challenges`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'application/json',
            'Cookie': 'hackerrank_mixpanel_token=1',
          },
          timeout: 10000
        }
      );

      if (recentResponse.data?.models) {
        stats.recentSubmissions = recentResponse.data.models
          .slice(0, 10)
          .map((sub: any) => ({
            problem: sub.name || 'Unknown Problem',
            difficulty: sub.difficulty || 'Unknown',
            status: sub.solved ? 'Solved' : 'Attempted',
            timestamp: sub.created_at || new Date().toISOString()
          }));
      }
    } catch (error) {
      console.warn('Failed to fetch recent submissions:', error);
    }

    // Calculate monthly progress
    if (submissionsResponse.data?.scores) {
      Object.entries(submissionsResponse.data.scores).forEach(([track, score]: [string, any]) => {
        const date = new Date(score.timestamp * 1000);
        const month = date.toLocaleString('en-US', { month: 'short' });
        if (stats.monthlyProgress[month] !== undefined && score.solved) {
          stats.monthlyProgress[month]++;
        }
      });
    }

    res.json(stats);
  } catch (error: any) {
    console.error('HackerRank API Error:', error.response?.data || error.message);
    
    if (error.response?.status === 429) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        details: 'Please try again later'
      });
    }

    if (error.response?.status === 404 || error.message === 'User not found') {
      return res.status(404).json({
        error: 'User not found',
        details: 'Please check the username and try again'
      });
    }

    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch HackerRank stats',
      details: error.message
    });
  }
});

export default router; 