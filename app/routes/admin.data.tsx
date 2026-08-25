import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { CardDescription, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  useSongListQuery,
  useTableListQuery,
  useVersionListQuery,
} from "@/api/iidx/catalog/requests";
import { AC_FILTER_OPTIONS } from "@/api/iidx/catalog/constants";
import type { SongSummary, TableSummary } from "@/api/iidx/catalog/types";
import { Field } from "@/components/Field";
import { FilterCard } from "@/components/FilterCard";
import { Pagination, PAGE_SIZE_OPTIONS } from "@/components/Pagination";
import { DataTable, type Column } from "@/components/table/DataTable";
import { formatDate } from "@/lib/format";

export function meta() {
  return [{ title: "테이블 데이터 관리 - IInfoDX Admin" }];
}

/*
아케이드 버전 수록 여부 여부 배지. 곡/채보 공통으로 쓴다.
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
곡 목록 패널. 제목/버전/아케이드 버전 수록 여부 필터 + 페이지네이션. 곡 제목을 클릭하면
채보 상세 페이지(/data/songs/:songId)로 이동한다.
*/
function SongsPanel() {
  const [titleFilter, setTitleFilter] = useState("");
  const [versionFilter, setVersionFilter] = useState("전체");
  const [acFilter, setAcFilter] = useState("전체");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

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
        <Link
          to={`/data/songs/${song.id}`}
          className={buttonVariants({
            variant: "link",
            className: "h-auto p-0 text-left text-foreground",
          })}
        >
          {song.title}
        </Link>
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
      header: "아케이드 버전 수록 여부",
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
        <Field label="아케이드 버전 수록 여부">
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
    </div>
  );
}

/*
난이도표 목록 패널. 목록은 전체를 한 번에 반환하므로 페이지네이션 없이
보여주고, 표 이름을 클릭하면 엔트리 상세 페이지(/data/tables/:tableSlug)로
이동한다.
*/
function TablesPanel() {
  const { data, isPending, isError } = useTableListQuery();

  const tables = data?.tables ?? [];

  const columns: Column<TableSummary>[] = [
    {
      key: "name",
      header: "이름",
      cellClassName: "font-medium",
      skeleton: <Skeleton className="h-4 w-40 rounded" />,
      cell: (table) => (
        <Link
          to={`/data/tables/${table.slug}`}
          className={buttonVariants({
            variant: "link",
            className: "h-auto p-0 text-left text-foreground",
          })}
        >
          {table.name}
        </Link>
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
    </div>
  );
}
