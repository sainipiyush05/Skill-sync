import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import axios from 'axios';

const LinkedInCallback = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const storedState = localStorage.getItem('linkedin_oauth_state');
      
      // Verify state to prevent CSRF attacks
      if (state !== storedState) {
        console.error('State mismatch');
        navigate('/linkedin-improvement?error=invalid_state');
        return;
      }

      localStorage.removeItem('linkedin_oauth_state');

      if (code && user?.uid) {
        try {
          // Exchange code for token
          const tokenResponse = await axios.post('/api/linkedin/token', { code });
          const { access_token, expires_in } = tokenResponse.data;

          // Save token to Firestore
          const userDocRef = doc(db, 'users', user.uid);
          await setDoc(userDocRef, {
            linkedInAccessToken: access_token,
            linkedInTokenExpiry: new Date(Date.now() + expires_in * 1000).toISOString(),
            lastUpdated: new Date().toISOString()
          }, { merge: true });

          // Fetch initial profile data
          const profileResponse = await axios.get('/api/linkedin/profile', {
            headers: { Authorization: `Bearer ${access_token}` }
          });

          // Save profile data
          await setDoc(userDocRef, {
            linkedInProfile: profileResponse.data,
            profileLastUpdated: new Date().toISOString()
          }, { merge: true });

          navigate('/linkedin-improvement?success=true');
        } catch (error) {
          console.error('Error handling LinkedIn callback:', error);
          navigate('/linkedin-improvement?error=auth_failed');
        }
      } else {
        navigate('/linkedin-improvement?error=invalid_request');
      }
    };

    handleCallback();
  }, [navigate, user]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0077B5]/10 to-primary">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-4">
          Connecting to LinkedIn...
        </h2>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0077B5] mx-auto" />
        <p className="text-gray-400 mt-4">Please wait while we complete the authentication</p>
      </div>
    </div>
  );
};

export default LinkedInCallback; 