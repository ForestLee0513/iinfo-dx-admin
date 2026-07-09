import { isAxiosError } from "axios";

/*
서버 에러 응답에서 사용자에게 보여줄 메시지를 추출한다.
FastAPI는 실패 시 { detail: string } 또는 { detail: [{ msg }, ...] } 형태로 응답한다.
(예: 본인 정지 시도, 관리자 정지 불가 등은 서버가 detail 문자열로 사유를 내려준다)
추출에 실패하면 fallback 문자열을 반환한다.
*/
export function getApiErrorMessage(
  error: unknown,
  fallback = "요청 처리 중 오류가 발생했습니다.",
): string {
  if (isAxiosError(error)) {
    const detail = (error.response?.data as { detail?: unknown } | undefined)
      ?.detail;

    if (typeof detail === "string" && detail.trim()) {
      return detail.trim();
    }

    // 422 유효성 검증 오류: [{ msg, loc, ... }] 배열
    if (Array.isArray(detail)) {
      const msg = detail
        .map((d) => (d && typeof d === "object" ? (d as { msg?: string }).msg : null))
        .filter((m): m is string => Boolean(m))
        .join("\n");
      if (msg) return msg;
    }
  }

  return fallback;
}
