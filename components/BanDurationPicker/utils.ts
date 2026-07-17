import type { BanDurationValue } from "./types";

const pad2 = (n: number) => String(n).padStart(2, "0");

/*
오늘 기준 n일 뒤 날짜를 로컬 기준 YYYY-MM-DD로 반환한다. (date input 값/min용)
*/
export function localDateAfter(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/*
"nnnn년 nn월 nn일 HH:mm" 표기. (정지 해제 예정 일시 안내용)
*/
export function formatKoreanDateTime(d: Date) {
  return `${d.getFullYear()}년 ${pad2(d.getMonth() + 1)}월 ${pad2(d.getDate())}일 ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/*
선택한 기간을 해제 예정 일시로 변환한다. 기준 시각은 팝업을 연 시각(openedAt).
- 프리셋: 기준 시각에서 N일 뒤
- 날짜 지정: 선택한 날짜의 기준 시각(시:분:초)에 해제 (날짜 미선택이면 undefined)
- 영구: undefined
*/
export function resolveBanUntilDate(
  duration: BanDurationValue,
  untilDate: string,
  openedAt: Date,
): Date | undefined {
  if (duration === "permanent") return undefined;
  if (duration === "custom") {
    if (!untilDate) return undefined;
    const d = new Date(`${untilDate}T00:00:00`);
    d.setHours(
      openedAt.getHours(),
      openedAt.getMinutes(),
      openedAt.getSeconds(),
      0,
    );
    return d;
  }
  const days = Number(duration);
  return new Date(openedAt.getTime() + days * 24 * 60 * 60 * 1000);
}
