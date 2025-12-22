import { useEffect, useState } from "react";

interface Snowflake {
  id: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
  symbol: string;
}

export const SnowEffect = () => {
  const [snowflakes, setSnowflakes] = useState<Snowflake[]>([]);
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
    if (isDark) {
      setSnowflakes([]);
      return;
    }

    const symbols = ['❄', '❅', '❆', '✦', '✧'];
    const flakes: Snowflake[] = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: Math.random() * 0.8 + 0.5,
      duration: Math.random() * 8 + 8,
      delay: Math.random() * 10,
      symbol: symbols[Math.floor(Math.random() * symbols.length)],
    }));
    setSnowflakes(flakes);
  }, [isDark]);

  if (isDark) return null;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {snowflakes.map((flake) => (
        <span
          key={flake.id}
          className="snowflake"
          style={{
            left: `${flake.left}%`,
            fontSize: `${flake.size}em`,
            animationDuration: `${flake.duration}s`,
            animationDelay: `${flake.delay}s`,
          }}
        >
          {flake.symbol}
        </span>
      ))}
    </div>
  );
};
