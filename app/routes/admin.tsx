import { useEffect } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  authKeys,
  useLogoutMutation,
  useMyInfoQuery,
} from "@/api/auth/requests";
import { AUTH_MEMBER_ROLE } from "@/api/auth/constants";
import { canAccessAdmin } from "@/api/auth/roles";
import { setAuthErrorCallback } from "@/lib/axios";
import type { AuthMemberRole } from "@/api/auth/types";

/*
사이드바 메뉴 정의.
roles를 지정하면 해당 역할에게만 노출되고, 생략하면 어드민 접근이 가능한
모든 역할에게 노출된다. 메뉴 숨김은 UX 제어일 뿐이므로 해당 페이지의
라우트/백엔드에서도 역할 검증이 함께 이루어져야 한다.
*/
type NavItem = {
  to: string;
  label: string;
  roles?: readonly AuthMemberRole[];
};

const NAV_ITEMS: NavItem[] = [
  { to: "/members", label: "회원 관리" },
  {
    to: "/permissions",
    label: "권한 관리",
    roles: [AUTH_MEMBER_ROLE.SUPER_ADMIN],
  },
  { to: "/crawling", label: "크롤링 관리" },
  { to: "/crawling-history", label: "크롤링 내역" },
  { to: "/ranking", label: "서열표 관리" },
];

function AdminLayoutSkeleton() {
  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-60 flex-shrink-0 bg-[#3749a6] flex flex-col">
        <div className="px-8 py-7">
          <div className="h-6 w-24 rounded bg-white/20 animate-pulse" />
        </div>
        <nav className="flex-1 flex flex-col gap-1 px-8 py-1">
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              className="my-3 h-4 w-28 rounded bg-white/15 animate-pulse"
            />
          ))}
        </nav>
        <div className="border-t border-white/15 px-8 py-6 flex flex-col gap-6">
          <div className="h-4 w-12 rounded bg-white/15 animate-pulse" />
          <div className="h-4 w-16 rounded bg-white/15 animate-pulse" />
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
        <header className="h-[70px] flex-shrink-0 bg-white border-b border-gray-100 flex items-center justify-end px-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gray-100 animate-pulse" />
            <div className="flex flex-col gap-1.5">
              <div className="h-3.5 w-40 rounded bg-gray-100 animate-pulse" />
              <div className="h-3 w-12 rounded bg-gray-100 animate-pulse" />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-hidden p-8">
          <div className="h-8 w-36 rounded bg-gray-200 mb-6 animate-pulse" />
          <div className="h-24 rounded-2xl bg-white border border-gray-100 mb-5 animate-pulse" />
          <div className="h-96 rounded-2xl bg-white border border-gray-100 animate-pulse" />
        </main>
      </div>
    </div>
  );
}

/*
경로가 메뉴 항목(to)에 속하는지 확인. "/permissions"와 "/permissions/123"은
매칭되지만 "/permissions-foo" 같은 다른 경로는 매칭되지 않는다.
*/
function isPathUnderNav(pathname: string, to: string): boolean {
  return pathname === to || pathname.startsWith(`${to}/`);
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const logout = useLogoutMutation();
  const { data: me, isLoading, isError } = useMyInfoQuery();

  // 어드민 권한이 없는 세션(비로그인·조회 실패·비-ADMIN role)은 콘솔 접근 차단.
  // 프론트 게이트는 UX 방어일 뿐, 실제 인가는 백엔드가 role을 검증해야 한다.
  const authorized = canAccessAdmin(me?.app_role);

  // 현재 URL이 역할 제한 메뉴에 해당하면, 메뉴 숨김과 별개로 직접 접근도 차단.
  const restrictedRoles = NAV_ITEMS.find(
    ({ to, roles }) => roles && isPathUnderNav(location.pathname, to),
  )?.roles;
  const routeAllowed =
    !restrictedRoles || (!!me && restrictedRoles.includes(me.app_role));

  useEffect(() => {
    setAuthErrorCallback(() => {
      queryClient.removeQueries({ queryKey: authKeys.all });
      navigate("/", { replace: true });
    });
    return () => setAuthErrorCallback(null);
  }, [navigate, queryClient]);

  useEffect(() => {
    if (isLoading) return;
    if (isError || !authorized) {
      queryClient.removeQueries({ queryKey: authKeys.all });
      navigate("/", { replace: true });
    }
  }, [isLoading, isError, authorized, navigate, queryClient]);

  // URL 직접 입력 등으로 역할 제한 경로에 진입한 경우 기본 페이지로 돌려보낸다.
  useEffect(() => {
    if (isLoading || isError || !authorized) return;
    if (!routeAllowed) {
      navigate("/members", { replace: true });
    }
  }, [isLoading, isError, authorized, routeAllowed, navigate]);

  // 권한 확인 전/차단 대상은 어드민 UI를 렌더링하지 않는다.
  // 로딩 중에는 실제 메뉴·데이터 없이 레이아웃 골격만 스켈레톤으로 보여준다.
  if (isLoading) {
    return <AdminLayoutSkeleton />;
  }

  if (isError || !authorized) {
    return null;
  }

  // 리다이렉트가 실행되기 전까지 제한된 페이지 내용이 노출되지 않도록 차단.
  if (!routeAllowed) {
    return null;
  }

  // 역할 제한이 없는 메뉴는 모두 노출, 있으면 현재 역할이 포함될 때만 노출.
  const visibleNavItems = NAV_ITEMS.filter(
    ({ roles }) => !roles || (me && roles.includes(me.app_role)),
  );

  function handleLogout() {
    logout.mutate(undefined, {
      onSuccess: () => navigate("/"),
    });
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-60 flex-shrink-0 bg-[#3749a6] flex flex-col">
        <div className="px-8 py-7">
          <span className="text-xl font-extrabold text-white tracking-tight">
            IInfo DX
          </span>
        </div>

        <nav className="flex-1 flex flex-col">
          {visibleNavItems.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center px-8 py-3.5 text-sm font-semibold transition-colors ${
                  isActive
                    ? "bg-white/15 text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/15 py-3">
          <button className="w-full text-left px-8 py-3.5 text-sm font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-colors">
            설정
          </button>
          <button
            onClick={handleLogout}
            disabled={logout.isPending}
            className="w-full text-left px-8 py-3.5 text-sm font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
          >
            {logout.isPending ? "로그아웃 중…" : "로그아웃"}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
        <header className="h-[70px] flex-shrink-0 bg-white border-b border-gray-100 flex items-center justify-end px-8">
          {me && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#3749a6]/10 flex items-center justify-center text-sm font-bold text-[#3749a6]">
                {me.email.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800 leading-tight">
                  {me.email}
                </p>
                <p className="text-xs font-semibold text-gray-500 leading-tight">
                  Admin
                </p>
              </div>
            </div>
          )}
        </header>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
