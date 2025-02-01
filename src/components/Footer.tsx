import { motion } from 'framer-motion';
import { FiGithub, FiLinkedin, FiTwitter, FiMail, FiHeart } from 'react-icons/fi';

const Footer = () => {
  const socialLinks = [
    { icon: FiGithub, href: "#", label: "GitHub" },
    { icon: FiLinkedin, href: "#", label: "LinkedIn" },
    { icon: FiTwitter, href: "#", label: "Twitter" },
    { icon: FiMail, href: "#", label: "Email" },
  ];

  return (
    <footer className="relative bg-secondary/80 backdrop-blur-lg border-t border-gray-700/50">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-accent/10 rounded-lg flex items-center justify-center">
                <span className="text-lg font-bold text-accent">SS</span>
              </div>
              <h3 className="text-lg font-display font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                SkillSync
              </h3>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              Elevate your developer journey with comprehensive tracking and insights across platforms.
            </p>
          </motion.div>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
              Quick Links
            </h4>
            <ul className="mt-4 space-y-2">
              {['About Us', 'Privacy Policy', 'Terms of Service'].map((item) => (
                <motion.li
                  key={item}
                  whileHover={{ x: 5 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <a
                    href="#"
                    className="text-gray-400 hover:text-white transition-colors duration-200 flex items-center"
                  >
                    <span className="h-px w-4 bg-accent/50 mr-2" />
                    {item}
                  </a>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Social Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
          >
            <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
              Connect With Us
            </h4>
            <div className="mt-4 flex space-x-4">
              {socialLinks.map((item, index) => (
                <motion.a
                  key={item.label}
                  href={item.href}
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-2 rounded-lg bg-primary-light/50 text-gray-400 hover:text-white transition-colors duration-200"
                >
                  <item.icon className="h-5 w-5" />
                </motion.a>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="mt-8 pt-8 border-t border-gray-700/50"
        >
          <p className="text-center text-gray-400 text-sm flex items-center justify-center">
            Made with 
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="mx-1 text-red-500"
            >
              <FiHeart className="h-4 w-4" />
            </motion.span>
            by SkillSync © {new Date().getFullYear()}
          </p>
        </motion.div>
      </div>
    </footer>
  );
};

export default Footer; 