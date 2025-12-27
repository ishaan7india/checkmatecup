import { useEffect, useState } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  hue: number;
  opacity: number;
  type: 'spark' | 'ember' | 'ring';
}

interface CaptureExplosionProps {
  x: number;
  y: number;
  onComplete: () => void;
}

export const CaptureExplosion = ({ x, y, onComplete }: CaptureExplosionProps) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [ringScale, setRingScale] = useState(0);
  const [ringOpacity, setRingOpacity] = useState(1);

  useEffect(() => {
    // Create explosion particles
    const newParticles: Particle[] = [];
    
    // Sparks
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const speed = 3 + Math.random() * 4;
      newParticles.push({
        id: i,
        x: 0,
        y: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 3,
        hue: Math.random() > 0.5 ? 45 : 25, // Orange/yellow
        opacity: 1,
        type: 'spark',
      });
    }

    // Embers
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 2;
      newParticles.push({
        id: 16 + i,
        x: 0,
        y: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        size: 4 + Math.random() * 4,
        hue: 15 + Math.random() * 30,
        opacity: 1,
        type: 'ember',
      });
    }

    setParticles(newParticles);

    // Animate ring
    const ringInterval = setInterval(() => {
      setRingScale(prev => prev + 0.15);
      setRingOpacity(prev => Math.max(0, prev - 0.08));
    }, 16);

    // Animate particles
    const particleInterval = setInterval(() => {
      setParticles(prev => 
        prev
          .map(p => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy + (p.type === 'ember' ? -0.5 : 0),
            vy: p.vy + 0.15, // Gravity
            opacity: p.opacity - 0.04,
            size: p.size * 0.96,
          }))
          .filter(p => p.opacity > 0)
      );
    }, 16);

    const cleanup = setTimeout(() => {
      clearInterval(ringInterval);
      clearInterval(particleInterval);
      onComplete();
    }, 800);

    return () => {
      clearInterval(ringInterval);
      clearInterval(particleInterval);
      clearTimeout(cleanup);
    };
  }, [onComplete]);

  return (
    <div 
      className="fixed pointer-events-none z-[9997]"
      style={{ left: x, top: y }}
    >
      {/* Explosion ring */}
      <div
        className="absolute rounded-full"
        style={{
          width: 80,
          height: 80,
          left: -40,
          top: -40,
          border: '3px solid',
          borderColor: 'hsl(45, 100%, 60%)',
          transform: `scale(${ringScale})`,
          opacity: ringOpacity,
          boxShadow: `
            0 0 20px hsl(45, 100%, 50%),
            0 0 40px hsl(25, 100%, 50%),
            inset 0 0 20px hsl(45, 100%, 60%)
          `,
        }}
      />

      {/* Flash */}
      <div
        className="absolute rounded-full"
        style={{
          width: 40,
          height: 40,
          left: -20,
          top: -20,
          background: 'radial-gradient(circle, hsl(45, 100%, 80%), hsl(25, 100%, 50%), transparent)',
          transform: `scale(${ringScale * 0.5})`,
          opacity: ringOpacity * 1.5,
        }}
      />

      {/* Particles */}
      {particles.map(particle => (
        <div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            width: particle.size,
            height: particle.size,
            left: particle.x - particle.size / 2,
            top: particle.y - particle.size / 2,
            opacity: particle.opacity,
            background: particle.type === 'spark'
              ? `hsl(${particle.hue}, 100%, 70%)`
              : `radial-gradient(circle, hsl(${particle.hue}, 100%, 60%), hsl(${particle.hue - 10}, 100%, 40%))`,
            boxShadow: `0 0 ${particle.size * 2}px hsl(${particle.hue}, 100%, 50%)`,
          }}
        />
      ))}
    </div>
  );
};
