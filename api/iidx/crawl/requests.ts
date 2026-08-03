import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { api } from "@/lib/axios";
import { CRAWL_BASE, CRAWL_JOBS_DEFAULT_LIMIT, CRAWL_JOBS_POLL_INTERVAL } from "./constants";
import type {
  CrawlJob,
  CrawlPreviewRequest,
  CrawlPreviewResponse,
  CrawlTargetCreateRequest,
  CrawlTargetDetail,
  CrawlTargetUpdateRequest,
  CrawlTargetsResponse,
  JobCreateRequest,
  JobListResponse,
  TargetScheduleConfig,
  TargetScheduleListResponse,
  TargetScheduleResponse,
} from "./types";

/*
쿼리 키 - Query Keys
*/
export const crawlKeys = {
  all: ["crawl"] as const,
  targets: () => [...crawlKeys.all, "targets"] as const,
  targetDetails: () => [...crawlKeys.targets(), "detail"] as const,
  targetDetail: (targetKey: string) =>
    [...crawlKeys.targetDetails(), targetKey] as const,
  jobs: () => [...crawlKeys.all, "jobs"] as const,
  jobList: (limit: number) => [...crawlKeys.jobs(), "list", limit] as const,
  schedules: () => [...crawlKeys.all, "schedules"] as const,
  scheduleList: () => [...crawlKeys.schedules(), "list"] as const,
};

/*
GET /api/v1/iidx/crawl/targets — 설정된 크롤 대상 + 등록된 크롤러 목록.
어드민 대시보드의 대상 선택 드롭다운/스케줄 키(target_key) 소스이기도 하다.
*/
export async function getCrawlTargets() {
  const { data } = await api.get<CrawlTargetsResponse>(
    `${CRAWL_BASE}/targets`,
  );
  return data;
}

export function crawlTargetsQueryOptions() {
  return queryOptions({
    queryKey: crawlKeys.targets(),
    queryFn: getCrawlTargets,
  });
}

export function useCrawlTargetsQuery() {
  return useQuery(crawlTargetsQueryOptions());
}

/*
GET /api/v1/iidx/crawl/targets/{target_key} — 크롤 대상 상세. url 등 크롤러별 설정을
포함한다 (수정 폼 프리필용, ADMIN 전용).
*/
export async function getCrawlTargetDetail(targetKey: string) {
  const { data } = await api.get<CrawlTargetDetail>(
    `${CRAWL_BASE}/targets/${targetKey}`,
  );
  return data;
}

export function crawlTargetDetailQueryOptions(targetKey: string) {
  return queryOptions({
    queryKey: crawlKeys.targetDetail(targetKey),
    queryFn: () => getCrawlTargetDetail(targetKey),
  });
}

export function useCrawlTargetDetailQuery(
  targetKey: string,
  enabled = true,
) {
  return useQuery({ ...crawlTargetDetailQueryOptions(targetKey), enabled });
}

/*
POST /api/v1/iidx/crawl/targets — 크롤 대상 등록. 같은 kind 안에서 id가 이미 있으면 409.
*/
export async function createCrawlTarget(body: CrawlTargetCreateRequest) {
  const { data } = await api.post<CrawlTargetDetail>(
    `${CRAWL_BASE}/targets`,
    body,
  );
  return data;
}

export function useCreateCrawlTargetMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCrawlTarget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: crawlKeys.targets() });
    },
  });
}

/*
PUT /api/v1/iidx/crawl/targets/{target_key} — label/crawler/크롤러별 설정을 전체
교체한다(부분 patch 아님). kind/id는 변경 불가.
*/
export async function updateCrawlTarget(
  targetKey: string,
  body: CrawlTargetUpdateRequest,
) {
  const { data } = await api.put<CrawlTargetDetail>(
    `${CRAWL_BASE}/targets/${targetKey}`,
    body,
  );
  return data;
}

export function useUpdateCrawlTargetMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      targetKey,
      ...body
    }: CrawlTargetUpdateRequest & { targetKey: string }) =>
      updateCrawlTarget(targetKey, body),
    onSuccess: (_data, { targetKey }) => {
      queryClient.invalidateQueries({ queryKey: crawlKeys.targets() });
      queryClient.invalidateQueries({
        queryKey: crawlKeys.targetDetail(targetKey),
      });
    },
  });
}

