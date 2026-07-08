import type { AuthMemberRole } from "@/api/auth/types";

/*
GET /api/v1/admin/users — 회원 목록 조회 파라미터
*/
export interface UserListRequest {
  page?: number; // 1 이상, 기본 1
  per_page?: number; // 1~100, 기본 20
  email?: string; // 이메일 부분 일치 검색
  provider?: string; // 가입 경로 필터 ("google" | "email" 등)
  is_banned?: boolean; // true=정지 중, false=활성
}

/*
회원 목록의 사용자 1명 요약 (OpenAPI: AdminUserSummary)
*/
export interface UserSummary {
  id: string;
  email?: string | null;
  provider?: string | null;
  created_at: string; // ISO date-time
  last_sign_in_at?: string | null;
  is_banned: boolean;
  ban_reason?: string | null;
  ban_until?: string | null; // null이면 영구 정지
}

/*
GET /api/v1/admin/users 응답 (OpenAPI: AdminUserListResponse)
Supabase Auth 페이지네이션을 그대로 전달한다.
*/
export interface UserListResponse {
  users: UserSummary[];
  page: number;
  per_page: number;
  total: number;
}

/*
user_profiles 테이블 내용 (OpenAPI: UserProfileDetail)
*/
export interface UserProfileDetail {
  is_public?: boolean; // default: true
  role?: AuthMemberRole; // default: "USER"
  updated_at?: string | null;
}

/*
GET /api/v1/admin/users/{user_id} 응답 (OpenAPI: AdminUserDetail)
요약 + 프로필 + 현재 활성 정지 정보.
*/
export interface UserDetail extends UserSummary {
  profile: UserProfileDetail;
  active_ban?: UserBanRecord | null;
}

/*
PUT /api/v1/admin/users/{user_id}/role 요청 (OpenAPI: RoleUpdateRequest)
SUPER_ADMIN 전용 API. SUPER_ADMIN 부여와 본인 역할 변경은 서버가 400으로 거부한다.
*/
export interface UserRoleUpdateRequest {
  role: AuthMemberRole;
}

/*
PUT /api/v1/admin/users/{user_id}/role 응답 (OpenAPI: RoleUpdateResponse)
*/
export interface UserRoleUpdateResponse {
  user_id: string;
  role: AuthMemberRole;
}

/*
POST /api/v1/admin/users/{user_id}/ban 요청 (OpenAPI: BanRequest)
*/
export interface UserBanRequest {
  reason: string;
  ban_until?: string | null; // ISO date-time, 미지정 시 영구 정지
}

/*
user_bans 테이블 레코드 — 정지 이력 1건 (OpenAPI: BanRecord)
*/
export interface UserBanRecord {
  id: string;
  user_id: string;
  reason: string;
  ban_until?: string | null;
  banned_by: string;
  banned_at: string;
  lifted_at?: string | null;
  lifted_by?: string | null;
}

/*
GET /api/v1/admin/users/{user_id}/bans 응답 (OpenAPI: BanListResponse)
*/
export interface UserBanListResponse {
  records: UserBanRecord[];
}
