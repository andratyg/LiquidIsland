import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export interface CompanionSharedProps {
  cursorDelta: { x: number; y: number; angle: number; distance: number };
  isPetting: boolean;
  isDraggingFile: boolean;
  companionColor: string;
  theme: 'dark' | 'light';
  onPet?: () => void;
  isCharging?: boolean;
  isLowBattery?: boolean;
}

export const SlimeCompanion: React.FC<CompanionSharedProps> = ({
  cursorDelta,
  isPetting,
  isDraggingFile,
  companionColor,
  theme,
  isCharging = false,
  isLowBattery = false,
}) => {
  // Blinking cycle: random blink every 3.2 - 5.2 seconds
  const [isBlinking, setIsBlinking] = useState(false);
  const blinkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function scheduleBlink() {
      const nextDelay = 3200 + Math.random() * 2000;
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
              }, 110);
            }, 90);
          } else {
            scheduleBlink();
          }
        }, 140);
      }, nextDelay);
    }

    scheduleBlink();
    return () => {
      if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
    };
  }, []);

  // Pupil displacement clamped to eye boundaries
  const maxRx = 1.1;
  const maxRy = 1.0;
  const pupilX = Math.cos(cursorDelta.angle) * cursorDelta.distance * maxRx;
  const pupilY = Math.sin(cursorDelta.angle) * cursorDelta.distance * maxRy;

  // Slime deformation based on states
  let slimeScaleX = 1;
  let slimeScaleY = 1;
  let slimeY = 0;

  if (isDraggingFile) {
    // Excited stretch anticipation
    slimeScaleX = 0.94;
    slimeScaleY = 1.12;
    slimeY = 1.5;
  } else if (isPetting) {
    // Kawaii squish and bounce
    slimeScaleX = 1.14;
    slimeScaleY = 0.88;
    slimeY = 1.2;
  } else if (isLowBattery) {
    // Low battery sleepy slouch
    slimeScaleX = 1.06;
    slimeScaleY = 0.94;
    slimeY = 1.0;
  } else if (isCharging) {
    // Energized buoyant stretch
    slimeScaleX = 1.03;
    slimeScaleY = 1.03;
    slimeY = -0.5;
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
        width="60"
        height="38"
        viewBox="0 0 60 38"
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
          transformOrigin: '30px 36px',
          overflow: 'visible',
        }}
      >
        <defs>
          {/* Slime Plump Body Gradient: Soft, 3D translucent liquid mochi */}
          <radialGradient
            id="slime-plump-grad"
            cx="44%"
            cy="28%"
            r="66%"
            fx="40%"
            fy="22%"
          >
            <stop offset="0%" stopColor="#ffffff" stopOpacity={isDark ? '0.65' : '0.85'} />
            <stop offset="26%" stopColor={companionColor} stopOpacity={isDark ? '0.96' : '0.90'} />
            <stop offset="72%" stopColor={companionColor} stopOpacity={isDark ? '0.85' : '0.78'} />
            <stop offset="100%" stopColor={companionColor} stopOpacity={isDark ? '0.60' : '0.50'} />
          </radialGradient>

          {/* Inner Glowing Fluid Core */}
          <radialGradient id="slime-core-glow" cx="50%" cy="55%" r="50%">
            <stop offset="0%" stopColor={companionColor} stopOpacity="0.75" />
            <stop offset="60%" stopColor={companionColor} stopOpacity="0.30" />
            <stop offset="100%" stopColor={companionColor} stopOpacity="0.0" />
          </radialGradient>

          {/* Soft Upper-Left Specular Highlight Gradient */}
          <linearGradient id="slime-soft-specular" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.90" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Ambient Underglow Droplet Pool */}
        <ellipse
          cx="30"
          cy="35.5"
          rx="18"
          ry="3.0"
          fill={companionColor}
          opacity={isDark ? '0.38' : '0.24'}
          filter="blur(3px)"
        />

        {/* ================================================================= */}
        {/* 1. Kawaii Chubby Round Dome/Droplet Shape (Mochi-Style)           */}
        {/* ================================================================= */}
        <path
          d="M 14 26 C 14 10, 46 10, 46 26 C 48 33, 42 36, 30 36 C 18 36, 12 33, 14 26 Z"
          fill="url(#slime-plump-grad)"
        />

        {/* Inner Glowing Liquid Fluid Core */}
        <ellipse
          cx="30"
          cy="28"
          rx="14"
          ry="6.5"
          fill="url(#slime-core-glow)"
        />

        {/* Internal Micro-Bubbles */}
        <g opacity={isDark ? '0.75' : '0.6'}>
          <circle cx="21" cy="29" r="0.9" fill="#ffffff" opacity="0.4" />
          <circle cx="39" cy="21" r="0.75" fill="#ffffff" opacity="0.45" />
          <circle cx="33" cy="31" r="0.6" fill="#ffffff" opacity="0.35" />
        </g>

        {/* ================================================================= */}
        {/* 2. Soft 3D Specular Highlight on Upper-Left Curve                */}
        {/* ================================================================= */}
        <path
          d="M 18 22 C 18 14, 25 12, 32 12"
          stroke="url(#slime-soft-specular)"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
          opacity="0.80"
        />
        {/* Glint Pearl Dot */}
        <circle
          cx="17.5"
          cy="18.5"
          r="1.0"
          fill="#ffffff"
          opacity="0.85"
        />

        {/* Subtle Bottom Caustics Rim */}
        <path
          d="M 21 34.8 C 26 35.8, 34 35.8, 39 34.8"
          stroke="#ffffff"
          strokeWidth="0.75"
          strokeLinecap="round"
          opacity="0.30"
          fill="none"
        />

        {/* ================================================================= */}
        {/* 3. Cute Expressive Oval Eyes (cx=23, cx=37, cy=24) & Smile Mouth  */}
        {/* ================================================================= */}
        {isPetting ? (
          /* Petting Happy Eyes: Joyful Squint Arcs (^ ^) with Blushing Cheeks */
          <g>
            <path
              d="M 20.5 24.5 Q 23 21.5 25.5 24.5"
              stroke={eyeSocketWhite}
              strokeWidth="1.8"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M 34.5 24.5 Q 37 21.5 39.5 24.5"
              stroke={eyeSocketWhite}
              strokeWidth="1.8"
              strokeLinecap="round"
              fill="none"
            />

            {/* Glowing Blushing Cheeks */}
            <ellipse cx="18" cy="26" rx="2.5" ry="1.5" fill="#f43f5e" opacity="0.75" />
            <ellipse cx="42" cy="26" rx="2.5" ry="1.5" fill="#f43f5e" opacity="0.75" />

            {/* Joyful Open Smile */}
            <path
              d="M 28 25.5 Q 30 28.5 32 25.5 Z"
              fill={isDark ? '#f43f5e' : '#e11d48'}
            />

            {/* Tiny Floating Love Heart on Petting */}
            <motion.path
              d="M 30 7 C 28.5 5.5, 26 6.5, 27.5 9 L 30 11 L 32.5 9 C 34 6.5, 31.5 5.5, 30 7 Z"
              fill="#f43f5e"
              initial={{ scale: 0, y: 3, opacity: 0 }}
              animate={{ scale: [0, 1.2, 1], y: [-1, -6, -9], opacity: [0, 1, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
              style={{ transformOrigin: '30px 8px' }}
            />
          </g>
        ) : (
          /* Normal / Cursor Tracking / Blinking Eyes */
          <g style={{ transformOrigin: '30px 24px' }}>
            {/* Left Eye (cx=23, cy=24) */}
            <g
              transform="translate(23, 24)"
              style={{
                transformOrigin: '0 0',
                transform: `scaleY(${isBlinking ? 0.10 : isLowBattery ? 0.35 : 1})`,
                transition: 'transform 0.08s ease-out',
              }}
            >
              <ellipse cx="0" cy="0" rx="2.4" ry="3.2" fill={eyeSocketWhite} />
              {/* Pupil tracking */}
              <ellipse
                cx={pupilX}
                cy={pupilY}
                rx="1.5"
                ry="2.1"
                fill={pupilCoreDark}
              />
              {/* Primary Glint Catchlight */}
              <circle
                cx={pupilX + 0.6}
                cy={pupilY - 0.7}
                r="0.8"
                fill="#ffffff"
              />
              {/* Micro Secondary Highlight */}
              <circle
                cx={pupilX - 0.5}
                cy={pupilY + 0.6}
                r="0.4"
                fill="#ffffff"
                opacity="0.8"
              />
            </g>

            {/* Right Eye (cx=37, cy=24) */}
            <g
              transform="translate(37, 24)"
              style={{
                transformOrigin: '0 0',
                transform: `scaleY(${isBlinking ? 0.10 : isLowBattery ? 0.35 : 1})`,
                transition: 'transform 0.08s ease-out',
              }}
            >
              <ellipse cx="0" cy="0" rx="2.4" ry="3.2" fill={eyeSocketWhite} />
              {/* Pupil tracking */}
              <ellipse
                cx={pupilX}
                cy={pupilY}
                rx="1.5"
                ry="2.1"
                fill={pupilCoreDark}
              />
              {/* Primary Glint Catchlight */}
              <circle
                cx={pupilX + 0.6}
                cy={pupilY - 0.7}
                r="0.8"
                fill="#ffffff"
              />
              {/* Micro Secondary Highlight */}
              <circle
                cx={pupilX - 0.5}
                cy={pupilY + 0.6}
                r="0.4"
                fill="#ffffff"
                opacity="0.8"
              />
            </g>

            {/* Rosy Soft Cheeks */}
            <ellipse
              cx="18.5"
              cy="26"
              rx="1.8"
              ry="1.1"
              fill="#f43f5e"
              opacity={isDark ? 0.40 : 0.48}
            />
            <ellipse
              cx="41.5"
              cy="26"
              rx="1.8"
              ry="1.1"
              fill="#f43f5e"
              opacity={isDark ? 0.40 : 0.48}
            />

            {/* Tiny Kawaii Mouth Between Eyes */}
            <path
              d="M 28.3 26.8 Q 30 28.2 31.7 26.8"
              stroke={pupilCoreDark}
              strokeWidth="0.9"
              strokeLinecap="round"
              fill="none"
              opacity={isDark ? 0.8 : 0.7}
            />
          </g>
        )}

        {/* Low Battery Floating Sleepy Zs */}
        {isLowBattery && (
          <>
            <motion.text
              x="42"
              y="14"
              fill="#94a3b8"
              fontSize="7"
              fontWeight="700"
              animate={{ y: [14, 8], opacity: [0, 0.9, 0], x: [42, 46] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
            >
              z
            </motion.text>
            <motion.text
              x="47"
              y="11"
              fill="#94a3b8"
              fontSize="8.5"
              fontWeight="700"
              animate={{ y: [11, 4], opacity: [0, 0.9, 0], x: [47, 52] }}
              transition={{ duration: 1.8, delay: 0.6, repeat: Infinity, ease: 'easeOut' }}
            >
              Z
            </motion.text>
          </>
        )}

        {/* Charging Sparkle Crown */}
        {isCharging && (
          <motion.polygon
            points="30,3 31.2,5.8 34,6.2 32,8.2 32.4,11 30,9.5 27.6,11 28,8.2 26,6.2 28.8,5.8"
            fill="#fde047"
            animate={{ y: [-1, -3, -1], rotate: [0, 15, -15, 0], scale: [0.85, 1.15, 0.85] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            style={{ transformOrigin: '30px 7px' }}
          />
        )}
      </motion.svg>
    </div>
  );
};
