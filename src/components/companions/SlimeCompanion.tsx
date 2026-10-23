import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export interface CompanionSharedProps {
  cursorDelta: { x: number; y: number; angle: number; distance: number };
  isPetting: boolean;
  isDraggingFile: boolean;
  companionColor: string;
  theme: 'dark' | 'light';
  onPet?: () => void;
}

export const SlimeCompanion: React.FC<CompanionSharedProps> = ({
  cursorDelta,
  isPetting,
  isDraggingFile,
  companionColor,
  theme,
}) => {
  // Blinking cycle: random blink every 3.5 - 5.5 seconds
  const [isBlinking, setIsBlinking] = useState(false);
  const blinkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function scheduleBlink() {
      const nextDelay = 3500 + Math.random() * 2000;
      blinkTimerRef.current = setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => {
          setIsBlinking(false);
          // Occasional double-blink (20% chance)
          if (Math.random() < 0.2) {
            setTimeout(() => {
              setIsBlinking(true);
              setTimeout(() => {
                setIsBlinking(false);
                scheduleBlink();
              }, 120);
            }, 100);
          } else {
            scheduleBlink();
          }
        }, 150);
      }, nextDelay);
    }

    scheduleBlink();
    return () => {
      if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
    };
  }, []);

  // Pupil displacement clamped to eye socket boundaries
  const maxRx = 4.2;
  const maxRy = 2.8;
  const pupilX = Math.cos(cursorDelta.angle) * cursorDelta.distance * maxRx;
  const pupilY = Math.sin(cursorDelta.angle) * cursorDelta.distance * maxRy;

  // Slime deformation based on states
  let slimeScaleX = 1;
  let slimeScaleY = 1;
  let slimeY = 0;

  if (isDraggingFile) {
    // Swallow anticipation: stretch downward and narrow horizontally
    slimeScaleX = 0.92;
    slimeScaleY = 1.16;
    slimeY = 3.5;
  } else if (isPetting) {
    // Jelly squash and bounce
    slimeScaleX = 1.14;
    slimeScaleY = 0.86;
    slimeY = 1.8;
  }

  const isDark = theme === 'dark';
  const eyeSocketWhite = isDark ? '#ffffff' : '#f8fafc';
  const pupilCoreDark = isDark ? '#090d16' : '#1e293b';

  return (
    <div
      className={`relative w-full h-full flex items-center justify-center select-none ${
        !isPetting && !isDraggingFile ? 'slime-breathing' : ''
      }`}
      style={{
        width: '168px',
        height: '40px',
        overflow: 'visible',
      }}
    >
      <motion.svg
        width="168"
        height="40"
        viewBox="0 0 168 40"
        fill="none"
        animate={{
          scaleX: slimeScaleX,
          scaleY: slimeScaleY,
          y: slimeY,
        }}
        transition={{
          type: 'spring',
          stiffness: 450,
          damping: 22,
          mass: 0.6,
        }}
        style={{
          transformOrigin: 'center 32px',
          overflow: 'visible',
        }}
      >
        <defs>
          {/* Liquid Goo Filter (feGaussianBlur + feColorMatrix for liquid surface tension) */}
          <filter id="slime-liquid-goo" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.4" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  
                      0 1 0 0 0  
                      0 0 1 0 0  
                      0 0 0 18 -7"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>

          {/* Slime Droplet Body Gradient: Luminous, multi-layered liquid crystal */}
          <radialGradient
            id="slime-body-grad"
            cx="48%"
            cy="30%"
            r="68%"
            fx="44%"
            fy="22%"
          >
            <stop offset="0%" stopColor="#ffffff" stopOpacity={isDark ? '0.65' : '0.85'} />
            <stop offset="25%" stopColor={companionColor} stopOpacity={isDark ? '0.96' : '0.90'} />
            <stop offset="70%" stopColor={companionColor} stopOpacity={isDark ? '0.82' : '0.74'} />
            <stop offset="100%" stopColor={companionColor} stopOpacity={isDark ? '0.55' : '0.45'} />
          </radialGradient>

          {/* Inner Glowing Fluid Core */}
          <radialGradient id="slime-core-glow" cx="50%" cy="55%" r="50%">
            <stop offset="0%" stopColor={companionColor} stopOpacity="0.8" />
            <stop offset="60%" stopColor={companionColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={companionColor} stopOpacity="0.0" />
          </radialGradient>

          {/* Primary Top-Left Specular Highlight Crescent */}
          <linearGradient id="slime-specular-crescent" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="40%" stopColor="#ffffff" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
          </linearGradient>

          {/* Bottom Refraction Caustics Rim */}
          <linearGradient id="slime-caustics-rim" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.45" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>

        {/* Ambient Underglow Droplet Pool */}
        <ellipse
          cx="84"
          cy="31"
          rx="38"
          ry="9"
          fill={companionColor}
          opacity={isDark ? '0.4' : '0.25'}
          filter="blur(5px)"
        />

        {/* ================================================================= */}
        {/* 1. Main Liquid Slime Droplet Body with Cute Teardrop Crown        */}
        {/* ================================================================= */}
        <g filter="url(#slime-liquid-goo)">
          <path
            d="M 84 4 
               C 86.5 7, 93 11, 99 15 
               C 107 20, 115 24, 114 30 
               C 113 36, 101 37.5, 84 37.5 
               C 67 37.5, 55 36, 54 30 
               C 53 24, 61 20, 69 15 
               C 75 11, 81.5 7, 84 4 Z"
            fill="url(#slime-body-grad)"
          />
        </g>

        {/* Inner Glowing Liquid Core */}
        <ellipse
          cx="84"
          cy="26"
          rx="25"
          ry="9"
          fill="url(#slime-core-glow)"
        />

        {/* ================================================================= */}
        {/* 2. Floating Internal Micro-Bubbles                               */}
        {/* ================================================================= */}
        <g opacity={isDark ? '0.75' : '0.6'}>
          {/* Bubble 1: Left */}
          <circle cx="68" cy="28" r="2.2" fill="#ffffff" opacity="0.35" />
          <circle cx="67.5" cy="27.5" r="0.8" fill="#ffffff" opacity="0.8" />

          {/* Bubble 2: Right Top */}
          <circle cx="98" cy="18" r="1.8" fill="#ffffff" opacity="0.4" />
          <circle cx="97.6" cy="17.6" r="0.6" fill="#ffffff" opacity="0.85" />

          {/* Bubble 3: Center Bottom */}
          <circle cx="88" cy="31" r="1.4" fill="#ffffff" opacity="0.3" />
        </g>

        {/* ================================================================= */}
        {/* 3. 3D Glass Specular Highlights & Surface Tension Caustics        */}
        {/* ================================================================= */}
        {/* Primary Specular Arc (Catching top light) */}
        <path
          d="M 68 14 C 74 9, 82 7, 87 8"
          stroke="url(#slime-specular-crescent)"
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
        />

        {/* Secondary Glint Pearl on Shoulder */}
        <ellipse
          cx="64"
          cy="18"
          rx="2.6"
          ry="1.6"
          transform="rotate(-28 64 18)"
          fill="#ffffff"
          opacity="0.85"
        />

        {/* Teardrop Tip Specular Pearl */}
        <circle
          cx="83.8"
          cy="6.8"
          r="1.2"
          fill="#ffffff"
          opacity="0.9"
        />

        {/* Bottom Caustics Rim Reflection */}
        <path
          d="M 66 35 C 75 36.8, 93 36.8, 102 35"
          stroke="url(#slime-caustics-rim)"
          strokeWidth="1.2"
          strokeLinecap="round"
          fill="none"
        />

        {/* ================================================================= */}
        {/* 4. Suspended Expressive Eyes & Dynamic Mouth                     */}
        {/* ================================================================= */}
        {isPetting ? (
          /* Petting Happy Eyes: Joyful Squint Arcs (^ ^) with Blushing Cheeks */
          <g>
            <path
              d="M 69 21 Q 74 15 79 21"
              stroke={eyeSocketWhite}
              strokeWidth="2.4"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M 89 21 Q 94 15 99 21"
              stroke={eyeSocketWhite}
              strokeWidth="2.4"
              strokeLinecap="round"
              fill="none"
            />

            {/* Glowing Blushing Cheeks */}
            <ellipse cx="64" cy="24.5" rx="3.4" ry="2.0" fill="#f43f5e" opacity="0.75" />
            <ellipse cx="104" cy="24.5" rx="3.4" ry="2.0" fill="#f43f5e" opacity="0.75" />

            {/* Joyful Open Smile */}
            <path
              d="M 80.5 23 Q 84 28.5 87.5 23 Z"
              fill={isDark ? '#f43f5e' : '#e11d48'}
              stroke={eyeSocketWhite}
              strokeWidth="0.8"
            />

            {/* Tiny Floating Love Heart on Petting */}
            <motion.path
              d="M 84 10 C 82 8, 79 9, 81 12 L 84 14 L 87 12 C 89 9, 86 8, 84 10 Z"
              fill="#f43f5e"
              initial={{ scale: 0, y: 4, opacity: 0 }}
              animate={{ scale: [0, 1.2, 1], y: [-2, -8, -12], opacity: [0, 1, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
              style={{ transformOrigin: '84px 11px' }}
            />
          </g>
        ) : (
          /* Normal / Cursor Tracking / Blinking Eyes */
          <g style={{ transformOrigin: '84px 21px' }}>
            {/* Left Eye */}
            <g
              transform="translate(74, 21)"
              style={{
                transformOrigin: '0 0',
                transform: `scaleY(${isBlinking ? 0.10 : 1})`,
                transition: 'transform 0.08s ease-out',
              }}
            >
              {/* Eye Socket White */}
              <circle cx="0" cy="0" r="4.6" fill={eyeSocketWhite} />
              {/* Tracking Pupil */}
              <circle
                cx={pupilX}
                cy={pupilY}
                r="2.8"
                fill={pupilCoreDark}
              />
              {/* Inner Iris Accent Glow */}
              <circle
                cx={pupilX}
                cy={pupilY + 0.8}
                r="1.5"
                fill={companionColor}
                opacity="0.8"
              />
              {/* Primary Glint Star/Catchlight */}
              <circle
                cx={pupilX + 1.0}
                cy={pupilY - 1.0}
                r="1.2"
                fill="#ffffff"
              />
              {/* Secondary Micro Highlight */}
              <circle
                cx={pupilX - 0.9}
                cy={pupilY + 0.9}
                r="0.6"
                fill="#ffffff"
                opacity="0.8"
              />
            </g>

            {/* Right Eye */}
            <g
              transform="translate(94, 21)"
              style={{
                transformOrigin: '0 0',
                transform: `scaleY(${isBlinking ? 0.10 : 1})`,
                transition: 'transform 0.08s ease-out',
              }}
            >
              {/* Eye Socket White */}
              <circle cx="0" cy="0" r="4.6" fill={eyeSocketWhite} />
              {/* Tracking Pupil */}
              <circle
                cx={pupilX}
                cy={pupilY}
                r="2.8"
                fill={pupilCoreDark}
              />
              {/* Inner Iris Accent Glow */}
              <circle
                cx={pupilX}
                cy={pupilY + 0.8}
                r="1.5"
                fill={companionColor}
                opacity="0.8"
              />
              {/* Primary Glint Star/Catchlight */}
              <circle
                cx={pupilX + 1.0}
                cy={pupilY - 1.0}
                r="1.2"
                fill="#ffffff"
              />
              {/* Secondary Micro Highlight */}
              <circle
                cx={pupilX - 0.9}
                cy={pupilY + 0.9}
                r="0.6"
                fill="#ffffff"
                opacity="0.8"
              />
            </g>

            {/* Cute Cheek Blush Spots */}
            <ellipse cx="66" cy="25.5" rx="2.5" ry="1.5" fill="#f43f5e" opacity="0.4" />
            <ellipse cx="102" cy="25.5" rx="2.5" ry="1.5" fill="#f43f5e" opacity="0.4" />

            {/* Dynamic Mouth */}
            {isDraggingFile ? (
              /* File Drag Anticipation: Excited Open "O" Mouth with Cute Tongue */
              <g>
                <ellipse
                  cx="84"
                  cy="27"
                  rx="4.4"
                  ry="5.8"
                  fill="#0f172a"
                  stroke="#ffffff"
                  strokeWidth="1.2"
                />
                {/* Cute Tongue */}
                <path
                  d="M 81.5 29.5 Q 84 32.5 86.5 29.5"
                  fill="#f43f5e"
                />
                {/* Sparkle Drop */}
                <circle cx="84" cy="25" r="0.8" fill="#ffffff" opacity="0.8" />
              </g>
            ) : (
              /* Idle Cute Curved Cat Mouth (ω) */
              <path
                d="M 81.2 24.8 Q 82.8 26.6 84 25.2 Q 85.2 26.6 86.8 24.8"
                stroke={isDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.65)'}
                strokeWidth="1.1"
                strokeLinecap="round"
                fill="none"
              />
            )}
          </g>
        )}
      </motion.svg>
    </div>
  );
};
