/**
 * src/components/ThemeProvider.tsx
 * ================================
 * Theme Provider Component
 *
 * Responsibilities:
 * - Manage theme state (dark/light/system)
 * - Persist theme preference to localStorage
 * - Resolve system theme preference
 * - Provide theme context to application
 *
 * @example
 * ```tsx
 * <ThemeProvider defaultTheme="dark">
 *   <App />
 * </ThemeProvider>
 * ```
 */

import { useEffect, useState, useMemo, ReactNode } from "react";
import { ThemeContext, type Theme } from "@/hooks/useTheme";

export function ThemeProvider({
  children,
  defaultTheme = "dark",
}: {
  children: ReactNode;
  defaultTheme?: Theme;
}) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem("basho-theme") as Theme | null;
    return stored || defaultTheme;
  });

  const resolvedTheme =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(resolvedTheme);
    localStorage.setItem("basho-theme", theme);
  }, [theme, resolvedTheme]);

  const value = useMemo(
    () => ({ theme, setTheme, resolvedTheme }),
    [theme, setTheme, resolvedTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
