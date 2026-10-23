import React from 'react';
import { motion } from 'framer-motion';

interface MiniHeadphonesProps {
  tintColor?: string;
}

export const MiniHeadphones: React.FC<MiniHeadphonesProps> = ({
  tintColor = '#3b82f6',
}) => {
  return (
    <motion.svg
      className="headphone-pulse"
      width="64"
      height="32"
      viewBox="0 0 64 32"
      fill="none"
      initial={{ opacity: 0, y: -6, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      style={{
        position: 'absolute',
        top: '2px',
        left: 'calc(50% - 32px)',
        pointerEvents: 'none',
        zIndex: 25,
      }}
    >
      <defs>
        <linearGradient id="headband-grad" x1="0" y1="0" x2="64" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="50%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
        <radialGradient id="earpad-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={tintColor} stopOpacity="0.9" />
          <stop offset="100%" stopColor={tintColor} stopOpacity="0.3" />
        </radialGradient>
      </defs>

      {/* Headband Overarching Arc */}
      <path
        d="M 12 24 C 12 8, 52 8, 52 24"
        stroke="url(#headband-grad)"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />

      {/* Left Earpad */}
      <g transform="translate(6, 17)">
        <rect
          x="0"
          y="0"
          width="7"
          height="12"
          rx="3.5"
          fill="url(#earpad-glow)"
          stroke="#1e293b"
          strokeWidth="0.8"
        />
        {/* Inner Accent Ring */}
        <circle cx="3.5" cy="6" r="1.5" fill="#ffffff" opacity="0.85" />
      </g>

      {/* Right Earpad */}
      <g transform="translate(51, 17)">
        <rect
          x="0"
          y="0"
          width="7"
          height="12"
          rx="3.5"
          fill="url(#earpad-glow)"
          stroke="#1e293b"
          strokeWidth="0.8"
        />
        {/* Inner Accent Ring */}
        <circle cx="3.5" cy="6" r="1.5" fill="#ffffff" opacity="0.85" />
      </g>
    </motion.svg>
  );
};
