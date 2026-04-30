import { createContext, useContext, useEffect, useState, useMemo, ReactNode } from "react";

/** Type representing theme. */
type Theme = "dark" | "light" | "system";

/** Defines the structure for theme provider state. */
interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "dark" | "light";
}

const ThemeContext = createContext<ThemeProviderState>({
  theme: "dark",
  setTheme: () => {},
  resolvedTheme: "dark",
});

/**
 * theme provider.
 *  * @param { children, defaultTheme = "dark" } - The { children, default theme = "dark" }.
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

/** Use theme. */
export const useTheme = () => useContext(ThemeContext);
