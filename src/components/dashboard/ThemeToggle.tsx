import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

const ThemeToggle = () => {
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains("dark")
  );

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  return (
    <button
      onClick={() => setIsDark(!isDark)}
      className="relative flex items-center w-[72px] h-9 rounded-full bg-muted p-1 transition-colors"
      aria-label="Toggle theme"
    >
      <span
        className={`absolute w-8 h-7 rounded-full bg-card shadow-sm transition-transform duration-300 ${
          isDark ? "translate-x-[34px]" : "translate-x-0"
        }`}
      />
      <span className="relative z-10 flex items-center justify-center w-8 h-7">
        <Sun className={`w-4 h-4 transition-colors ${isDark ? "text-muted-foreground" : "text-foreground"}`} />
      </span>
      <span className="relative z-10 flex items-center justify-center w-8 h-7">
        <Moon className={`w-4 h-4 transition-colors ${isDark ? "text-foreground" : "text-muted-foreground"}`} />
      </span>
    </button>
  );
};

export default ThemeToggle;
