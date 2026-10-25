import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { CompanionSharedProps } from './SlimeCompanion';

interface CatCompanionProps extends CompanionSharedProps {
  isBezelLine?: boolean;
}

export const CatCompanion: React.FC<CatCompanionProps> = ({
  cursorDelta,
  isPetting,
  isDraggingFile,
  companionColor,
  theme,
  isBezelLine = false,
  isCharging = false,
  isLowBattery = false,
}) => {
  // Blinking loop: random blink every 3.6s - 5.4s
  const [isBlinking, setIsBlinking] = useState(false);
  const blinkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function scheduleBlink() {
      const delay = 3600 + Math.random() * 1800;
      blinkTimerRef.current = setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => {
          setIsBlinking(false);
          // 25% chance of adorable double-blink
          if (Math.random() < 0.25) {
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
        }, 130);
      }, delay);
    }
    scheduleBlink();
    return () => {
      if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
    };
  }, []);

  // Paw Swat Gesture: when cursor hovers near the bottom edge for ~1 second
  const [isSwatting, setIsSwatting] = useState(false);
  const swatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const isNearBottomEdge = cursorDelta.y > 6 && cursorDelta.distance > 0.15;

    if (isNearBottomEdge && !isSwatting && !isPetting) {
      if (!swatTimerRef.current) {
        swatTimerRef.current = setTimeout(() => {
          setIsSwatting(true);
          setTimeout(() => {
            setIsSwatting(false);
            swatTimerRef.current = null;
          }, 500);
        }, 900);
      }
    } else {
      if (swatTimerRef.current) {
        clearTimeout(swatTimerRef.current);
        swatTimerRef.current = null;
      }
    }
  }, [cursorDelta, isSwatting, isPetting]);

  // Pupil displacement clamped to eye socket boundaries
  const maxRx = 3.6;
  const maxRy = 2.4;
  const pupilX = Math.cos(cursorDelta.angle) * cursorDelta.distance * maxRx;
  const pupilY = Math.sin(cursorDelta.angle) * cursorDelta.distance * maxRy;

  const isDark = theme === 'dark';
  // Rich velvety feline silhouette tone
  const catBodyColor = isDark ? '#15151c' : '#2d3748';
  const catHighlight = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.45)';
  const earInnerPink = isDark ? '#3b1d36' : '#fed7e2';
  const earFluffColor = isDark ? 'rgba(255, 255, 255, 0.25)' : '#ffffff';
  const eyeGlowColor = companionColor || (isDark ? '#38bdf8' : '#0284c7');

  // =========================================================================
  // Stealth Bezel-Line Peek Mode: Cute Rounded Ears and Swaying Tail
  // =========================================================================
  if (isBezelLine) {
    return (
      <div
        className="relative w-full h-full flex items-center justify-center pointer-events-none"
        style={{ width: '136px', height: '6px' }}
      >
        <svg
          width="136"
          height="18"
          viewBox="0 0 136 18"
          fill="none"
          style={{ position: 'absolute', top: '-12px', overflow: 'visible' }}
        >
          {/* Left Peeking Rounded Ear */}
          <path
            d="M 50 18 C 50 12, 54 4, 57 4 C 60 4, 63 10, 64 18 Z"
            fill={catBodyColor}
          />
          <path
            d="M 53 18 C 53 14, 55 8, 57 8 C 59 8, 61 12, 62 18 Z"
            fill={earInnerPink}
            opacity="0.8"
          />

          {/* Right Peeking Rounded Ear */}
          <path
            d="M 72 18 C 73 10, 76 4, 79 4 C 82 4, 86 12, 86 18 Z"
            fill={catBodyColor}
          />
          <path
            d="M 74 18 C 75 12, 77 8, 79 8 C 81 8, 83 14, 83 18 Z"
            fill={earInnerPink}
            opacity="0.8"
          />

          {/* Swaying Tail Tip */}
          <motion.path
            d="M 106 18 C 110 11, 117 5, 120 7 C 122 9, 116 14, 112 18 Z"
            fill={catBodyColor}
            animate={{ rotate: [-6, 8, -6] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
            style={{ transformOrigin: '108px 18px' }}
          />
          <circle cx="119" cy="7" r="1.8" fill={companionColor} opacity="0.85" />
        </svg>
      </div>
    );
  }

  // =========================================================================
  // Standard Eyes State Mode (168px × 40px)
  // =========================================================================
  return (
    <div
      className={`relative w-full h-full flex items-center justify-center select-none ${
        isPetting ? 'cat-purr-active' : ''
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
        style={{ overflow: 'visible' }}
      >
        <defs>
          {/* Luminous Iris Multi-Stop Radial Gradient */}
          <radialGradient id="cat-iris-glow" cx="50%" cy="40%" r="55%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="35%" stopColor={eyeGlowColor} stopOpacity="0.95" />
            <stop offset="75%" stopColor={eyeGlowColor} stopOpacity="0.75" />
            <stop offset="100%" stopColor="#0b0f19" stopOpacity="0.95" />
          </radialGradient>

          {/* Velvet Cat Fur Gradient */}
          <linearGradient id="cat-velvet-grad" x1="0" y1="0" x2="0" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={isDark ? '#23232c' : '#3d4a5d'} />
            <stop offset="60%" stopColor={catBodyColor} />
            <stop offset="100%" stopColor={isDark ? '#111116' : '#1e2633'} />
          </linearGradient>

          {/* Soft Paw Shadow */}
          <radialGradient id="paw-shadow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#000000" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ambient Underglow */}
        <ellipse
          cx="84"
          cy="32"
          rx="42"
          ry="8"
          fill={eyeGlowColor}
          opacity={isDark ? '0.18' : '0.12'}
          filter="blur(6px)"
        />

        {/* ================================================================= */}
        {/* 1. Graceful Animated Tail (Right Side)                           */}
        {/* ================================================================= */}
        <motion.g
          animate={{
            rotate: isPetting ? [0, 10, -5, 0] : [-4, 7, -4],
          }}
          transition={{
            duration: isPetting ? 0.9 : 3.0,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{ transformOrigin: '124px 34px' }}
        >
          <path
            d="M 121 34 
               C 125 27, 133 21, 134 13 
               C 134.5 7.5, 128 8, 127 13 
               C 126 18, 121 26, 117 34 Z"
            fill="url(#cat-velvet-grad)"
          />
          {/* Luminous Tail Tip */}
          <circle cx="132" cy="10" r="2.2" fill={companionColor} opacity="0.9" />
          <circle cx="132" cy="10" r="1.0" fill="#ffffff" opacity="0.8" />
        </motion.g>

        {/* ================================================================= */}
        {/* 2. Soft Sculpted Cat Ears with Fur Tufts                         */}
        {/* ================================================================= */}
        {/* Left Ear */}
        <motion.g
          className={!isPetting && !isDraggingFile ? 'cat-ear-twitch-left' : ''}
          animate={{
            scaleY: isDraggingFile ? 1.15 : isPetting ? 0.88 : 1,
            rotate: isPetting ? -10 : 0,
          }}
          transition={{ type: 'spring', stiffness: 380, damping: 22 }}
          style={{ transformOrigin: '64px 15px' }}
        >
          {/* Outer Ear with Rounded Apex */}
          <path
            d="M 54 18 
               C 53 12, 59 3, 63.5 2 
               C 66.5 2, 72 9, 74 16 Z"
            fill="url(#cat-velvet-grad)"
            stroke={catHighlight}
            strokeWidth="0.75"
          />
          {/* Inner Ear Cavity */}
          <path
            d="M 57 16 
               C 56 12, 60 6, 63.5 5 
               C 66 6, 69 11, 71 15 Z"
            fill={earInnerPink}
            opacity="0.85"
          />
          {/* Fluffy Ear Fur Tufts */}
          <path
            d="M 56 15 Q 60 12 58 9 M 57 16 Q 62 13 60 11"
            stroke={earFluffColor}
            strokeWidth="0.8"
            strokeLinecap="round"
          />
        </motion.g>

        {/* Right Ear */}
        <motion.g
          className={!isPetting && !isDraggingFile ? 'cat-ear-twitch-right' : ''}
          animate={{
            scaleY: isDraggingFile ? 1.15 : isPetting ? 0.88 : 1,
            rotate: isPetting ? 10 : 0,
          }}
          transition={{ type: 'spring', stiffness: 380, damping: 22 }}
          style={{ transformOrigin: '104px 15px' }}
        >
          {/* Outer Ear with Rounded Apex */}
          <path
            d="M 94 16 
               C 96 9, 101.5 2, 104.5 2 
               C 109 3, 115 12, 114 18 Z"
            fill="url(#cat-velvet-grad)"
            stroke={catHighlight}
            strokeWidth="0.75"
          />
          {/* Inner Ear Cavity */}
          <path
            d="M 97 15 
               C 99 11, 102 6, 104.5 5 
               C 108 6, 112 12, 111 16 Z"
            fill={earInnerPink}
            opacity="0.85"
          />
          {/* Fluffy Ear Fur Tufts */}
          <path
            d="M 112 15 Q 108 12 110 9 M 111 16 Q 106 13 108 11"
            stroke={earFluffColor}
            strokeWidth="0.8"
            strokeLinecap="round"
          />
        </motion.g>

        {/* ================================================================= */}
        {/* 3. Main Head Silhouette with Chubby Fluffy Cheeks                */}
        {/* ================================================================= */}
        <path
          d="M 56 22 
             C 53 23, 50 26, 52 28 
             C 54 30, 56 31, 58 32
             C 65 36, 74 36.5, 84 36.5 
             C 94 36.5, 103 36, 110 32 
             C 112 31, 114 30, 116 28 
             C 118 26, 115 23, 112 22 
             C 111 13, 98 9.5, 84 9.5 
             C 70 9.5, 57 13, 56 22 Z"
          fill="url(#cat-velvet-grad)"
          stroke={catHighlight}
          strokeWidth="0.6"
        />

        {/* Subtle Forehead Shadow Depth */}
        <path
          d="M 72 13 Q 84 15 96 13"
          stroke="rgba(0,0,0,0.3)"
          strokeWidth="1.2"
          strokeLinecap="round"
          fill="none"
        />

        {/* Graceful Curved Whisker Pairs */}
        <g stroke={isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.35)'} strokeWidth="0.75" strokeLinecap="round" fill="none">
          {/* Left Whiskers */}
          <path d="M 55 24 Q 45 22 38 23" />
          <path d="M 55 26.5 Q 46 27 39 30" />
          {/* Right Whiskers */}
          <path d="M 113 24 Q 123 22 130 23" />
          <path d="M 113 26.5 Q 122 27 129 30" />
        </g>

        {/* ================================================================= */}
        {/* 4. Expressive Feline Eyes & Face Details                         */}
        {/* ================================================================= */}
        {isPetting ? (
          /* Petting Happy Eyes: Purring Feline Arcs (^ ^) with Blushing Cheeks */
          <g>
            <path
              d="M 68 21 Q 74 15 80 21"
              stroke="#ffffff"
              strokeWidth="2.4"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M 88 21 Q 94 15 100 21"
              stroke="#ffffff"
              strokeWidth="2.4"
              strokeLinecap="round"
              fill="none"
            />
            {/* Rosy Blushing Cheeks */}
            <ellipse cx="64" cy="25" rx="3.5" ry="2.0" fill="#f43f5e" opacity="0.65" />
            <ellipse cx="104" cy="25" rx="3.5" ry="2.0" fill="#f43f5e" opacity="0.65" />
          </g>
        ) : (
          /* Normal / Cursor Tracking / Dilated Eyes */
          <g>
            {/* Left Eye */}
            <g
              transform="translate(74, 21)"
              style={{
                transformOrigin: '0 0',
                transform: `scaleY(${isBlinking ? 0.10 : isLowBattery ? 0.28 : 1})`,
                transition: 'transform 0.07s ease-out',
              }}
            >
              {/* Outer Eyeliner Border with Cat Wing */}
              <path
                d="M -6.5 0 Q -3 -4.5 4.5 -1 Q 6 0 7 0.5 Q 4 4.5 -3 4 Q -5.5 2.5 -6.5 0 Z"
                fill="#090d16"
              />
              {/* Iris Luminous Gradient */}
              <ellipse
                cx="0"
                cy="0"
                rx={isDraggingFile ? 5.2 : 4.4}
                ry={isDraggingFile ? 5.2 : 3.8}
                fill="url(#cat-iris-glow)"
              />
              {/* Responsive Pupil */}
              {isDraggingFile ? (
                /* Wide Dilated Pupil on File Pounce */
                <circle cx={pupilX} cy={pupilY} r="3.4" fill="#060910" />
              ) : (
                /* Elegant Feline Slit Pupil Tracking Cursor */
                <ellipse
                  cx={pupilX}
                  cy={pupilY}
                  rx="1.5"
                  ry="3.2"
                  fill="#060910"
                />
              )}
              {/* Primary Star/Catchlight Glint */}
              <circle
                cx={pupilX + 1.4}
                cy={pupilY - 1.3}
                r="1.2"
                fill="#ffffff"
                opacity="0.95"
              />
              {/* Secondary Micro Highlight */}
              <circle
                cx={pupilX - 1.2}
                cy={pupilY + 1.2}
                r="0.6"
                fill="#ffffff"
                opacity="0.75"
              />
            </g>

            {/* Right Eye */}
            <g
              transform="translate(94, 21)"
              style={{
                transformOrigin: '0 0',
                transform: `scaleY(${isBlinking ? 0.10 : isLowBattery ? 0.28 : 1})`,
                transition: 'transform 0.07s ease-out',
              }}
            >
              {/* Outer Eyeliner Border with Cat Wing */}
              <path
                d="M 6.5 0 Q 3 -4.5 -4.5 -1 Q -6 0 -7 0.5 Q -4 4.5 3 4 Q 5.5 2.5 6.5 0 Z"
                fill="#090d16"
              />
              {/* Iris Luminous Gradient */}
              <ellipse
                cx="0"
                cy="0"
                rx={isDraggingFile ? 5.2 : 4.4}
                ry={isDraggingFile ? 5.2 : 3.8}
                fill="url(#cat-iris-glow)"
              />
              {/* Responsive Pupil */}
              {isDraggingFile ? (
                <circle cx={pupilX} cy={pupilY} r="3.4" fill="#060910" />
              ) : (
                <ellipse
                  cx={pupilX}
                  cy={pupilY}
                  rx="1.5"
                  ry="3.2"
                  fill="#060910"
                />
              )}
              {/* Primary Star/Catchlight Glint */}
              <circle
                cx={pupilX + 1.4}
                cy={pupilY - 1.3}
                r="1.2"
                fill="#ffffff"
                opacity="0.95"
              />
              {/* Secondary Micro Highlight */}
              <circle
                cx={pupilX - 1.2}
                cy={pupilY + 1.2}
                r="0.6"
                fill="#ffffff"
                opacity="0.75"
              />
            </g>
          </g>
        )}

        {/* Cute Heart-Triangle Pink Nose */}
        <path
          d="M 82.5 24.5 Q 84 24 85.5 24.5 Q 84 26.5 84 26.5 Z"
          fill="#f43f5e"
        />

        {/* Adorable Cat Muzzle ("3" / "w" Smile) */}
        <path
          d="M 80.5 26.5 Q 82.2 28.2 84 26.8 Q 85.8 28.2 87.5 26.5"
          stroke={isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.55)'}
          strokeWidth="1.0"
          strokeLinecap="round"
          fill="none"
        />

        {/* Low Battery Floating Sleepy Zs */}
        {isLowBattery && (
          <>
            <motion.text
              x="100"
              y="14"
              fill="#94a3b8"
              fontSize="9"
              fontWeight="700"
              animate={{ y: [14, 6], opacity: [0, 0.9, 0], x: [100, 105] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
            >
              z
            </motion.text>
            <motion.text
              x="108"
              y="10"
              fill="#94a3b8"
              fontSize="11"
              fontWeight="700"
              animate={{ y: [10, 0], opacity: [0, 0.9, 0], x: [108, 114] }}
              transition={{ duration: 1.8, delay: 0.6, repeat: Infinity, ease: 'easeOut' }}
            >
              Z
            </motion.text>
          </>
        )}

        {/* Charging Electric Sparkle Cheeks & Crown */}
        {isCharging && (
          <>
            <motion.polygon
              points="84,2 85.5,5.5 89,6 86.5,8.5 87,12 84,10 81,12 81.5,8.5 79,6 82.5,5.5"
              fill="#fde047"
              animate={{ y: [-1, -4, -1], rotate: [0, 20, -20, 0], scale: [0.8, 1.15, 0.8] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              style={{ transformOrigin: '84px 7px' }}
            />
            <circle cx="60" cy="24" r="2" fill="#fde047" className="sparkle-particle" />
            <circle cx="108" cy="24" r="2" fill="#fde047" className="sparkle-particle" />
          </>
        )}

        {/* ================================================================= */}
        {/* 5. Marshmallow Paws Resting on Bottom Rim & Swat Reaction        */}
        {/* ================================================================= */}
        {/* Left Paw (Calm resting on bottom notch lip) */}
        <g transform="translate(67, 34.5)">
          {/* Main Paw Mound */}
          <ellipse cx="0" cy="0" rx="5.5" ry="3.2" fill="url(#cat-velvet-grad)" stroke={catHighlight} strokeWidth="0.5" />
          {/* 3 Cute Rounded Toe Beans */}
          <circle cx="-3" cy="0.2" r="1.3" fill={earInnerPink} opacity="0.8" />
          <circle cx="0" cy="-0.6" r="1.4" fill={earInnerPink} opacity="0.85" />
          <circle cx="3" cy="0.2" r="1.3" fill={earInnerPink} opacity="0.8" />
        </g>

        {/* Right Paw (Interactive: Playful Paw Swat reaching toward cursor) */}
        <motion.g
          animate={{
            y: isSwatting ? 8 : 0,
            x: isSwatting ? 2.5 : 0,
            scale: isSwatting ? 1.25 : 1,
          }}
          transition={{
            type: 'spring',
            stiffness: 550,
            damping: 18,
          }}
          style={{ transformOrigin: '101px 34.5px' }}
        >
          <g transform="translate(101, 34.5)">
            <ellipse cx="0" cy="0" rx="5.5" ry="3.2" fill="url(#cat-velvet-grad)" stroke={catHighlight} strokeWidth="0.5" />
            <circle cx="-3" cy="0.2" r="1.3" fill={earInnerPink} opacity="0.8" />
            <circle cx="0" cy="-0.6" r="1.4" fill={earInnerPink} opacity="0.85" />
            <circle cx="3" cy="0.2" r="1.3" fill={earInnerPink} opacity="0.8" />

            {/* Claws Extend Playfully During Swat */}
            {isSwatting && (
              <g stroke="#ffffff" strokeWidth="0.8" strokeLinecap="round">
                <line x1="-3.2" y1="2" x2="-3.2" y2="4.8" />
                <line x1="0" y1="2.4" x2="0" y2="5.5" />
                <line x1="3.2" y1="2" x2="3.2" y2="4.8" />
              </g>
            )}
          </g>
        </motion.g>
      </motion.svg>
    </div>
  );
};
