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
      width="60"
      height="38"
      viewBox="0 0 60 38"
      fill="none"
      initial={{ opacity: 0, scale: 0.88, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.88, y: -4 }}
      transition={{ duration: 0.18 }}
      style={{
        position: 'absolute',
        top: '1px',
        left: 'calc(50% - 30px)',
        pointerEvents: 'none',
        zIndex: 26,
      }}
    >
      <defs>
        <linearGradient id="lens-glint-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.40" />
          <stop offset="45%" stopColor="#ffffff" stopOpacity="0.10" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
        </linearGradient>
      </defs>

      {/* Center Tiny Nose Bridge (between cx=23 and cx=37) */}
      <path
        d="M 28.4 24 Q 30 22.5 31.6 24"
        stroke={frameColor}
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />

      {/* Left Temple Bar */}
      <path
        d="M 11 22.5 L 17.6 23.5"
        stroke={frameColor}
        strokeWidth="1.2"
        strokeLinecap="round"
      />

      {/* Right Temple Bar */}
      <path
        d="M 42.4 23.5 L 49 22.5"
        stroke={frameColor}
        strokeWidth="1.2"
        strokeLinecap="round"
      />

      {/* Left Circular Lens (Centered precisely over eye cx=23, cy=24) */}
      <circle
        cx="23"
        cy="24"
        r="5.4"
        fill="url(#lens-glint-gradient)"
        stroke={frameColor}
        strokeWidth="1.5"
      />
      {/* Left Specular Glint Highlight */}
      <path
        d="M 20.2 21.5 Q 23 20 25.4 21.5"
        stroke="#ffffff"
        strokeWidth="0.8"
        strokeLinecap="round"
        opacity="0.85"
      />

      {/* Right Circular Lens (Centered precisely over eye cx=37, cy=24) */}
      <circle
        cx="37"
        cy="24"
        r="5.4"
        fill="url(#lens-glint-gradient)"
        stroke={frameColor}
        strokeWidth="1.5"
      />
      {/* Right Specular Glint Highlight */}
      <path
        d="M 34.2 21.5 Q 37 20 39.4 21.5"
        stroke="#ffffff"
        strokeWidth="0.8"
        strokeLinecap="round"
        opacity="0.85"
      />
    </motion.svg>
  );
};
