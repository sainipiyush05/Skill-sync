import express, { Request, Response, Router, RequestHandler } from 'express';
import cors from 'cors';
import axios, { AxiosError } from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// Create a router
const router = Router();

const LINKEDIN_CLIENT_ID = process.env.REACT_APP_LINKEDIN_CLIENT_ID;
const LINKEDIN_CLIENT_SECRET = process.env.REACT_APP_LINKEDIN_CLIENT_SECRET;
const LINKEDIN_REDIRECT_URI = process.env.REACT_APP_LINKEDIN_REDIRECT_URI;

// Define interfaces
interface TokenRequest extends Request {
  body: {
    code: string;
  };
}

interface ShareRequest extends Request {
  body: {
    content: string;
    accessToken: string;
  };
}

interface LinkedInProfile {
  id: string;
  firstName: string;
  lastName: string;
  profilePicture?: any;
  headline?: string;
  summary?: string;
  vanityName?: string;
  skills: any[];
  experience: any[];
  education: any[];
}

interface ProfileStrength {
  score: number;
  sections: {
    basics: number;
    experience: number;
    education: number;
    skills: number;
    summary: number;
    photo: number;
  };
  suggestions: Array<{
    type: 'critical' | 'high' | 'medium' | 'low';
    message: string;
    action: string;
  }>;
}

// LinkedIn token exchange endpoint
const handleTokenExchange: RequestHandler = async (req, res) => {
  const { code } = (req as TokenRequest).body;

  try {
    const tokenResponse = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', null, {
      params: {
        grant_type: 'authorization_code',
        code,
        client_id: LINKEDIN_CLIENT_ID,
        client_secret: LINKEDIN_CLIENT_SECRET,
        redirect_uri: LINKEDIN_REDIRECT_URI,
      },
    });

    res.json(tokenResponse.data);
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error('LinkedIn token exchange error:', 
      axiosError.response?.data || axiosError.message
    );
    res.status(500).json({ error: 'Failed to exchange token' });
  }
};

// Add this function to calculate profile strength
const calculateProfileStrength = (profile: LinkedInProfile): ProfileStrength => {
  const strength: ProfileStrength = {
    score: 0,
    sections: {
      basics: 0,
      experience: 0,
      education: 0,
      skills: 0,
      summary: 0,
      photo: 0
    },
    suggestions: []
  };

  // Check basic info (20%)
  if (profile.firstName && profile.lastName) strength.sections.basics += 10;
  if (profile.headline) strength.sections.basics += 10;
  
  // Check experience (25%)
  const experienceScore = Math.min(25, (profile.experience?.length || 0) * 5);
  strength.sections.experience = experienceScore;
  
  // Check education (15%)
  const educationScore = Math.min(15, (profile.education?.length || 0) * 5);
  strength.sections.education = educationScore;
  
  // Check skills (20%)
  const skillsScore = Math.min(20, (profile.skills?.length || 0) * 2);
  strength.sections.skills = skillsScore;
  
  // Check summary (10%)
  if (profile.summary) strength.sections.summary = 10;
  
  // Check profile photo (10%)
  if (profile.profilePicture) strength.sections.photo = 10;

  // Calculate total score
  strength.score = Object.values(strength.sections).reduce((a, b) => a + b, 0);

  // Generate suggestions
  if (!profile.headline) {
    strength.suggestions.push({
      type: 'critical',
      message: 'Add a professional headline to appear in search results',
      action: 'Add headline'
    });
  }

  if (!profile.summary) {
    strength.suggestions.push({
      type: 'high',
      message: 'Add a summary to tell your professional story',
      action: 'Add summary'
    });
  }

  if (!profile.profilePicture) {
    strength.suggestions.push({
      type: 'critical',
      message: 'Add a profile photo to get more profile views',
      action: 'Add photo'
    });
  }

  if (!profile.experience?.length) {
    strength.suggestions.push({
      type: 'critical',
      message: 'Add your work experience to showcase your career',
      action: 'Add experience'
    });
  }

  if (!profile.education?.length) {
    strength.suggestions.push({
      type: 'high',
      message: 'Add your education to highlight your qualifications',
      action: 'Add education'
    });
  }

  if (!profile.skills?.length) {
    strength.suggestions.push({
      type: 'high',
      message: 'Add skills to be discovered for opportunities',
      action: 'Add skills'
    });
  }

  return strength;
};

// LinkedIn profile endpoint with expanded fields
const handleProfileFetch: RequestHandler = async (req, res) => {
  console.log('Profile fetch request received');
  const accessToken = req.headers.authorization?.split('Bearer ')[1];

  if (!accessToken) {
    console.log('No access token provided');
    res.status(401).json({ error: 'No access token provided' });
    return;
  }

  try {
    console.log('Fetching LinkedIn profile data...');
    // Fetch basic profile data
    const profileResponse = await axios.get<LinkedInProfile>('https://api.linkedin.com/v2/me?projection=(id,firstName,lastName,profilePicture,headline,summary,vanityName)', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0'
      }
    });

    // Fetch additional profile sections
    const [skillsResponse, experienceResponse, educationResponse] = await Promise.all([
      axios.get('https://api.linkedin.com/v2/skillsV2', {
        headers: { Authorization: `Bearer ${accessToken}` }
      }),
      axios.get('https://api.linkedin.com/v2/positions', {
        headers: { Authorization: `Bearer ${accessToken}` }
      }),
      axios.get('https://api.linkedin.com/v2/education', {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
    ]);

    // Combine all profile data
    const profileData: LinkedInProfile = {
      ...profileResponse.data,
      skills: skillsResponse.data.elements || [],
      experience: experienceResponse.data.elements || [],
      education: educationResponse.data.elements || []
    };

    console.log('Profile data fetched:', profileData);
    
    // Calculate profile strength
    const profileStrength = calculateProfileStrength(profileData);
    console.log('Profile strength calculated:', profileStrength);

    // Return profile data with strength analysis
    res.json({
      ...profileData,
      profileStrength
    });
  } catch (error) {
    console.error('LinkedIn profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile data' });
  }
};

// Share post endpoint
const handleShare: RequestHandler = async (req, res) => {
  const { content, accessToken } = (req as ShareRequest).body;

  if (!accessToken || !content) {
    res.status(400).json({ error: 'Missing required parameters' });
    return;
  }

  try {
    const profileResponse = await axios.get('https://api.linkedin.com/v2/me', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const authorUrn = `urn:li:person:${profileResponse.data.id}`;

    const postResponse = await axios.post('https://api.linkedin.com/v2/ugcPosts', {
      author: authorUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: content
          },
          shareMediaCategory: 'NONE'
        }
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
      }
    }, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    res.json({ success: true, data: postResponse.data });
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error('LinkedIn share error:', 
      axiosError.response?.data || axiosError.message
    );
    res.status(500).json({ error: 'Failed to share post' });
  }
};

// Register routes
router.post('/token', handleTokenExchange);
router.get('/profile', handleProfileFetch);
router.post('/share', handleShare);

// Create the Express app and add middleware
const app = express();
app.use(cors());
app.use(express.json());

// Mount the router at /api/linkedin
app.use('/api/linkedin', router);

export default app; 