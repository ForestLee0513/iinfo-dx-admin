export type CrawlKind = "song" | "table";
export type CrawlScope = "full" | "song" | "table";
export type CrawlJobStatus = "RUNNING" | "DONE" | "FAILED";
export type CrawlJobStepStatus = "PENDING" | "RUNNING" | "DONE" | "FAILED";
export type ScheduleDay = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

/*
크롤 대상 1건 (OpenAPI: CrawlTarget) — 어드민 대시보드 드롭다운(스케줄 생성용) 소스.
최소 필드만 담는다 — url 등 크롤러별 설정은 CrawlTargetDetail에서만 조회.
*/
export interface CrawlTarget {
  key: string;
  kind: CrawlKind;
  id: string;
  label: string;
  crawler: string;
}

/*
GET /api/v1/crawl/targets 응답 (OpenAPI: CrawlTargetsResponse)
설정된 크롤 대상 + 등록된 크롤러 목록 (진단 + 드롭다운 소스 겸용).
*/
export interface CrawlTargetsResponse {
  registered_crawlers: Record<string, string[]>;
  targets: CrawlTarget[];
}

/*
크롤러에 넘길 설정. 크롤러마다 사용하는 필드가 다르다.
- 5ch_sheet   : url, play_style, level
- numeric_json: url, slug, name, source, play_style, level
CrawlPreviewRequest.target, CrawlTargetCreateRequest/UpdateRequest의 크롤러별
추가 설정에 공통으로 쓰인다.
*/
export interface CrawlerTargetFields {
  url?: string | null;
  play_style?: "SP" | "DP" | null;
  level?: number | null; // 1~12
  slug?: string | null;
  name?: string | null;
  source?: string | null;
  [key: string]: unknown;
}

export type PreviewTarget = CrawlerTargetFields;

/*
POST /api/v1/crawl/preview 요청 (OpenAPI: CrawlPreviewRequest)
선택한 크롤러를 실제 크롤 경로 그대로 실행해 결과를 반환한다. Supabase에는 반영하지 않는다.
*/
export interface CrawlPreviewRequest {
  kind?: CrawlKind; // default: "table"
  crawler?: string; // default: "5ch_sheet"
  target: PreviewTarget;
  title?: string | null;
}

/*
POST /api/v1/crawl/targets 요청 (OpenAPI: CrawlTargetCreateRequest)
같은 kind 안에서 id가 이미 있으면 409. crawler별 추가 설정(url/play_style/level/
slug/name/source 등)은 정의되지 않은 키로 그대로 허용한다.
*/
export interface CrawlTargetCreateRequest extends CrawlerTargetFields {
  kind: CrawlKind;
  id: string;
  label: string;
  crawler: string;
}

/*
GET/POST/PUT /api/v1/crawl/targets(/{target_key}) 응답 (OpenAPI: CrawlTargetDetail)
크롤러별 추가 설정(url 등)을 그대로 포함한다 (ADMIN 전용, 수정 폼 프리필용).
공개 목록(CrawlTarget)은 최소 필드만 노출하므로 별도 모델로 분리되어 있다.
*/
export interface CrawlTargetDetail extends CrawlerTargetFields {
  key: string;
  kind: CrawlKind;
  id: string;
  label: string;
  crawler: string;
}

/*
PUT /api/v1/crawl/targets/{target_key} 요청 (OpenAPI: CrawlTargetUpdateRequest)
kind/id는 경로(target_key)로 고정되어 본문에서 받지 않는다.
label/crawler/크롤러별 추가 설정을 전체 교체한다(부분 patch 아님).
*/
export interface CrawlTargetUpdateRequest extends CrawlerTargetFields {
  label: string;
  crawler: string;
}

export interface PreviewTableDef {
  slug: string;
  name: string;
  source: string;
  play_style: string;
  rating_type: string;
  level?: number | null;
  grades?: string[] | null;
}

/*
GRADE 방식은 grade를, NUMERIC 방식은 rating을 채운다.
*/
export interface PreviewEntry {
  title: string;
  series?: string | null;
  play_style: string;
  difficulty: string;
  level?: number | null;
  grade?: string | null;
  rating?: number | null;
  table_type?: string | null;
}

export interface PreviewTable {
  table: PreviewTableDef;
  entry_count: number;
  entries: PreviewEntry[];
}

export interface VersionPreview {
  id: number;
  name: string;
}

export interface ChartPreview {
  [key: string]: unknown;
}

export interface SongPreview {
  tag: string;
  title: string;
  genre?: string | null;
  artist?: string | null;
  version?: number | null;
  in_ac?: boolean; // default: true
  charts: ChartPreview[];
}

