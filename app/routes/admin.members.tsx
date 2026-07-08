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

/*
정지 기간 선택지.
- days 프리셋: 오늘부터 N일 뒤 해제
- custom: datepicker로 해제일 직접 선택
- permanent: ban_until 미전송 → 영구 정지
*/
const BAN_DURATION_OPTIONS = [
  { value: "1", label: "1일" },
  { value: "3", label: "3일" },
  { value: "7", label: "7일" },
  { value: "30", label: "30일" },
  { value: "custom", label: "날짜 지정" },
  { value: "permanent", label: "영구" },
] as const;

type BanDurationValue = (typeof BAN_DURATION_OPTIONS)[number]["value"];

/*
오늘 기준 n일 뒤 날짜를 로컬 기준 YYYY-MM-DD로 반환한다. (date input 값/min용)
*/
function localDateAfter(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:bg-white focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10";

function formatDate(iso?: string | null) {
  if (!iso) return "-";
  return iso.slice(0, 10);
}

function SkeletonRows({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <tr key={i} className="animate-pulse">
          <td className="w-12 px-5 py-3.5">
            <div className="h-4 w-4 rounded bg-gray-100" />
          </td>
          <td className="px-4 py-3.5">
            <div className="h-4 w-6 rounded bg-gray-100" />
          </td>
          <td className="px-4 py-3.5">
            <div className="h-4 w-44 rounded bg-gray-100" />
          </td>
          <td className="px-4 py-3.5">
            <div className="h-5 w-16 rounded-full bg-gray-100" />
          </td>
          <td className="px-4 py-3.5">
            <div className="h-4 w-20 rounded bg-gray-100" />
          </td>
          <td className="px-4 py-3.5">
            <div className="h-4 w-20 rounded bg-gray-100" />
          </td>
          <td className="px-4 py-3.5">
            <div className="h-5 w-12 rounded-full bg-gray-100" />
          </td>
        </tr>
      ))}
    </>
  );
}

export default function Members() {
  const [emailFilter, setEmailFilter] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>("전체");
  const [activeFilter, setActiveFilter] = useState<string>("전체");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [banModalOpen, setBanModalOpen] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [banDuration, setBanDuration] = useState<BanDurationValue>("7");
  const [banUntilDate, setBanUntilDate] = useState(""); // 날짜 지정 시 YYYY-MM-DD

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

  const banTargets = selectedUsers.filter((u) => !u.is_banned);

  function openBanModal() {
    if (banTargets.length === 0) {
      window.alert("선택한 회원이 모두 이미 정지 상태입니다.");
      return;
    }
    setBanReason("");
    setBanDuration("7");
    setBanUntilDate(localDateAfter(7));
    setBanModalOpen(true);
  }

  /*
  선택한 기간을 ban_until(ISO)로 변환한다.
  - 프리셋: 지금부터 N일 뒤
  - 날짜 지정: 선택한 날짜의 로컬 0시에 해제
  - 영구: undefined (미전송)
  */
  function resolveBanUntil(): string | undefined {
    if (banDuration === "permanent") return undefined;
    if (banDuration === "custom")
      return new Date(`${banUntilDate}T00:00:00`).toISOString();
    const days = Number(banDuration);
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  }

  const banFormInvalid =
    !banReason.trim() || (banDuration === "custom" && !banUntilDate);

  async function confirmBan() {
    if (banFormInvalid) return;

    const reason = banReason.trim();
    const ban_until = resolveBanUntil();

    const results = await Promise.allSettled(
      banTargets.map((u) =>
        banMutation.mutateAsync({ userId: u.id, reason, ban_until }),
      ),
    );
    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed > 0) window.alert(`${failed}명 정지 처리에 실패했습니다.`);
    setBanModalOpen(false);
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
              onClick={openBanModal}
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
                <SkeletonRows count={pageSize} />
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
                        title={
                          member.is_banned
                            ? [
                                member.ban_reason,
                                member.ban_until
                                  ? `${formatDate(member.ban_until)}까지`
                                  : "영구 정지",
                              ]
                                .filter(Boolean)
                                .join(" · ")
                            : undefined
                        }
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

      {/* 정지 처리 모달 */}
      {banModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4"
          onClick={() => !banMutation.isPending && setBanModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-gray-900">정지 처리</h2>
            <p className="mt-1 text-sm text-gray-500">
              <span className="font-semibold text-gray-900">
                {banTargets.length}
              </span>
              명을 정지 처리합니다.
            </p>

            <div className="mt-5 flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">
                정지 사유
              </label>
              <textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="정지 사유를 입력하세요."
                rows={3}
                autoFocus
                className={inputClass + " resize-none"}
              />
            </div>

            <div className="mt-4 flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">
                정지 기간
              </label>
              <div className="flex flex-wrap gap-2">
                {BAN_DURATION_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setBanDuration(o.value)}
                    className={`rounded-lg border px-3.5 py-2 text-sm font-medium transition-all ${
                      banDuration === o.value
                        ? "border-gray-900 bg-gray-900 text-white"
                        : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              {banDuration === "custom" && (
                <div className="mt-2 flex flex-col gap-1.5">
                  <input
                    type="date"
                    value={banUntilDate}
                    min={localDateAfter(1)}
                    onChange={(e) => setBanUntilDate(e.target.value)}
                    className={inputClass + " cursor-pointer"}
                  />
                  <p className="text-xs text-gray-400">
                    선택한 날짜 0시에 정지가 해제됩니다.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setBanModalOpen(false)}
                disabled={banMutation.isPending}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              >
                취소
              </button>
              <button
                onClick={confirmBan}
                disabled={banFormInvalid || banMutation.isPending}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-red-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {banMutation.isPending ? "정지 처리 중…" : "정지 처리"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
