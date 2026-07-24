import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  CardDescription,
  CardHeader,
  Field as DSField,
  FieldContent as DSFieldContent,
  FieldDescription,
  FieldLabel as DSFieldLabel,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  ToggleGroup,
  ToggleGroupItem,
} from "@forestlee0513/iinfo-dx-design-system";

import { useMyInfoQuery } from "@/api/auth/requests";
import { AUTH_MEMBER_ROLE } from "@/api/auth/constants";
import { ROLE_LABELS, ROLE_BADGE_VARIANT } from "@/api/auth/roles";
import {
  useUpdateUserRoleMutation,
  useUserListQuery,
} from "@/api/users/requests";
import { PLATFORM_OPTIONS } from "@/api/users/constants";
import type { AuthMemberRole } from "@/api/auth/types";
import type { UserSummary } from "@/api/users/types";
import { Field, RequiredMark } from "@/components/Field";
import { FilterCard } from "@/components/FilterCard";
import { formatDate } from "@/lib/format";
import { Modal } from "@/components/Modal";
import { Pagination, PAGE_SIZE_OPTIONS } from "@/components/Pagination";
import { ProviderBadge } from "@/components/ProviderBadge";
import { DataTable, type Column } from "@/components/table/DataTable";
import { getApiErrorMessage } from "@/lib/api-error";

export function meta() {
  return [{ title: "권한 관리 - IInfoDX Admin" }];
}

/*
역할 변경 모달에서 부여할 수 있는 역할.
SUPER_ADMIN은 API로 부여할 수 없으므로(서버 400) 선택지에서 제외한다.
*/
const ASSIGNABLE_ROLES = [
  AUTH_MEMBER_ROLE.USER,
  AUTH_MEMBER_ROLE.ADMIN,
] as const;

