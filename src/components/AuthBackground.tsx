import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const AuthBackground = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: e.clientX,
        y: e.clientY,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <>
      {/* Enhanced Gradient Background */}
      <div className="fixed inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-dark to-[#0A0F1C]" />
        <motion.div 
          className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.1),transparent_50%)]"
          animate={{
            backgroundPosition: `${mousePosition.x * 0.05}px ${mousePosition.y * 0.05}px`
          }}
          transition={{ type: "spring", damping: 10 }}
        />
      </div>

      {/* Space Dust */}
      <div className="fixed inset-0">
        {[...Array(100)].map((_, i) => (
          <motion.div
            key={`dust-${i}`}
            initial={{
              opacity: Math.random() * 0.5 + 0.2,
              scale: Math.random() * 0.4 + 0.3,
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
            }}
            animate={{
              opacity: [null, 0.2, 0.5, 0.2],
              scale: [null, 0.5, 1, 0.5],
              x: mousePosition.x * (i % 5) * 0.02,
              y: mousePosition.y * (i % 3) * 0.02,
            }}
            transition={{
              duration: 8 + Math.random() * 12,
              repeat: Infinity,
              delay: i * 0.1,
            }}
            className="absolute w-1 h-1 bg-white rounded-full"
          />
        ))}
      </div>

      {/* Nebula Effects */}
      <div className="fixed inset-0 overflow-hidden">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={`nebula-${i}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: [0.1, 0.3, 0.1],
              scale: [1, 1.2, 1],
              x: [0, i % 2 === 0 ? 100 : -100, 0],
              y: [0, i % 2 === 0 ? -100 : 100, 0],
            }}
            transition={{
              duration: 20 + i * 5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className={`absolute rounded-full blur-[100px] ${
              i === 0
                ? 'bg-purple-500/20 w-[800px] h-[800px] -top-40 -left-20'
                : i === 1
                ? 'bg-blue-500/20 w-[600px] h-[600px] top-[60%] -right-40'
                : 'bg-accent/20 w-[700px] h-[700px] top-1/4 left-1/3'
            }`}
          />
        ))}
      </div>

      {/* Shooting Stars */}
      <div className="fixed inset-0 overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={`star-${i}`}
            initial={{
              opacity: 0,
              x: -100,
              y: Math.random() * window.innerHeight,
            }}
            animate={{
              opacity: [0, 1, 0],
              x: [null, window.innerWidth + 200],
              y: [null, Math.random() * window.innerHeight],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 3,
              ease: "linear",
            }}
            className="absolute h-px w-16 bg-gradient-to-r from-transparent via-white to-transparent"
            style={{
              transform: 'rotate(-45deg)',
            }}
          />
        ))}
      </div>

      {/* Interactive Constellation Points */}
      <div className="fixed inset-0">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={`constellation-${i}`}
            className="absolute w-1 h-1 bg-accent rounded-full"
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
              scale: 0.5,
            }}
            animate={{
              scale: [0.5, 1, 0.5],
              opacity: [0.3, 0.7, 0.3],
            }}
            transition={{
              duration: 4 + Math.random() * 2,
              repeat: Infinity,
              delay: i * 0.3,
            }}
          />
        ))}
      </div>

      {/* Subtle Noise Overlay */}
      <div 
        className="fixed inset-0 opacity-[0.015] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%' height='100%' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
        }}
      />
    </>
  );
};

export default AuthBackground; 