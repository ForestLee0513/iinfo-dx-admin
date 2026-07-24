import { Link } from "react-router";

import type { Route } from "./+types/$";

/*
매칭되지 않는 모든 경로(404)를 처리하는 catch-all(splat) 라우트.

루트 ErrorBoundary에서 404를 처리하지 않고 이 실제 라우트로 처리하는 이유:
- dev 서버는 라우트별 critical CSS를 블로킹 스타일시트로 주입하는데, 매칭 라우트가
  없는 ErrorBoundary 경로에서는 critical CSS가 비어 새로고침 시 FOUC가 발생한다.
  실제 라우트로 매칭되면 critical CSS가 정상 계산되어 FOUC가 사라진다.
- ThemeProvider 트리 안에서 렌더되므로 테마 클래스도 자연스럽게 유지된다.
*/
export function meta(_: Route.MetaArgs) {
  return [{ title: "404 · 페이지를 찾을 수 없습니다" }];
}

export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-muted-foreground text-sm font-medium">404</p>
      <h1 className="text-2xl font-semibold">페이지를 찾을 수 없습니다</h1>
      <p className="text-muted-foreground text-sm">
        요청하신 주소가 없거나 변경되었을 수 있습니다.
      </p>
      <Link
        to="/"
        className="text-primary mt-2 text-sm font-medium underline underline-offset-4"
      >
        홈으로 돌아가기
      </Link>
    </main>
  );
}
