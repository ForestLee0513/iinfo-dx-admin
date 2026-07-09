import { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { useQueries } from "@tanstack/react-query";

import { useMyInfoQuery } from "@/api/auth/requests";
import { AUTH_MEMBER_ROLE } from "@/api/auth/constants";
import {
  userDetailQueryOptions,
  useUpdateUserRoleMutation,
  useUserListQuery,
} from "@/api/users/requests";
import type { AuthMemberRole } from "@/api/auth/types";
import type { UserSummary } from "@/api/users/types";
import { PLATFORM_OPTIONS } from "@/components/constants";
import { Badge, type BadgeColor } from "@/components/ui/Badge";
import { Field } from "@/components/ui/Field";
import { FilterCard } from "@/components/ui/FilterCard";
import { formatDate } from "@/components/ui/format";
import { Modal } from "@/components/ui/Modal";
import { Pagination, PAGE_SIZE_OPTIONS } from "@/components/ui/Pagination";
import { ProviderBadge } from "@/components/ui/ProviderBadge";
import { inputClass } from "@/components/ui/styles";
import { DataTable, type Column } from "@/components/table/DataTable";

export function meta() {
  return [{ title: "권한 관리 - IInfoDX Admin" }];
}

const ROLE_LABELS: Record<AuthMemberRole, string> = {
  USER: "일반 회원",
  ADMIN: "관리자",
  SUPER_ADMIN: "최고 관리자",
};

const ROLE_BADGE_COLOR: Record<AuthMemberRole, BadgeColor> = {
  USER: "gray",
  ADMIN: "blue",
  SUPER_ADMIN: "purple",
};

/*
역할 변경 모달에서 부여할 수 있는 역할.
SUPER_ADMIN은 API로 부여할 수 없으므로(서버 400) 선택지에서 제외한다.
*/
const ASSIGNABLE_ROLES = [
  AUTH_MEMBER_ROLE.USER,
  AUTH_MEMBER_ROLE.ADMIN,
] as const;

/*
서버 오류 응답의 detail 메시지를 추출한다. (예: "자기 자신의 역할은 변경할 수 없습니다.")
*/
function getErrorDetail(error: unknown): string | null {
  if (isAxiosError(error)) {
    const detail = (error.response?.data as { detail?: unknown } | undefined)
      ?.detail;
    if (typeof detail === "string") return detail;
  }
  return null;
}

function RoleBadge({ role }: { role: AuthMemberRole }) {
  return <Badge color={ROLE_BADGE_COLOR[role]}>{ROLE_LABELS[role]}</Badge>;
}

export default function Permissions() {
  const [emailFilter, setEmailFilter] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>("전체");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 역할 변경 모달 대상. null이면 닫힘.
  const [roleTarget, setRoleTarget] = useState<UserSummary | null>(null);
  const [selectedRole, setSelectedRole] = useState<AuthMemberRole>(
    AUTH_MEMBER_ROLE.USER,
  );

  // 이메일 입력은 타이핑마다 요청하지 않도록 300ms 디바운스한다.
  const [debouncedEmail, setDebouncedEmail] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedEmail(emailFilter.trim()), 300);
    return () => clearTimeout(timer);
  }, [emailFilter]);

  const { data: me } = useMyInfoQuery();

  const { data, isPending, isError } = useUserListQuery({
    page,
    per_page: pageSize,
    email: debouncedEmail || undefined,
    provider: platformFilter !== "전체" ? platformFilter : undefined,
  });

  const users = data?.users ?? [];
  const total = data?.total ?? 0;

  /*
  목록 API에는 role이 없어(AdminUserSummary) 화면에 보이는 행만큼
  상세를 병렬 조회해 profile.role을 읽는다. 상세 캐시는 역할 변경 시 무효화된다.
  */
  const roleQueries = useQueries({
    queries: users.map((u) => userDetailQueryOptions(u.id)),
  });
  const roleById = new Map<string, AuthMemberRole | undefined>(
    users.map((u, i) => [u.id, roleQueries[i].data?.profile.role]),
  );

  const roleMutation = useUpdateUserRoleMutation();

  function handleFilterChange<T extends string>(
    setter: (v: T) => void,
    value: T,
  ) {
    setter(value);
    setPage(1);
  }

  function openRoleModal(user: UserSummary) {
    const currentRole = roleById.get(user.id) ?? AUTH_MEMBER_ROLE.USER;
    // 현재 역할이 부여 가능 목록에 없으면(SUPER_ADMIN 등) USER를 기본 선택으로 둔다.
    setSelectedRole(
      (ASSIGNABLE_ROLES as readonly string[]).includes(currentRole)
        ? currentRole
        : AUTH_MEMBER_ROLE.USER,
    );
    setRoleTarget(user);
  }

  const targetCurrentRole = roleTarget
    ? (roleById.get(roleTarget.id) ?? AUTH_MEMBER_ROLE.USER)
    : null;

  const roleUnchanged = selectedRole === targetCurrentRole;

  function confirmRoleChange() {
    if (!roleTarget || roleUnchanged) return;

    roleMutation.mutate(
      { userId: roleTarget.id, role: selectedRole },
      {
        onSuccess: () => setRoleTarget(null),
        onError: (error) => {
          window.alert(getErrorDetail(error) ?? "역할 변경에 실패했습니다.");
        },
      },
    );
  }

  const columns: Column<UserSummary>[] = [
    {
      key: "no",
      header: "No",
      cellClassName: "px-5 py-3.5 text-gray-400 tabular-nums",
      skeleton: <div className="h-4 w-6 rounded bg-gray-100" />,
      cell: (_user, idx) => (page - 1) * pageSize + idx + 1,
    },
    {
      key: "email",
      header: "이메일",
      cellClassName: "px-4 py-3.5 font-medium text-gray-900",
      skeleton: <div className="h-4 w-44 rounded bg-gray-100" />,
      cell: (user) => (
        <>
          {user.email ?? "-"}
          {user.id === me?.id && (
            <span className="ml-2 text-xs font-semibold text-gray-400">
              (나)
            </span>
          )}
        </>
      ),
    },
    {
      key: "provider",
      header: "플랫폼",
      skeleton: <div className="h-5 w-16 rounded-full bg-gray-100" />,
      cell: (user) => <ProviderBadge provider={user.provider} />,
    },
    {
      key: "created",
      header: "가입일",
      cellClassName: "px-4 py-3.5 text-gray-500 tabular-nums",
      skeleton: <div className="h-4 w-20 rounded bg-gray-100" />,
      cell: (user) => formatDate(user.created_at),
    },
    {
      key: "role",
      header: "권한",
      skeleton: <div className="h-5 w-16 rounded-full bg-gray-100" />,
      cell: (user) => {
        const role = roleById.get(user.id);
        return role ? (
          <RoleBadge role={role} />
        ) : (
          <span className="inline-block h-5 w-16 animate-pulse rounded-full bg-gray-100" />
        );
      },
    },
    {
      key: "manage",
      header: "관리",
      skeleton: <div className="h-8 w-20 rounded-lg bg-gray-100" />,
      cell: (user) => {
        const role = roleById.get(user.id);
        const isSelf = user.id === me?.id;
        // 본인과 최고 관리자는 API가 거부하므로 버튼도 비활성화한다.
        const changeDisabled = isSelf || role === AUTH_MEMBER_ROLE.SUPER_ADMIN;

        return (
          <button
            onClick={() => openRoleModal(user)}
            disabled={changeDisabled || !role}
            title={
              isSelf
                ? "본인 역할은 변경할 수 없습니다."
                : role === AUTH_MEMBER_ROLE.SUPER_ADMIN
                  ? "최고 관리자 역할은 변경할 수 없습니다."
                  : undefined
            }
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition-all hover:bg-gray-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            역할 변경
          </button>
        );
      },
    },
  ];

  return (
    <div className="p-8">
      <h1 className="text-[2rem] font-semibold text-gray-900 mb-6">
        권한 관리
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
      </FilterCard>

      {/* 테이블 카드 */}
      <DataTable
        columns={columns}
        data={users}
        rowKey={(user) => user.id}
        isLoading={isPending}
        isError={isError}
        skeletonRows={pageSize}
        errorMessage="회원 목록을 불러오지 못했습니다."
        toolbar={
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <p className="text-sm text-gray-500">
                총 <span className="font-semibold text-gray-900">{total}</span>명
              </p>
              <p className="mt-0.5 text-xs text-gray-400">
                최고 관리자 권한은 시스템에서 직접 관리되며, 본인 역할은 변경할
                수 없습니다.
              </p>
            </div>
          </div>
        }
        footer={
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
          />
        }
      />

      {/* 역할 변경 모달 */}
      {roleTarget && (
        <Modal
          onClose={() => setRoleTarget(null)}
          closeDisabled={roleMutation.isPending}
          title="역할 변경"
          description={
            <>
              <span className="font-semibold text-gray-900">
                {roleTarget.email ?? roleTarget.id}
              </span>
              님의 역할을 변경합니다.
            </>
          }
          footer={
            <>
              <button
                onClick={() => setRoleTarget(null)}
                disabled={roleMutation.isPending}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              >
                취소
              </button>
              <button
                onClick={confirmRoleChange}
                disabled={roleUnchanged || roleMutation.isPending}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-gray-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {roleMutation.isPending ? "변경 중…" : "변경"}
              </button>
            </>
          }
        >
          <div className="mt-5 flex items-center gap-2 text-sm text-gray-600">
            <span>현재 역할:</span>
            {targetCurrentRole && <RoleBadge role={targetCurrentRole} />}
          </div>

          <div className="mt-4 flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              변경할 역할
            </label>
            <div className="flex flex-wrap gap-2">
              {ASSIGNABLE_ROLES.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setSelectedRole(role)}
                  className={`rounded-lg border px-3.5 py-2 text-sm font-medium transition-all ${
                    selectedRole === role
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {ROLE_LABELS[role]}
                </button>
              ))}
            </div>
            {selectedRole === AUTH_MEMBER_ROLE.ADMIN && (
              <p className="text-xs text-gray-400">
                관리자는 어드민 콘솔에 접근할 수 있습니다.
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
