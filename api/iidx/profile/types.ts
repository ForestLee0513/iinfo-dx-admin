/*
노트 레이더 6지표 + 합계. 스타일별로 일부 지표가 없을 수 있어 모두 옵셔널.
*/
export interface RadarValues {
  notes?: number | null;
  chord?: number | null;
  peak?: number | null;
  charge?: number | null;
  scratch?: number | null;
  softLan?: number | null;
  total?: number | null;
}

/*
노트 레이더 - 플레이 스타일(SP/DP)별
*/
export interface NotesRadar {
  SP?: RadarValues | null;
  DP?: RadarValues | null;
}

/*
단위(급단) - 플레이 스타일(SP/DP)별
*/
export interface DanByStyle {
  SP?: string | null;
  DP?: string | null;
}

/*
아레나 클래스 - 플레이 스타일(SP/DP)별
*/
export interface ArenaClassByStyle {
  SP?: string | null;
  DP?: string | null;
}

/*
GET /api/v1/iidx/admin/users/{user_id} 응답 — IIDX 서비스 전용 프로필 (OpenAPI: AdminIidxProfileDetail)
계정 계층 정보(핸들/정지 이력 등)는 GET /admin/users/{id}가 별도로 반환한다.
onboarded=false면 iidx.profiles 행이 아직 없는 상태(서비스 미가입)라 나머지 필드는 모두 기본값/None이다.
*/
export interface AdminIidxProfileDetail {
  onboarded: boolean; // default: false
  is_public: boolean; // default: true
  service_role: string; // default: "USER"
  dj_name?: string | null;
  dj_id?: string | null;
  community_nickname?: string | null;
  play_count?: number | null;
  notes_radar?: NotesRadar | null;
  dan?: DanByStyle | null;
  arena_class?: ArenaClassByStyle | null;
}
