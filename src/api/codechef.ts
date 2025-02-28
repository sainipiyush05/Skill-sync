import axios from 'axios';
import express from 'express';
import * as cheerio from 'cheerio';

const router = express.Router();

interface CodeChefBadge {
  name: string;
  current_level: string;
  problems_solved: number;
  problems_needed_next: number;
}

interface CodeChefSubmission {
  problem: string;
  difficulty: string;
  status: string;
  timestamp: string;
}

interface CodeChefStats {
  platform: string;
  username: string;
  solved: number;
  total: number;
  rank: string;
  rating: number;
  badges: CodeChefBadge[];
  monthlyProgress: {
    [key: string]: number;
  };
  recentSubmissions: CodeChefSubmission[];
}

const validateUsername = (input: string): string => {
  return input
    .replace(/https?:\/\//g, '')
    .replace(/www\./g, '')
    .replace(/codechef\.com\/users\//g, '')
    .replace(/\/$/, '')
    .trim();
};

router.get('/:username', async (req, res) => {
  let { username } = req.params;

  try {
    username = validateUsername(username);
    console.log('Fetching CodeChef stats for:', username);

    const response = await axios.get(
      `https://www.codechef.com/users/${username}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        timeout: 15000
      }
    );

    const $ = cheerio.load(response.data);
    console.log('Page loaded successfully');

    // Check if user exists
    const userNotFound = $('.error-message').length > 0 || 
                        response.data.includes('Invalid username');
    if (userNotFound) {
      throw new Error('User not found');
    }

    // Extract rating and rank
    const rating = $('.rating-header .rating').text().trim() || 
                  $('.rating-number').text().trim();
    const rank = $('.rating-header .rank').text().trim() || 
                $('.rating-ranks strong').first().text().trim();

    console.log('Basic stats:', { rating, rank });

    // Count solved problems
    let totalSolved = 0;
    const problemsSection = $('.problems-solved');
    
    // Try multiple ways to get solved count
    if (problemsSection.length > 0) {
      problemsSection.find('h5').each((_, elem) => {
        const text = $(elem).text().trim();
        if (text.includes('Fully Solved') || text.includes('Partially Solved')) {
          const count = parseInt($(elem).next('.content').text().match(/\d+/)?.[0] || '0', 10);
          totalSolved += count;
        }
      });
    } else {
      // Alternative selector for solved problems
      const solvedText = $('.content h5:contains("Problems Solved")').next('.content').text().trim();
      totalSolved = parseInt(solvedText.match(/\d+/)?.[0] || '0', 10);
    }

    console.log('Total solved:', totalSolved);

    // Extract badges
    const badges: CodeChefBadge[] = [];
    $('.badge-card, .rating-data-section').each((_, elem) => {
      const name = $(elem).find('.badge-title, h4').text().trim();
      const level = $(elem).find('.badge-level, .rating-star').text().trim();
      const progress = $(elem).find('.badge-progress, .problems-solved').text().trim();
      
      if (name) {
        const solved = parseInt(progress.match(/(\d+)/)?.[1] || '0', 10);
        const needed = parseInt(progress.match(/(\d+)\s*\/\s*(\d+)/)?.[2] || '0', 10);
        
        badges.push({
          name,
          current_level: level || 'Beginner',
          problems_solved: solved,
          problems_needed_next: needed
        });
      }
    });

    console.log('Badges:', badges);

    // Extract recent submissions
    const recentSubmissions: CodeChefSubmission[] = [];
    $('.submissions-table tbody tr, .dataTable tbody tr').each((i, elem) => {
      if (i < 10) {
        const cells = $(elem).find('td');
        const timestamp = cells.eq(0).text().trim();
        const problem = cells.eq(1).find('a').text().trim();
        const status = cells.eq(2).text().trim();
        const difficulty = cells.eq(3).text().trim() || 
                         cells.eq(1).find('.difficulty').text().trim();

        if (timestamp && problem) {
          try {
            const date = new Date(timestamp);
            recentSubmissions.push({
              problem,
              difficulty: difficulty || 'Unknown',
              status: status || 'Unknown',
              timestamp: date.toISOString()
            });
          } catch (error) {
            console.warn('Failed to parse submission date:', timestamp);
          }
        }
      }
    });

    console.log('Recent submissions:', recentSubmissions);

    // Calculate monthly progress
    const monthlyProgress: { [key: string]: number } = {
      'Jan': 0, 'Feb': 0, 'Mar': 0, 'Apr': 0,
      'May': 0, 'Jun': 0, 'Jul': 0, 'Aug': 0,
      'Sep': 0, 'Oct': 0, 'Nov': 0, 'Dec': 0
    };

    recentSubmissions.forEach(submission => {
      if (submission.status.toLowerCase().includes('accepted')) {
        const month = new Date(submission.timestamp).toLocaleString('en-US', { month: 'short' });
        monthlyProgress[month]++;
      }
    });

    const stats: CodeChefStats = {
      platform: 'CodeChef',
      username,
      solved: totalSolved,
      total: 5000,
      rank: rank || 'N/A',
      rating: parseInt(rating, 10) || 0,
      badges,
      monthlyProgress,
      recentSubmissions
    };

    console.log('Final stats:', stats);
    res.json(stats);
  } catch (error: any) {
    console.error('CodeChef API Error:', error.message);
    console.error('Full error:', error);
    
    res.status(200).json({
      platform: 'CodeChef',
      username: username || '',
      solved: 0,
      total: 5000,
      rank: 'N/A',
      rating: 0,
      badges: [],
      monthlyProgress: {
        'Jan': 0, 'Feb': 0, 'Mar': 0, 'Apr': 0,
        'May': 0, 'Jun': 0, 'Jul': 0, 'Aug': 0,
        'Sep': 0, 'Oct': 0, 'Nov': 0, 'Dec': 0
      },
      recentSubmissions: []
    });
  }
});

export default router; 