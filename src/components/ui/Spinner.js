import React from 'react';
import { motion } from 'framer-motion';
import { Link2 } from 'lucide-react';

export default function Spinner({ size = 'md', className = '' }) {
  const sizes = {
    sm: { container: 'w-8 h-8', icon: 'w-4 h-4' },
    md: { container: 'w-12 h-12', icon: 'w-6 h-6' },
    lg: { container: 'w-20 h-20', icon: 'w-10 h-10' },
  };

  const s = sizes[size] || sizes.md;

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <motion.div
        className={`${s.container} flex items-center justify-center`}
        animate={{
          scale: [1, 1.18, 1, 1.12, 1],
        }}
        transition={{
          duration: 1.1,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <Link2 className={`${s.icon} text-primary`} strokeWidth={2.5} />
      </motion.div>
    </div>
  );
}
