import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { auth } from '../services/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { FiMail, FiLock } from 'react-icons/fi';
import AuthBackground from '../components/AuthBackground';
import BrandLogo from '../components/BrandLogo';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (err) {
      setError('Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4">
      <AuthBackground />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="w-full max-w-md"
      >
        <div className="relative bg-secondary/80 backdrop-blur-xl rounded-2xl shadow-glow p-8">
          {/* Logo and Title */}
          <motion.div 
            className="text-center space-y-3 mb-8"
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
          >
            <div className="flex justify-center mb-4">
              <BrandLogo />
            </div>
            <motion.h2 
              className="text-3xl font-display font-bold text-white"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              SkillSync
            </motion.h2>
            <motion.p 
              className="text-gray-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Sign in to continue your journey
            </motion.p>
          </motion.div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 bg-error/10 border border-error/20 text-error rounded-xl p-4 text-sm flex items-center"
            >
              <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
              </svg>
              {error}
            </motion.div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1">
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiMail className="h-5 w-5 text-gray-400" />
                </div>
                <motion.input
                  whileFocus={{ scale: 1.01 }}
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 input focus:ring-2 focus:ring-accent/50"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiLock className="h-5 w-5 text-gray-400" />
                </div>
                <motion.input
                  whileFocus={{ scale: 1.01 }}
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 input focus:ring-2 focus:ring-accent/50"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={isLoading}
              className="w-full btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="relative z-10">
                {isLoading ? 'Signing in...' : 'Sign in'}
              </span>
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-accent-dark to-accent opacity-0 group-hover:opacity-100"
                initial={false}
                transition={{ duration: 0.3 }}
              />
            </motion.button>
          </form>

          {/* Sign Up Link */}
          <motion.p 
            className="mt-6 text-center text-sm text-gray-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Don't have an account?{' '}
            <Link
              to="/signup"
              className="font-medium text-accent hover:text-accent-light transition-colors duration-200"
            >
              Sign up
            </Link>
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login; 