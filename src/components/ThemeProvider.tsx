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

import { createContext, useContext, useEffect, useState, useMemo, ReactNode } from "react";

/**
 * Theme options.
 */
type Theme = "dark" | "light" | "system";

/**
 * Theme provider state interface.
 */
interface ThemeProviderState {
  /** Current theme setting */
  theme: Theme;
  /** Function to change theme */
  setTheme: (theme: Theme) => void;
  /** Resolved theme (dark or light, never system) */
  resolvedTheme: "dark" | "light";
}

const ThemeContext = createContext<ThemeProviderState>({
  theme: "dark",
  setTheme: () => {},
  resolvedTheme: "dark",
});

/**
 * Theme provider component.
 * Manages application theme and provides theme context to child components.
 *
 * @param {{ children: ReactNode; defaultTheme?: Theme }} props - Component props.
 * @param {ReactNode} props.children - Child components.
 * @param {Theme} [props.defaultTheme="dark"] - Default theme.
 * @returns {JSX.Element} Theme context provider.
 *
 * @example
 * ```tsx
 * <ThemeProvider defaultTheme="dark">
 *   <App />
 * </ThemeProvider>
 * ```
 */
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

/**
 * Hook to access theme context.
 * Returns the current theme, resolved theme, and theme setter function.
 *
 * @returns {ThemeProviderState} Theme context state.
 *
 * @example
 * ```tsx
 * const { theme, setTheme, resolvedTheme } = useTheme();
 * setTheme("light");
 * ```
 */
export const useTheme = () => useContext(ThemeContext);
