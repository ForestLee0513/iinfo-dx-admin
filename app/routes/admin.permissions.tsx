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

export function meta() {
  return [{ title: "권한 관리 - IInfoDX Admin" }];
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

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

const ROLE_LABELS: Record<AuthMemberRole, string> = {
  USER: "일반 회원",
  ADMIN: "관리자",
  SUPER_ADMIN: "최고 관리자",
};

const ROLE_BADGE_CLASS: Record<AuthMemberRole, string> = {
  USER: "bg-gray-100 text-gray-700",
  ADMIN: "bg-blue-50 text-blue-700",
  SUPER_ADMIN: "bg-purple-50 text-purple-700",
};

/*
역할 변경 모달에서 부여할 수 있는 역할.
SUPER_ADMIN은 API로 부여할 수 없으므로(서버 400) 선택지에서 제외한다.
*/
const ASSIGNABLE_ROLES = [
  AUTH_MEMBER_ROLE.USER,
  AUTH_MEMBER_ROLE.ADMIN,
] as const;

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:bg-white focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10";

function formatDate(iso?: string | null) {
  if (!iso) return "-";
  return iso.slice(0, 10);
}

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
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${ROLE_BADGE_CLASS[role]}`}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}

function SkeletonRows({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <tr key={i} className="animate-pulse">
          <td className="px-5 py-3.5">
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
            <div className="h-5 w-16 rounded-full bg-gray-100" />
          </td>
          <td className="px-4 py-3.5">
            <div className="h-8 w-20 rounded-lg bg-gray-100" />
          </td>
        </tr>
      ))}
    </>
  );
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
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

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
          window.alert(
            getErrorDetail(error) ?? "역할 변경에 실패했습니다.",
          );
        },
      },
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-[2rem] font-semibold text-gray-900 mb-6">
        권한 관리
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
        </div>
      </div>

      {/* 테이블 카드 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* 안내 바 */}
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

        {/* 테이블 */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {["No", "이메일", "플랫폼", "가입일", "권한", "관리"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap first:px-5"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isPending ? (
                <SkeletonRows count={pageSize} />
              ) : isError ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-16 text-center text-red-500"
                  >
                    회원 목록을 불러오지 못했습니다.
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-16 text-center text-gray-400"
                  >
                    검색 결과가 없습니다.
                  </td>
                </tr>
              ) : (
                users.map((user, idx) => {
                  const role = roleById.get(user.id);
                  const isSelf = user.id === me?.id;
                  // 본인과 최고 관리자는 API가 거부하므로 버튼도 비활성화한다.
                  const changeDisabled =
                    isSelf || role === AUTH_MEMBER_ROLE.SUPER_ADMIN;

                  return (
                    <tr
                      key={user.id}
                      className="transition-colors hover:bg-gray-50/70"
                    >
                      <td className="px-5 py-3.5 text-gray-400 tabular-nums">
                        {(page - 1) * pageSize + idx + 1}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-gray-900">
                        {user.email ?? "-"}
                        {isSelf && (
                          <span className="ml-2 text-xs font-semibold text-gray-400">
                            (나)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                          {user.provider
                            ? (PROVIDER_LABELS[user.provider] ?? user.provider)
                            : "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-gray-500 tabular-nums">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-4 py-3.5">
                        {role ? (
                          <RoleBadge role={role} />
                        ) : (
                          <span className="inline-block h-5 w-16 animate-pulse rounded-full bg-gray-100" />
                        )}
                      </td>
                      <td className="px-4 py-3.5">
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
                      </td>
                    </tr>
                  );
                })
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
                setPage(1);
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
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="rounded-lg border border-gray-200 w-8 h-8 flex items-center justify-center text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ‹
              </button>
              <span className="px-3 py-1 text-sm font-medium text-gray-700">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="rounded-lg border border-gray-200 w-8 h-8 flex items-center justify-center text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ›
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 역할 변경 모달 */}
      {roleTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4"
          onClick={() => !roleMutation.isPending && setRoleTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-gray-900">역할 변경</h2>
            <p className="mt-1 text-sm text-gray-500">
              <span className="font-semibold text-gray-900">
                {roleTarget.email ?? roleTarget.id}
              </span>
              님의 역할을 변경합니다.
            </p>

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

            <div className="mt-6 flex justify-end gap-2">
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
