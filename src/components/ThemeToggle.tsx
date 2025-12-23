import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";

const THEME_KEY = "christmas-gambit-theme";

export const ThemeToggle = () => {
  const [isDark, setIsDark] = useState(() => {
    // Check localStorage first, then system preference
    const stored = localStorage.getItem(THEME_KEY);
    if (stored !== null) {
      return stored === "dark";
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    // Apply theme on mount and when isDark changes
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark(prev => !prev);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="relative overflow-hidden transition-all duration-300"
    >
      {isDark ? (
        <Moon className="h-5 w-5 text-neon-cyan animate-scale-in" />
      ) : (
        <Sun className="h-5 w-5 text-accent animate-scale-in" />
      )}
    </Button>
  );
};
