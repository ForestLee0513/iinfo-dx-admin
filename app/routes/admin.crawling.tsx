import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  useCrawlJobsQuery,
  useCrawlTargetsQuery,
  useDeleteCrawlTargetMutation,
  useSchedulesQuery,
  useTriggerCrawlMutation,
} from "@/api/iidx/crawl/requests";
import {
  CRAWL_KIND_OPTIONS,
  JOB_STATUS_LABELS,
  JOB_STEP_STATUS_LABELS,
} from "@/api/iidx/crawl/constants";
import type {
  CrawlJob,
  CrawlJobStepStatus,
  CrawlTarget,
  JobStep,
  JobStepResultItem,
} from "@/api/iidx/crawl/types";
import { Modal } from "@/components/Modal";
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
  if (steps.length === 0)
    return <span className="text-muted-foreground">-</span>;

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
function countJobResults(
  job: CrawlJob,
): { success: number; failed: number } | null {
  const items = job.steps.flatMap((s) => s.result?.results ?? []);
  if (items.length === 0) return null;
  const failed = items.filter(isResultItemFailed).length;
  return { success: items.length - failed, failed };
}

/*
등록된 크롤링 대상 하나를 식별할 이름. kind:id 형태의 key보다 사람이 읽기 쉬운
label을 우선 노출한다.
*/
function targetDisplayName(
  target: CrawlTarget | undefined,
  fallbackId: string,
) {
  return target?.label ?? fallbackId;
}

export default function Crawling() {
  const targetsQuery = useCrawlTargetsQuery();
  const jobsQuery = useCrawlJobsQuery();
  const schedulesQuery = useSchedulesQuery();
  const triggerMutation = useTriggerCrawlMutation();

  const deleteTargetMutation = useDeleteCrawlTargetMutation();
  const [resultJob, setResultJob] = useState<CrawlJob | null>(null);

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
    try {
      await triggerMutation.mutateAsync({
        scope: target.kind,
        target_id: target.id,
      });
      window.alert(`"${target.label}" 크롤 작업을 실행했습니다.`);
    } catch (err) {
      window.alert(getApiErrorMessage(err));
    }
  }

  async function handleFullTrigger() {
    if (!window.confirm("전체 대상(곡 마스터 → 난이도표)을 동기화할까요?"))
      return;
    try {
      await triggerMutation.mutateAsync({ scope: "full" });
      window.alert("전체 동기화 작업을 실행했습니다.");
    } catch (err) {
      window.alert(getApiErrorMessage(err));
    }
  }

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
              render={
                <Badge variant="default">
                  활성 ({schedule.triggers.length})
                </Badge>
              }
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

          <Button
            size="sm"
            variant="ghost"
            render={
              <Link to={`/crawling/${encodeURIComponent(t.key)}/edit`}>
                수정
              </Link>
            }
          />
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
              <span className="text-destructive">
                &nbsp;· 실패 {counts.failed}
              </span>
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
        {/* 등록된 크롤링 대상 */}
        <DataTable
          columns={targetColumns}
          data={targets}
          rowKey={(t) => t.key}
          isLoading={targetsQuery.isPending}
          isError={targetsQuery.isError}
          skeletonRows={3}
          emptyMessage="등록된 크롤링 대상이 없습니다."
          errorMessage="크롤 대상을 불러오지 못했습니다."
          toolbar={
            <CardHeader>
              <CardTitle>등록된 크롤링 대상</CardTitle>
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
                  <Button
                    variant="outline"
                    render={<Link to="/crawling/new">난이도표 등록</Link>}
                  />
                  <Button
                    variant="outline"
                    render={
                      <Link to="/crawling/new/song">수록곡 정보 등록</Link>
                    }
                  />
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

      {/* 작업 결과 상세 모달 */}
      {resultJob && (
        <JobResultModal job={resultJob} onClose={() => setResultJob(null)} />
      )}
    </div>
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
function JobResultModal({
  job,
  onClose,
}: {
  job: CrawlJob;
  onClose: () => void;
}) {
  const stepsWithResults = job.steps.filter(
    (s) => (s.result?.results?.length ?? 0) > 0,
  );

  return (
    <Modal
      onClose={onClose}
      title="작업 결과 상세"
      description={`작업 ID: ${job.id}`}
      className="sm:max-w-2xl"
    >
      <div className="flex flex-col gap-4">
        {stepsWithResults.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            대상별 결과가 없습니다.
          </p>
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
