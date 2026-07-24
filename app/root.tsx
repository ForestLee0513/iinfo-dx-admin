import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import { TooltipProvider } from "@forestlee0513/iinfo-dx-design-system";

import { useEffect, useLayoutEffect } from "react";

import type { Route } from "./+types/root";
import { QueryProvider } from "@/providers/QueryProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { syncThemeClass, themeInitScript } from "@/lib/theme";
import "./app.css";

export const links: Route.LinksFunction = () => [];

// useLayoutEffect는 브라우저 페인트 전에 동기 실행되어 테마 클래스 재적용으로 인한
// light 깜빡임(FOUC)을 없앤다. SSR에서는 실행되지 않고 경고만 나므로 서버에선 useEffect로 둔다.
const useIsomorphicLayoutEffect =
  typeof document !== "undefined" ? useLayoutEffect : useEffect;

export function Layout({ children }: { children: React.ReactNode }) {
  // ErrorBoundary는 ThemeProvider(App) 밖에서 렌더된다. 클라이언트 라우팅으로 404에
  // 진입하면 App이 언마운트되며 테마 클래스가 유실돼 light로 보이므로, 항상 마운트되는
  // Layout에서 매 렌더마다 테마 클래스를 재적용한다. 페인트 전 동기 실행이라 유실→재적용
  // 사이의 light 프레임(FOUC)이 화면에 나타나지 않는다. (URL 직접 진입은 themeInitScript가
  // 처리하므로 원래 정상이었다.)
  useIsomorphicLayoutEffect(() => {
    syncThemeClass();
  });

  // dark 클래스는 하이드레이션 전에 themeInitScript가 직접 붙이므로 서버 출력과
  // 다를 수 있다 — 의도된 불일치이므로 경고를 억제한다.
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <QueryProvider>
      <ThemeProvider>
        <TooltipProvider>
          <Outlet />
        </TooltipProvider>
      </ThemeProvider>
    </QueryProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
