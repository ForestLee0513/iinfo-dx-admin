export const USERS_BASE = "/api/v1/admin/users";

/*
GET /api/v1/admin/users 페이지네이션 기본값/한계 — 서버 스키마와 동일하게 유지.
*/
export const USERS_DEFAULT_PAGE = 1;
export const USERS_DEFAULT_PER_PAGE = 20;
export const USERS_MAX_PER_PAGE = 100;

/*
provider 값 → 화면 표기. 목록에 없는 provider는 원문 그대로 노출한다.
*/
export const PROVIDER_LABELS: Record<string, string> = {
  google: "Google",
  email: "이메일",
};

/*
플랫폼(provider) 필터 셀렉트 옵션.
*/
export const PLATFORM_OPTIONS = [
  { value: "전체", label: "전체" },
  { value: "google", label: "Google" },
  { value: "email", label: "이메일" },
] as const;
