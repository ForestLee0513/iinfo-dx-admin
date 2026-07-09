import { useState } from "react";
import { Link, useParams } from "react-router";

import {
  useBanUserMutation,
  useUnbanUserMutation,
  useUpdateUserRoleMutation,
  useUserBansQuery,
  useUserDetailQuery,
} from "@/api/users/requests";
import type { AuthMemberRole } from "@/api/auth/types";
import { AUTH_MEMBER_ROLE } from "@/api/auth/constants";
import { useMyInfoQuery } from "@/api/auth/requests";
import { getApiErrorMessage } from "@/lib/api-error";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { ProviderBadge } from "@/components/ui/ProviderBadge";
import { formatDate } from "@/components/ui/format";
import { inputClass } from "@/components/ui/styles";

export function meta() {
  return [{ title: "회원 상세 - IInfoDX Admin" }];
}

const BAN_DURATION_OPTIONS = [
  { value: "1", label: "1일" },
  { value: "3", label: "3일" },
  { value: "7", label: "7일" },
  { value: "30", label: "30일" },
  { value: "custom", label: "날짜 지정" },
  { value: "permanent", label: "영구" },
] as const;

type BanDurationValue = (typeof BAN_DURATION_OPTIONS)[number]["value"];

const ROLE_LABELS: Record<AuthMemberRole, string> = {
  USER: "일반 회원",
  ADMIN: "관리자",
  SUPER_ADMIN: "최고 관리자",
};

const ROLE_BADGE_COLOR: Record<AuthMemberRole, "gray" | "blue" | "purple"> = {
  USER: "gray",
  ADMIN: "blue",
  SUPER_ADMIN: "purple",
};

const ASSIGNABLE_ROLES: AuthMemberRole[] = [
  AUTH_MEMBER_ROLE.USER,
  AUTH_MEMBER_ROLE.ADMIN,
];

const pad2 = (n: number) => String(n).padStart(2, "0");

