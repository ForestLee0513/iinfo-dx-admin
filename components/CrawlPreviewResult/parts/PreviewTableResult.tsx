import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/table/DataTable";
import type { PreviewEntry, PreviewTable } from "@/api/iidx/crawl/types";

const previewEntryColumns: Column<PreviewEntry>[] = [
  {
    key: "title",
    header: "곡명",
    cellClassName: "font-medium",
    cell: (e) => e.title,
  },
  {
    key: "series",
    header: "시리즈",
    cellClassName: "text-muted-foreground",
    cell: (e) => e.series ?? "-",
  },
  { key: "play_style", header: "스타일", cell: (e) => e.play_style },
  { key: "difficulty", header: "난이도", cell: (e) => e.difficulty },
  {
    key: "rating",
    header: "등급/레벨",
    cell: (e) => e.grade ?? e.level ?? e.rating ?? "-",
  },
  {
    key: "table_type",
    header: "난이도 분류",
    cellClassName: "text-muted-foreground",
    cell: (e) => e.table_type ?? "-",
  },
];

/*
난이도표 크롤러(5ch_sheet, numeric_json 등) 미리보기 결과. 한 번의 크롤로 여러
표가 나올 수 있어 표 단위로 DataTable을 나눠 보여준다.
*/
export function PreviewTableResult({
  tables,
}: {
  tables?: PreviewTable[] | null;
}) {
  if (!tables || tables.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      {tables.map((t, i) => (
        <DataTable
          key={i}
          columns={previewEntryColumns}
          data={t.entries}
          rowKey={(e) => `${e.title}-${e.difficulty}-${e.play_style}`}
          emptyMessage="곡 데이터가 없습니다."
          toolbar={
            <CardHeader>
              <CardTitle>{t.table.name}</CardTitle>
              <CardDescription>{t.entry_count}곡</CardDescription>
            </CardHeader>
          }
        />
      ))}
    </div>
  );
}
