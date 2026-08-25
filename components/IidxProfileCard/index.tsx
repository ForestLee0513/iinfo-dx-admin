import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { ROLE_BADGE_VARIANT, ROLE_LABELS } from "@/api/auth/roles";
import type { AuthMemberRole } from "@/api/auth/types";
import { DanArenaTable } from "./parts/DanArenaTable";
import { NotesRadarTable } from "./parts/NotesRadarTable";
import type { IidxProfileCardProps } from "./types";

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Field orientation="responsive">
      <FieldLabel className="w-36 flex-shrink-0">{label}</FieldLabel>
      <FieldContent className="text-sm">{children}</FieldContent>
    </Field>
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
          <FieldGroup>
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
          </FieldGroup>

          <DanArenaTable dan={profile.dan} arenaClass={profile.arena_class} />
          <NotesRadarTable notesRadar={profile.notes_radar} />
        </div>
      </CardContent>
    </Card>
  );
}