/*
실제로 sync될 내용의 미리보기. SLOTS 배치 검증에 사용한다.
*/
export interface SongMasterPreviewResponse {
  source: string;
  songs_total: number;
  charts_total: number;
  versions: VersionPreview[];
  songs: SongPreview[];
}

/*
POST /api/v1/crawl/preview 응답 (OpenAPI: CrawlPreviewResponse)
*/
export interface CrawlPreviewResponse {
  kind: CrawlKind;
  crawler: string;
  target: Record<string, unknown>;
  tables?: PreviewTable[] | null;
  song_result?: SongMasterPreviewResponse | null;
}

/*
POST /api/v1/crawl/jobs 요청 (OpenAPI: JobCreateRequest)
수동 크롤 실행 요청. full = 수록곡 정보 → 난이도표 순차(전체 대상).
scope="song"/"table"일 때 target_id(등록된 대상 참조) 또는 target(대상을 직접
지정 — crawler 키 필수, 미등록 대상도 즉시 실행 가능) 중 하나만 줄 수 있다.
둘 다 생략하면 해당 종류의 등록된 전체 대상을 동기화한다.
*/
export interface JobCreateRequest {
  scope?: CrawlScope; // default: "full"
  target_id?: string | null;
  target?: Record<string, unknown> | null;
}

/*
JobStep.result.results 배열의 원소 — 스텝 하나 안에서 대상(수록곡 정보 source /
난이도표 slug·crawler) 단위로 실행된 개별 결과. 백엔드(run_song_sync/
run_table_sync)가 status="FAILED"인 원소만 명시적으로 표시하고 그 외는
성공으로 간주하므로, FE도 동일하게 status !== "FAILED"를 성공으로 취급한다.
크롤러/RPC마다 나머지 필드(songs_total 등)가 달라 인덱스 시그니처로 남긴다.
*/
export interface JobStepResultItem {
  status?: string | null; // "SUCCESS" | "FAILED" | 그 외(성공으로 간주)
  error?: string | null;
  crawler?: string | null;
  source?: string | null;
  slug?: string | null;
  target?: string | null; // 크롤 실패 시 대상 url
  [key: string]: unknown;
}

/*
JobStep.result — song_sync/table_sync 파이프라인의 실행 결과 요약.
status="SKIPPED"는 동시 실행 잠금에 걸려 건너뛴 경우(reason에 사유).
*/
export interface JobStepResult {
  status: string; // "DONE" | "FAILED" | "SKIPPED"
  log?: string | null;
  reason?: string | null;
  results?: JobStepResultItem[] | null;
}

/*
작업의 단일 스텝 (OpenAPI: JobStep). 스텝 단위로 Redis에 체크포인트가 남아
이어하기 기준이 된다.
*/
export interface JobStep {
  name: string;
  status: CrawlJobStepStatus; // default: "PENDING"
  result?: JobStepResult | null;
  error?: string | null;
}

/*
크롤 동기화 작업 상태 (OpenAPI: CrawlJob). 어드민 FE가 폴링으로 진행 상황을 확인한다.
*/
export interface CrawlJob {
  id: string;
  scope: CrawlScope;
  target_id?: string | null;
  target?: Record<string, unknown> | null;
  status: CrawlJobStatus;
  triggered_by: string;
  steps: JobStep[];
  resumed?: boolean; // default: false
  created_at: string;
  finished_at?: string | null;
}

/*
GET /api/v1/crawl/jobs 응답 (OpenAPI: JobListResponse)
*/
export interface JobListResponse {
  jobs: CrawlJob[];
}

/*
스케줄 트리거 1건 (특정 요일 + 시각) (OpenAPI: ScheduleTrigger). 대상 하나에
여러 개 지정 가능.
*/
export interface ScheduleTrigger {
  day: ScheduleDay;
  hour: number; // 0~23
  minute: number; // 0~59
}

/*
크롤 대상 1건에 대한 스케줄 설정 (OpenAPI: TargetScheduleConfig) — 요일·시각을
여러 개 지정할 수 있다.
*/
export interface TargetScheduleConfig {
  enabled: boolean;
  triggers?: ScheduleTrigger[];
}

/*
GET/PUT/DELETE /api/v1/crawl/schedules/{target_key} 응답 (OpenAPI: TargetScheduleResponse)
*/
export interface TargetScheduleResponse {
  enabled: boolean;
  triggers: ScheduleTrigger[];
  target_key: string;
  kind: CrawlKind;
  label: string;
  timezone: string;
  next_run_at?: string | null;
}

/*
GET /api/v1/crawl/schedules 응답 (OpenAPI: TargetScheduleListResponse)
*/
export interface TargetScheduleListResponse {
  schedules: TargetScheduleResponse[];
}
