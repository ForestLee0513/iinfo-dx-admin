import { useEffect, useState } from "react";

import {
  useBanUserMutation,
  useUnbanUserMutation,
  useUserListQuery,
} from "@/api/users/requests";
import type { UserSummary } from "@/api/users/types";

export function meta() {
  return [{ title: "회원 관리 - IInfoDX Admin" }];
}

/*
provider 값 → 화면 표기. 목록에 없는 provider는 원문 그대로 노출한다.
*/
const PROVIDER_LABELS: Record<string, string> = {
  google: "Google",
  email: "이메일",
};

const PLATFORM_OPTIONS = [
  { value: "전체", label: "전체" },
  { value: "google", label: "Google" },
  { value: "email", label: "이메일" },
] as const;

const ACTIVE_OPTIONS = ["전체", "활성", "정지"] as const;
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:bg-white focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10";

function formatDate(iso?: string | null) {
  if (!iso) return "-";
  return iso.slice(0, 10);
}

export default function Members() {
  const [emailFilter, setEmailFilter] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>("전체");
  const [activeFilter, setActiveFilter] = useState<string>("전체");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 이메일 입력은 타이핑마다 요청하지 않도록 300ms 디바운스한다.
  const [debouncedEmail, setDebouncedEmail] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedEmail(emailFilter.trim()), 300);
    return () => clearTimeout(timer);
  }, [emailFilter]);

  const { data, isPending, isError } = useUserListQuery({
    page,
    per_page: pageSize,
    email: debouncedEmail || undefined,
    provider: platformFilter !== "전체" ? platformFilter : undefined,
    is_banned:
      activeFilter === "정지"
        ? true
        : activeFilter === "활성"
          ? false
          : undefined,
  });

  const filtered = data?.users ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const banMutation = useBanUserMutation();
  const unbanMutation = useUnbanUserMutation();
  const isMutating = banMutation.isPending || unbanMutation.isPending;

  const selectedUsers = filtered.filter((u) => selectedIds.has(u.id));
  const allSelected =
    filtered.length > 0 && filtered.every((u) => selectedIds.has(u.id));

  function toggleAll() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) filtered.forEach((u) => next.delete(u.id));
      else filtered.forEach((u) => next.add(u.id));
      return next;
    });
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleFilterChange<T extends string>(
    setter: (v: T) => void,
    value: T,
  ) {
    setter(value);
    setPage(1);
    setSelectedIds(new Set());
  }

  function changePage(next: number) {
    setPage(next);
    setSelectedIds(new Set());
  }

  async function handleBan() {
    const targets = selectedUsers.filter((u) => !u.is_banned);
    if (targets.length === 0) {
      window.alert("선택한 회원이 모두 이미 정지 상태입니다.");
      return;
    }
    const reason = window.prompt(
      `${targets.length}명을 정지 처리합니다.\n정지 사유를 입력하세요. (미입력 시 취소)`,
    );
    if (!reason?.trim()) return;

    const results = await Promise.allSettled(
      targets.map((u) =>
        banMutation.mutateAsync({ userId: u.id, reason: reason.trim() }),
      ),
    );
    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed > 0) window.alert(`${failed}명 정지 처리에 실패했습니다.`);
    setSelectedIds(new Set());
  }

  async function handleUnban() {
    const targets = selectedUsers.filter((u) => u.is_banned);
    if (targets.length === 0) {
      window.alert("선택한 회원 중 정지 상태인 회원이 없습니다.");
      return;
    }
    if (!window.confirm(`${targets.length}명의 정지를 해제할까요?`)) return;

    const results = await Promise.allSettled(
      targets.map((u) => unbanMutation.mutateAsync(u.id)),
    );
    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed > 0) window.alert(`${failed}명 정지 해제에 실패했습니다.`);
    setSelectedIds(new Set());
  }

  return (
    <div className="p-8">
      <h1 className="text-[2rem] font-semibold text-gray-900 mb-6">
        회원 관리
      </h1>

      {/* 필터 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">이메일</label>
            <input
              type="text"
              value={emailFilter}
              onChange={(e) =>
                handleFilterChange(setEmailFilter, e.target.value)
              }
              placeholder="example@example.com"
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">플랫폼</label>
            <select
              value={platformFilter}
              onChange={(e) =>
                handleFilterChange(setPlatformFilter, e.target.value)
              }
              className={inputClass + " cursor-pointer"}
            >
              {PLATFORM_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              활성 여부
            </label>
            <select
              value={activeFilter}
              onChange={(e) =>
                handleFilterChange(setActiveFilter, e.target.value)
              }
              className={inputClass + " cursor-pointer"}
            >
              {ACTIVE_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 테이블 카드 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* 액션 바 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <p className="text-sm text-gray-500">
            총{" "}
            <span className="font-semibold text-gray-900">{total}</span>명
            {selectedIds.size > 0 && (
              <span className="ml-2 text-gray-400">
                ({selectedIds.size}명 선택됨)
              </span>
            )}
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleBan}
              disabled={selectedIds.size === 0 || isMutating}
              className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-red-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {banMutation.isPending ? "정지 처리 중…" : "정지 처리"}
            </button>
            <button
              onClick={handleUnban}
              disabled={selectedIds.size === 0 || isMutating}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {unbanMutation.isPending ? "정지 해제 중…" : "정지 해제"}
            </button>
          </div>
        </div>

        {/* 테이블 */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="w-12 px-5 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="rounded border-gray-300 accent-gray-900 cursor-pointer"
                  />
                </th>
                {[
                  "No",
                  "이메일",
                  "플랫폼",
                  "가입일",
                  "최근 로그인",
                  "활성 여부",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isPending ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-16 text-center text-gray-400"
                  >
                    불러오는 중…
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-16 text-center text-red-500"
                  >
                    회원 목록을 불러오지 못했습니다.
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-16 text-center text-gray-400"
                  >
                    검색 결과가 없습니다.
                  </td>
                </tr>
              ) : (
                filtered.map((member: UserSummary, idx) => (
                  <tr
                    key={member.id}
                    className={`transition-colors hover:bg-gray-50/70 ${
                      selectedIds.has(member.id) ? "bg-blue-50/40" : ""
                    }`}
                  >
                    <td className="w-12 px-5 py-3.5">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(member.id)}
                        onChange={() => toggleOne(member.id)}
                        className="rounded border-gray-300 accent-gray-900 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3.5 text-gray-400 tabular-nums">
                      {(page - 1) * pageSize + idx + 1}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-gray-900">
                      {member.email ?? "-"}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                        {member.provider
                          ? (PROVIDER_LABELS[member.provider] ??
                            member.provider)
                          : "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-gray-500 tabular-nums">
                      {formatDate(member.created_at)}
                    </td>
                    <td className="px-4 py-3.5 text-gray-500 tabular-nums">
                      {formatDate(member.last_sign_in_at)}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        title={member.ban_reason ?? undefined}
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                          member.is_banned
                            ? "bg-red-50 text-red-600"
                            : "bg-green-50 text-green-700"
                        }`}
                      >
                        {member.is_banned ? "정지" : "활성"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>페이지당</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                changePage(1);
              }}
              className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-sm outline-none focus:border-gray-900 cursor-pointer"
            >
              {PAGE_SIZE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <span>개</span>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>
              {total === 0
                ? "0개"
                : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} / 총 ${total}개`}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => changePage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="rounded-lg border border-gray-200 w-8 h-8 flex items-center justify-center text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ‹
              </button>
              <span className="px-3 py-1 text-sm font-medium text-gray-700">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => changePage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="rounded-lg border border-gray-200 w-8 h-8 flex items-center justify-center text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ›
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
