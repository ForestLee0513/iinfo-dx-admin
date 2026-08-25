import { useState } from "react";
import { Link, useParams } from "react-router";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

import {
  useBanUserMutation,
  useUnbanUserMutation,
  useUpdateUserRoleMutation,
  useUserBansQuery,
  useUserDetailQuery,
} from "@/api/users/requests";
import { useUserIidxProfileQuery } from "@/api/iidx/profile/requests";
import type { AuthMemberRole } from "@/api/auth/types";
import { AUTH_MEMBER_ROLE } from "@/api/auth/constants";
import { ROLE_LABELS } from "@/api/auth/roles";
import { useMyInfoQuery } from "@/api/auth/requests";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  BanDurationPicker,
  localDateAfter,
  resolveBanUntilDate,
  type BanDurationValue,
} from "@/components/BanDurationPicker";
import { RequiredMark } from "@/components/Field";
import { IidxProfileCard } from "@/components/IidxProfileCard";
import { Modal } from "@/components/Modal";
import { ProviderBadge } from "@/components/ProviderBadge";
import { formatDate, formatDateTime } from "@/lib/format";

export function meta() {
  return [{ title: "회원 상세 - IInfoDX Admin" }];
}

const ASSIGNABLE_ROLES: AuthMemberRole[] = [
  AUTH_MEMBER_ROLE.USER,
  AUTH_MEMBER_ROLE.ADMIN,
];

