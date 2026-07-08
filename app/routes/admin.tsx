import { useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { authKeys, useLogoutMutation, useMyInfoQuery } from "@/api/auth/requests";
import { canAccessAdmin } from "@/api/auth/roles";
import { setAuthErrorCallback } from "@/lib/axios";

const NAV_ITEMS = [
  { to: "/members", label: "회원 관리" },
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

export default function AdminLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const logout = useLogoutMutation();
  const { data: me, isLoading, isError } = useMyInfoQuery();

  // 어드민 권한이 없는 세션(비로그인·조회 실패·비-ADMIN role)은 콘솔 접근 차단.
  // 프론트 게이트는 UX 방어일 뿐, 실제 인가는 백엔드가 role을 검증해야 한다.
  const authorized = canAccessAdmin(me?.app_role);

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

  // 권한 확인 전/차단 대상은 어드민 UI를 렌더링하지 않는다.
  // 로딩 중에는 실제 메뉴·데이터 없이 레이아웃 골격만 스켈레톤으로 보여준다.
  if (isLoading) {
    return <AdminLayoutSkeleton />;
  }

  if (isError || !authorized) {
    return null;
  }

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
          {NAV_ITEMS.map(({ to, label }) => (
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
