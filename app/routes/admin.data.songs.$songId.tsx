import { Link, useParams } from "react-router";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { useSongDetailQuery } from "@/api/iidx/catalog/requests";
import type { ChartSummary } from "@/api/iidx/catalog/types";
import { DataTable, type Column } from "@/components/table/DataTable";

export function meta() {
  return [{ title: "곡 상세 - IInfoDX Admin" }];
}

/*
아케이드 버전 수록 여부 여부 배지. admin.data.tsx의 곡 목록과 동일한 표시 규칙을 이 페이지에서도 쓴다.
*/
function InAcBadge({ inAc }: { inAc: boolean }) {
  return (
    <Badge variant={inAc ? "default" : "outline"}>
      {inAc ? "수록" : "미수록"}
    </Badge>
  );
}

function MetaRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <dt className="w-20 flex-shrink-0 text-muted-foreground">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}

const chartColumns: Column<ChartSummary>[] = [
  { key: "play_style", header: "스타일", cell: (c) => c.play_style },
  { key: "difficulty", header: "난이도", cell: (c) => c.difficulty },
  {
    key: "level",
    header: "레벨",
    cellClassName: "tabular-nums",
    cell: (c) => c.level ?? "-",
  },
  {
    key: "notes",
    header: "노트 수",
    cellClassName: "text-muted-foreground tabular-nums",
    cell: (c) => c.notes ?? "-",
  },
  {
    key: "in_ac",
    header: "아케이드 버전 수록 여부",
    cell: (c) => <InAcBadge inAc={c.in_ac} />,
  },
];

function SongDetailSkeleton() {
  return (
    <div className="flex flex-col gap-5 p-8 max-w-4xl">
      <Skeleton className="h-4 w-16 rounded" />
      <Skeleton className="h-8 w-64 rounded" />
      <Card>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex gap-2">
                <Skeleton className="h-4 w-16 rounded" />
                <Skeleton className="h-4 w-24 rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Skeleton className="h-48 rounded" />
    </div>
  );
}

/*
곡 1개의 메타 정보 + 채보 목록을 보여주는 상세 페이지. 목록에서 곡 제목을
클릭하면 이 페이지로 이동한다(이전에는 모달로 띄웠다).
*/
export default function SongDetail() {
  const { songId } = useParams<{ songId: string }>();
  const { data, isPending, isError } = useSongDetailQuery(songId!);

  if (isPending) return <SongDetailSkeleton />;

  if (isError || !data) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertDescription>곡 정보를 불러오지 못했습니다.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const subtitle = [data.artist, data.genre].filter(Boolean).join(" · ");

  return (
    <div className="p-8 max-w-4xl">
      <Link
        to="/data"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        ← 목록
      </Link>

      <h1 className="text-[2rem] font-semibold text-foreground break-all mb-1">
        {data.title}
      </h1>
      {subtitle && (
        <p className="text-sm text-muted-foreground mb-6">{subtitle}</p>
      )}

      <div className="flex flex-col gap-5">
        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <MetaRow label="버전">
                {data.version_name ?? data.version ?? "-"}
              </MetaRow>
              <MetaRow label="BPM">{data.bpm ?? "-"}</MetaRow>
              <MetaRow label="시리즈">{data.series ?? "-"}</MetaRow>
              <MetaRow label="아케이드 버전 수록 여부">
                <InAcBadge inAc={data.in_ac} />
              </MetaRow>
            </dl>
          </CardContent>
        </Card>

        <DataTable
          columns={chartColumns}
          data={data.charts}
          rowKey={(c) => `${c.play_style}-${c.difficulty}`}
          emptyMessage="채보 정보가 없습니다."
          toolbar={
            <CardHeader>
              <CardTitle>채보 ({data.charts.length})</CardTitle>
            </CardHeader>
          }
        />
      </div>
    </div>
  );
}
