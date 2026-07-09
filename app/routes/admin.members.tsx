import { useEffect, useState } from "react";

import {
  useBanUserMutation,
  useUnbanUserMutation,
  useUserListQuery,
} from "@/api/users/requests";
import type { UserSummary } from "@/api/users/types";
import { PLATFORM_OPTIONS } from "@/components/constants";
import { Badge } from "@/components/ui/Badge";
import { Field } from "@/components/ui/Field";
import { FilterCard } from "@/components/ui/FilterCard";
import { formatDate } from "@/components/ui/format";
import { Modal } from "@/components/ui/Modal";
import { Pagination, PAGE_SIZE_OPTIONS } from "@/components/ui/Pagination";
import { ProviderBadge } from "@/components/ui/ProviderBadge";
import { inputClass } from "@/components/ui/styles";
import { DataTable, type Column } from "@/components/table/DataTable";

export function meta() {
  return [{ title: "회원 관리 - IInfoDX Admin" }];
}

const ACTIVE_OPTIONS = ["전체", "활성", "정지"] as const;

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

const pad2 = (n: number) => String(n).padStart(2, "0");

/*
오늘 기준 n일 뒤 날짜를 로컬 기준 YYYY-MM-DD로 반환한다. (date input 값/min용)
*/
function localDateAfter(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatTimeOfDay(d: Date) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/*
"nnnn년 nn월 nn일 HH:mm" 표기. (정지 해제 예정 일시 안내용)
*/
function formatKoreanDateTime(d: Date) {
  return `${d.getFullYear()}년 ${pad2(d.getMonth() + 1)}월 ${pad2(d.getDate())}일 ${formatTimeOfDay(d)}`;
}

/*
로컬 시각 기준 "YYYY-MM-DD HH:mm" 표기. (정지 해제 예정 일시 노출용)
*/
function formatDateTime(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${formatTimeOfDay(d)}`;
}

/*
정지 배지. 마우스를 올리면 정지 사유와 해제 예정일을 툴팁으로 보여준다.
테이블 래퍼(overflow-x-auto)에 잘리지 않도록 fixed 좌표로 띄운다.
*/
function BannedBadge({
  reason,
  until,
}: {
  reason?: string | null;
  until?: string | null;
}) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setPos({ x: rect.left + rect.width / 2, y: rect.top });
      }}
      onMouseLeave={() => setPos(null)}
    >
      <Badge color="red" className="cursor-help">
        정지
      </Badge>
      {pos && (
        <span
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-gray-900 px-3 py-2 text-xs text-white shadow-lg"
          style={{ left: pos.x, top: pos.y - 8 }}
        >
          <span className="block font-semibold">
            {reason?.trim() || "사유 미입력"}
          </span>
          <span className="mt-0.5 block text-gray-300">
            {until ? `${formatDateTime(until)}까지 정지` : "영구 정지"}
          </span>
          <span
            className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-900"
            aria-hidden
          />
        </span>
      )}
    </span>
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
  // 정지 기간 계산의 기준 시각. 팝업을 연 순간으로 고정한다.
  const [banOpenedAt, setBanOpenedAt] = useState(() => new Date());

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
    setBanOpenedAt(new Date());
    setBanModalOpen(true);
  }

  /*
  선택한 기간을 해제 예정 일시로 변환한다. 기준 시각은 팝업을 연 시각(banOpenedAt).
  - 프리셋: 기준 시각에서 N일 뒤
  - 날짜 지정: 선택한 날짜의 기준 시각(시:분:초)에 해제 (날짜 미선택이면 undefined)
  - 영구: undefined
  */
  function resolveBanUntilDate(): Date | undefined {
    if (banDuration === "permanent") return undefined;
    if (banDuration === "custom") {
      if (!banUntilDate) return undefined;
      const d = new Date(`${banUntilDate}T00:00:00`);
      d.setHours(
        banOpenedAt.getHours(),
        banOpenedAt.getMinutes(),
        banOpenedAt.getSeconds(),
        0,
      );
      return d;
    }
    const days = Number(banDuration);
    return new Date(banOpenedAt.getTime() + days * 24 * 60 * 60 * 1000);
  }

  const banReleaseDate = resolveBanUntilDate(); // undefined = 영구 또는 날짜 미선택

  const banFormInvalid =
    !banReason.trim() || (banDuration === "custom" && !banUntilDate);

  async function confirmBan() {
    if (banFormInvalid) return;

    const reason = banReason.trim();
    const ban_until = resolveBanUntilDate()?.toISOString();

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

  const columns: Column<UserSummary>[] = [
    {
      key: "select",
      header: (
        <input
          type="checkbox"
          checked={allSelected}
          onChange={toggleAll}
          className="rounded border-gray-300 accent-gray-900 cursor-pointer"
        />
      ),
      headerClassName: "w-12 px-5 py-3 text-left",
      cellClassName: "w-12 px-5 py-3.5",
      skeleton: <div className="h-4 w-4 rounded bg-gray-100" />,
      cell: (member) => (
        <input
          type="checkbox"
          checked={selectedIds.has(member.id)}
          onChange={() => toggleOne(member.id)}
          className="rounded border-gray-300 accent-gray-900 cursor-pointer"
        />
      ),
    },
    {
      key: "no",
      header: "No",
      cellClassName: "px-4 py-3.5 text-gray-400 tabular-nums",
      skeleton: <div className="h-4 w-6 rounded bg-gray-100" />,
      cell: (_member, idx) => (page - 1) * pageSize + idx + 1,
    },
    {
      key: "email",
      header: "이메일",
      cellClassName: "px-4 py-3.5 font-medium text-gray-900",
      skeleton: <div className="h-4 w-44 rounded bg-gray-100" />,
      cell: (member) => member.email ?? "-",
    },
    {
      key: "provider",
      header: "플랫폼",
      skeleton: <div className="h-5 w-16 rounded-full bg-gray-100" />,
      cell: (member) => <ProviderBadge provider={member.provider} />,
    },
    {
      key: "created",
      header: "가입일",
      cellClassName: "px-4 py-3.5 text-gray-500 tabular-nums",
      skeleton: <div className="h-4 w-20 rounded bg-gray-100" />,
      cell: (member) => formatDate(member.created_at),
    },
    {
      key: "last",
      header: "최근 로그인",
      cellClassName: "px-4 py-3.5 text-gray-500 tabular-nums",
      skeleton: <div className="h-4 w-20 rounded bg-gray-100" />,
      cell: (member) => formatDate(member.last_sign_in_at),
    },
    {
      key: "status",
      header: "활성 여부",
      skeleton: <div className="h-5 w-12 rounded-full bg-gray-100" />,
      cell: (member) =>
        member.is_banned ? (
          <BannedBadge reason={member.ban_reason} until={member.ban_until} />
        ) : (
          <Badge color="green">활성</Badge>
        ),
    },
  ];

  return (
    <div className="p-8">
      <h1 className="text-[2rem] font-semibold text-gray-900 mb-6">
        회원 관리
      </h1>

      {/* 필터 */}
      <FilterCard>
        <Field label="이메일">
          <input
            type="text"
            value={emailFilter}
            onChange={(e) => handleFilterChange(setEmailFilter, e.target.value)}
            placeholder="example@example.com"
            className={inputClass}
          />
        </Field>
        <Field label="플랫폼">
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
        </Field>
        <Field label="활성 여부">
          <select
            value={activeFilter}
            onChange={(e) => handleFilterChange(setActiveFilter, e.target.value)}
            className={inputClass + " cursor-pointer"}
          >
            {ACTIVE_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </Field>
      </FilterCard>

      {/* 테이블 카드 */}
      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(member) => member.id}
        isLoading={isPending}
        isError={isError}
        skeletonRows={pageSize}
        errorMessage="회원 목록을 불러오지 못했습니다."
        rowClassName={(member) =>
          selectedIds.has(member.id) ? "bg-blue-50/40" : ""
        }
        toolbar={
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <p className="text-sm text-gray-500">
                총 <span className="font-semibold text-gray-900">{total}</span>명
                {selectedIds.size > 0 && (
                  <span className="ml-2 text-gray-400">
                    ({selectedIds.size}명 선택됨)
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-xs text-gray-400">
                '정지' 표시에 마우스를 가져다 대면 정지 사유와 해제 예정일을
                확인할 수 있습니다.
              </p>
            </div>
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
        }
        footer={
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={changePage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              changePage(1);
            }}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
          />
        }
      />

      {/* 정지 처리 모달 */}
      {banModalOpen && (
        <Modal
          onClose={() => setBanModalOpen(false)}
          closeDisabled={banMutation.isPending}
          title="정지 처리"
          description={
            <>
              <span className="font-semibold text-gray-900">
                {banTargets.length}
              </span>
              명을 정지 처리합니다.
            </>
          }
          footer={
            <>
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
            </>
          }
        >
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
              <input
                type="date"
                value={banUntilDate}
                min={localDateAfter(1)}
                onChange={(e) => setBanUntilDate(e.target.value)}
                className={inputClass + " mt-2 cursor-pointer"}
              />
            )}
            {banDuration !== "permanent" && banReleaseDate && (
              <p className="text-xs text-gray-400">
                {formatKoreanDateTime(banReleaseDate)}에 정지가 해제됩니다.
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
