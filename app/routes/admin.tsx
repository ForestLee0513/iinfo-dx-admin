import { useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { authKeys, useLogoutMutation, useMyInfoQuery } from "@/api/auth/requests";
import { setAuthErrorCallback } from "@/lib/axios";

const NAV_ITEMS = [
  { to: "/members", label: "회원 관리" },
  { to: "/crawling", label: "크롤링 관리" },
  { to: "/crawling-history", label: "크롤링 내역" },
  { to: "/ranking", label: "서열표 관리" },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const logout = useLogoutMutation();
  const { data: me } = useMyInfoQuery();

  useEffect(() => {
    setAuthErrorCallback(() => {
      queryClient.removeQueries({ queryKey: authKeys.all });
      navigate("/", { replace: true });
    });
    return () => setAuthErrorCallback(null);
  }, [navigate, queryClient]);

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
