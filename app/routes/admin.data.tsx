import { useEffect, useState } from "react";
import {
  Badge,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@forestlee0513/iinfo-dx-design-system";

import {
  useSongDetailQuery,
  useSongListQuery,
  useTableDetailQuery,
  useTableListQuery,
  useVersionListQuery,
} from "@/api/iidx/catalog/requests";
import { AC_FILTER_OPTIONS } from "@/api/iidx/catalog/constants";
import type {
  ChartSummary,
  DifficultyEntry,
  SongSummary,
  TableSummary,
} from "@/api/iidx/catalog/types";
import { Field } from "@/components/Field";
import { FilterCard } from "@/components/FilterCard";
import { Modal } from "@/components/Modal";
import { Pagination, PAGE_SIZE_OPTIONS } from "@/components/Pagination";
import { DataTable, type Column } from "@/components/table/DataTable";
import { formatDate } from "@/lib/format";

export function meta() {
  return [{ title: "테이블 데이터 관리 - IInfoDX Admin" }];
}

/*
AC 수록 여부 배지. 곡/채보 공통으로 쓴다.
*/
function InAcBadge({ inAc }: { inAc: boolean }) {
  return (
    <Badge variant={inAc ? "default" : "outline"}>
      {inAc ? "수록" : "미수록"}
    </Badge>
  );
}

export default function CatalogData() {
  return (
    <div className="p-8">
      <h1 className="text-[2rem] font-semibold text-foreground mb-6">
        테이블 데이터 관리
      </h1>

      <Tabs defaultValue="songs">
        <TabsList className="mb-5">
          <TabsTrigger value="songs">곡</TabsTrigger>
          <TabsTrigger value="tables">난이도표</TabsTrigger>
        </TabsList>

        <TabsContent value="songs">
          <SongsPanel />
        </TabsContent>
        <TabsContent value="tables">
          <TablesPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/*
곡 목록 패널. 제목/버전/AC 수록 필터 + 페이지네이션. 곡을 클릭하면 채보를
상세 모달로 보여준다.
*/
function SongsPanel() {
  const [titleFilter, setTitleFilter] = useState("");
  const [versionFilter, setVersionFilter] = useState("전체");
  const [acFilter, setAcFilter] = useState("전체");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [detailSongId, setDetailSongId] = useState<string | null>(null);

  // 제목 입력은 타이핑마다 요청하지 않도록 300ms 디바운스한다.
  const [debouncedTitle, setDebouncedTitle] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTitle(titleFilter.trim()), 300);
    return () => clearTimeout(timer);
  }, [titleFilter]);

  const versionsQuery = useVersionListQuery();
  const versions = versionsQuery.data?.versions ?? [];

  const { data, isPending, isError } = useSongListQuery({
    page,
    per_page: pageSize,
    title: debouncedTitle || undefined,
    version: versionFilter !== "전체" ? Number(versionFilter) : undefined,
    in_ac:
      acFilter === "수록" ? true : acFilter === "미수록" ? false : undefined,
  });

  const songs = data?.songs ?? [];
  const total = data?.total ?? 0;

  const versionItems = [
    { value: "전체", label: "전체" },
    ...versions.map((v) => ({
      value: String(v.id),
      label: v.abbrev ? `${v.name} (${v.abbrev})` : v.name,
    })),
  ];

  // 필터가 바뀌면 항상 1페이지부터 다시 조회한다.
  function changeFilter<T>(setter: (v: T) => void, value: T) {
    setter(value);
    setPage(1);
  }

  const columns: Column<SongSummary>[] = [
    {
      key: "title",
      header: "제목",
      cellClassName: "font-medium",
      skeleton: <Skeleton className="h-4 w-40 rounded" />,
      cell: (song) => (
        <button
          type="button"
          className="text-left hover:underline"
          onClick={() => setDetailSongId(song.id)}
        >
          {song.title}
        </button>
      ),
    },
    {
      key: "artist",
      header: "아티스트",
      cellClassName: "text-muted-foreground",
      skeleton: <Skeleton className="h-4 w-28 rounded" />,
      cell: (song) => song.artist ?? "-",
    },
    {
      key: "genre",
      header: "장르",
      cellClassName: "text-muted-foreground",
      skeleton: <Skeleton className="h-4 w-24 rounded" />,
      cell: (song) => song.genre ?? "-",
    },
    {
      key: "version",
      header: "버전",
      skeleton: <Skeleton className="h-4 w-16 rounded" />,
      cell: (song) => song.version_name ?? song.version ?? "-",
    },
    {
      key: "bpm",
      header: "BPM",
      cellClassName: "text-muted-foreground tabular-nums",
      skeleton: <Skeleton className="h-4 w-12 rounded" />,
      cell: (song) => song.bpm ?? "-",
    },
    {
      key: "in_ac",
      header: "AC 수록",
      skeleton: <Skeleton className="h-5 w-12 rounded-full" />,
      cell: (song) => <InAcBadge inAc={song.in_ac} />,
    },
    {
      key: "updated_at",
      header: "수정일",
      cellClassName: "text-muted-foreground tabular-nums",
      skeleton: <Skeleton className="h-4 w-20 rounded" />,
      cell: (song) => formatDate(song.updated_at),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <FilterCard>
        <Field label="제목">
          <Input
            type="text"
            value={titleFilter}
            onChange={(e) => changeFilter(setTitleFilter, e.target.value)}
            placeholder="곡 제목"
          />
        </Field>
        <Field label="버전">
          <Select
            value={versionFilter}
            items={versionItems}
            onValueChange={(value) => {
              if (value !== null) changeFilter(setVersionFilter, value);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {versionItems.map((v) => (
                <SelectItem key={v.value} value={v.value}>
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="AC 수록">
          <Select
            value={acFilter}
            items={AC_FILTER_OPTIONS}
            onValueChange={(value) => {
              if (value !== null) changeFilter(setAcFilter, value);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AC_FILTER_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </FilterCard>

      <DataTable
        columns={columns}
        data={songs}
        rowKey={(song) => song.id}
        isLoading={isPending}
        isError={isError}
        skeletonRows={pageSize > 25 ? 10 : pageSize}
        emptyMessage="곡이 없습니다."
        errorMessage="곡 목록을 불러오지 못했습니다."
        toolbar={
          <CardHeader>
            <CardDescription>
              총 <span className="font-semibold text-foreground">{total}</span>
              개 · 제목을 클릭하면 채보 정보를 확인할 수 있습니다.
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

      {detailSongId && (
        <SongDetailModal
          songId={detailSongId}
          onClose={() => setDetailSongId(null)}
        />
      )}
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
    header: "AC 수록",
    cell: (c) => (
      <Badge variant={c.in_ac ? "default" : "outline"}>
        {c.in_ac ? "수록" : "미수록"}
      </Badge>
    ),
  },
];

/*
곡 1개의 메타 정보 + 채보 목록을 보여주는 상세 모달.
*/
function SongDetailModal({
  songId,
  onClose,
}: {
  songId: string;
  onClose: () => void;
}) {
  const { data, isPending, isError } = useSongDetailQuery(songId);

  return (
    <Modal
      onClose={onClose}
      title={data ? data.title : "곡 상세"}
      description={
        data
          ? [data.artist, data.genre].filter(Boolean).join(" · ") || undefined
          : undefined
      }
      className="sm:max-w-2xl"
    >
      {isPending ? (
        <Skeleton className="h-48 rounded" />
      ) : isError || !data ? (
        <p className="text-sm text-destructive">
          곡 정보를 불러오지 못했습니다.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <MetaRow label="버전">
              {data.version_name ?? data.version ?? "-"}
            </MetaRow>
            <MetaRow label="BPM">{data.bpm ?? "-"}</MetaRow>
            <MetaRow label="시리즈">{data.series ?? "-"}</MetaRow>
            <MetaRow label="AC 수록">
              <InAcBadge inAc={data.in_ac} />
            </MetaRow>
          </dl>

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
      )}
    </Modal>
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

/*
난이도표 목록 패널. 목록은 전체를 한 번에 반환하므로 페이지네이션 없이
보여주고, 표를 클릭하면 엔트리 전체를 상세 모달로 보여준다.
*/
function TablesPanel() {
  const { data, isPending, isError } = useTableListQuery();
  const [detailTable, setDetailTable] = useState<TableSummary | null>(null);

  const tables = data?.tables ?? [];

  const columns: Column<TableSummary>[] = [
    {
      key: "name",
      header: "이름",
      cellClassName: "font-medium",
      skeleton: <Skeleton className="h-4 w-40 rounded" />,
      cell: (table) => (
        <button
          type="button"
          className="text-left hover:underline"
          onClick={() => setDetailTable(table)}
        >
          {table.name}
        </button>
      ),
    },
    {
      key: "slug",
      header: "slug",
      cellClassName: "font-mono text-xs text-muted-foreground",
      skeleton: <Skeleton className="h-4 w-24 rounded" />,
      cell: (table) => table.slug,
    },
    {
      key: "source",
      header: "출처",
      cellClassName: "text-muted-foreground",
      skeleton: <Skeleton className="h-4 w-16 rounded" />,
      cell: (table) => table.source,
    },
    {
      key: "play_style",
      header: "스타일",
      skeleton: <Skeleton className="h-4 w-10 rounded" />,
      cell: (table) => table.play_style,
    },
    {
      key: "rating_type",
      header: "레이팅 종류",
      cellClassName: "text-muted-foreground",
      skeleton: <Skeleton className="h-4 w-16 rounded" />,
      cell: (table) => table.rating_type,
    },
    {
      key: "range",
      header: "레벨/등급",
      skeleton: <Skeleton className="h-4 w-16 rounded" />,
      cell: (table) =>
        table.level != null
          ? `레벨 ${table.level}`
          : table.grades && table.grades.length > 0
            ? table.grades.join(", ")
            : "-",
    },
    {
      key: "updated_at",
      header: "수정일",
      cellClassName: "text-muted-foreground tabular-nums",
      skeleton: <Skeleton className="h-4 w-20 rounded" />,
      cell: (table) => formatDate(table.updated_at),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <DataTable
        columns={columns}
        data={tables}
        rowKey={(table) => table.slug}
        isLoading={isPending}
        isError={isError}
        skeletonRows={5}
        emptyMessage="등록된 난이도표가 없습니다."
        errorMessage="난이도표 목록을 불러오지 못했습니다."
        toolbar={
          <CardHeader>
            <CardDescription>
              총{" "}
              <span className="font-semibold text-foreground">
                {tables.length}
              </span>
              개 · 이름을 클릭하면 표에 속한 곡 엔트리를 확인할 수 있습니다.
            </CardDescription>
          </CardHeader>
        }
      />

      {detailTable && (
        <TableDetailModal
          table={detailTable}
          onClose={() => setDetailTable(null)}
        />
      )}
    </div>
  );
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
    header: "표 종류",
    cellClassName: "text-muted-foreground",
    cell: (entry) => entry.table_type ?? "-",
  },
];

/*
난이도표 1개의 메타 정보 + 엔트리(표에 속한 곡) 전체를 보여주는 상세 모달.
*/
function TableDetailModal({
  table,
  onClose,
}: {
  table: TableSummary;
  onClose: () => void;
}) {
  const { data, isPending, isError } = useTableDetailQuery(table.slug);

  const entries = data?.difficulty_entries ?? [];

  return (
    <Modal
      onClose={onClose}
      title={table.name}
      description={`${table.source} · ${table.play_style} · ${table.rating_type}`}
      className="sm:max-w-3xl"
    >
      <div className="max-h-125 overflow-auto">
        <DataTable
          columns={entryColumns}
          data={entries}
          rowKey={(entry) => String(entry.id)}
          isLoading={isPending}
          isError={isError}
          skeletonRows={5}
          emptyMessage="표에 속한 곡이 없습니다."
          errorMessage="엔트리를 불러오지 못했습니다."
          cardClassName="!ring-0"
          toolbar={
            <CardHeader>
              <CardTitle>엔트리 ({entries.length})</CardTitle>
            </CardHeader>
          }
        />
      </div>
    </Modal>
  );
}
