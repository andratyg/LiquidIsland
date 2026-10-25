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
      width="60"
      height="38"
      viewBox="0 0 60 38"
      fill="none"
      initial={{ opacity: 0, y: -6, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.92 }}
      transition={{ duration: 0.2 }}
      style={{
        position: 'absolute',
        top: '1px',
        left: 'calc(50% - 30px)',
        pointerEvents: 'none',
        zIndex: 25,
      }}
    >
      <defs>
        {/* Sleek Dark Metallic Headband Gradient */}
        <linearGradient id="headband-metallic-grad" x1="0" y1="0" x2="60" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="25%" stopColor="#64748b" />
          <stop offset="50%" stopColor="#cbd5e1" />
          <stop offset="75%" stopColor="#64748b" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>

        {/* Earcup Dark Obsidian Metallic Fill */}
        <linearGradient id="earcup-glass-dark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#090d16" />
        </linearGradient>
      </defs>

      {/* Headband Arch: Arches HIGH over the top contour at y: 4px */}
      <path
        d="M 8 22 C 8 4, 52 4, 52 22"
        stroke="url(#headband-metallic-grad)"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />

      {/* Inner Padding Cushion */}
      <path
        d="M 12 18 C 12 7, 48 7, 48 18"
        stroke="#0f172a"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
        opacity="0.85"
      />

      {/* Left Earcup: Sits on the OUTER left side of the body (x: 4..10px, clear of eye at 23px) */}
      <g transform="translate(4, 16)">
        {/* Outer Dark Metallic Housing */}
        <rect
          x="0"
          y="0"
          width="6.5"
          height="13"
          rx="3.25"
          fill="url(#earcup-glass-dark)"
          stroke="#475569"
          strokeWidth="0.75"
        />
        {/* Thin Glowing Neon Accent Ring */}
        <rect
          x="1"
          y="1"
          width="4.5"
          height="11"
          rx="2.25"
          fill="none"
          stroke={tintColor}
          strokeWidth="0.9"
          style={{ filter: `drop-shadow(0 0 3px ${tintColor})` }}
        />
        {/* Specular Glint Highlight */}
        <circle cx="3.25" cy="4" r="0.9" fill="#ffffff" opacity="0.9" />
      </g>

      {/* Right Earcup: Sits on the OUTER right side of the body (x: 49.5..56px, clear of eye at 37px) */}
      <g transform="translate(49.5, 16)">
        {/* Outer Dark Metallic Housing */}
        <rect
          x="0"
          y="0"
          width="6.5"
          height="13"
          rx="3.25"
          fill="url(#earcup-glass-dark)"
          stroke="#475569"
          strokeWidth="0.75"
        />
        {/* Thin Glowing Neon Accent Ring */}
        <rect
          x="1"
          y="1"
          width="4.5"
          height="11"
          rx="2.25"
          fill="none"
          stroke={tintColor}
          strokeWidth="0.9"
          style={{ filter: `drop-shadow(0 0 3px ${tintColor})` }}
        />
        {/* Specular Glint Highlight */}
        <circle cx="3.25" cy="4" r="0.9" fill="#ffffff" opacity="0.9" />
      </g>
    </motion.svg>
  );
};
