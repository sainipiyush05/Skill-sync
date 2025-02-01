import { motion } from 'framer-motion';
import { FiCode, FiActivity } from 'react-icons/fi';

const BootSplash = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-primary flex items-center justify-center z-50"
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          duration: 0.5,
          ease: "easeOut"
        }}
        className="text-center"
      >
        <div className="flex items-center justify-center mb-4">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 360]
            }}
            transition={{
              duration: 2,
              ease: "easeInOut",
              repeat: Infinity
            }}
            className="relative"
          >
            <FiCode className="w-16 h-16 text-accent" />
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 1.5,
                ease: "easeInOut",
                repeat: Infinity
              }}
              className="absolute -top-2 -right-2"
            >
              <FiActivity className="w-6 h-6 text-success" />
            </motion.div>
          </motion.div>
        </div>
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-3xl font-bold text-white mb-2 font-display"
        >
          Skill Sync
        </motion.h1>
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-gray-400"
        >
          Synchronize Your Developer Journey
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-8"
        >
          <div className="flex justify-center space-x-2">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.3, 1, 0.3]
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2
                }}
                className="w-2 h-2 bg-accent rounded-full"
              />
            ))}
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default BootSplash; 