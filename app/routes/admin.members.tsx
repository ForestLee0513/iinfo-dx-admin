import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  ButtonGroup,
  CardAction,
  CardDescription,
  CardHeader,
  Checkbox,
  Field as DSField,
  FieldContent as DSFieldContent,
  FieldLabel as DSFieldLabel,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@forestlee0513/iinfo-dx-design-system";

import {
  useBanUserMutation,
  useUnbanUserMutation,
  useUserListQuery,
} from "@/api/users/requests";
import type { UserSummary } from "@/api/users/types";
import { PLATFORM_OPTIONS } from "@/api/users/constants";
import {
  BanDurationPicker,
  localDateAfter,
  resolveBanUntilDate,
  type BanDurationValue,
} from "@/components/BanDurationPicker";
import { Field } from "@/components/Field";
import { FilterCard } from "@/components/FilterCard";
import { getApiErrorMessage } from "@/lib/api-error";
import { formatDate, formatDateTime } from "@/lib/format";
import { Modal } from "@/components/Modal";
import { Pagination, PAGE_SIZE_OPTIONS } from "@/components/Pagination";
import { ProviderBadge } from "@/components/ProviderBadge";
import { DataTable, type Column } from "@/components/table/DataTable";

export function meta() {
  return [{ title: "회원 관리 - IInfoDX Admin" }];
}

const ACTIVE_OPTIONS = ["전체", "활성", "정지"] as const;
const ACTIVE_SELECT_ITEMS = ACTIVE_OPTIONS.map((o) => ({ value: o, label: o }));

