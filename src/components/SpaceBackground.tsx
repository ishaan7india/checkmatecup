import { useEffect, useState } from "react";

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
}

export const SpaceBackground = () => {
  const [stars, setStars] = useState<Star[]>([]);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkDark = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const generatedStars: Star[] = Array.from({ length: 100 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      duration: Math.random() * 3 + 2,
      delay: Math.random() * 5,
    }));
    setStars(generatedStars);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Nebula gradient background for dark mode */}
      {isDark && (
        <div className="absolute inset-0 bg-nebula-gradient opacity-30" />
      )}
      
      {/* Stars */}
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full animate-pulse-slow"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            backgroundColor: isDark ? 'white' : 'hsl(250, 85%, 60%)',
            opacity: isDark ? 0.6 : 0.3,
            animationDuration: `${star.duration}s`,
            animationDelay: `${star.delay}s`,
            boxShadow: isDark 
              ? `0 0 ${star.size * 2}px rgba(255,255,255,0.5)` 
              : `0 0 ${star.size * 2}px hsl(250, 85%, 60%, 0.3)`,
          }}
        />
      ))}

      {/* RGB Breathing orbs for dark mode */}
      {isDark && (
        <>
          <div 
            className="absolute w-96 h-96 rounded-full opacity-10 blur-3xl rgb-glow"
            style={{ left: '10%', top: '20%', background: 'hsl(185, 100%, 50%)' }}
          />
          <div 
            className="absolute w-80 h-80 rounded-full opacity-10 blur-3xl rgb-glow"
            style={{ right: '15%', top: '60%', background: 'hsl(280, 80%, 60%)', animationDelay: '1.5s' }}
          />
          <div 
            className="absolute w-64 h-64 rounded-full opacity-10 blur-3xl rgb-glow"
            style={{ left: '50%', bottom: '10%', background: 'hsl(320, 90%, 60%)', animationDelay: '3s' }}
          />
        </>
      )}
    </div>
  );
};