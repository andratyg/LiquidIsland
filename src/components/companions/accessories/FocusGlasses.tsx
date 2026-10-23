import React from 'react';
import { motion } from 'framer-motion';

interface FocusGlassesProps {
  frameColor?: string;
}

export const FocusGlasses: React.FC<FocusGlassesProps> = ({
  frameColor = '#f59e0b',
}) => {
  return (
    <motion.svg
      width="56"
      height="24"
      viewBox="0 0 56 24"
      fill="none"
      initial={{ opacity: 0, scale: 0.85, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85, y: -4 }}
      transition={{ duration: 0.18 }}
      style={{
        position: 'absolute',
        top: '12px',
        left: 'calc(50% - 28px)',
        pointerEvents: 'none',
        zIndex: 26,
      }}
    >
      <defs>
        <linearGradient id="lens-glint" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
          <stop offset="40%" stopColor="#ffffff" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
        </linearGradient>
      </defs>

      {/* Center Nose Bridge */}
      <path
        d="M 23 11 Q 28 8 33 11"
        stroke={frameColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Left Temple Bar */}
      <path
        d="M 2 11 L 8 11"
        stroke={frameColor}
        strokeWidth="1.2"
        strokeLinecap="round"
      />

      {/* Right Temple Bar */}
      <path
        d="M 48 11 L 54 11"
        stroke={frameColor}
        strokeWidth="1.2"
        strokeLinecap="round"
      />

      {/* Left Circular Lens */}
      <circle
        cx="16"
        cy="12"
        r="8"
        fill="url(#lens-glint)"
        stroke={frameColor}
        strokeWidth="1.6"
      />
      {/* Left Specular Glint Highlight */}
      <path
        d="M 12 8 Q 16 6 19 8"
        stroke="#ffffff"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.8"
      />

      {/* Right Circular Lens */}
      <circle
        cx="40"
        cy="12"
        r="8"
        fill="url(#lens-glint)"
        stroke={frameColor}
        strokeWidth="1.6"
      />
      {/* Right Specular Glint Highlight */}
      <path
        d="M 36 8 Q 40 6 43 8"
        stroke="#ffffff"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.8"
      />
    </motion.svg>
  );
};
