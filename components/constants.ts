/*
회원 관련 화면에서 공통으로 쓰는 상수.
*/

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
