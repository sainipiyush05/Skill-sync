import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiHome, FiGithub, FiLinkedin, FiBarChart2, FiBook, FiMenu, FiX, FiUser, FiUsers } from 'react-icons/fi';
import { useAuth } from '../hooks/useAuth';
import BrandLogo from './BrandLogo';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, signOut } = useAuth();
  const location = useLocation();

  const navItems = [
    { path: '/', icon: FiHome, label: 'Home' },
    { path: '/github', icon: FiGithub, label: 'GitHub' },
    { path: '/linkedin', icon: FiLinkedin, label: 'LinkedIn' },
    { path: '/stats', icon: FiBarChart2, label: 'Stats' },
    { path: '/learning-tree', icon: FiBook, label: 'Learning Tree' },
    { path: 'https://p2p-puce.vercel.app/', icon: FiUsers, label: 'Community', external: true },
  ];

  return (
    <>
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="fixed top-0 left-0 right-0 z-50 bg-secondary/80 backdrop-blur-lg border-b border-gray-700/50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center group">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center space-x-3"
              >
                <div className="relative w-10 h-10 flex items-center justify-center">
                  <div className="absolute inset-0 scale-[0.4]">
                    <BrandLogo />
                  </div>
                </div>
                <span className="text-xl font-display font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                  SkillSync
                </span>
              </motion.div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => (
                <motion.div
                  key={item.path}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {item.external ? (
                    <a
                      href={item.path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`relative flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-gray-300 hover:text-white`}
                    >
                      <item.icon className="mr-2 h-5 w-5" />
                      {item.label}
                    </a>
                  ) : (
                    <Link
                      to={item.path}
                      className={`relative flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        location.pathname === item.path
                          ? 'text-white'
                          : 'text-gray-300 hover:text-white'
                      }`}
                    >
                      <item.icon className="mr-2 h-5 w-5" />
                      {item.label}
                      {location.pathname === item.path && (
                        <motion.div
                          layoutId="navbar-active"
                          className="absolute inset-0 bg-accent/10 rounded-lg -z-10"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                    </Link>
                  )}
                </motion.div>
              ))}
            </div>

            {/* User Menu */}
            <div className="hidden md:flex items-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={signOut}
                className="flex items-center px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white transition-colors duration-200 bg-primary-light/50 hover:bg-primary-light"
              >
                <FiUser className="mr-2 h-5 w-5" />
                Sign out
              </motion.button>
            </div>

            {/* Mobile menu button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2 rounded-lg bg-primary-light/50 text-gray-300 hover:text-white"
            >
              {isOpen ? (
                <FiX className="h-6 w-6" />
              ) : (
                <FiMenu className="h-6 w-6" />
              )}
            </motion.button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden overflow-hidden bg-primary-light/50 backdrop-blur-lg"
          >
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navItems.map((item) => (
                <motion.div
                  key={item.path}
                  whileHover={{ scale: 1.02, x: 5 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {item.external ? (
                    <a
                      href={item.path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center px-3 py-2 rounded-lg text-base font-medium text-gray-300 hover:text-white hover:bg-accent/5"
                      onClick={() => setIsOpen(false)}
                    >
                      <item.icon className="mr-2 h-5 w-5" />
                      {item.label}
                    </a>
                  ) : (
                    <Link
                      to={item.path}
                      className={`flex items-center px-3 py-2 rounded-lg text-base font-medium ${
                        location.pathname === item.path
                          ? 'bg-accent/10 text-white'
                          : 'text-gray-300 hover:text-white hover:bg-accent/5'
                      }`}
                      onClick={() => setIsOpen(false)}
                    >
                      <item.icon className="mr-2 h-5 w-5" />
                      {item.label}
                    </Link>
                  )}
                </motion.div>
              ))}
              <motion.button
                whileHover={{ scale: 1.02, x: 5 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  signOut();
                  setIsOpen(false);
                }}
                className="w-full text-left flex items-center px-3 py-2 text-base font-medium text-gray-300 hover:text-white hover:bg-accent/5 rounded-lg"
              >
                <FiUser className="mr-2 h-5 w-5" />
                Sign out
              </motion.button>
            </div>
          </motion.div>
        )}
      </motion.nav>
      {/* Spacer to prevent content from being hidden under navbar */}
      <div className="h-16" />
    </>
  );
};

export default Navbar; 