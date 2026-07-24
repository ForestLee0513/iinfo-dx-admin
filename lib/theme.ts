export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "iinfo-dx-theme";

/*
SSR 결과는 항상 라이트 모드로 내려오므로, 하이드레이션 전에 저장된 테마(또는 시스템
설정)를 즉시 <html>에 반영해 다크 모드 사용자가 매 로드마다 깜빡임을 겪지 않게 한다.
root.tsx의 <head>에서 인라인 스크립트로 실행된다.
*/
export const themeInitScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});var d=t?t==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;

/*
저장된 테마(없으면 시스템 설정)를 읽어 <html>.dark 클래스를 다시 맞춘다.
themeInitScript와 동일한 판정 규칙을 런타임에서도 쓰기 위한 함수다.
ErrorBoundary는 ThemeProvider 밖에서 렌더되므로(App의 형제), 클라이언트 라우팅으로
404에 진입하면 App이 언마운트되며 명령형으로 붙였던 테마 클래스가 유실된다.
항상 마운트되는 root.tsx의 Layout에서 매 렌더마다 이 함수를 호출해 그 유실을 막는다.
DOM 클래스가 아니라 localStorage를 기준으로 삼아 이미 유실된 상태에 휘둘리지 않게 한다.
*/
export function syncThemeClass() {
  if (typeof document === "undefined") return;
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  const isDark = stored
    ? stored === "dark"
    : window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.classList.toggle("dark", isDark);
}
