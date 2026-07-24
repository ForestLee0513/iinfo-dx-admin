import { AUTH_MEMBER_ROLE } from "@/api/auth/constants";
import type { AuthMemberRole } from "@/api/auth/types";

/*
사이드바 메뉴 정의.
roles를 지정하면 해당 역할에게만 노출되고, 생략하면 어드민 접근이 가능한
모든 역할에게 노출된다. 메뉴 숨김은 UX 제어일 뿐이므로 해당 페이지의
라우트/백엔드에서도 역할 검증이 함께 이루어져야 한다.

로그인 화면(app/routes/login.tsx)과 어드민 레이아웃(app/routes/admin.tsx)이
"첫 번째 페이지"를 동일하게 참조하도록 이 목록을 단일 출처로 공유한다.
*/
export type NavItem = {
  to: string;
  label: string;
  roles?: readonly AuthMemberRole[];
};

export const NAV_ITEMS: NavItem[] = [
  { to: "/members", label: "회원 관리" },
  {
    to: "/permissions",
    label: "권한 관리",
    roles: [AUTH_MEMBER_ROLE.SUPER_ADMIN],
  },
  { to: "/crawling", label: "크롤링 관리" },
  { to: "/ranking", label: "서열표 관리" },
];

/*
어드민 진입 시 기본 랜딩 경로 — 사이드바 첫 번째 메뉴.
역할 제한이 없어 어드민 접근이 가능한 모든 역할에게 노출되므로,
인증된 세션을 로그인 화면에서 곧바로 보낼 안전한 기본 목적지가 된다.
*/
export const ADMIN_LANDING_PATH = NAV_ITEMS[0].to;
