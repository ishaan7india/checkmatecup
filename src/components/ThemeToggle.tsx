import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";

export const ThemeToggle = () => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const stored = document.documentElement.classList.contains('dark');
    setIsDark(stored);
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    if (newTheme) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
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