/*
Field(orientation="responsive")는 컨테이너 폭이 28rem을 넘으면 자식에 *:w-auto를
강제해, FieldLabel에 준 고정폭(w-36)이 라벨 텍스트 길이에 따라 다시 auto로
풀려버린다(동일 specificity에서 소스 순서상 field.tsx 쪽이 더 뒤라 이긴다).
캐스케이드로 이기려 하지 않는 고정 그리드로 대체한다.
*/
function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[9rem_1fr] items-start gap-3">
      <span className="text-sm leading-none font-medium">{label}</span>
      <div className="text-sm">{children}</div>
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
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-5 p-8 max-w-4xl">
      <Skeleton className="h-4 w-20 rounded" />
      <Skeleton className="h-8 w-64 rounded" />
      <Card>
        <CardContent>
          <div className="flex flex-col gap-4">
            <Skeleton className="h-4 w-24 rounded" />
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-4 w-28 rounded" />
                <Skeleton className="h-4 w-40 rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <div className="flex flex-col gap-4">
            <Skeleton className="h-4 w-24 rounded" />
            <div className="flex gap-4">
              <Skeleton className="h-4 w-28 rounded" />
              <Skeleton className="h-4 w-20 rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function MemberDetail() {
  const { userId } = useParams<{ userId: string }>();

  const { data: detail, isPending, isError } = useUserDetailQuery(userId!);
  const { data: bansData, isPending: bansPending } = useUserBansQuery(userId!);
  const { data: me } = useMyInfoQuery();
  const { data: iidxProfile, isPending: iidxProfilePending } =
    useUserIidxProfileQuery(userId!);

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

  const banReleaseDate = resolveBanUntilDate(
    banDuration,
    banUntilDate,
    banOpenedAt,
  );
  const banFormInvalid =
    !banReason.trim() || (banDuration === "custom" && !banUntilDate);

  async function confirmBan() {
    if (banFormInvalid || !detail) return;
    setBanError(null);
    try {
      await banMutation.mutateAsync({
        userId: detail.id,
        reason: banReason.trim(),
        ban_until: banReleaseDate?.toISOString(),
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
      <div className="p-8">
        <Alert variant="destructive">
          <AlertDescription>회원 정보를 불러오지 못했습니다.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const currentRole = (detail.profile.role ??
    AUTH_MEMBER_ROLE.USER) as AuthMemberRole;

  return (
    <div className="p-8 max-w-4xl">
      {/* 뒤로가기 */}
      <Link
        to="/members"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        ← 회원 목록
      </Link>

      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-[2rem] font-semibold text-foreground break-all">
          {detail.email ?? "(이메일 없음)"}
        </h1>
        {detail.is_banned ? (
          <Badge variant="destructive">정지</Badge>
        ) : (
          <Badge variant="default">활성</Badge>
        )}
      </div>

      <div className="flex flex-col gap-5">
        {/* 기본 정보 */}
        <SectionCard title="기본 정보">
          <div className="flex flex-col gap-4">
            <InfoRow label="회원 ID">
              <span className="font-mono text-xs text-muted-foreground">
                {detail.id}
              </span>
            </InfoRow>
            <InfoRow label="플랫폼">
              <ProviderBadge provider={detail.provider} />
            </InfoRow>
            <InfoRow label="이메일">{detail.email ?? "-"}</InfoRow>
            <InfoRow label="가입일">{formatDate(detail.created_at)}</InfoRow>
            <InfoRow label="최근 로그인">
              {formatDate(detail.last_sign_in_at)}
            </InfoRow>
          </div>
        </SectionCard>

        {/* 현재 정지 정보 */}
        {detail.is_banned && detail.active_ban && (
          <SectionCard title="현재 정지 정보">
            <div className="flex flex-col gap-4">
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
                <span className="font-mono text-xs text-muted-foreground">
                  {detail.active_ban.banned_by}
                </span>
              </InfoRow>
              <InfoRow label="정지 처리일">
                {formatDateTime(detail.active_ban.banned_at)}
              </InfoRow>
            </div>
          </SectionCard>
        )}

        {/* 정지 이력 */}
        <Card>
          <CardHeader>
            <CardTitle>정지 이력</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  {[
                    "No",
                    "사유",
                    "정지 처리자",
                    "정지일",
                    "해제 예정일",
                    "해제일",
                    "해제 처리자",
                  ].map((h) => (
                    <TableHead key={h}>{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {bansPending ? (
                  Array.from({ length: 3 }, (_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }, (_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-16 rounded" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : bans.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-12 text-center text-muted-foreground"
                    >
                      정지 이력이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  bans.map((ban, idx) => (
                    <TableRow key={ban.id}>
                      <TableCell className="text-muted-foreground tabular-nums">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {ban.reason}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {ban.banned_by}
                      </TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">
                        {formatDateTime(ban.banned_at)}
                      </TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">
                        {ban.ban_until ? formatDateTime(ban.ban_until) : "영구"}
                      </TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">
                        {ban.lifted_at ? formatDateTime(ban.lifted_at) : "-"}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {ban.lifted_by ?? "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* 액션 */}
        <div className="flex flex-wrap gap-2">
          {detail.is_banned ? (
            <Button
              variant="outline"
              onClick={handleUnban}
              disabled={isMutating}
            >
              {unbanMutation.isPending ? "정지 해제 중…" : "정지 해제"}
            </Button>
          ) : (
            <Button
              variant="destructive"
              onClick={openBanModal}
              disabled={isMutating}
            >
              {banMutation.isPending ? "정지 처리 중…" : "정지 처리"}
            </Button>
          )}
          {isSuperAdmin && (
            <Button
              variant="outline"
              onClick={openRoleModal}
              disabled={isMutating}
            >
              역할 변경
            </Button>
          )}
        </div>

        {/* 게임별 프로필 — 서비스가 실제로 열린 게임만 탭에 노출한다(IIDX 외 게임은 미개발) */}
        <Tabs defaultValue="iidx">
          <TabsList>
            <TabsTrigger value="iidx">IIDX</TabsTrigger>
          </TabsList>
          <TabsContent value="iidx">
            <IidxProfileCard profile={iidxProfile} isPending={iidxProfilePending} />
          </TabsContent>
        </Tabs>
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
          <Field>
            <FieldLabel>
              정지 사유
              <RequiredMark />
            </FieldLabel>
            <FieldContent>
              <Textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="정지 사유를 입력하세요."
                rows={3}
                autoFocus
              />
            </FieldContent>
          </Field>

          <BanDurationPicker
            duration={banDuration}
            onDurationChange={setBanDuration}
            untilDate={banUntilDate}
            onUntilDateChange={setBanUntilDate}
            minDate={localDateAfter(1)}
            releaseDate={banReleaseDate}
            required
          />

          {banError && (
            <Alert variant="destructive" className="whitespace-pre-wrap">
              <AlertDescription>{banError}</AlertDescription>
            </Alert>
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
              <Button
                variant="outline"
                onClick={() => setRoleModalOpen(false)}
                disabled={roleMutation.isPending}
              >
                취소
              </Button>
              <Button
                onClick={confirmRoleChange}
                disabled={
                  roleMutation.isPending || selectedRole === currentRole
                }
              >
                {roleMutation.isPending ? "변경 중…" : "변경"}
              </Button>
            </>
          }
        >
          <RadioGroup
            value={selectedRole}
            onValueChange={(value) => setSelectedRole(value as AuthMemberRole)}
          >
            {ASSIGNABLE_ROLES.map((role) => (
              <Label key={role}>
                <RadioGroupItem value={role} />
                {ROLE_LABELS[role]}
              </Label>
            ))}
          </RadioGroup>

          {roleError && (
            <Alert variant="destructive" className="whitespace-pre-wrap">
              <AlertDescription>{roleError}</AlertDescription>
            </Alert>
          )}
        </Modal>
      )}
    </div>
  );
}
