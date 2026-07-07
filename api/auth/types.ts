import {
  AUTH_MEMBER_ROLE,
  AUTH_OAUTH_PROMPT,
  AUTH_OAUTH_PROVIDERS,
} from "./constants";

/*
상수값 파생 타입 - derived from constants
*/
export type AuthMemberRole = keyof typeof AUTH_MEMBER_ROLE;
export type AuthOAuthProvider = (typeof AUTH_OAUTH_PROVIDERS)[number];
export type AuthOAuthPrompt =
  (typeof AUTH_OAUTH_PROMPT)[keyof typeof AUTH_OAUTH_PROMPT];

/*
공용 세션/사용자 형태 (OpenAPI: SessionData / AuthUser)
*/
export interface AuthSession {
  access_token: string;
  token_type: string; // default: "bearer"
  expires_in?: number | null;
}

export interface AuthUser {
  id: string;
  email?: string | null;
  provider?: string | null;
  app_role: AuthMemberRole; // default: "USER"
}

/*
GET /api/v1/web/auth/login/{provider} — OAuth 로그인 시작
*/
export interface AuthOAuthLoginRequest {
  provider: AuthOAuthProvider; // ex) "google"
  redirect: string; // 로그인 완료 후 돌려보낼 FE URL (허용 오리진만)
  prompt?: AuthOAuthPrompt; // 미지정 시 공급자 기본값 적용
}

/*
POST /api/v1/web/auth/login — 이메일 로그인 (OpenAPI: EmailCredentials)
*/
export interface AuthLoginRequest {
  email: string;
  password: string;
}

/*
POST /api/v1/web/auth/login|refresh 성공 응답 (OpenAPI: AuthSessionResponse)
*/
export interface AuthLoginResponse {
  session: AuthSession;
  user: AuthUser;
}

export type AuthRefreshResponse = AuthLoginResponse;

/*
POST /api/v1/web/auth/signup — 이메일 회원가입 (OpenAPI: SignupResponse)
*/
export interface AuthSignUpRequest {
  email: string;
  password: string;
}

export interface AuthSignUpResponse {
  email_confirmation_required: boolean;
  session?: AuthSession | null;
  user?: AuthUser | null;
}

/*
GET /api/v1/web/auth/me — 현재 로그인 사용자 조회
*/
export interface AuthMyInfoResponse {
  id: string;
  email: string;
  provider: string;
  app_role: AuthMemberRole;
}
