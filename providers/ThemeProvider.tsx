import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { THEME_STORAGE_KEY, type Theme } from "@/lib/theme";

const ThemeContext = createContext<{
  theme: Theme;
  toggleTheme: () => void;
} | null>(null);

/*
서버 렌더링은 항상 "light"를 내려주지만, 클라이언트에서는 root.tsx의 인라인 스크립트가
하이드레이션 전에 이미 <html>에 실제 테마 클래스를 반영해 둔 상태다. 따라서 클라이언트
초기 렌더 시점에 그 클래스를 동기적으로 읽어와 최초 렌더부터 올바른 테마로 그리면,
"light로 그렸다가 dark로 바뀌는" 추가 프레임(FOUC)이 발생하지 않는다.
(서버/클라이언트 초기 출력이 달라 하이드레이션 경고가 날 수 있는 지점은
ThemeToggle에서 suppressHydrationWarning으로 억제한다.)
*/
function getInitialTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme은 ThemeProvider 내부에서만 사용할 수 있습니다.");
  }
  return ctx;
}
