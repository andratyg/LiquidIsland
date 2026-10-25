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
  // Blinking loop: random blink every 3.4s - 5.2s
  const [isBlinking, setIsBlinking] = useState(false);
  const blinkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function scheduleBlink() {
      const delay = 3400 + Math.random() * 1800;
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

  // Paw Swat Gesture: when cursor hovers near the bottom edge
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
        }, 850);
      }
    } else {
      if (swatTimerRef.current) {
        clearTimeout(swatTimerRef.current);
        swatTimerRef.current = null;
      }
    }
  }, [cursorDelta, isSwatting, isPetting]);

  // Pupil displacement clamped to eye socket boundaries
  const maxRx = 1.0;
  const maxRy = 0.9;
  const pupilX = Math.cos(cursorDelta.angle) * cursorDelta.distance * maxRx;
  const pupilY = Math.sin(cursorDelta.angle) * cursorDelta.distance * maxRy;

  const isDark = theme === 'dark';
  // Rich velvety feline silhouette tone
  const catBodyColor = isDark ? '#14141a' : '#2d3748';
  const catHighlight = isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.45)';
  const earInnerPink = isDark ? '#3b1d36' : '#fed7e2';
  const earFluffColor = isDark ? 'rgba(255, 255, 255, 0.28)' : '#ffffff';
  const eyeGlowColor = companionColor || (isDark ? '#38bdf8' : '#0284c7');

  // =========================================================================
  // Stealth Bezel-Line Peek Mode: Cute Rounded Ears
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
          {/* Left Peeking Cat Ear */}
          <path d="M 50 18 C 50 12, 54 4, 57 4 C 60 4, 63 10, 64 18 Z" fill={catBodyColor} />
          <path d="M 53 18 C 53 14, 55 8, 57 8 C 59 8, 61 12, 62 18 Z" fill={earInnerPink} opacity="0.8" />

          {/* Right Peeking Cat Ear */}
          <path d="M 72 18 C 73 10, 76 4, 79 4 C 82 4, 86 12, 86 18 Z" fill={catBodyColor} />
          <path d="M 74 18 C 75 12, 77 8, 79 8 C 81 8, 83 14, 83 18 Z" fill={earInnerPink} opacity="0.8" />
        </svg>
      </div>
    );
  }

  // =========================================================================
  // Standard Eyes State Mode (Unified 60x38 Coordinate Space)
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
        width="60"
        height="38"
        viewBox="0 0 60 38"
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
          <linearGradient id="cat-velvet-grad" x1="0" y1="0" x2="0" y2="38" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={isDark ? '#23232c' : '#3d4a5d'} />
            <stop offset="60%" stopColor={catBodyColor} />
            <stop offset="100%" stopColor={isDark ? '#111116' : '#1e2633'} />
          </linearGradient>
        </defs>

        {/* Ambient Underglow Pool */}
        <ellipse
          cx="30"
          cy="35"
          rx="18"
          ry="3.0"
          fill={eyeGlowColor}
          opacity={isDark ? '0.22' : '0.14'}
          filter="blur(3px)"
        />

        {/* ================================================================= */}
        {/* 1. Graceful Animated Tail (Right Side)                           */}
        {/* ================================================================= */}
        <motion.g
          animate={{
            rotate: isPetting ? [0, 8, -4, 0] : [-3, 6, -3],
          }}
          transition={{
            duration: isPetting ? 0.9 : 3.0,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{ transformOrigin: '48px 33px' }}
        >
          <path
            d="M 46 33 C 49 27, 54 22, 54 15 C 54.5 11, 50 11.5, 49 15 C 48.5 19, 46 26, 44 33 Z"
            fill="url(#cat-velvet-grad)"
          />
          {/* Luminous Tail Tip */}
          <circle cx="53" cy="13" r="1.5" fill={companionColor} opacity="0.9" />
        </motion.g>

        {/* ================================================================= */}
        {/* 2. Soft Sculpted Cat Ears with Fur Tufts                         */}
        {/* ================================================================= */}
        {/* Left Ear */}
        <motion.g
          className={!isPetting && !isDraggingFile ? 'cat-ear-twitch-left' : ''}
          animate={{
            scaleY: isDraggingFile ? 1.12 : isPetting ? 0.90 : 1,
            rotate: isPetting ? -8 : 0,
          }}
          transition={{ type: 'spring', stiffness: 380, damping: 22 }}
          style={{ transformOrigin: '19px 15px' }}
        >
          <path
            d="M 15 18 C 14 13, 17 5, 20.5 4 C 22.5 4, 25 10, 26 16 Z"
            fill="url(#cat-velvet-grad)"
            stroke={catHighlight}
            strokeWidth="0.6"
          />
          <path
            d="M 17 16 C 16 13, 18 7, 20.5 6 C 22 7, 24 11, 24.5 15 Z"
            fill={earInnerPink}
            opacity="0.85"
          />
          <path
            d="M 16 15 Q 19 13 18 10 M 17 16 Q 20 14 19 12"
            stroke={earFluffColor}
            strokeWidth="0.6"
            strokeLinecap="round"
          />
        </motion.g>

        {/* Right Ear */}
        <motion.g
          className={!isPetting && !isDraggingFile ? 'cat-ear-twitch-right' : ''}
          animate={{
            scaleY: isDraggingFile ? 1.12 : isPetting ? 0.90 : 1,
            rotate: isPetting ? 8 : 0,
          }}
          transition={{ type: 'spring', stiffness: 380, damping: 22 }}
          style={{ transformOrigin: '41px 15px' }}
        >
          <path
            d="M 34 16 C 35 10, 37.5 4, 39.5 4 C 43 5, 46 13, 45 18 Z"
            fill="url(#cat-velvet-grad)"
            stroke={catHighlight}
            strokeWidth="0.6"
          />
          <path
            d="M 35.5 15 C 36 11, 38 7, 39.5 6 C 42 7, 44 13, 43 16 Z"
            fill={earInnerPink}
            opacity="0.85"
          />
          <path
            d="M 44 15 Q 41 13 42 10 M 43 16 Q 40 14 41 12"
            stroke={earFluffColor}
            strokeWidth="0.6"
            strokeLinecap="round"
          />
        </motion.g>

        {/* ================================================================= */}
        {/* 3. Main Head Silhouette with Chubby Fluffy Cheeks                */}
        {/* ================================================================= */}
        <path
          d="M 16 21 
             C 14 22, 12 25, 13 27 
             C 14 29, 16 30, 18 31
             C 22 35, 26 36, 30 36 
             C 34 36, 38 35, 42 31 
             C 44 30, 46 29, 47 27 
             C 48 25, 46 22, 44 21 
             C 43 14, 37 11, 30 11 
             C 23 11, 17 14, 16 21 Z"
          fill="url(#cat-velvet-grad)"
          stroke={catHighlight}
          strokeWidth="0.6"
        />

        {/* Graceful Curved Whisker Pairs */}
        <g stroke={isDark ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.30)'} strokeWidth="0.65" strokeLinecap="round" fill="none">
          {/* Left Whiskers */}
          <path d="M 15 25 Q 9 23 4 24" />
          <path d="M 15 27 Q 9 27.5 5 30" />
          {/* Right Whiskers */}
          <path d="M 45 25 Q 51 23 56 24" />
          <path d="M 45 27 Q 51 27.5 55 30" />
        </g>

        {/* ================================================================= */}
        {/* 4. Expressive Feline Eyes (cx=22, cx=38, cy=24) & Face Details    */}
        {/* ================================================================= */}
        {isPetting ? (
          /* Petting Happy Eyes: Purring Feline Arcs (^ ^) with Blushing Cheeks */
          <g>
            <path
              d="M 19.5 24.5 Q 22.5 21 25.5 24.5"
              stroke="#ffffff"
              strokeWidth="1.8"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M 34.5 24.5 Q 37.5 21 40.5 24.5"
              stroke="#ffffff"
              strokeWidth="1.8"
              strokeLinecap="round"
              fill="none"
            />
            {/* Rosy Blushing Cheeks */}
            <ellipse cx="17" cy="26" rx="2.4" ry="1.4" fill="#f43f5e" opacity="0.65" />
            <ellipse cx="43" cy="26" rx="2.4" ry="1.4" fill="#f43f5e" opacity="0.65" />
          </g>
        ) : (
          /* Normal / Cursor Tracking / Dilated Eyes */
          <g style={{ transformOrigin: '30px 24px' }}>
            {/* Left Eye (cx=22, cy=24) */}
            <g
              transform="translate(22, 24)"
              style={{
                transformOrigin: '0 0',
                transform: `scaleY(${isBlinking ? 0.10 : isLowBattery ? 0.28 : 1})`,
                transition: 'transform 0.07s ease-out',
              }}
            >
              {/* Outer Eyeliner Border with Wing */}
              <path
                d="M -4 0 Q -2 -3 3 -0.8 Q 4 0 4.5 0.3 Q 2.5 3 -2 2.6 Q -3.5 1.6 -4 0 Z"
                fill="#090d16"
              />
              {/* Iris Luminous Gradient */}
              <ellipse
                cx="0"
                cy="0"
                rx={isDraggingFile ? 3.4 : 3.0}
                ry={isDraggingFile ? 3.4 : 2.6}
                fill="url(#cat-iris-glow)"
              />
              {/* Responsive Pupil: Dilates when dragging/excited, sleek vertical slit otherwise */}
              {isDraggingFile ? (
                <circle cx={pupilX} cy={pupilY} r="2.2" fill="#060910" />
              ) : (
                <ellipse
                  cx={pupilX}
                  cy={pupilY}
                  rx="1.0"
                  ry="2.2"
                  fill="#060910"
                />
              )}
              {/* Catchlight Glint */}
              <circle
                cx={pupilX + 0.8}
                cy={pupilY - 0.8}
                r="0.75"
                fill="#ffffff"
                opacity="0.95"
              />
            </g>

            {/* Right Eye (cx=38, cy=24) */}
            <g
              transform="translate(38, 24)"
              style={{
                transformOrigin: '0 0',
                transform: `scaleY(${isBlinking ? 0.10 : isLowBattery ? 0.28 : 1})`,
                transition: 'transform 0.07s ease-out',
              }}
            >
              {/* Outer Eyeliner Border with Wing */}
              <path
                d="M 4 0 Q 2 -3 -3 -0.8 Q -4 0 -4.5 0.3 Q -2.5 3 2 2.6 Q 3.5 1.6 4 0 Z"
                fill="#090d16"
              />
              {/* Iris Luminous Gradient */}
              <ellipse
                cx="0"
                cy="0"
                rx={isDraggingFile ? 3.4 : 3.0}
                ry={isDraggingFile ? 3.4 : 2.6}
                fill="url(#cat-iris-glow)"
              />
              {/* Responsive Pupil */}
              {isDraggingFile ? (
                <circle cx={pupilX} cy={pupilY} r="2.2" fill="#060910" />
              ) : (
                <ellipse
                  cx={pupilX}
                  cy={pupilY}
                  rx="1.0"
                  ry="2.2"
                  fill="#060910"
                />
              )}
              {/* Catchlight Glint */}
              <circle
                cx={pupilX + 0.8}
                cy={pupilY - 0.8}
                r="0.75"
                fill="#ffffff"
                opacity="0.95"
              />
            </g>
          </g>
        )}

        {/* Cute Heart-Triangle Pink Nose */}
        <path
          d="M 29 25.5 Q 30 25 31 25.5 Q 30 27 30 27 Z"
          fill="#f43f5e"
        />

        {/* Adorable Cat Muzzle ("3" / "w" Smile) */}
        <path
          d="M 28.2 27.2 Q 29.1 28.4 30 27.5 Q 30.9 28.4 31.8 27.2"
          stroke={isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.55)'}
          strokeWidth="0.8"
          strokeLinecap="round"
          fill="none"
        />

        {/* Low Battery Sleepy Floating Zs */}
        {isLowBattery && (
          <>
            <motion.text
              x="44"
              y="14"
              fill="#94a3b8"
              fontSize="7"
              fontWeight="700"
              animate={{ y: [14, 8], opacity: [0, 0.9, 0], x: [44, 48] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
            >
              z
            </motion.text>
            <motion.text
              x="49"
              y="11"
              fill="#94a3b8"
              fontSize="8.5"
              fontWeight="700"
              animate={{ y: [11, 4], opacity: [0, 0.9, 0], x: [49, 54] }}
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

        {/* ================================================================= */}
        {/* 5. Marshmallow Paws Resting on Bottom Rim & Swat Reaction        */}
        {/* ================================================================= */}
        {/* Left Paw (Resting on bottom rim) */}
        <g transform="translate(21, 35)">
          <ellipse cx="0" cy="0" rx="3.6" ry="2.0" fill="url(#cat-velvet-grad)" stroke={catHighlight} strokeWidth="0.4" />
          {/* 3 Cute Rounded Toe Beans */}
          <circle cx="-1.8" cy="0.1" r="0.8" fill={earInnerPink} opacity="0.85" />
          <circle cx="0" cy="-0.4" r="0.9" fill={earInnerPink} opacity="0.9" />
          <circle cx="1.8" cy="0.1" r="0.8" fill={earInnerPink} opacity="0.85" />
        </g>

        {/* Right Paw (Interactive Playful Swat) */}
        <motion.g
          animate={{
            y: isSwatting ? 4 : 0,
            x: isSwatting ? 1.5 : 0,
            scale: isSwatting ? 1.2 : 1,
          }}
          transition={{
            type: 'spring',
            stiffness: 550,
            damping: 18,
          }}
          style={{ transformOrigin: '39px 35px' }}
        >
          <g transform="translate(39, 35)">
            <ellipse cx="0" cy="0" rx="3.6" ry="2.0" fill="url(#cat-velvet-grad)" stroke={catHighlight} strokeWidth="0.4" />
            <circle cx="-1.8" cy="0.1" r="0.8" fill={earInnerPink} opacity="0.85" />
            <circle cx="0" cy="-0.4" r="0.9" fill={earInnerPink} opacity="0.9" />
            <circle cx="1.8" cy="0.1" r="0.8" fill={earInnerPink} opacity="0.85" />

            {/* Claws Extend Playfully During Swat */}
            {isSwatting && (
              <g stroke="#ffffff" strokeWidth="0.6" strokeLinecap="round">
                <line x1="-1.8" y1="1.2" x2="-1.8" y2="3.2" />
                <line x1="0" y1="1.5" x2="0" y2="3.8" />
                <line x1="1.8" y1="1.2" x2="1.8" y2="3.2" />
              </g>
            )}
          </g>
        </motion.g>
      </motion.svg>
    </div>
  );
};
