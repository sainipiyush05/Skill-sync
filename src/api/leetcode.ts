import axios from 'axios';
import express from 'express';
const router = express.Router();

interface LeetCodeParams {
  username: string;
}

interface LeetCodeStats {
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

interface LeetCodeError {
  error: string;
  details?: string | unknown;
}

const validateUsername = (username: string): boolean => {
  // Remove any URL parts if present
  const cleaned = username
    .replace(/https?:\/\//g, '')
    .replace(/www\./g, '')
    .replace(/leetcode\.com\/(u\/)?/g, '')
    .replace(/\/$/, '')
    .trim();

  // Check if username is valid
  return (
    cleaned.length > 0 &&
    cleaned.length <= 39 &&
    /^[a-zA-Z0-9-_]+$/.test(cleaned)
  );
};

const getLeetCodeStats = async (
  req: express.Request<LeetCodeParams>,
  res: express.Response<LeetCodeStats | LeetCodeError>
): Promise<void> => {
  let { username } = req.params;

  // Clean and validate username
  username = username
    .replace(/https?:\/\//g, '')
    .replace(/www\./g, '')
    .replace(/leetcode\.com\/(u\/)?/g, '')
    .replace(/\/$/, '')
    .trim();

  if (!username || username.length > 39 || !/^[a-zA-Z0-9-_]+$/.test(username)) {
    res.status(400).json({
      error: 'Invalid username format',
      details: 'Username should only contain letters, numbers, underscores, and hyphens'
    });
    return;
  }

  try {
    const statsQuery = {
      operationName: "userPublicProfile",
      query: `
        query userPublicProfile($username: String!) {
          matchedUser(username: $username) {
            username
            submitStats: submitStatsGlobal {
              acSubmissionNum {
                difficulty
                count
                submissions
              }
            }
            profile {
              ranking
              reputation
            }
            submissionCalendar
          }
          allQuestionsCount {
            difficulty
            count
          }
        }
      `,
      variables: { username }
    };

    const response = await axios.post('https://leetcode.com/graphql', statsQuery, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      }
    });

    const userData = response.data.data;
    
    if (!userData?.matchedUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Calculate total solved problems
    const totalSolved = userData.matchedUser.submitStats.acSubmissionNum.reduce(
      (acc: number, curr: { count: number }) => acc + curr.count,
      0
    );

    const totalProblems = userData.allQuestionsCount.reduce(
      (acc: number, curr: { count: number }) => acc + curr.count,
      0
    );

    // Initialize monthly progress
    const monthlyProgress: { [key: string]: number } = {
      'Jan': 0, 'Feb': 0, 'Mar': 0, 'Apr': 0,
      'May': 0, 'Jun': 0, 'Jul': 0, 'Aug': 0,
      'Sep': 0, 'Oct': 0, 'Nov': 0, 'Dec': 0
    };

    // Process submission calendar for monthly progress
    if (userData.matchedUser.submissionCalendar) {
      const calendar = JSON.parse(userData.matchedUser.submissionCalendar);
      Object.entries(calendar).forEach(([timestamp, count]) => {
        const date = new Date(parseInt(timestamp) * 1000);
        const month = date.toLocaleString('en-US', { month: 'short' });
        if (monthlyProgress[month] !== undefined) {
          monthlyProgress[month] += count as number;
        }
      });
    }

    // Get recent submissions in a separate query
    const recentQuery = {
      operationName: "recentSubmissions",
      query: `
        query recentSubmissions($username: String!) {
          recentSubmissionList(username: $username, limit: 10) {
            title
            timestamp
            statusDisplay
          }
        }
      `,
      variables: { username }
    };

    const recentResponse = await axios.post('https://leetcode.com/graphql', recentQuery, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      }
    });

    const recentSubmissions = recentResponse.data.data.recentSubmissionList || [];

    const stats: LeetCodeStats = {
      solved: totalSolved,
      total: totalProblems,
      rank: userData.matchedUser.profile.ranking?.toString() || 'N/A',
      rating: userData.matchedUser.profile.reputation || 0,
      recentSubmissions: recentSubmissions.map((sub: any) => ({
        problem: sub.title,
        difficulty: 'Unknown',
        status: sub.statusDisplay,
        timestamp: new Date(parseInt(sub.timestamp) * 1000).toISOString()
      })),
      monthlyProgress
    };

    res.json(stats);
  } catch (error: any) {
    console.error('LeetCode API Error:', error.response?.data || error.message);
    
    if (error.response?.status === 429) {
      res.status(429).json({ 
        error: 'Rate limit exceeded',
        details: 'Please try again later'
      });
      return;
    }

    if (error.response?.status === 403) {
      res.status(403).json({ 
        error: 'Access denied',
        details: 'Please try again later'
      });
      return;
    }

    if (error.response?.status === 404) {
      res.status(404).json({ 
        error: 'User not found',
        details: 'Please check the username and try again'
      });
      return;
    }

    res.status(error.response?.status || 500).json({ 
      error: 'Failed to fetch LeetCode stats',
      details: error.response?.data || error.message
    });
  }
};

router.get('/:username', getLeetCodeStats);

export default router; 