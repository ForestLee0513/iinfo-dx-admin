# This is React Router (framework mode), not Next.js

This project runs on **React Router v8 in framework mode** (SSR-enabled) — it is not Next.js. There is no App Router, no `page.tsx`/`layout.tsx` special files, no server actions, and `searchParams` is a plain client-side hook, not an awaited `Promise`. Routes are declared explicitly in `app/routes.ts` and rendered by files under `app/routes/`. Read `node_modules/react-router/dist/development/*.d.ts` or https://reactrouter.com/ (framework mode docs) before assuming Next.js conventions apply.

UI copy and code comments are written in **Korean**. Path aliases: `@/*` → repo root, `~/*` → `app/` (both declared in `tsconfig.json` / `vite.config.ts`; prefer `@/*` for anything outside `app/`, since that's what's used throughout the codebase today).

## Commands

Package manager is **yarn** (yarn.lock present).

- `yarn dev` — dev server (React Router dev, HMR) at http://localhost:5173
- `yarn build` — production build (`react-router build`) → `build/client` + `build/server`
- `yarn start` — serve the production build (`react-router-serve ./build/server/index.js`)
- `yarn typecheck` — regenerates React Router's route types (`react-router typegen`) then runs `tsc`

There is no `lint` script and no ESLint config in this project (only `@tanstack/eslint-plugin-query` sits in `devDependencies`, unused by any script) — don't assume `yarn lint` works, and don't invoke `eslint` directly on the assumption a flat config exists. There is also no test setup.

## Environment

There is no `.env.local` convention here (no `NEXT_PUBLIC_*` vars). The only environment knob is:

- `VITE_API_URL` — backend base URL used **only by the dev server's Vite proxy** (`vite.config.ts` proxies `/api/v1` → `VITE_API_URL`, default `http://localhost:8000`). Backend routes live under `/api/v1/web/...` and `/api/v1/admin/...`.

