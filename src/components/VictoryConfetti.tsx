import { useEffect, useState } from 'react';

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  color: string;
  rotation: number;
  scale: number;
  delay: number;
}

interface VictoryConfettiProps {
  isActive: boolean;
}

const COLORS = [
  'hsl(45, 100%, 60%)',   // Gold
  'hsl(185, 100%, 50%)',  // Cyan
  'hsl(280, 80%, 60%)',   // Purple
  'hsl(320, 90%, 60%)',   // Magenta
  'hsl(35, 100%, 55%)',   // Orange
  'hsl(120, 70%, 50%)',   // Green
];

export const VictoryConfetti = ({ isActive }: VictoryConfettiProps) => {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (!isActive) {
      setPieces([]);
      return;
    }

    // Generate confetti pieces
    const newPieces: ConfettiPiece[] = [];
    for (let i = 0; i < 150; i++) {
      newPieces.push({
        id: i,
        x: Math.random() * 100,
        y: -10 - Math.random() * 20,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rotation: Math.random() * 360,
        scale: 0.5 + Math.random() * 0.5,
        delay: Math.random() * 2,
      });
    }
    setPieces(newPieces);

    // Clear after animation
    const timeout = setTimeout(() => {
      setPieces([]);
    }, 6000);

    return () => clearTimeout(timeout);
  }, [isActive]);

  if (!isActive || pieces.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute confetti-piece"
          style={{
            left: `${piece.x}%`,
            top: `${piece.y}%`,
            backgroundColor: piece.color,
            width: `${10 * piece.scale}px`,
            height: `${14 * piece.scale}px`,
            transform: `rotate(${piece.rotation}deg)`,
            animationDelay: `${piece.delay}s`,
          }}
        />
      ))}
    </div>
  );
};
