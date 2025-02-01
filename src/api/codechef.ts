import axios from 'axios';
import express from 'express';
import * as cheerio from 'cheerio';

const router = express.Router();

interface CodeChefStats {
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
    .replace(/codechef\.com\/users\//g, '')
    .replace(/\/$/, '')
    .trim();

  return cleaned; // Remove strict validation to allow more username formats
};

router.get('/:username', async (req, res) => {
  let { username } = req.params;

  try {
    // Clean username
    username = validateUsername(username);
    
    const response = await axios.get(
      `https://www.codechef.com/users/${username}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        timeout: 15000,
        maxRedirects: 5
      }
    );

    const $ = cheerio.load(response.data);

    // Check if user exists by looking for specific elements
    if ($('.user-details-container').length === 0) {
      throw new Error('User not found');
    }

    // Extract user data with better selectors
    const rating = $('.rating-number').first().text().trim();
    const rank = $('.rating-ranks strong').first().text().trim();
    
    // Get problem counts from all sections
    let totalSolved = 0;
    
    // Count fully solved problems
    $('.problems-solved').find('h5').each((_, elem) => {
      const header = $(elem).text().trim();
      if (header.includes('Fully Solved')) {
        const content = $(elem).next('.content').text().trim();
        const count = parseInt(content.split('(')[0].trim()) || 0;
        totalSolved += count;
      }
      if (header.includes('Partially Solved')) {
        const content = $(elem).next('.content').text().trim();
        const count = parseInt(content.split('(')[0].trim()) || 0;
        totalSolved += count;
      }
    });

    const stats: CodeChefStats = {
      solved: totalSolved,
      total: 5000,
      rank: rank || 'N/A',
      rating: parseInt(rating) || 0,
      recentSubmissions: [],
      monthlyProgress: {
        'Jan': 0, 'Feb': 0, 'Mar': 0, 'Apr': 0,
        'May': 0, 'Jun': 0, 'Jul': 0, 'Aug': 0,
        'Sep': 0, 'Oct': 0, 'Nov': 0, 'Dec': 0
      }
    };

    // Extract recent submissions
    $('.submissions-list tbody tr').each((i, elem) => {
      if (i < 10) {
        const cells = $(elem).find('td');
        const timestamp = cells.eq(0).text().trim();
        const problem = cells.eq(1).find('a').text().trim();
        const status = cells.eq(2).text().trim();

        if (timestamp && problem) {
          try {
            const date = new Date(timestamp);
            stats.recentSubmissions.push({
              problem,
              difficulty: 'Unknown',
              status: status || 'Unknown',
              timestamp: date.toISOString()
            });

            if (status.toLowerCase().includes('accepted')) {
              const month = date.toLocaleString('en-US', { month: 'short' });
              stats.monthlyProgress[month]++;
            }
          } catch (error) {
            console.warn('Failed to parse submission date:', timestamp);
          }
        }
      }
    });

    res.json(stats);
  } catch (error: any) {
    console.error('CodeChef API Error:', error.message);
    
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
      error: 'Failed to fetch CodeChef stats',
      details: error.message
    });
  }
});

export default router; 