function RoleBadge({ role }: { role: AuthMemberRole }) {
  return <Badge variant={ROLE_BADGE_VARIANT[role]}>{ROLE_LABELS[role]}</Badge>;
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

  const roleMutation = useUpdateUserRoleMutation();

  function handleFilterChange<T extends string>(
    setter: (v: T) => void,
    value: T,
  ) {
    setter(value);
    setPage(1);
  }

  function openRoleModal(user: UserSummary) {
    const currentRole = user.role ?? AUTH_MEMBER_ROLE.USER;
    // 현재 역할이 부여 가능 목록에 없으면(SUPER_ADMIN 등) USER를 기본 선택으로 둔다.
    setSelectedRole(
      (ASSIGNABLE_ROLES as readonly string[]).includes(currentRole)
        ? currentRole
        : AUTH_MEMBER_ROLE.USER,
    );
    setRoleTarget(user);
  }

  const targetCurrentRole = roleTarget
    ? (roleTarget.role ?? AUTH_MEMBER_ROLE.USER)
    : null;

  const roleUnchanged = selectedRole === targetCurrentRole;

  function confirmRoleChange() {
    if (!roleTarget || roleUnchanged) return;

    roleMutation.mutate(
      { userId: roleTarget.id, role: selectedRole },
      {
        onSuccess: () => setRoleTarget(null),
        onError: (error) => {
          window.alert(getApiErrorMessage(error, "역할 변경에 실패했습니다."));
        },
      },
    );
  }

  const columns: Column<UserSummary>[] = [
    {
      key: "no",
      header: "No",
      cellClassName: "text-muted-foreground tabular-nums",
      skeleton: <Skeleton className="h-4 w-6 rounded" />,
      cell: (_user, idx) => (page - 1) * pageSize + idx + 1,
    },
    {
      key: "email",
      header: "이메일",
      cellClassName: "font-medium",
      skeleton: <Skeleton className="h-4 w-44 rounded" />,
      cell: (user) => (
        <>
          {user.email ?? "-"}
          {user.id === me?.id && (
            <span className="ml-2 text-xs font-semibold text-muted-foreground">
              (나)
            </span>
          )}
        </>
      ),
    },
    {
      key: "provider",
      header: "플랫폼",
      skeleton: <Skeleton className="h-5 w-16 rounded-full" />,
      cell: (user) => <ProviderBadge provider={user.provider} />,
    },
    {
      key: "created",
      header: "가입일",
      cellClassName: "text-muted-foreground tabular-nums",
      skeleton: <Skeleton className="h-4 w-20 rounded" />,
      cell: (user) => formatDate(user.created_at),
    },
    {
      key: "role",
      header: "권한",
      skeleton: <Skeleton className="h-5 w-16 rounded-full" />,
      cell: (user) => {
        const role = user.role ?? AUTH_MEMBER_ROLE.USER;
        return <RoleBadge role={role} />;
      },
    },
    {
      key: "manage",
      header: "관리",
      skeleton: <Skeleton className="h-8 w-20 rounded-lg" />,
      cell: (user) => {
        const role = user.role ?? AUTH_MEMBER_ROLE.USER;
        const isSelf = user.id === me?.id;
        // 본인과 최고 관리자는 API가 거부하므로 버튼도 비활성화한다.
        const changeDisabled = isSelf || role === AUTH_MEMBER_ROLE.SUPER_ADMIN;

        return (
          <Button
            variant="outline"
            size="xs"
            onClick={() => openRoleModal(user)}
            disabled={changeDisabled}
            title={
              isSelf
                ? "본인 역할은 변경할 수 없습니다."
                : role === AUTH_MEMBER_ROLE.SUPER_ADMIN
                  ? "최고 관리자 역할은 변경할 수 없습니다."
                  : undefined
            }
          >
            역할 변경
          </Button>
        );
      },
    },
  ];

  return (
    <div className="p-8">
      <h1 className="text-[2rem] font-semibold text-foreground mb-6">
        권한 관리
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
            <CardHeader>
              <CardDescription>
                총{" "}
                <span className="font-semibold text-foreground">{total}</span>명
              </CardDescription>
              <CardDescription>
                최고 관리자 권한은 시스템에서 직접 관리되며, 본인 역할은 변경할
                수 없습니다.
              </CardDescription>
            </CardHeader>
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
      </div>

      {/* 역할 변경 모달 */}
      {roleTarget && (
        <Modal
          onClose={() => setRoleTarget(null)}
          closeDisabled={roleMutation.isPending}
          title="역할 변경"
          description={
            <>
              <span className="font-semibold text-foreground">
                {roleTarget.email ?? roleTarget.id}
              </span>
              님의 역할을 변경합니다.
            </>
          }
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => setRoleTarget(null)}
                disabled={roleMutation.isPending}
              >
                취소
              </Button>
              <Button
                onClick={confirmRoleChange}
                disabled={roleUnchanged || roleMutation.isPending}
              >
                {roleMutation.isPending ? "변경 중…" : "변경"}
              </Button>
            </>
          }
        >
          <DSField orientation="horizontal">
            <DSFieldLabel>현재 역할</DSFieldLabel>
            <DSFieldContent>
              {targetCurrentRole && <RoleBadge role={targetCurrentRole} />}
            </DSFieldContent>
          </DSField>

          <DSField>
            <DSFieldLabel>
              변경할 역할
              <RequiredMark />
            </DSFieldLabel>
            <DSFieldContent>
              <ToggleGroup
                variant="outline"
                value={[selectedRole]}
                onValueChange={(value) => {
                  const next = value[value.length - 1];
                  if (next) setSelectedRole(next as AuthMemberRole);
                }}
              >
                {ASSIGNABLE_ROLES.map((role) => (
                  <ToggleGroupItem key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              {selectedRole === AUTH_MEMBER_ROLE.ADMIN && (
                <FieldDescription>
                  관리자는 어드민 콘솔에 접근할 수 있습니다.
                </FieldDescription>
              )}
            </DSFieldContent>
          </DSField>
        </Modal>
      )}
    </div>
  );
}
