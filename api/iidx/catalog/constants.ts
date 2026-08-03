export const CATALOG_BASE = "/api/v1/iidx/admin";

/*
GET /api/v1/admin/songs 페이지네이션 기본값 — 서버 스키마와 동일하게 유지.
*/
export const CATALOG_SONGS_DEFAULT_PAGE = 1;
export const CATALOG_SONGS_DEFAULT_PER_PAGE = 50;

/*
곡 목록 "AC 수록" 필터 셀렉트 옵션. in_ac(boolean) 파라미터로 변환한다.
*/
export const AC_FILTER_OPTIONS = [
  { value: "전체", label: "전체" },
  { value: "수록", label: "수록" },
  { value: "미수록", label: "미수록" },
] as const;

/*
GET /api/v1/admin/tables/{slug} 엔트리 정렬 기준 — 서버 enum과 동일하게 유지.
*/
export const TABLE_ENTRY_SORT_OPTIONS = [
  { value: "difficulty", label: "난이도" },
  { value: "title", label: "제목" },
  { value: "level", label: "레벨" },
  { value: "grade", label: "등급" },
  { value: "rating", label: "레이팅" },
] as const;
