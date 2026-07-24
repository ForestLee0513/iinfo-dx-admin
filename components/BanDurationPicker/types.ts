/*
정지 기간 선택지.
- days 프리셋: 오늘부터 N일 뒤 해제
- custom: datepicker로 해제일 직접 선택
- permanent: ban_until 미전송 → 영구 정지
*/
export const BAN_DURATION_OPTIONS = [
  { value: "1", label: "1일" },
  { value: "3", label: "3일" },
  { value: "7", label: "7일" },
  { value: "30", label: "30일" },
  { value: "custom", label: "날짜 지정" },
  { value: "permanent", label: "영구" },
] as const;

export type BanDurationValue = (typeof BAN_DURATION_OPTIONS)[number]["value"];

export type BanDurationPickerProps = {
  duration: BanDurationValue;
  onDurationChange: (value: BanDurationValue) => void;
  untilDate: string;
  onUntilDateChange: (value: string) => void;
  minDate: string;
  releaseDate?: Date;
  required?: boolean;
};
