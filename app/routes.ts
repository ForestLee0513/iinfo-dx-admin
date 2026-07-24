import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  index("routes/login.tsx"),
  layout("routes/admin.tsx", [
    route("members", "routes/admin.members.tsx"),
    route("members/:userId", "routes/admin.members.$userId.tsx"),
    route("permissions", "routes/admin.permissions.tsx"),
    route("crawling", "routes/admin.crawling.tsx"),
    route("data", "routes/admin.data.tsx"),
  ]),
  // 매칭되지 않는 모든 경로(404). ErrorBoundary가 아닌 실제 라우트로 처리해
  // dev critical CSS 누락으로 인한 FOUC를 없애고 ThemeProvider 안에서 렌더한다.
  route("*", "routes/$.tsx"),
] satisfies RouteConfig;
