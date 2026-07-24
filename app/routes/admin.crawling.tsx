import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardAction,
  CardContent,
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
  Switch,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@forestlee0513/iinfo-dx-design-system";

import {
  useCrawlJobsQuery,
  useCrawlTargetDetailQuery,
  useCrawlTargetsQuery,
  useCreateCrawlTargetMutation,
  useDeleteCrawlTargetMutation,
  usePreviewCrawlMutation,
  useSchedulesQuery,
  useTriggerCrawlMutation,
  useUpdateCrawlTargetMutation,
  useUpdateScheduleMutation,
} from "@/api/crawl/requests";
import {
  CRAWL_KIND_OPTIONS,
  JOB_STATUS_LABELS,
  JOB_STEP_STATUS_LABELS,
} from "@/api/crawl/constants";
import type {
  CrawlJob,
  CrawlJobStepStatus,
  CrawlKind,
  CrawlTarget,
  JobStep,
  JobStepResultItem,
  PreviewEntry,
  PreviewTable,
  SongMasterPreviewResponse,
  SongPreview,
} from "@/api/crawl/types";
import { Field } from "@/components/Field";
import { FilterCard } from "@/components/FilterCard";
import { Modal } from "@/components/Modal";
import { ScheduleEditor } from "@/components/ScheduleEditor";
import { DataTable, type Column } from "@/components/table/DataTable";
import { getApiErrorMessage } from "@/lib/api-error";
import { formatDateTime } from "@/lib/format";

export function meta() {
  return [{ title: "크롤링 관리 - IInfoDX Admin" }];
}

const STATUS_BADGE_VARIANT: Record<
  CrawlJob["status"],
  "secondary" | "default" | "destructive"
> = {
  RUNNING: "secondary",
  DONE: "default",
  FAILED: "destructive",
};

const STEP_BADGE_VARIANT: Record<
  CrawlJobStepStatus,
  "outline" | "secondary" | "default" | "destructive"
> = {
  PENDING: "outline",
  RUNNING: "secondary",
  DONE: "default",
  FAILED: "destructive",
};

