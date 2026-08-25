import { Badge } from "@/components/ui/badge";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/table/DataTable";
import type {
  SongMasterPreviewResponse,
  SongPreview,
} from "@/api/iidx/crawl/types";

const songPreviewColumns: Column<SongPreview>[] = [
  {
    key: "tag",
    header: "태그",
    cellClassName: "text-muted-foreground",
    cell: (s) => s.tag,
  },
  {
    key: "title",
    header: "제목",
    cellClassName: "font-medium",
    cell: (s) => s.title,
  },
  { key: "genre", header: "장르", cell: (s) => s.genre ?? "-" },
  { key: "artist", header: "아티스트", cell: (s) => s.artist ?? "-" },
  { key: "version", header: "버전", cell: (s) => s.version ?? "-" },
  {
    key: "in_ac",
    header: "아케이드 버전 수록 여부",
    cell: (s) => (
      <Badge variant={s.in_ac !== false ? "default" : "outline"}>
        {s.in_ac !== false ? "수록" : "미수록"}
      </Badge>
    ),
  },
  {
    key: "charts",
    header: "채보 수",
    cellClassName: "text-muted-foreground tabular-nums",
    cell: (s) => s.charts.length,
  },
];

/*
곡 마스터 크롤러(textage 등) 미리보기 결과. 난이도표 결과(PreviewTableResult)와
달리 SongMasterPreviewResponse.songs를 곡 단위 DataTable로 보여준다.
*/
export function PreviewSongResult({
  result,
}: {
  result?: SongMasterPreviewResponse | null;
}) {
  if (!result) return null;

  return (
    <DataTable
      columns={songPreviewColumns}
      data={result.songs}
      rowKey={(s) => s.tag}
      emptyMessage="곡 데이터가 없습니다."
      toolbar={
        <CardHeader>
          <CardTitle>{result.source}</CardTitle>
          <CardDescription>
            곡 {result.songs_total}개 · 채보 {result.charts_total}개 (버전{" "}
            {result.versions.length}개)
          </CardDescription>
        </CardHeader>
      }
    />
  );
}