/*
정지 배지. 마우스를 올리면 정지 사유와 해제 예정일을 툴팁으로 보여준다.
*/
function BannedBadge({
  reason,
  until,
}: {
  reason?: string | null;
  until?: string | null;
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={<Badge variant="destructive">정지</Badge>} />
      <TooltipContent>
        {reason?.trim() || "사유 미입력"} ·{" "}
        {until ? `${formatDateTime(until)}까지 정지` : "영구 정지"}
      </TooltipContent>
    </Tooltip>
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
  // 서버가 거부한 사유(본인 정지 시도 등)를 모달 하단 경고 라벨로 노출한다.
  const [banError, setBanError] = useState<string | null>(null);

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
  // 함께 선택됐지만 이미 정지 상태라 정지 처리 대상이 아닌 사용자
  const alreadyBannedTargets = selectedUsers.filter((u) => u.is_banned);

  function openBanModal() {
    if (banTargets.length === 0) {
      window.alert("선택한 회원이 모두 이미 정지 상태입니다.");
      return;
    }
    setBanReason("");
    setBanDuration("7");
    setBanUntilDate(localDateAfter(7));
    setBanOpenedAt(new Date());
    setBanError(null);
    setBanModalOpen(true);
  }

  // undefined = 영구 또는 날짜 미선택
  const banReleaseDate = resolveBanUntilDate(
    banDuration,
    banUntilDate,
    banOpenedAt,
  );

  const banFormInvalid =
    !banReason.trim() || (banDuration === "custom" && !banUntilDate);

  async function confirmBan() {
    if (banFormInvalid) return;
    setBanError(null);

    const reason = banReason.trim();
    const ban_until = banReleaseDate?.toISOString();

    const results = await Promise.allSettled(
      banTargets.map((u) =>
        banMutation.mutateAsync({ userId: u.id, reason, ban_until }),
      ),
    );
    // 실패 목록: 이미 정지된 사용자 + 서버가 거부한 사용자를 동일한 형식으로 모은다.
    // (allSettled는 순서를 보존하므로 results[i]를 banTargets[i]와 매칭한다)
    const failures: { user: UserSummary; message: string }[] = [
      ...alreadyBannedTargets.map((user) => ({
        user,
        message: "이미 정지된 사용자입니다.",
      })),
      ...results.flatMap((r, i) =>
        r.status === "rejected"
          ? [{ user: banTargets[i], message: getApiErrorMessage(r.reason) }]
          : [],
      ),
    ];
    if (failures.length > 0) {
      const lines = failures.map(
        ({ user, message }) => `· ${user.email ?? user.id}: ${message}`,
      );
      setBanError(
        [
          `${selectedIds.size}명 중 ${failures.length}명 정지 처리에 실패했습니다.`,
          ...lines,
        ].join("\n"),
      );
      return; // 실패 사유 확인을 위해 모달을 열어 둔다.
    }
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
    // allSettled는 순서를 보존하므로 results[i]를 targets[i]와 매칭한다.
    const failures = results
      .map((r, i) => ({ r, user: targets[i] }))
      .filter((x) => x.r.status === "rejected");
    if (failures.length > 0) {
      const lines = failures.map(
        ({ r, user }) =>
          `· ${user.email ?? user.id}: ${getApiErrorMessage((r as PromiseRejectedResult).reason)}`,
      );
      window.alert(
        [
          `${selectedIds.size}명 중 ${failures.length}명 정지 해제에 실패했습니다.`,
          ...lines,
        ].join("\n"),
      );
    }
    setSelectedIds(new Set());
  }

  const columns: Column<UserSummary>[] = [
    {
      key: "select",
      header: <Checkbox checked={allSelected} onCheckedChange={toggleAll} />,
      headerClassName: "w-12",
      cellClassName: "w-12",
      skeleton: <Skeleton className="h-4 w-4 rounded" />,
      cell: (member) => (
        <Checkbox
          checked={selectedIds.has(member.id)}
          onCheckedChange={() => toggleOne(member.id)}
        />
      ),
    },
    {
      key: "no",
      header: "No",
      cellClassName: "text-muted-foreground tabular-nums",
      skeleton: <Skeleton className="h-4 w-6 rounded" />,
      cell: (_member, idx) => (page - 1) * pageSize + idx + 1,
    },
    {
      key: "email",
      header: "이메일",
      cellClassName: "font-medium",
      skeleton: <Skeleton className="h-4 w-44 rounded" />,
      cell: (member) => (
        <Link to={`/members/${member.id}`} className="hover:underline">
          {member.email ?? "-"}
        </Link>
      ),
    },
    {
      key: "provider",
      header: "플랫폼",
      skeleton: <Skeleton className="h-5 w-16 rounded-full" />,
      cell: (member) => <ProviderBadge provider={member.provider} />,
    },
    {
      key: "created",
      header: "가입일",
      cellClassName: "text-muted-foreground tabular-nums",
      skeleton: <Skeleton className="h-4 w-20 rounded" />,
      cell: (member) => formatDate(member.created_at),
    },
    {
      key: "last",
      header: "최근 로그인",
      cellClassName: "text-muted-foreground tabular-nums",
      skeleton: <Skeleton className="h-4 w-20 rounded" />,
      cell: (member) => formatDate(member.last_sign_in_at),
    },
    {
      key: "status",
      header: "활성 여부",
      skeleton: <Skeleton className="h-5 w-12 rounded-full" />,
      cell: (member) =>
        member.is_banned ? (
          <BannedBadge reason={member.ban_reason} until={member.ban_until} />
        ) : (
          <Badge variant="default">활성</Badge>
        ),
    },
  ];

  return (
    <div className="p-8">
      <h1 className="text-[2rem] font-semibold text-foreground mb-6">
        회원 관리
      </h1>

      <div className="flex flex-col gap-5">
        {/* 필터 */}
        <FilterCard>
          <Field label="이메일">
            <Input
              type="text"
              value={emailFilter}
              onChange={(e) =>
                handleFilterChange(setEmailFilter, e.target.value)
              }
              placeholder="example@example.com"
            />
          </Field>
          <Field label="플랫폼">
            <Select
              value={platformFilter}
              items={PLATFORM_OPTIONS}
              onValueChange={(value) => {
                if (value !== null) handleFilterChange(setPlatformFilter, value);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLATFORM_OPTIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="활성 여부">
            <Select
              value={activeFilter}
              items={ACTIVE_SELECT_ITEMS}
              onValueChange={(value) => {
                if (value !== null) handleFilterChange(setActiveFilter, value);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTIVE_OPTIONS.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            selectedIds.has(member.id) ? "bg-accent/40" : ""
          }
          toolbar={
            <CardHeader>
              <CardDescription>
                총{" "}
                <span className="font-semibold text-foreground">{total}</span>명
                {selectedIds.size > 0 && (
                  <span className="ml-2">({selectedIds.size}명 선택됨)</span>
                )}
              </CardDescription>
              <CardDescription>
                '정지' 표시에 마우스를 가져다 대면 정지 사유와 해제 예정일을
                확인할 수 있습니다.
              </CardDescription>
              <CardAction>
                <ButtonGroup>
                  <Button
                    variant="destructive"
                    onClick={openBanModal}
                    disabled={selectedIds.size === 0 || isMutating}
                  >
                    {banMutation.isPending ? "정지 처리 중…" : "정지 처리"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleUnban}
                    disabled={selectedIds.size === 0 || isMutating}
                  >
                    {unbanMutation.isPending ? "정지 해제 중…" : "정지 해제"}
                  </Button>
                </ButtonGroup>
              </CardAction>
            </CardHeader>
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
      </div>

      {/* 정지 처리 모달 */}
      {banModalOpen && (
        <Modal
          onClose={() => setBanModalOpen(false)}
          closeDisabled={banMutation.isPending}
          title="정지 처리"
          description={
            <>
              <span className="font-semibold text-foreground">
                {banTargets.length}
              </span>
              명을 정지 처리합니다.
            </>
          }
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => setBanModalOpen(false)}
                disabled={banMutation.isPending}
              >
                취소
              </Button>
              <Button
                variant="destructive"
                onClick={confirmBan}
                disabled={banFormInvalid || banMutation.isPending}
              >
                {banMutation.isPending ? "정지 처리 중…" : "정지 처리"}
              </Button>
            </>
          }
        >
          <DSField>
            <DSFieldLabel>정지 사유</DSFieldLabel>
            <DSFieldContent>
              <Textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="정지 사유를 입력하세요."
                rows={3}
                autoFocus
              />
            </DSFieldContent>
          </DSField>

          <BanDurationPicker
            duration={banDuration}
            onDurationChange={setBanDuration}
            untilDate={banUntilDate}
            onUntilDateChange={setBanUntilDate}
            minDate={localDateAfter(1)}
            releaseDate={banReleaseDate}
          />

          {banError && (
            <Alert variant="destructive" className="whitespace-pre-wrap">
              <AlertDescription>{banError}</AlertDescription>
            </Alert>
          )}
        </Modal>
      )}
    </div>
  );
}
