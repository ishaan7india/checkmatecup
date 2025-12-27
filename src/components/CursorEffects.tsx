import { useEffect, useState, useCallback } from 'react';

interface FlameParticle {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  hue: number;
}

export const CursorEffects = () => {
  const [particles, setParticles] = useState<FlameParticle[]>([]);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const createParticle = useCallback((x: number, y: number) => {
    const particle: FlameParticle = {
      id: Date.now() + Math.random(),
      x: x + (Math.random() - 0.5) * 10,
      y: y + (Math.random() - 0.5) * 10,
      size: Math.random() * 8 + 4,
      opacity: 1,
      hue: Math.random() * 40 + 15, // Orange to yellow range
    };
    return particle;
  }, []);

  useEffect(() => {
    let lastTime = 0;
    const throttleMs = 30;

    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastTime < throttleMs) return;
      lastTime = now;

      setMousePos({ x: e.clientX, y: e.clientY });
      
      const newParticles = Array.from({ length: 2 }, () => 
        createParticle(e.clientX, e.clientY)
      );
      
      setParticles(prev => [...prev.slice(-20), ...newParticles]);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [createParticle]);

  useEffect(() => {
    const interval = setInterval(() => {
      setParticles(prev => 
        prev
          .map(p => ({ ...p, opacity: p.opacity - 0.08, y: p.y - 2, size: p.size * 0.95 }))
          .filter(p => p.opacity > 0)
      );
    }, 30);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Custom cursor */}
      <div 
        className="cursor-target pointer-events-none fixed z-[9999]"
        style={{ 
          left: mousePos.x - 12, 
          top: mousePos.y - 12,
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          {/* Outer ring */}
          <circle cx="12" cy="12" r="10" stroke="hsl(185, 100%, 50%)" strokeWidth="1.5" fill="none" opacity="0.8" />
          {/* Inner ring */}
          <circle cx="12" cy="12" r="5" stroke="hsl(320, 90%, 60%)" strokeWidth="1" fill="none" opacity="0.9" />
          {/* Center dot */}
          <circle cx="12" cy="12" r="2" fill="hsl(45, 100%, 60%)" />
          {/* Crosshairs */}
          <line x1="12" y1="0" x2="12" y2="6" stroke="hsl(185, 100%, 50%)" strokeWidth="1" opacity="0.7" />
          <line x1="12" y1="18" x2="12" y2="24" stroke="hsl(185, 100%, 50%)" strokeWidth="1" opacity="0.7" />
          <line x1="0" y1="12" x2="6" y2="12" stroke="hsl(185, 100%, 50%)" strokeWidth="1" opacity="0.7" />
          <line x1="18" y1="12" x2="24" y2="12" stroke="hsl(185, 100%, 50%)" strokeWidth="1" opacity="0.7" />
        </svg>
      </div>

      {/* Flame particles */}
      {particles.map(particle => (
        <div
          key={particle.id}
          className="pointer-events-none fixed z-[9998] rounded-full"
          style={{
            left: particle.x - particle.size / 2,
            top: particle.y - particle.size / 2,
            width: particle.size,
            height: particle.size,
            opacity: particle.opacity,
            background: `radial-gradient(circle, hsl(${particle.hue}, 100%, 60%), hsl(${particle.hue - 10}, 100%, 40%), transparent)`,
            boxShadow: `0 0 ${particle.size}px hsl(${particle.hue}, 100%, 50%)`,
            transform: 'translate3d(0, 0, 0)',
          }}
        />
      ))}
    </>
  );
};
