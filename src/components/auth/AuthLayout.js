import React from 'react';
import { motion } from 'framer-motion';
import Logo from '../ui/Logo';
import RateLimitBanner from '../ui/RateLimitBanner';
import { AUTH_IMAGE_URL } from '../../utils/constants';

export default function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background-main">
      {/* Rate-limit banner (auto-shows on 429) */}
      <RateLimitBanner />

      <div className="flex flex-1 overflow-hidden">
      {/* Left — Image with overlay (hidden on mobile) */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <img
          src={AUTH_IMAGE_URL}
          alt="Team collaboration"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />

        {/* Overlay content */}
        <div className="absolute inset-0 flex flex-col justify-between p-10">
          {/* Top — Logo */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Logo size="md" className="[&_span]:text-white" />
          </motion.div>

          {/* Bottom — Heading & year */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-3"
          >
            <h2 className="text-3xl font-bold text-white leading-tight">
              Shorten. Share. Track.
            </h2>
            <p className="text-sm text-white/70 max-w-xs">
              The modern link management platform for teams.
            </p>
            <p className="text-xs text-white/40 pt-4">
              &copy; {new Date().getFullYear()} Golinks
            </p>
          </motion.div>
        </div>
      </div>

      {/* Right — Auth form */}
      <div className="w-full lg:w-1/2 flex flex-col h-full overflow-y-auto">
        <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-12 lg:px-16 xl:px-24 py-12">
          <div className="w-full max-w-sm">
            {/* Logo (visible on mobile only since image panel has its own) */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mb-10 lg:hidden"
            >
              <Logo size="xl" />
            </motion.div>

            {/* Title */}
            {title && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="mb-8"
              >
                <h1 className="text-3xl font-bold text-text-primary">{title}</h1>
                {subtitle && (
                  <p className="mt-2 text-text-secondary text-sm">{subtitle}</p>
                )}
              </motion.div>
            )}

            {/* Form content */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              {children}
            </motion.div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