In both dev and prod, the browser calls the API **same-origin** (`api/axios.ts`'s `API_BASE_URL` is `""`) — dev relies on the Vite proxy above, production relies on a reverse proxy (e.g. nginx) placed in front of the app server. There is no `basePath`/`assetPrefix` concept in this setup, so there's no static-import requirement for images — reference `public/` assets by plain string path as usual.

## Project layout

Styling is Tailwind CSS v4 (Vite plugin, no tailwind.config, no separate `styles/` folder — see below). Each top-level folder owns exactly one concern; keep the boundaries from overlapping.

```
📦 repo root
 ┣ 📂api        # per-domain requests + server-state (TanStack Query)
 ┣ 📂app        # routing (React Router framework mode) and screen assembly
 ┣ 📂components # feature-scoped, reusable UI
 ┣ 📂lib        # shared client foundations (HTTP + cache clients)
 ┣ 📂providers  # React providers wiring lib clients into the tree
 ┗ 📂public     # static assets (fonts, favicon) served as-is
```

The sections below give the rules for each folder, in that order.

## `api/<domain>/` — requests & server-state

Each backend domain gets its own folder (see `api/auth/` and `api/users/` as reference implementations):

```
📂api/<domain>
 ┣ 📜constants.ts  # route base (e.g. USERS_BASE = "/api/v1/admin/users") + enum-like consts
 ┣ 📜types.ts      # request/response interfaces, one block per endpoint (path in a comment)
 ┗ 📜requests.ts   # request fns + TanStack layer together: <domain>Keys factory, queryOptions, hooks
```

Unlike a strict request/query split, **`requests.ts` holds both the raw async request function and its paired TanStack hook right next to each other** (e.g. `getUserDetail` immediately followed by `userDetailQueryOptions` and `useUserDetailQuery`). Components only ever import the hooks (`useUserDetailQuery`, `useBanUserMutation`, …) from `requests.ts`; the plain async functions (`startOAuthLogin`, `refreshSession`, …) are imported directly only for non-hook flows that run outside a React hook (interceptors, `window.location` redirects).

A domain can add extra files beyond these three when it has domain logic that isn't a request or a type — e.g. `api/auth/roles.ts` holds `canAccessAdmin` / `isRole`, pure helpers derived from `AUTH_MEMBER_ROLE`, kept out of `requests.ts` because they aren't network calls.

### Query keys — the `<domain>Keys` factory

The client cache is TanStack Query — treat it as **server-state, not a client store**. State is partitioned per domain by the **top-level string** of each query key:

```ts
export const authKeys = {
  all: ["auth"] as const, // namespace root for the whole domain
  me: () => [...authKeys.all, "me"] as const,
};
```

- **Namespacing rule:** every domain's `all` MUST start with a unique string (`["auth"]`, `["users"]`, …). Never hand-build a key in a component — always go through the factory so the prefix stays consistent.
- **Domains don't clobber each other:** invalidate/remove match by array **prefix**, so `removeQueries({ queryKey: authKeys.all })` only touches keys starting with `["auth", …]`. Auth cache is wiped only by a same-prefix collision, `queryClient.clear()`, or a key-less `invalidateQueries()` — all deliberate.
- **Derive child keys from the parent** (`[...userKeys.all, "detail"]` → `[...userKeys.details(), userId]`) so a broader removal (e.g. `userKeys.all`) cleans the entire domain in one call.
- Cache writes on mutation success go through **named helpers** in `requests.ts` (e.g. `seedMyInfo`, `invalidateUser`), not scattered `setQueryData`/`invalidateQueries` calls in components. Login mutations seed the `me` cache from the login response to avoid an immediate follow-up `/me` request.

## `app/` — routing & assembly only

`app/routes.ts` is the single source of truth for the route tree, built with the `@react-router/dev/routes` helpers (`index`, `route`, `layout`):

```ts
export default [
  index("routes/login.tsx"),
  layout("routes/admin.tsx", [
    route("members", "routes/admin.members.tsx"),
    route("members/:userId", "routes/admin.members.$userId.tsx"),
    route("permissions", "routes/admin.permissions.tsx"),
  ]),
] satisfies RouteConfig;
```

Route filenames (e.g. `admin.members.$userId.tsx`) are just conventional labels registered in `routes.ts` — React Router's framework mode does not infer routes from the filesystem the way Next.js's App Router does, so the URL structure lives in `routes.ts`, not in folder nesting.

- **Route files stay thin where possible**, but unlike Next.js's page/layout split, a React Router layout route (`admin.tsx`) commonly owns real client logic (auth gate, nav, session-derived redirects via `useEffect` + `useNavigate`) because there's no server-side middleware step to do it instead — see `app/routes/admin.tsx`.
- **Typed route args** come from the generated `./+types/<route-file>` module (e.g. `import type { Route } from "./+types/login"`), regenerated by `yarn typecheck` (`react-router typegen`). Use `Route.MetaArgs` for `meta()`, `Route.ErrorBoundaryProps` for `ErrorBoundary`, etc.
- **`meta()`** is a plain exported function returning an array of tag descriptors (`{ title }`, `{ name, content }`) — this replaces Next.js's `metadata` export/`generateMetadata`.
- **`searchParams` is a client hook, not a `Promise`.** Read query params with `useSearchParams()` from `react-router` inside the component (see `app/routes/login.tsx`'s `oauthError` handling) — there is no `await searchParams` step.
- **Root layout** (`app/root.tsx`) exports `Layout` (the `<html>/<head>/<body>` shell, `<Meta>`/`<Links>`/`<Scripts>`/`<ScrollRestoration>`), a default `App` component (global providers + `<Outlet />`), and `ErrorBoundary` (checked with `isRouteErrorResponse` for 404s vs. unexpected errors) — this trio is React Router's root-level equivalent of Next.js's root layout + `not-found`/`error` files, but all three live in one file.
- **Nested layouts** are declared via `layout(...)` in `routes.ts`, not via a parenthesized route-group folder — `app/routes/admin.tsx` wraps every route nested under it in `routes.ts` and renders them through its own `<Outlet />`.

## `components/` — feature-scoped UI

One folder per feature component, **one component per file**, split by concern. A simple component starts flat (e.g. today's `components/ui/Badge.tsx`, `components/table/DataTable.tsx`); when it grows enough to need local state, context, or multiple sub-parts, promote it to a folder:

```
📂components/<Name>
 ┣ 📜index.tsx   # the component itself; module parts attach here (Foo.Body = Body) just before export
 ┣ 📂parts       # helper components too small to live globally, one file each
 ┣ 📜types.ts    # component-local types (props, context types) — reads as the component's table of contents
 ┗ 📜utils.ts    # component-local helpers (optional; omit if unused)
```

For components that own local state, add two more folders:

```
 ┣ 📂contexts    # Context used only inside this component
 ┗ 📂hooks       # hooks used only inside this component
```

- **Scope decides placement.** Shared across screens → global (repo-level `hooks/`, `contexts/`, or a global `components/`); used only inside one component → that component's local `parts/` `hooks/` `contexts/`. Same rule for every subfolder.
- **`index.tsx` is the container.** For stateful components it owns state + providers and delegates rendering to `parts/`; `parts/` consumes state (via Context/hooks) and holds none of its own — keep the "owns state (index) ↔ consumes state (parts)" boundary clean.
- **`types.ts` is the component's index** — reading it alone should reveal what the component takes and exposes, without opening the implementation.

## `lib/` — shared client foundations

App-wide plumbing that isn't tied to any domain or screen. Domains grow, screens grow; these files stay reused.

```
📂lib
 ┣ 📜axios.ts        # shared HTTP instance + 401 auto-recovery
 ┣ 📜query-client.ts # server/browser QueryClient factory
 ┗ 📜api-error.ts     # shared error-message extraction for API errors
```

### `axios.ts` — shared HTTP instance & 401 recovery

- Exports the shared `api` axios instance. Sessions are cookie-based (`withCredentials: true`), and `API_BASE_URL` is left empty so requests go same-origin (see Environment above).
- The access token for Bearer-protected endpoints lives **in memory only** (`setAccessToken`), so a page refresh drops it **intentionally** — real identity rests in the httpOnly refresh cookie (XSS can't read it), and the in-memory token is a recoverable derivative.
- On any 401 (except login/refresh requests themselves), the response interceptor calls `POST /refresh` — **deduplicated through a single shared promise** so concurrent 401s trigger one refresh — then retries the original request **exactly once** (`_retried` flag). A 401 on refresh/login itself is a credential error and propagates as-is (no recursion). A 401 that survives the retry calls the `authErrorCallback` registered via `setAuthErrorCallback` (see `app/routes/admin.tsx`, which wires it to clear the `me` cache and redirect to `/`).

### `query-client.ts` — server/browser factory

- `retry` skips all 4xx errors (retry only `5xx`, up to 3×): a 401 reaching TanStack Query means the axios interceptor's refresh-and-retry already failed, so retrying again is pointless. The two layers manage retries without overlapping.
- `getQueryClient()` returns a **new `QueryClient` per server request** (no cross-user cache leaks, matters because React Router framework mode renders on the server) and a **browser singleton** (survives suspend/re-render without discarding the hydrated cache). Callers just call `getQueryClient()` — the server/browser rule stays sealed in this file.

## `providers/` — wiring `lib` clients into the tree

Providers connect the clients created in `lib/` to the React tree. Today this is a single file:

```
📂providers
 ┗ 📜QueryProvider.tsx  # inject QueryClient into the tree + mount Devtools
```

- **`QueryProvider.tsx`** (thin) — calls `getQueryClient()`, wraps `children` in `QueryClientProvider`, and mounts `ReactQueryDevtools`. Never `new QueryClient()` here.
- There is no dedicated session-bootstrap provider. Auth state is just the `me` query (`useMyInfoQuery` from `api/auth/requests.ts`): the admin layout route (`app/routes/admin.tsx`) reads it directly, shows a skeleton while `isLoading`, and redirects out via `useNavigate` when the query errors or the role fails `canAccessAdmin`/route-level role checks. Recovery from a dropped in-memory access token happens implicitly through `lib/axios.ts`'s 401 → refresh → retry flow, not through an explicit "restore session" step on mount.

OAuth login is a full-page redirect (`window.location.assign`), not XHR — the session cookie is set on the provider callback.

## Styling & fonts

There is no separate `styles/` folder — styling lives directly under `app/`:

```
📂app
 ┗ 📜app.css   # Tailwind v4 entry + font-face + design tokens
```

- **`app.css`** is the Tailwind v4 entry point: `@import "tailwindcss"` replaces the old `@tailwind base/components/utilities`, and the `@theme` block replaces `tailwind.config`'s `theme.extend`. Pretendard / Pretendard JP are wired via plain `@font-face` rules pointing at `public/fonts/*.woff2` (not `next/font/local`), split by `unicode-range` so Korean/Latin and Japanese glyphs load the matching variable-weight file under one `font-family: "Pretendard"`. The `@theme` block promotes that into `--font-sans`, so components just use the `font-sans` Tailwind utility.
- The admin console is locked to light theme (`color-scheme: light` on `html, body` in `app.css`) so native controls (inputs, selects, scrollbars) don't pick up the system dark mode.
