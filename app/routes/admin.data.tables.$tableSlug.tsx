import { Link, useParams } from "react-router";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { useTableDetailQuery } from "@/api/iidx/catalog/requests";
import type { DifficultyEntry } from "@/api/iidx/catalog/types";
import { DataTable, type Column } from "@/components/table/DataTable";

export function meta() {
  return [{ title: "난이도표 상세 - IInfoDX Admin" }];
}

const entryColumns: Column<DifficultyEntry>[] = [
  {
    key: "title",
    header: "곡명",
    cellClassName: "font-medium",
    cell: (entry) => entry.title,
  },
  {
    key: "series",
    header: "시리즈",
    cellClassName: "text-muted-foreground",
    cell: (entry) => entry.series ?? "-",
  },
  { key: "play_style", header: "스타일", cell: (entry) => entry.play_style },
  { key: "difficulty", header: "난이도", cell: (entry) => entry.difficulty },
  {
    key: "rating",
    header: "등급/레벨",
    cellClassName: "tabular-nums",
    cell: (entry) => entry.grade ?? entry.level ?? entry.rating ?? "-",
  },
  {
    key: "table_type",
    header: "난이도 분류",
    cellClassName: "text-muted-foreground",
    cell: (entry) => entry.table_type ?? "-",
  },
];

function TableDetailSkeleton() {
  return (
    <div className="flex flex-col gap-5 p-8 max-w-5xl">
      <Skeleton className="h-4 w-16 rounded" />
      <Skeleton className="h-8 w-64 rounded" />
      <Skeleton className="h-4 w-48 rounded" />
      <Skeleton className="h-64 rounded" />
    </div>
  );
}

/*
난이도표 1개의 메타 정보 + 엔트리(표에 속한 곡) 전체를 보여주는 상세 페이지.
목록에서 표 이름을 클릭하면 이 페이지로 이동한다(이전에는 모달로 띄웠다).
*/
export default function TableDetail() {
  const { tableSlug } = useParams<{ tableSlug: string }>();
  const { data, isPending, isError } = useTableDetailQuery(tableSlug!);

  if (isPending) return <TableDetailSkeleton />;

  if (isError || !data) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertDescription>표 정보를 불러오지 못했습니다.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const entries = data.difficulty_entries;

  return (
    <div className="p-8 max-w-5xl">
      <Link
        to="/data"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        ← 목록
      </Link>

      <h1 className="text-[2rem] font-semibold text-foreground break-all mb-1">
        {data.name}
      </h1>
      <p className="text-sm text-muted-foreground mb-6">
        {data.source} · {data.play_style} · {data.rating_type}
      </p>

      <DataTable
        columns={entryColumns}
        data={entries}
        rowKey={(entry) => String(entry.id)}
        emptyMessage="표에 속한 곡이 없습니다."
        toolbar={
          <CardHeader>
            <CardTitle>엔트리 ({entries.length})</CardTitle>
          </CardHeader>
        }
      />
    </div>
  );
}
