"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface ThemeToggleProps {
  showShortcut?: boolean;
}

export function ThemeToggle({ showShortcut = true }: ThemeToggleProps) {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if not in input or textarea
      if (
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        // Check for Ctrl/Cmd + K
        if (e.key === "k" && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          setTheme(theme === "dark" ? "light" : "dark");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [theme, setTheme]);

  if (!mounted) {
    return null;
  }

  return (
    <button
      className="relative inline-flex items-center px-3 py-2 rounded-lg bg-white dark:bg-gray-800
                 border border-gray-200 dark:border-gray-700 shadow-sm
                 hover:bg-gray-50 dark:hover:bg-gray-700
                 transition-colors duration-200"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      {showShortcut && (
        <kbd className="ml-2 hidden sm:inline-flex items-center gap-1 rounded border border-gray-200 dark:border-gray-700 px-1.5 font-mono text-xs text-gray-500 dark:text-gray-400">
          <span className="text-xs">⌘</span>K
        </kbd>
      )}
    </button>
  );
}
