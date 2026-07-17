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
