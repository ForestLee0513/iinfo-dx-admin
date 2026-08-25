import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ROLE_BADGE_VARIANT, ROLE_LABELS } from "@/api/auth/roles";
import type { AuthMemberRole } from "@/api/auth/types";
import { DanArenaTable } from "./parts/DanArenaTable";
import { NotesRadarTable } from "./parts/NotesRadarTable";
import type { IidxProfileCardProps } from "./types";

/*
Field(orientation="responsive")는 컨테이너 폭이 28rem을 넘으면 자식에 *:w-auto를
강제해, FieldLabel에 준 고정폭(w-36)이 라벨 텍스트 길이에 따라 다시 auto로
풀려버린다(동일 specificity에서 소스 순서상 field.tsx 쪽이 더 뒤라 이긴다).
라벨 길이 편차가 큰 이 카드에서는 값 열이 들쭉날쭉해지므로 캐스케이드로 이기려
하지 않는 고정 그리드로 대체한다.
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

function IidxProfileSkeleton() {
  return (
    <Card>
      <CardContent>
        <div className="flex flex-col gap-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-4 w-28 rounded" />
              <Skeleton className="h-4 w-40 rounded" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function IidxProfileCard({ profile, isPending }: IidxProfileCardProps) {
  if (isPending) return <IidxProfileSkeleton />;

  if (!profile || !profile.onboarded) {
    return (
      <Card>
        <CardContent>
          <p className="py-12 text-center text-sm text-muted-foreground">
            IIDX 서비스에 가입하지 않은 회원입니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  const serviceRole = profile.service_role as AuthMemberRole;

  return (
    <Card>
      <CardContent>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <InfoRow label="DJ NAME">{profile.dj_name ?? "-"}</InfoRow>
            <InfoRow label="DJ ID">
              <span className="font-mono text-xs text-muted-foreground">
                {profile.dj_id ?? "-"}
              </span>
            </InfoRow>
            <InfoRow label="커뮤니티 닉네임">
              {profile.community_nickname ?? "-"}
            </InfoRow>
            <InfoRow label="플레이 횟수">
              {profile.play_count != null
                ? `${profile.play_count.toLocaleString()}회`
                : "-"}
            </InfoRow>
            <InfoRow label="서비스 내 역할">
              <Badge variant={ROLE_BADGE_VARIANT[serviceRole] ?? "secondary"}>
                {ROLE_LABELS[serviceRole] ?? profile.service_role}
              </Badge>
            </InfoRow>
            <InfoRow label="프로필 공개">
              {profile.is_public ? "공개" : "비공개"}
            </InfoRow>
          </div>

          <DanArenaTable dan={profile.dan} arenaClass={profile.arena_class} />
          <NotesRadarTable notesRadar={profile.notes_radar} />
        </div>
      </CardContent>
    </Card>
  );
}
