/*
어드민 카탈로그(난이도표·곡·버전) 조회 전용 도메인. 모두 읽기 전용 GET이며
백엔드 Admin Catalog 태그(/api/v1/admin/tables, /songs, /versions)에 대응한다.
*/

/*
난이도표 메타데이터 (목록 조회 — 엔트리 제외) (OpenAPI: TableSummary)
*/
export interface TableSummary {
  slug: string;
  name: string;
  source: string;
  play_style: string;
  rating_type: string;
  level?: number | null;
  grades?: string[] | null;
  updated_at: string; // ISO date-time
}

/*
GET /api/v1/admin/tables 응답 (OpenAPI: TableListResponse)
*/
export interface TableListResponse {
  tables: TableSummary[];
}

/*
difficulty_entries 한 행 — 표에 속한 곡 엔트리 (OpenAPI: DifficultyEntry)
*/
export interface DifficultyEntry {
  id: number;
  table_id: string;
  title: string;
  series?: string | null;
  play_style: string;
  difficulty: string;
  level?: number | null;
  grade?: string | null;
  rating?: number | null;
  table_type?: string | null;
  created_at: string; // ISO date-time
}

/*
GET /api/v1/admin/tables/{slug} 파라미터
*/
export interface TableDetailRequest {
  sort?: "title" | "level" | "grade" | "rating" | "difficulty";
  order?: "asc" | "desc"; // 기본 asc
}

/*
GET /api/v1/admin/tables/{slug} 응답 — 표 1개 + 엔트리 전체 (OpenAPI: TableDetail)
*/
export interface TableDetail {
  id: string;
  slug: string;
  name: string;
  source: string;
  play_style: string;
  rating_type: string;
  level?: number | null;
  grades?: string[] | null;
  created_at: string;
  updated_at: string;
  difficulty_entries: DifficultyEntry[];
}

/*
곡별 채보 1행 — SP/DP × 난이도 (OpenAPI: ChartSummary)
*/
export interface ChartSummary {
  play_style: string;
  difficulty: string;
  level?: number | null;
  notes?: number | null;
  in_ac: boolean;
}

/*
곡 목록의 곡 1개 요약 — 채보 제외 (OpenAPI: SongSummary)
*/
export interface SongSummary {
  id: string;
  textage_tag?: string | null;
  title: string;
  series?: string | null;
  genre?: string | null;
  artist?: string | null;
  bpm?: string | null;
  version?: number | null;
  version_name?: string | null;
  in_ac: boolean;
  updated_at: string; // ISO date-time
}

/*
GET /api/v1/admin/songs 파라미터
*/
export interface SongListRequest {
  page?: number; // 1 이상, 기본 1
  per_page?: number; // 기본 50
  title?: string; // 제목 부분 일치 검색
  version?: number; // 시리즈 버전 id
  in_ac?: boolean; // true=AC 수록, false=미수록
  sort?: string; // 기본 title
  order?: "asc" | "desc"; // 기본 asc
}

/*
GET /api/v1/admin/songs 응답 (OpenAPI: SongListResponse)
*/
export interface SongListResponse {
  songs: SongSummary[];
  page: number;
  per_page: number;
  total: number;
}

/*
GET /api/v1/admin/songs/{song_id} 응답 — 곡 1개 + 채보 전체 (OpenAPI: SongDetail)
*/
export interface SongDetail extends SongSummary {
  created_at: string;
  charts: ChartSummary[];
}

/*
IIDX 시리즈 버전 — 곡 필터 드롭다운/표시용 (OpenAPI: VersionSummary)
*/
export interface VersionSummary {
  id: number;
  name: string;
  abbrev?: string | null;
}

/*
GET /api/v1/admin/versions 응답 (OpenAPI: VersionListResponse)
*/
export interface VersionListResponse {
  versions: VersionSummary[];
}