function localDateAfter(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatTimeOfDay(d: Date) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function formatKoreanDateTime(d: Date) {
  return `${d.getFullYear()}년 ${pad2(d.getMonth() + 1)}월 ${pad2(d.getDate())}일 ${formatTimeOfDay(d)}`;
}

function formatDateTime(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${formatTimeOfDay(d)}`;
}

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-0">
      <dt className="w-36 flex-shrink-0 text-sm font-medium text-gray-500">
        {label}
      </dt>
      <dd className="text-sm text-gray-900">{children}</dd>
    </div>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
      <h2 className="text-base font-semibold text-gray-900 mb-4">{title}</h2>
      {children}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="p-8 max-w-4xl animate-pulse">
      <div className="h-4 w-20 rounded bg-gray-200 mb-6" />
      <div className="h-8 w-64 rounded bg-gray-200 mb-8" />
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-5 space-y-4">
        <div className="h-4 w-24 rounded bg-gray-200" />
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex gap-4">
            <div className="h-4 w-28 rounded bg-gray-100" />
            <div className="h-4 w-40 rounded bg-gray-100" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-5 space-y-4">
        <div className="h-4 w-24 rounded bg-gray-200" />
        <div className="flex gap-4">
          <div className="h-4 w-28 rounded bg-gray-100" />
          <div className="h-4 w-20 rounded bg-gray-100" />
        </div>
      </div>
    </div>
  );
}

export default function MemberDetail() {
  const { userId } = useParams<{ userId: string }>();

  const { data: detail, isPending, isError } = useUserDetailQuery(userId!);
  const { data: bansData, isPending: bansPending } = useUserBansQuery(userId!);
  const { data: me } = useMyInfoQuery();

  const [banModalOpen, setBanModalOpen] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [banDuration, setBanDuration] = useState<BanDurationValue>("7");
  const [banUntilDate, setBanUntilDate] = useState("");
  const [banOpenedAt, setBanOpenedAt] = useState(() => new Date());
  // 서버가 거부한 사유(본인 정지 시도 등)를 모달 하단 경고 라벨로 노출한다.
  const [banError, setBanError] = useState<string | null>(null);

  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<AuthMemberRole>(
    AUTH_MEMBER_ROLE.USER,
  );
  const [roleError, setRoleError] = useState<string | null>(null);

  const banMutation = useBanUserMutation();
  const unbanMutation = useUnbanUserMutation();
  const roleMutation = useUpdateUserRoleMutation();

  const isSuperAdmin = me?.app_role === AUTH_MEMBER_ROLE.SUPER_ADMIN;
  const isMutating =
    banMutation.isPending || unbanMutation.isPending || roleMutation.isPending;

  const bans = bansData?.records ?? [];

  function openBanModal() {
    setBanReason("");
    setBanDuration("7");
    setBanUntilDate(localDateAfter(7));
    setBanOpenedAt(new Date());
    setBanError(null);
    setBanModalOpen(true);
  }

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

  const banReleaseDate = resolveBanUntilDate();
  const banFormInvalid =
    !banReason.trim() || (banDuration === "custom" && !banUntilDate);

  async function confirmBan() {
    if (banFormInvalid || !detail) return;
    setBanError(null);
    try {
      await banMutation.mutateAsync({
        userId: detail.id,
        reason: banReason.trim(),
        ban_until: resolveBanUntilDate()?.toISOString(),
      });
      setBanModalOpen(false);
    } catch (e) {
      // 본인 정지 시도 등 서버가 거부한 사유를 모달에 그대로 노출한다.
      setBanError(getApiErrorMessage(e, "정지 처리에 실패했습니다."));
    }
  }

  async function handleUnban() {
    if (!detail) return;
    if (!window.confirm("이 회원의 정지를 해제할까요?")) return;
    try {
      await unbanMutation.mutateAsync(detail.id);
    } catch (e) {
      window.alert(getApiErrorMessage(e, "정지 해제에 실패했습니다."));
    }
  }

  function openRoleModal() {
    setSelectedRole(
      (detail?.profile.role ?? AUTH_MEMBER_ROLE.USER) as AuthMemberRole,
    );
    setRoleError(null);
    setRoleModalOpen(true);
  }

  async function confirmRoleChange() {
    if (!detail) return;
    setRoleError(null);
    try {
      await roleMutation.mutateAsync({ userId: detail.id, role: selectedRole });
      setRoleModalOpen(false);
    } catch (e) {
      // SUPER_ADMIN 부여/본인 역할 변경 등 서버 거부 사유를 모달에 노출한다.
      setRoleError(getApiErrorMessage(e, "역할 변경에 실패했습니다."));
    }
  }

  if (isPending) return <DetailSkeleton />;

  if (isError || !detail) {
    return (
      <div className="p-8 text-sm text-red-500">
        회원 정보를 불러오지 못했습니다.
      </div>
    );
  }

  const currentRole = (detail.profile.role ?? AUTH_MEMBER_ROLE.USER) as AuthMemberRole;

  return (
    <div className="p-8 max-w-4xl">
      {/* 뒤로가기 */}
      <Link
        to="/members"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-6"
      >
        ← 회원 목록
      </Link>

      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-[2rem] font-semibold text-gray-900 break-all">
          {detail.email ?? "(이메일 없음)"}
        </h1>
        {detail.is_banned ? (
          <Badge color="red">정지</Badge>
        ) : (
          <Badge color="green">활성</Badge>
        )}
      </div>

      {/* 기본 정보 */}
      <SectionCard title="기본 정보">
        <dl className="flex flex-col gap-3.5">
          <InfoRow label="회원 ID">
            <span className="font-mono text-xs text-gray-500">{detail.id}</span>
          </InfoRow>
          <InfoRow label="이메일">{detail.email ?? "-"}</InfoRow>
          <InfoRow label="플랫폼">
            <ProviderBadge provider={detail.provider} />
          </InfoRow>
          <InfoRow label="가입일">{formatDate(detail.created_at)}</InfoRow>
          <InfoRow label="최근 로그인">
            {formatDate(detail.last_sign_in_at)}
          </InfoRow>
        </dl>
      </SectionCard>

      {/* 프로필 */}
      <SectionCard title="프로필">
        <dl className="flex flex-col gap-3.5">
          <InfoRow label="역할">
            <Badge color={ROLE_BADGE_COLOR[currentRole]}>
              {ROLE_LABELS[currentRole]}
            </Badge>
          </InfoRow>
          <InfoRow label="프로필 공개">
            {detail.profile.is_public === false ? "비공개" : "공개"}
          </InfoRow>
          {detail.profile.updated_at && (
            <InfoRow label="프로필 수정일">
              {formatDate(detail.profile.updated_at)}
            </InfoRow>
          )}
        </dl>
      </SectionCard>

      {/* 현재 정지 정보 */}
      {detail.is_banned && detail.active_ban && (
        <SectionCard title="현재 정지 정보">
          <dl className="flex flex-col gap-3.5">
            <InfoRow label="정지 사유">
              <span className="whitespace-pre-wrap">
                {detail.active_ban.reason || "-"}
              </span>
            </InfoRow>
            <InfoRow label="해제 예정일">
              {detail.active_ban.ban_until
                ? formatDateTime(detail.active_ban.ban_until)
                : "영구 정지"}
            </InfoRow>
            <InfoRow label="정지 처리자">
              <span className="font-mono text-xs text-gray-500">
                {detail.active_ban.banned_by}
              </span>
            </InfoRow>
            <InfoRow label="정지 처리일">
              {formatDateTime(detail.active_ban.banned_at)}
            </InfoRow>
          </dl>
        </SectionCard>
      )}

      {/* 액션 */}
      <div className="flex flex-wrap gap-2 mb-5">
        {detail.is_banned ? (
          <button
            onClick={handleUnban}
            disabled={isMutating}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {unbanMutation.isPending ? "정지 해제 중…" : "정지 해제"}
          </button>
        ) : (
          <button
            onClick={openBanModal}
            disabled={isMutating}
            className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-red-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {banMutation.isPending ? "정지 처리 중…" : "정지 처리"}
          </button>
        )}
        {isSuperAdmin && (
          <button
            onClick={openRoleModal}
            disabled={isMutating}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            역할 변경
          </button>
        )}
      </div>

      {/* 정지 이력 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">정지 이력</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {[
                  "No",
                  "사유",
                  "정지 처리자",
                  "정지일",
                  "해제 예정일",
                  "해제일",
                  "해제 처리자",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap first:px-5"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {bansPending ? (
                Array.from({ length: 3 }, (_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 7 }, (_, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div className="h-4 w-16 rounded bg-gray-100" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : bans.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-gray-400"
                  >
                    정지 이력이 없습니다.
                  </td>
                </tr>
              ) : (
                bans.map((ban, idx) => (
                  <tr
                    key={ban.id}
                    className="transition-colors hover:bg-gray-50/70"
                  >
                    <td className="px-5 py-3.5 text-gray-400 tabular-nums">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3.5 max-w-xs truncate text-gray-900">
                      {ban.reason}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-gray-500 whitespace-nowrap">
                      {ban.banned_by}
                    </td>
                    <td className="px-4 py-3.5 text-gray-500 tabular-nums whitespace-nowrap">
                      {formatDateTime(ban.banned_at)}
                    </td>
                    <td className="px-4 py-3.5 text-gray-500 tabular-nums whitespace-nowrap">
                      {ban.ban_until ? formatDateTime(ban.ban_until) : "영구"}
                    </td>
                    <td className="px-4 py-3.5 text-gray-500 tabular-nums whitespace-nowrap">
                      {ban.lifted_at ? formatDateTime(ban.lifted_at) : "-"}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-gray-500 whitespace-nowrap">
                      {ban.lifted_by ?? "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 정지 처리 모달 */}
      {banModalOpen && (
        <Modal
          onClose={() => setBanModalOpen(false)}
          closeDisabled={banMutation.isPending}
          title="정지 처리"
          description={`${detail.email ?? "이 회원"}을 정지 처리합니다.`}
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

          {banError && (
            <p className="mt-4 whitespace-pre-wrap rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {banError}
            </p>
          )}
        </Modal>
      )}

      {/* 역할 변경 모달 */}
      {roleModalOpen && (
        <Modal
          onClose={() => setRoleModalOpen(false)}
          closeDisabled={roleMutation.isPending}
          title="역할 변경"
          description={`${detail.email ?? "이 회원"}의 역할을 변경합니다.`}
          footer={
            <>
              <button
                onClick={() => setRoleModalOpen(false)}
                disabled={roleMutation.isPending}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              >
                취소
              </button>
              <button
                onClick={confirmRoleChange}
                disabled={
                  roleMutation.isPending || selectedRole === currentRole
                }
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-gray-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {roleMutation.isPending ? "변경 중…" : "변경"}
              </button>
            </>
          }
        >
          <div className="mt-5 flex flex-col gap-2">
            {ASSIGNABLE_ROLES.map((role) => (
              <label
                key={role}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-all ${
                  selectedRole === role
                    ? "border-gray-900 bg-gray-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value={role}
                  checked={selectedRole === role}
                  onChange={() => setSelectedRole(role)}
                  className="accent-gray-900"
                />
                <span className="flex flex-col">
                  <span className="text-sm font-medium text-gray-900">
                    {ROLE_LABELS[role]}
                  </span>
                </span>
              </label>
            ))}
          </div>

          {roleError && (
            <p className="mt-4 whitespace-pre-wrap rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {roleError}
            </p>
          )}
        </Modal>
      )}
    </div>
  );
}
