import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Home from './pages/Home';
import GithubImprovement from './pages/GithubImprovement';
import LinkedInImprovement from './pages/LinkedInImprovement';
import CodingStats from './pages/CodingStats';
import LearningTree from './pages/LearningTree';
import PrivateRoute from './components/PrivateRoute';
import MainLayout from './layouts/MainLayout';
// import LinkedInCallback from './pages/LinkedInCallback';
import BootSplash from './components/BootSplash';
import { useAuth } from './hooks/useAuth';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const { loading: authLoading } = useAuth();

  useEffect(() => {
    // Minimum splash screen duration
    const minLoadingTime = 2000; // 2 seconds
    const startTime = Date.now();

    const initializeApp = async () => {
      try {
        // Wait for auth to be ready
        if (!authLoading) {
          const elapsedTime = Date.now() - startTime;
          const remainingTime = Math.max(0, minLoadingTime - elapsedTime);

          // Ensure minimum display time for splash screen
          await new Promise(resolve => setTimeout(resolve, remainingTime));
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error initializing app:', error);
        setIsLoading(false);
      }
    };

    initializeApp();
  }, [authLoading]);

  return (
    <Router>
      <AnimatePresence mode="wait">
        {isLoading ? (
          <BootSplash key="bootsplash" />
        ) : (
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/" element={
              <PrivateRoute>
                <MainLayout>
                  <Home />
                </MainLayout>
              </PrivateRoute>
            } />
            <Route path="/github" element={
              <PrivateRoute>
                <MainLayout>
                  <GithubImprovement />
                </MainLayout>
              </PrivateRoute>
            } />
            <Route path="/linkedin" element={
              <PrivateRoute>
                <MainLayout>
                  <LinkedInImprovement />
                </MainLayout>
              </PrivateRoute>
            } />
            <Route path="/stats" element={
              <PrivateRoute>
                <MainLayout>
                  <CodingStats />
                </MainLayout>
              </PrivateRoute>
            } />
            <Route path="/learning-tree" element={
              <PrivateRoute>
                <MainLayout>
                  <LearningTree />
                </MainLayout>
              </PrivateRoute>
            } />
            <Route path="/linkedin-improvement" element={<LinkedInImprovement />} />
            {/* <Route path="/linkedin-callback" element={<LinkedInCallback />} /> */}
          </Routes>
        )}
      </AnimatePresence>
    </Router>
  );
}

export default App;
