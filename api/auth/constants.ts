export const AUTH_BASE = "/api/v1/admin/auth";

/*
서비스 권한 역할 — 백엔드 UserRole(app_metadata.role)과 1:1 대응.
현재 서버 enum은 USER / ADMIN 두 가지다. 부관리자 등 신규 역할이 서버에
추가되면 여기에 멤버 한 줄을 더하고(예: OPERATOR: "OPERATOR"),
아래 ADMIN_ROLES에 어드민 콘솔 접근을 허용할지 여부만 반영하면 된다.
*/
export const AUTH_MEMBER_ROLE = {
  USER: "USER",
  ADMIN: "ADMIN",
  // OPERATOR: "OPERATOR", // 부관리자 예시 — 서버 역할 추가 시 주석 해제
} as const;

/*
어드민 콘솔 접근이 허용되는 역할 집합.
부관리자를 추가할 때는 AUTH_MEMBER_ROLE에 멤버를 더한 뒤 이 목록에 넣으면 된다.
*/
export const ADMIN_ROLES = [AUTH_MEMBER_ROLE.ADMIN] as const;

export const AUTH_OAUTH_PROVIDERS = ["google"] as const;

/*
OIDC 표준 prompt 값 (공급자 authorize URL에 그대로 전달됨).
- none: 인증/동의 UI 없이 조용히 진행, 활성 세션 없으면 에러
- login: 기존 세션이 있어도 재인증 강제
- consent: 동의 화면 강제
- select_account: 계정 선택 화면 강제
*/
export const AUTH_OAUTH_PROMPT = {
  NONE: "none",
  LOGIN: "login",
  CONSENT: "consent",
  SELECT_ACCOUNT: "select_account",
} as const;

/*
공급자별 기본 prompt 값. AUTH_OAUTH_PROVIDERS에 공급자를 추가하면
satisfies 제약으로 이 매핑도 함께 갱신하도록 강제된다.
*/
export const AUTH_OAUTH_PROVIDER_PROMPT = {
  google: AUTH_OAUTH_PROMPT.SELECT_ACCOUNT,
} as const satisfies Record<
  (typeof AUTH_OAUTH_PROVIDERS)[number],
  (typeof AUTH_OAUTH_PROMPT)[keyof typeof AUTH_OAUTH_PROMPT] | null
>;