function JobStatusBadge({ status }: { status: CrawlJob["status"] }) {
  return (
    <Badge variant={STATUS_BADGE_VARIANT[status]}>
      {JOB_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

/*
작업의 스텝별 상태를 배지로 나열한다. 실패 스텝은 오류 메시지를 툴팁으로 보여준다.
*/
function StepBadges({ steps }: { steps: JobStep[] }) {
  if (steps.length === 0) return <span className="text-muted-foreground">-</span>;

  return (
    <div className="flex flex-wrap gap-1">
      {steps.map((step, i) => {
        const badge = (
          <Badge key={i} variant={STEP_BADGE_VARIANT[step.status]}>
            {step.name} · {JOB_STEP_STATUS_LABELS[step.status] ?? step.status}
          </Badge>
        );
        if (step.status !== "FAILED" || !step.error) return badge;
        return (
          <Tooltip key={i}>
            <TooltipTrigger render={badge} />
            <TooltipContent>{step.error}</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

/*
결과 원소 하나가 성공인지 여부. 백엔드가 status="FAILED"인 원소만 명시적으로
표시하고 나머지(SUCCESS 포함, 크롤러별로 없을 수도 있음)는 성공으로 간주하므로
FE도 동일한 기준으로 판단한다.
*/
function isResultItemFailed(item: JobStepResultItem) {
  return item.status === "FAILED";
}

/*
결과 원소를 식별할 이름. 파이프라인마다 다른 필드(source/slug/crawler/target)에
값이 들어오므로 우선순위대로 하나를 고른다.
*/
function resultItemLabel(item: JobStepResultItem) {
  return (
    (item.slug as string | undefined) ??
    (item.source as string | undefined) ??
    (item.crawler as string | undefined) ??
    (item.target as string | undefined) ??
    "-"
  );
}

/*
작업의 모든 스텝 result.results를 합쳐 성공/실패 건수를 센다. 결과가 하나도
없으면(구 작업, 즉시 SKIPPED 등) null을 반환한다.
*/
function countJobResults(job: CrawlJob): { success: number; failed: number } | null {
  const items = job.steps.flatMap((s) => s.result?.results ?? []);
  if (items.length === 0) return null;
  const failed = items.filter(isResultItemFailed).length;
  return { success: items.length - failed, failed };
}

/*
등록된 크롤 대상 하나를 식별할 이름. kind:id 형태의 key보다 사람이 읽기 쉬운
label을 우선 노출한다.
*/
function targetDisplayName(target: CrawlTarget | undefined, fallbackId: string) {
  return target?.label ?? fallbackId;
}

const previewEntryColumns: Column<PreviewEntry>[] = [
  { key: "title", header: "곡명", cellClassName: "font-medium", cell: (e) => e.title },
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
    header: "표 종류",
    cellClassName: "text-muted-foreground",
    cell: (e) => e.table_type ?? "-",
  },
];

/*
난이도표 크롤러(5ch_sheet, numeric_json 등) 미리보기 결과. 한 번의 크롤로 여러
표가 나올 수 있어 표 단위로 DataTable을 나눠 보여준다.
*/
function PreviewTableResult({ tables }: { tables?: PreviewTable[] | null }) {
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

const songPreviewColumns: Column<SongPreview>[] = [
  { key: "tag", header: "태그", cellClassName: "text-muted-foreground", cell: (s) => s.tag },
  { key: "title", header: "제목", cellClassName: "font-medium", cell: (s) => s.title },
  { key: "genre", header: "장르", cell: (s) => s.genre ?? "-" },
  { key: "artist", header: "아티스트", cell: (s) => s.artist ?? "-" },
  { key: "version", header: "버전", cell: (s) => s.version ?? "-" },
  {
    key: "in_ac",
    header: "AC 수록",
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
function PreviewSongResult({
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

/*
크롤러별 추가 설정 폼 상태. 표시 여부는 kind에 따라 갈리지만 값 자체는
미리보기/즉시 실행 폼과 대상 등록/수정 모달이 공통으로 쓴다.
*/
type CrawlerFormFields = {
  url: string;
  playStyle: string;
  level: string;
  slug: string;
  name: string;
  source: string;
};

const PLAY_STYLE_OPTIONS = ["미지정", "SP", "DP"].map((o) => ({
  value: o,
  label: o,
}));

const EMPTY_CRAWLER_FIELDS: CrawlerFormFields = {
  url: "",
  playStyle: "미지정",
  level: "",
  slug: "",
  name: "",
  source: "",
};

/*
빈 값/기본값은 제외하고 서버에 보낼 크롤러별 설정 객체를 만든다.
*/
function buildCrawlerFields(fields: CrawlerFormFields): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (fields.url.trim()) out.url = fields.url.trim();
  if (fields.playStyle !== "미지정") out.play_style = fields.playStyle;
  if (fields.level.trim()) out.level = Number(fields.level);
  if (fields.slug.trim()) out.slug = fields.slug.trim();
  if (fields.name.trim()) out.name = fields.name.trim();
  if (fields.source.trim()) out.source = fields.source.trim();
  return out;
}

/*
난이도표(kind="table")에만 필요한 크롤러별 설정 입력들. 곡 마스터는 백엔드에
baseURL 등이 고정되어 있어 별도 입력이 필요 없다.
*/
function CrawlerFieldsFieldset({
  kind,
  fields,
  onChange,
}: {
  kind: CrawlKind;
  fields: CrawlerFormFields;
  onChange: (patch: Partial<CrawlerFormFields>) => void;
}) {
  if (kind !== "table") return null;

  return (
    <>
      <Field label="URL">
        <Input
          value={fields.url}
          onChange={(e) => onChange({ url: e.target.value })}
          placeholder="https://docs.google.com/spreadsheets/d/.../pubhtml"
        />
      </Field>
      <Field label="플레이 스타일">
        <Select
          value={fields.playStyle}
          items={PLAY_STYLE_OPTIONS}
          onValueChange={(value) => {
            if (value !== null) onChange({ playStyle: value });
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PLAY_STYLE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="레벨">
        <Input
          type="number"
          min={1}
          max={12}
          value={fields.level}
          onChange={(e) => onChange({ level: e.target.value })}
          placeholder="1~12"
        />
      </Field>
      <Field label="표 slug">
        <Input value={fields.slug} onChange={(e) => onChange({ slug: e.target.value })} />
      </Field>
      <Field label="표 이름">
        <Input value={fields.name} onChange={(e) => onChange({ name: e.target.value })} />
      </Field>
      <Field label="출처">
        <Input
          value={fields.source}
          onChange={(e) => onChange({ source: e.target.value })}
          placeholder="5ch, cpi 등"
        />
      </Field>
    </>
  );
}

export default function Crawling() {
  const targetsQuery = useCrawlTargetsQuery();
  const jobsQuery = useCrawlJobsQuery();
  const schedulesQuery = useSchedulesQuery();
  const triggerMutation = useTriggerCrawlMutation();
  const previewMutation = usePreviewCrawlMutation();

  const [triggerError, setTriggerError] = useState<string | null>(null);
  const [scheduleTarget, setScheduleTarget] = useState<CrawlTarget | null>(null);
  // "create" = 신규 등록, CrawlTarget = 해당 대상 수정
  const [targetModal, setTargetModal] = useState<"create" | CrawlTarget | null>(null);
  const deleteTargetMutation = useDeleteCrawlTargetMutation();
  const [resultJob, setResultJob] = useState<CrawlJob | null>(null);

  // 미리보기/즉시 실행 폼
  const [kind, setKind] = useState<CrawlKind>("table");
  const [crawler, setCrawler] = useState("5ch_sheet");
  const [fields, setFields] = useState<CrawlerFormFields>(EMPTY_CRAWLER_FIELDS);

  function patchFields(patch: Partial<CrawlerFormFields>) {
    setFields((f) => ({ ...f, ...patch }));
  }

  const targets = targetsQuery.data?.targets ?? [];
  const targetsByKindAndId = useMemo(() => {
    const map = new Map<string, CrawlTarget>();
    targets.forEach((t) => map.set(`${t.kind}:${t.id}`, t));
    return map;
  }, [targets]);

  const schedulesByKey = useMemo(() => {
    const map = new Map<string, (typeof schedules)[number]>();
    const schedules = schedulesQuery.data?.schedules ?? [];
    schedules.forEach((s) => map.set(s.target_key, s));
    return map;
  }, [schedulesQuery.data]);

  const crawlerOptions = targetsQuery.data?.registered_crawlers[kind] ?? [];
  const crawlerSelectItems = crawlerOptions.map((c) => ({ value: c, label: c }));

  async function handlePreview() {
    setTriggerError(null);
    try {
      await previewMutation.mutateAsync({
        kind,
        crawler,
        target: buildCrawlerFields(fields),
      });
    } catch {
      // 오류 메시지는 previewMutation.error에서 렌더링한다.
    }
  }

  async function handleAdHocTrigger() {
    setTriggerError(null);
    try {
      await triggerMutation.mutateAsync({
        scope: kind,
        target: { crawler, ...buildCrawlerFields(fields) },
      });
      window.alert("크롤 작업을 실행했습니다. 아래 작업 내역에서 진행 상황을 확인하세요.");
    } catch (err) {
      setTriggerError(getApiErrorMessage(err));
    }
  }

  async function handleDeleteTarget(t: CrawlTarget) {
    if (
      !window.confirm(
        `"${t.label}" 대상을 삭제할까요? 걸려 있는 스케줄과 등록된 작업도 함께 삭제됩니다.`,
      )
    )
      return;
    try {
      await deleteTargetMutation.mutateAsync(t.key);
    } catch (err) {
      window.alert(getApiErrorMessage(err));
    }
  }

  async function handleTargetTrigger(target: CrawlTarget) {
    setTriggerError(null);
    try {
      await triggerMutation.mutateAsync({ scope: target.kind, target_id: target.id });
      window.alert(`"${target.label}" 크롤 작업을 실행했습니다.`);
    } catch (err) {
      window.alert(getApiErrorMessage(err));
    }
  }

  async function handleFullTrigger() {
    if (!window.confirm("전체 대상(곡 마스터 → 난이도표)을 동기화할까요?")) return;
    setTriggerError(null);
    try {
      await triggerMutation.mutateAsync({ scope: "full" });
      window.alert("전체 동기화 작업을 실행했습니다.");
    } catch (err) {
      window.alert(getApiErrorMessage(err));
    }
  }

  const previewResult = previewMutation.data;

  const targetColumns: Column<CrawlTarget>[] = [
    {
      key: "label",
      header: "이름",
      cellClassName: "font-medium",
      skeleton: <Skeleton className="h-4 w-32 rounded" />,
      cell: (t) => t.label,
    },
    {
      key: "kind",
      header: "종류",
      skeleton: <Skeleton className="h-5 w-14 rounded-full" />,
      cell: (t) => (
        <Badge variant="secondary">
          {CRAWL_KIND_OPTIONS.find((o) => o.value === t.kind)?.label ?? t.kind}
        </Badge>
      ),
    },
    {
      key: "crawler",
      header: "크롤러",
      cellClassName: "text-muted-foreground",
      skeleton: <Skeleton className="h-4 w-20 rounded" />,
      cell: (t) => t.crawler,
    },
    {
      key: "schedule",
      header: "스케줄",
      skeleton: <Skeleton className="h-5 w-24 rounded-full" />,
      cell: (t) => {
        const schedule = schedulesByKey.get(t.key);
        if (!schedule || !schedule.enabled) {
          return <Badge variant="outline">미설정</Badge>;
        }
        return (
          <Tooltip>
            <TooltipTrigger
              render={<Badge variant="default">활성 ({schedule.triggers.length})</Badge>}
            />
            <TooltipContent>
              다음 실행: {formatDateTime(schedule.next_run_at)}
            </TooltipContent>
          </Tooltip>
        );
      },
    },
    {
      key: "actions",
      header: "",
      headerClassName: "w-72",
      cellClassName: "w-72",
      skeleton: <Skeleton className="h-8 w-56 rounded" />,
      cell: (t) => (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleTargetTrigger(t)}
            disabled={triggerMutation.isPending}
          >
            지금 실행
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setScheduleTarget(t)}>
            스케줄 설정
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setTargetModal(t)}>
            수정
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive"
            onClick={() => handleDeleteTarget(t)}
            disabled={deleteTargetMutation.isPending}
          >
            삭제
          </Button>
        </div>
      ),
    },
  ];

  const jobs = jobsQuery.data?.jobs ?? [];
  const jobColumns: Column<CrawlJob>[] = [
    {
      key: "status",
      header: "상태",
      skeleton: <Skeleton className="h-5 w-14 rounded-full" />,
      cell: (job) => <JobStatusBadge status={job.status} />,
    },
    {
      key: "scope",
      header: "범위",
      cellClassName: "text-muted-foreground",
      skeleton: <Skeleton className="h-4 w-10 rounded" />,
      cell: (job) =>
        CRAWL_KIND_OPTIONS.find((o) => o.value === job.scope)?.label ??
        (job.scope === "full" ? "전체" : job.scope),
    },
    {
      key: "target",
      header: "대상",
      skeleton: <Skeleton className="h-4 w-28 rounded" />,
      cell: (job) =>
        job.target_id
          ? targetDisplayName(
              targetsByKindAndId.get(`${job.scope}:${job.target_id}`),
              job.target_id,
            )
          : job.target
            ? "직접 지정"
            : "전체 대상",
    },
    {
      key: "steps",
      header: "진행 단계",
      skeleton: <Skeleton className="h-5 w-40 rounded" />,
      cell: (job) => <StepBadges steps={job.steps} />,
    },
    {
      key: "results",
      header: "결과",
      skeleton: <Skeleton className="h-6 w-20 rounded" />,
      cell: (job) => {
        const counts = countJobResults(job);
        if (!counts) return <span className="text-muted-foreground">-</span>;
        return (
          <Button size="sm" variant="ghost" onClick={() => setResultJob(job)}>
            성공 {counts.success}
            {counts.failed > 0 && (
              <span className="text-destructive">&nbsp;· 실패 {counts.failed}</span>
            )}
          </Button>
        );
      },
    },
    {
      key: "triggered_by",
      header: "실행자",
      cellClassName: "text-muted-foreground",
      skeleton: <Skeleton className="h-4 w-16 rounded" />,
      cell: (job) => job.triggered_by,
    },
    {
      key: "created_at",
      header: "시작 시각",
      cellClassName: "text-muted-foreground tabular-nums",
      skeleton: <Skeleton className="h-4 w-32 rounded" />,
      cell: (job) => formatDateTime(job.created_at),
    },
    {
      key: "finished_at",
      header: "종료 시각",
      cellClassName: "text-muted-foreground tabular-nums",
      skeleton: <Skeleton className="h-4 w-32 rounded" />,
      cell: (job) => formatDateTime(job.finished_at),
    },
  ];

  return (
    <div className="p-8">
      <h1 className="text-[2rem] font-semibold text-foreground mb-6">
        크롤링 관리
      </h1>

      <div className="flex flex-col gap-5">
        {/* 등록된 크롤 대상 */}
        <DataTable
          columns={targetColumns}
          data={targets}
          rowKey={(t) => t.key}
          isLoading={targetsQuery.isPending}
          isError={targetsQuery.isError}
          skeletonRows={3}
          emptyMessage="등록된 크롤 대상이 없습니다."
          errorMessage="크롤 대상을 불러오지 못했습니다."
          toolbar={
            <CardHeader>
              <CardTitle>등록된 크롤 대상</CardTitle>
              <CardDescription>
                {targetsQuery.data &&
                  Object.entries(targetsQuery.data.registered_crawlers)
                    .map(
                      ([k, crawlers]) =>
                        `${CRAWL_KIND_OPTIONS.find((o) => o.value === k)?.label ?? k}: ${crawlers.join(", ")}`,
                    )
                    .join(" · ")}
              </CardDescription>
              <CardAction>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setTargetModal("create")}>
                    대상 등록
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleFullTrigger}
                    disabled={triggerMutation.isPending}
                  >
                    전체 동기화 실행
                  </Button>
                </div>
              </CardAction>
            </CardHeader>
          }
        />

        {/* 미리보기 & 즉시 실행 */}
        <Card>
          <CardHeader>
            <CardTitle>미리보기 &amp; 즉시 실행</CardTitle>
            <CardDescription>
              등록 여부와 무관하게 대상을 직접 지정해 크롤 결과를 미리 보거나 바로
              실행합니다. 미리보기는 실제 저장소에 반영되지 않습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <FilterCard>
              <Field label="종류" required>
                <Select
                  value={kind}
                  items={CRAWL_KIND_OPTIONS}
                  onValueChange={(value) => {
                    if (value !== null) {
                      const nextKind = value as CrawlKind;
                      setKind(nextKind);
                      setCrawler(
                        targetsQuery.data?.registered_crawlers[nextKind]?.[0] ?? "",
                      );
                      // 종류가 바뀌면 이전 종류에서 입력한 값이 그대로 남아
                      // 실행/미리보기에 섞여 들어가지 않도록 폼을 초기화한다.
                      setFields(EMPTY_CRAWLER_FIELDS);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CRAWL_KIND_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="크롤러" required>
                <Select
                  value={crawler}
                  items={crawlerSelectItems}
                  onValueChange={(value) => {
                    if (value !== null) setCrawler(value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {crawlerOptions.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <CrawlerFieldsFieldset kind={kind} fields={fields} onChange={patchFields} />
            </FilterCard>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handlePreview}
                disabled={!crawler || previewMutation.isPending}
              >
                {previewMutation.isPending ? "미리보기 조회 중…" : "미리보기"}
              </Button>
              <Button
                onClick={handleAdHocTrigger}
                disabled={!crawler || triggerMutation.isPending}
              >
                {triggerMutation.isPending ? "실행 중…" : "즉시 실행"}
              </Button>
            </div>

            {triggerError && (
              <Alert variant="destructive">
                <AlertDescription>{triggerError}</AlertDescription>
              </Alert>
            )}

            {previewMutation.isError && (
              <Alert variant="destructive">
                <AlertDescription>
                  {getApiErrorMessage(previewMutation.error)}
                </AlertDescription>
              </Alert>
            )}

            {previewResult && previewResult.kind === "song" && (
              <PreviewSongResult result={previewResult.song_result} />
            )}

            {previewResult && previewResult.kind === "table" && (
              <PreviewTableResult tables={previewResult.tables} />
            )}
          </CardContent>
        </Card>

        {/* 작업 내역 */}
        <DataTable
          columns={jobColumns}
          data={jobs}
          rowKey={(job) => job.id}
          isLoading={jobsQuery.isPending}
          isError={jobsQuery.isError}
          skeletonRows={5}
          emptyMessage="실행된 크롤 작업이 없습니다."
          errorMessage="작업 내역을 불러오지 못했습니다."
          toolbar={
            <CardHeader>
              <CardTitle>최근 작업 내역</CardTitle>
              <CardDescription>
                실행 중인 작업이 있으면 자동으로 갱신됩니다.
              </CardDescription>
            </CardHeader>
          }
        />
      </div>

      {/* 스케줄 설정 모달 */}
      {scheduleTarget && (
        <ScheduleModal
          target={scheduleTarget}
          onClose={() => setScheduleTarget(null)}
        />
      )}

      {/* 대상 등록/수정 모달 */}
      {targetModal && (
        <TargetFormModal
          target={targetModal === "create" ? null : targetModal}
          registeredCrawlers={targetsQuery.data?.registered_crawlers ?? {}}
          onClose={() => setTargetModal(null)}
        />
      )}

      {/* 작업 결과 상세 모달 */}
      {resultJob && <JobResultModal job={resultJob} onClose={() => setResultJob(null)} />}
    </div>
  );
}

/*
대상 1건의 스케줄을 조회/수정하는 모달. 저장 시 대상의 target_key(=CrawlTarget.key)
로 PUT하여 Redis 스케줄을 갱신한다.
*/
function ScheduleModal({
  target,
  onClose,
}: {
  target: CrawlTarget;
  onClose: () => void;
}) {
  const schedulesQuery = useSchedulesQuery();
  const updateScheduleMutation = useUpdateScheduleMutation();

  const current = schedulesQuery.data?.schedules.find(
    (s) => s.target_key === target.key,
  );

  const [enabled, setEnabled] = useState(current?.enabled ?? false);
  const [triggers, setTriggers] = useState(current?.triggers ?? []);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    try {
      await updateScheduleMutation.mutateAsync({
        targetKey: target.key,
        enabled,
        triggers,
      });
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  return (
    <Modal
      onClose={onClose}
      closeDisabled={updateScheduleMutation.isPending}
      title={`스케줄 설정 — ${target.label}`}
      description="지정한 요일·시각에 자동으로 크롤을 실행합니다."
      footer={
        <>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={updateScheduleMutation.isPending}
          >
            취소
          </Button>
          <Button onClick={handleSave} disabled={updateScheduleMutation.isPending}>
            {updateScheduleMutation.isPending ? "저장 중…" : "저장"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Switch checked={enabled} onCheckedChange={setEnabled} />
          <span className="text-sm">스케줄 활성화</span>
        </div>

        <ScheduleEditor triggers={triggers} onChange={setTriggers} />

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
    </Modal>
  );
}

/*
크롤 대상 등록/수정 모달. target이 null이면 등록, 아니면 해당 대상 수정.
수정 시에는 kind/id를 바꿀 수 없어(target_key로 고정) 읽기 전용으로 보여주고,
url 등 크롤러별 설정은 GET /targets/{target_key}로 상세를 불러와 프리필한다.
*/
function TargetFormModal({
  target,
  registeredCrawlers,
  onClose,
}: {
  target: CrawlTarget | null;
  registeredCrawlers: Record<string, string[]>;
  onClose: () => void;
}) {
  const isEdit = target !== null;
  const detailQuery = useCrawlTargetDetailQuery(target?.key ?? "", isEdit);
  const createMutation = useCreateCrawlTargetMutation();
  const updateMutation = useUpdateCrawlTargetMutation();

  const [kind, setKind] = useState<CrawlKind>(target?.kind ?? "table");
  const [id, setId] = useState(target?.id ?? "");
  const [label, setLabel] = useState(target?.label ?? "");
  const [crawler, setCrawler] = useState(
    target?.crawler ?? registeredCrawlers[kind]?.[0] ?? "",
  );
  const [fields, setFields] = useState<CrawlerFormFields>(EMPTY_CRAWLER_FIELDS);
  const [error, setError] = useState<string | null>(null);
  const [prefilled, setPrefilled] = useState(false);

  // 상세 조회가 끝나면 크롤러별 설정(url 등)을 한 번만 폼에 채워 넣는다.
  useEffect(() => {
    if (!isEdit || !detailQuery.data || prefilled) return;
    const detail = detailQuery.data;
    setLabel(detail.label);
    setCrawler(detail.crawler);
    setFields({
      url: typeof detail.url === "string" ? detail.url : "",
      playStyle: typeof detail.play_style === "string" ? detail.play_style : "미지정",
      level: typeof detail.level === "number" ? String(detail.level) : "",
      slug: typeof detail.slug === "string" ? detail.slug : "",
      name: typeof detail.name === "string" ? detail.name : "",
      source: typeof detail.source === "string" ? detail.source : "",
    });
    setPrefilled(true);
  }, [isEdit, detailQuery.data, prefilled]);

  function patchFields(patch: Partial<CrawlerFormFields>) {
    setFields((f) => ({ ...f, ...patch }));
  }

  const crawlerOptions = registeredCrawlers[kind] ?? [];
  const crawlerSelectItems = crawlerOptions.map((c) => ({ value: c, label: c }));
  const isPending = createMutation.isPending || updateMutation.isPending;
  const formInvalid = !id.trim() || !label.trim() || !crawler;
  const detailLoading = isEdit && detailQuery.isPending;

  async function handleSubmit() {
    setError(null);
    try {
      if (isEdit && target) {
        await updateMutation.mutateAsync({
          targetKey: target.key,
          label: label.trim(),
          crawler,
          ...buildCrawlerFields(fields),
        });
      } else {
        await createMutation.mutateAsync({
          kind,
          id: id.trim(),
          label: label.trim(),
          crawler,
          ...buildCrawlerFields(fields),
        });
      }
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  return (
    <Modal
      onClose={onClose}
      closeDisabled={isPending}
      title={isEdit ? `대상 수정 — ${target?.label}` : "대상 등록"}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={formInvalid || isPending || detailLoading}
          >
            {isPending ? "저장 중…" : "저장"}
          </Button>
        </>
      }
    >
      {detailLoading ? (
        <Skeleton className="h-64 rounded" />
      ) : (
        <div className="flex flex-col gap-4">
          <FilterCard>
            <Field label="종류" required>
              {isEdit ? (
                <div className="py-2 text-sm">
                  {CRAWL_KIND_OPTIONS.find((o) => o.value === kind)?.label ?? kind}
                </div>
              ) : (
                <Select
                  value={kind}
                  items={CRAWL_KIND_OPTIONS}
                  onValueChange={(value) => {
                    if (value !== null) {
                      const nextKind = value as CrawlKind;
                      setKind(nextKind);
                      setCrawler(registeredCrawlers[nextKind]?.[0] ?? "");
                      setFields(EMPTY_CRAWLER_FIELDS);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CRAWL_KIND_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </Field>
            <Field label="ID" required>
              {isEdit ? (
                <div className="py-2 text-sm text-muted-foreground">{id}</div>
              ) : (
                <Input
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  placeholder="5ch_sp12"
                />
              )}
            </Field>
            <Field label="이름" required>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} />
            </Field>
            <Field label="크롤러" required>
              <Select
                value={crawler}
                items={crawlerSelectItems}
                onValueChange={(value) => {
                  if (value !== null) setCrawler(value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="선택" />
                </SelectTrigger>
                <SelectContent>
                  {crawlerOptions.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <CrawlerFieldsFieldset kind={kind} fields={fields} onChange={patchFields} />
          </FilterCard>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </Modal>
  );
}

const resultItemColumns: Column<JobStepResultItem>[] = [
  {
    key: "label",
    header: "대상",
    cellClassName: "font-medium",
    cell: (item) => resultItemLabel(item),
  },
  {
    key: "status",
    header: "상태",
    cell: (item) => (
      <Badge variant={isResultItemFailed(item) ? "destructive" : "default"}>
        {isResultItemFailed(item) ? "실패" : "성공"}
      </Badge>
    ),
  },
  {
    key: "error",
    header: "오류",
    cellClassName: "text-muted-foreground whitespace-pre-wrap break-words",
    cell: (item) => item.error ?? "-",
  },
];

/*
작업 스텝별 result.results(대상 단위 성공/실패 목록)를 보여주는 모달. 스텝
레벨 배지(StepBadges)는 스텝 전체의 성공/실패만 알려주므로, 스텝 하나가
여러 대상을 순회할 때(예: 전체 동기화) 대상별 성공/실패를 여기서 구분해 보여준다.
*/
function JobResultModal({ job, onClose }: { job: CrawlJob; onClose: () => void }) {
  const stepsWithResults = job.steps.filter((s) => (s.result?.results?.length ?? 0) > 0);

  return (
    <Modal
      onClose={onClose}
      title="작업 결과 상세"
      description={`작업 ID: ${job.id}`}
      className="sm:max-w-2xl"
    >
      <div className="flex flex-col gap-4">
        {stepsWithResults.length === 0 ? (
          <p className="text-sm text-muted-foreground">대상별 결과가 없습니다.</p>
        ) : (
          stepsWithResults.map((step) => (
            <DataTable
              key={step.name}
              columns={resultItemColumns}
              data={step.result?.results ?? []}
              rowKey={(item) => `${step.name}-${resultItemLabel(item)}`}
              toolbar={
                <CardHeader>
                  <CardTitle>{step.name}</CardTitle>
                </CardHeader>
              }
            />
          ))
        )}
      </div>
    </Modal>
  );
}
