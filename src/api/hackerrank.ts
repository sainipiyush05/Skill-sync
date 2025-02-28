import axios from 'axios';
import express from 'express';
import * as cheerio from 'cheerio';

const router = express.Router();

interface HackerRankBadge {
  name: string;
  stars: number;
  solved: number;
}

interface HackerRankStats {
  solved: number;
  badges: HackerRankBadge[];
  monthlyProgress: {
    [key: string]: number;
  };
}

const validateUsername = (input: string): string => {
  return input
    .replace(/https?:\/\//g, '')
    .replace(/www\./g, '')
    .replace(/hackerrank\.com\/profile\//g, '')
    .replace(/hackerrank\.com\//g, '')
    .replace(/\/$/, '')
    .trim();
};

router.get('/:username', async (req, res) => {
  let { username } = req.params;

  try {
    username = validateUsername(username);
    
    const profileResponse = await axios.get(
      `https://www.hackerrank.com/profile/${username}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      }
    );

    const $ = cheerio.load(profileResponse.data);
    const badges: HackerRankBadge[] = [];

    // Extract badges using multiple selectors
    $('.hacker-badge, .badge-container').each((_, element) => {
      const name = $(element).find('.badge-title, .title').text().trim();
      const stars = $(element).find('.badge-star, .star-filled').length;
      const solvedText = $(element).find('.badge-solved, .solved-count').text().trim();
      const solved = parseInt(solvedText.match(/\d+/)?.[0] || '0');
      
      if (name) {
        badges.push({ name, stars, solved });
      }
    });

    // Sort badges by solved count for better visualization
    badges.sort((a, b) => b.solved - a.solved);

    const stats: HackerRankStats = {
      solved: badges.reduce((sum, badge) => sum + badge.solved, 0),
      badges: badges || [],
      monthlyProgress: {
        'Jan': 0, 'Feb': 0, 'Mar': 0, 'Apr': 0,
        'May': 0, 'Jun': 0, 'Jul': 0, 'Aug': 0,
        'Sep': 0, 'Oct': 0, 'Nov': 0, 'Dec': 0
      }
    };

    res.json(stats);
  } catch (error: any) {
    console.error('HackerRank API Error:', error.message);
    // Return a valid stats object even on error
    res.status(200).json({
      solved: 0,
      badges: [],
      monthlyProgress: {
        'Jan': 0, 'Feb': 0, 'Mar': 0, 'Apr': 0,
        'May': 0, 'Jun': 0, 'Jul': 0, 'Aug': 0,
        'Sep': 0, 'Oct': 0, 'Nov': 0, 'Dec': 0
      }
    });
  }
});

export default router; 