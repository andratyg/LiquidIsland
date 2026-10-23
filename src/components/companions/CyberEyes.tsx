import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { CompanionSharedProps } from './SlimeCompanion';

export const CyberEyes: React.FC<CompanionSharedProps> = ({
  cursorDelta,
  isPetting,
  isDraggingFile,
  companionColor,
  theme,
}) => {
  // Blinking cycle: random blink every 3.2s - 4.8s
  const [isBlinking, setIsBlinking] = useState(false);
  const blinkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function scheduleBlink() {
      const delay = 3200 + Math.random() * 1800;
      blinkTimerRef.current = setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => {
          setIsBlinking(false);
          // Occasional double-blink (25% chance)
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

  // Cursor Parallax displacement
  const maxShiftX = 5.5;
  const maxShiftY = 2.2;
  const shiftX = Math.cos(cursorDelta.angle) * cursorDelta.distance * maxShiftX;
  const shiftY = Math.sin(cursorDelta.angle) * cursorDelta.distance * maxShiftY;

  const isDark = theme === 'dark';
  const glowAccent = companionColor || (isDark ? '#38bdf8' : '#0284c7');

  return (
    <div
      className="relative w-full h-full flex items-center justify-center select-none"
      style={{
        width: '168px',
        height: '40px',
        overflow: 'visible',
      }}
    >
      {/* Diffuse bottom ambient blue glow reflection */}
      <div
        style={{
          position: 'absolute',
          bottom: '2px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '72px',
          height: '14px',
          borderRadius: '9999px',
          backgroundColor: glowAccent,
          filter: isDraggingFile ? 'blur(10px)' : 'blur(7px)',
          opacity: isDraggingFile ? 0.75 : 0.45,
          pointerEvents: 'none',
          transition: 'opacity 0.2s ease, filter 0.2s ease',
        }}
      />

      <svg
        width="168"
        height="40"
        viewBox="0 0 168 40"
        fill="none"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <filter id="cyber-eye-drop-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur in="SourceGraphic" stdDeviation={isDraggingFile ? '2.4' : '1.4'} result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Master Tracking Assembly with Cursor Parallax */}
        <motion.g
          animate={{
            x: shiftX,
            y: shiftY,
          }}
          transition={{
            type: 'spring',
            stiffness: 420,
            damping: 28,
            mass: 0.5,
          }}
          filter="url(#cyber-eye-drop-glow)"
        >
          {isPetting ? (
            /* Petting Mode: Cyber Smiling Arcs (^ ^) */
            <g>
              <path
                d="M 69 22 Q 74 16 79 22"
                stroke={glowAccent}
                strokeWidth="2.8"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M 89 22 Q 94 16 99 22"
                stroke={glowAccent}
                strokeWidth="2.8"
                strokeLinecap="round"
                fill="none"
              />
            </g>
          ) : (
            /* 1:1 Authentic Reference Video Vertical Eyes (6.5px × 14px) */
            <g style={{ transformOrigin: '84px 20px' }}>
              {/* Left Eye: 6.5px width, 14px height */}
              <motion.rect
                x="71"
                y="13"
                width={isDraggingFile ? 7.5 : 6.5}
                height={isDraggingFile ? 15 : 14}
                rx={isDraggingFile ? 3.75 : 3.25}
                fill="#ffffff"
                stroke={glowAccent}
                strokeWidth="0.8"
                animate={{
                  scaleY: isBlinking ? 0.08 : 1,
                  y: isBlinking ? 6.5 : 0,
                }}
                transition={{ duration: 0.08 }}
                style={{ transformOrigin: '74.25px 20px' }}
              />

              {/* Right Eye: 6.5px width, 14px height */}
              <motion.rect
                x="90.5"
                y="13"
                width={isDraggingFile ? 7.5 : 6.5}
                height={isDraggingFile ? 15 : 14}
                rx={isDraggingFile ? 3.75 : 3.25}
                fill="#ffffff"
                stroke={glowAccent}
                strokeWidth="0.8"
                animate={{
                  scaleY: isBlinking ? 0.08 : 1,
                  y: isBlinking ? 6.5 : 0,
                }}
                transition={{ duration: 0.08 }}
                style={{ transformOrigin: '93.75px 20px' }}
              />
            </g>
          )}
        </motion.g>
      </svg>
    </div>
  );
};
