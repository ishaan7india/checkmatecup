import { useEffect, useState } from 'react';

interface CheckmateAnimationProps {
  isActive: boolean;
  losingColor: 'white' | 'black';
  onComplete?: () => void;
}

export const CheckmateAnimation = ({ isActive, losingColor, onComplete }: CheckmateAnimationProps) => {
  const [phase, setPhase] = useState<'hidden' | 'falling' | 'landed'>('hidden');

  useEffect(() => {
    if (!isActive) {
      setPhase('hidden');
      return;
    }

    // Start the falling animation
    setPhase('falling');

    // Transition to landed
    const landedTimeout = setTimeout(() => {
      setPhase('landed');
    }, 800);

    // Complete and hide
    const completeTimeout = setTimeout(() => {
      onComplete?.();
    }, 3000);

    return () => {
      clearTimeout(landedTimeout);
      clearTimeout(completeTimeout);
    };
  }, [isActive, onComplete]);

  if (phase === 'hidden') return null;

  const kingColor = losingColor === 'white' ? '#f0f0f0' : '#1a1a1a';
  const kingStroke = losingColor === 'white' ? '#666' : '#444';

  return (
    <div className="fixed inset-0 pointer-events-none z-40 flex items-center justify-center">
      {/* Dramatic overlay */}
      <div 
        className={`absolute inset-0 bg-black transition-opacity duration-500 ${
          phase === 'falling' ? 'opacity-30' : phase === 'landed' ? 'opacity-20' : 'opacity-0'
        }`}
      />
      
      {/* Falling King */}
      <div 
        className={`relative checkmate-king ${phase}`}
        style={{
          transformOrigin: 'bottom center',
        }}
      >
        <svg
          width="120"
          height="140"
          viewBox="0 0 60 70"
          fill="none"
          className="drop-shadow-2xl"
        >
          {/* King piece */}
          <g filter="url(#shadow)">
            {/* Base */}
            <ellipse cx="30" cy="65" rx="25" ry="4" fill={kingColor} stroke={kingStroke} strokeWidth="1"/>
            <path d="M10 62 Q10 58 15 56 L45 56 Q50 58 50 62 L50 65 L10 65 Z" fill={kingColor} stroke={kingStroke} strokeWidth="1"/>
            
            {/* Body */}
            <path d="M15 56 Q12 45 18 35 L42 35 Q48 45 45 56 Z" fill={kingColor} stroke={kingStroke} strokeWidth="1"/>
            
            {/* Collar */}
            <path d="M18 35 Q15 33 16 30 L44 30 Q45 33 42 35 Z" fill={kingColor} stroke={kingStroke} strokeWidth="1"/>
            
            {/* Head */}
            <ellipse cx="30" cy="22" rx="12" ry="10" fill={kingColor} stroke={kingStroke} strokeWidth="1"/>
            
            {/* Crown points */}
            <path d="M22 14 L22 8 L24 12 L26 6 L28 12 L30 4 L32 12 L34 6 L36 12 L38 8 L38 14" fill={kingColor} stroke={kingStroke} strokeWidth="1"/>
            
            {/* Cross on top */}
            <rect x="28" y="0" width="4" height="10" fill={kingColor} stroke={kingStroke} strokeWidth="0.5"/>
            <rect x="25" y="2" width="10" height="3" fill={kingColor} stroke={kingStroke} strokeWidth="0.5"/>
          </g>
          
          <defs>
            <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="2" dy="4" stdDeviation="3" floodOpacity="0.4"/>
            </filter>
          </defs>
        </svg>
        
        {/* Impact effect when landed */}
        {phase === 'landed' && (
          <>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-8 checkmate-impact" />
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 checkmate-dust" />
          </>
        )}
      </div>
      
      {/* Checkmate text */}
      <div className={`absolute bottom-1/3 text-center checkmate-text ${phase}`}>
        <h2 className="text-4xl md:text-6xl font-display font-bold text-primary drop-shadow-lg">
          CHECKMATE!
        </h2>
        <p className="text-lg md:text-xl text-foreground/80 mt-2">
          {losingColor === 'white' ? 'Black' : 'White'} Wins!
        </p>
      </div>
    </div>
  );
};
