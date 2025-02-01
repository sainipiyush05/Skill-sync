import { motion } from 'framer-motion';
import { FiCode, FiBriefcase, FiTrendingUp } from 'react-icons/fi';

const BrandLogo = () => {
  return (
    <motion.div
      className="relative w-16 h-16"
      initial={{ scale: 0.5, rotate: -10 }}
      animate={{ scale: 1, rotate: 0 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <div className="absolute inset-0 bg-accent/10 rounded-2xl" />
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="relative">
          <FiCode className="w-8 h-8 text-accent absolute -left-4 -top-4 transform -rotate-12" />
          <FiBriefcase className="w-8 h-8 text-accent/80" />
          <FiTrendingUp className="w-8 h-8 text-accent absolute -right-4 -bottom-4 transform rotate-12" />
        </div>
      </motion.div>
    </motion.div>
  );
};

export default BrandLogo; 