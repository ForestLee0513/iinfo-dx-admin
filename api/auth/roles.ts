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