/*
DELETE /api/v1/iidx/crawl/targets/{target_key} — 크롤 대상을 삭제한다. 걸려 있는
스케줄과 등록된 job도 함께 정리된다(cascade).
*/
export async function deleteCrawlTarget(targetKey: string) {
  await api.delete(`${CRAWL_BASE}/targets/${targetKey}`);
}

export function useDeleteCrawlTargetMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCrawlTarget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: crawlKeys.targets() });
      // 대상 삭제 시 걸려 있던 스케줄도 서버에서 함께 정리되므로 캐시도 맞춰 무효화한다.
      queryClient.invalidateQueries({ queryKey: crawlKeys.schedules() });
    },
  });
}

/*
POST /api/v1/iidx/crawl/preview — 선택한 크롤러를 실제 크롤 경로 그대로 실행해 결과를
반환한다. Supabase에는 반영하지 않는다.
*/
export async function previewCrawl(body: CrawlPreviewRequest) {
  const { data } = await api.post<CrawlPreviewResponse>(
    `${CRAWL_BASE}/preview`,
    body,
  );
  return data;
}

export function usePreviewCrawlMutation() {
  return useMutation({
    mutationFn: previewCrawl,
  });
}

/*
GET /api/v1/iidx/crawl/jobs — 최근 작업 목록. 실행 중인 작업이 있으면 폴링으로
진행 상황을 갱신한다.
*/
export async function getCrawlJobs(limit = CRAWL_JOBS_DEFAULT_LIMIT) {
  const { data } = await api.get<JobListResponse>(`${CRAWL_BASE}/jobs`, {
    params: { limit },
  });
  return data;
}

export function crawlJobsQueryOptions(limit = CRAWL_JOBS_DEFAULT_LIMIT) {
  return queryOptions({
    queryKey: crawlKeys.jobList(limit),
    queryFn: () => getCrawlJobs(limit),
    refetchInterval: (query) =>
      query.state.data?.jobs.some((job) => job.status === "RUNNING")
        ? CRAWL_JOBS_POLL_INTERVAL
        : false,
  });
}

export function useCrawlJobsQuery(limit?: number) {
  return useQuery(crawlJobsQueryOptions(limit));
}

/*
POST /api/v1/iidx/crawl/jobs — 크롤 동기화 작업을 생성하고 백그라운드로 실행한다.
scope="song"/"table" + target_id로 등록된 대상 하나를 참조하거나,
target으로 대상 설정을 직접 내려 등록 여부와 무관하게 즉시 실행할 수 있다.
*/
export async function triggerCrawl(body: JobCreateRequest) {
  const { data } = await api.post<CrawlJob>(`${CRAWL_BASE}/jobs`, body);
  return data;
}

export function useTriggerCrawlMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: triggerCrawl,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: crawlKeys.jobs() });
    },
  });
}

/*
GET /api/v1/iidx/crawl/schedules — 등록된 전체 대상의 스케줄 목록.
*/
export async function getSchedules() {
  const { data } = await api.get<TargetScheduleListResponse>(
    `${CRAWL_BASE}/schedules`,
  );
  return data;
}

export function schedulesQueryOptions() {
  return queryOptions({
    queryKey: crawlKeys.scheduleList(),
    queryFn: getSchedules,
  });
}

export function useSchedulesQuery() {
  return useQuery(schedulesQueryOptions());
}

/*
PUT /api/v1/iidx/crawl/schedules/{target_key} — 등록된 대상 하나의 스케줄 변경.
Redis에 저장 후 실행 중인 스케줄러에 즉시 반영된다.
*/
export async function updateSchedule(
  targetKey: string,
  body: TargetScheduleConfig,
) {
  const { data } = await api.put<TargetScheduleResponse>(
    `${CRAWL_BASE}/schedules/${targetKey}`,
    body,
  );
  return data;
}

export function useUpdateScheduleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      targetKey,
      ...body
    }: TargetScheduleConfig & { targetKey: string }) =>
      updateSchedule(targetKey, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: crawlKeys.schedules() });
    },
  });
}

/*
DELETE /api/v1/iidx/crawl/schedules/{target_key} — 등록된 대상 하나의 스케줄 삭제.
비활성 상태로 되돌리고 등록된 job을 제거한다.
*/
export async function deleteSchedule(targetKey: string) {
  const { data } = await api.delete<TargetScheduleResponse>(
    `${CRAWL_BASE}/schedules/${targetKey}`,
  );
  return data;
}

export function useDeleteScheduleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: crawlKeys.schedules() });
    },
  });
}
