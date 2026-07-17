import { ADMIN_ROLES } from "./constants";
import type { AuthMemberRole } from "./types";

/*
어드민 콘솔 접근 가능 여부 — AUTH_MEMBER_ROLE 기준.
부관리자를 포함해 어드민 접근을 허용할 역할은 constants.ADMIN_ROLES에서 관리한다.
미등록/미확인 역할은 접근 불가로 안전 실패한다.
*/
export function canAccessAdmin(
  role: AuthMemberRole | string | undefined | null,
): boolean {
  return !!role && (ADMIN_ROLES as readonly string[]).includes(role);
}

/*
특정 역할과 정확히 일치하는지 확인하는 유틸.
세분화된 화면/기능 노출 제어에 사용한다.
*/
export function isRole(
  role: AuthMemberRole | string | undefined | null,
  target: AuthMemberRole,
): boolean {
  return role === target;
}

/*
Badge 컴포넌트의 variant prop과 동일한 값. 커스텀 색상 없이 디자인 시스템
토큰(variant)만으로 배지 색을 구분한다.
*/
export type BadgeVariant =
  "default" | "secondary" | "destructive" | "outline" | "ghost" | "link";

/*
역할(AuthMemberRole) → 화면 표기 라벨/배지 variant. 회원 상세·권한 관리 화면이 공유한다.
*/
export const ROLE_LABELS: Record<AuthMemberRole, string> = {
  USER: "일반 회원",
  ADMIN: "관리자",
  SUPER_ADMIN: "최고 관리자",
};

export const ROLE_BADGE_VARIANT: Record<AuthMemberRole, BadgeVariant> = {
  USER: "secondary",
  ADMIN: "default",
  SUPER_ADMIN: "destructive",
};
