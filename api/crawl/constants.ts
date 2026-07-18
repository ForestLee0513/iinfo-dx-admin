export const CRAWL_BASE = "/api/v1/crawl";

/*
GET /api/v1/crawl/jobs limit 상한 — 서버 스키마와 동일하게 유지.
*/
export const CRAWL_JOBS_DEFAULT_LIMIT = 20;
export const CRAWL_JOBS_MAX_LIMIT = 50;

/*
실행 중인 작업이 있을 때 작업 목록을 폴링하는 주기(ms).
*/
export const CRAWL_JOBS_POLL_INTERVAL = 3000;

export const CRAWL_KIND_OPTIONS = [
  { value: "table", label: "난이도표" },
  { value: "song", label: "수록곡 정보" },
] as const;

export const CRAWL_SCOPE_OPTIONS = [
  { value: "table", label: "난이도표" },
  { value: "song", label: "수록곡 정보" },
  { value: "full", label: "전체" },
] as const;

export const SCHEDULE_DAY_OPTIONS = [
  { value: "mon", label: "월" },
  { value: "tue", label: "화" },
  { value: "wed", label: "수" },
  { value: "thu", label: "목" },
  { value: "fri", label: "금" },
  { value: "sat", label: "토" },
  { value: "sun", label: "일" },
] as const;

export const JOB_STATUS_LABELS: Record<string, string> = {
  RUNNING: "실행 중",
  DONE: "완료",
  FAILED: "실패",
};

export const JOB_STEP_STATUS_LABELS: Record<string, string> = {
  PENDING: "대기",
  RUNNING: "실행 중",
  DONE: "완료",
  FAILED: "실패",
};
