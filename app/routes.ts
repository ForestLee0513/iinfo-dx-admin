import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  index("routes/login.tsx"),
  layout("routes/admin.tsx", [
    route("members", "routes/admin.members.tsx"),
    route("members/:userId", "routes/admin.members.$userId.tsx"),
    route("permissions", "routes/admin.permissions.tsx"),
  ]),
] satisfies RouteConfig;
