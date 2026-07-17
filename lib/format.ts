/*
ISO 문자열을 "YYYY-MM-DD"로 자른다. 값이 없으면 "-".
*/
export function formatDate(iso?: string | null) {
  if (!iso) return "-";
  return iso.slice(0, 10);
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/*
로컬 시각 기준 "YYYY-MM-DD HH:mm" 표기. 값이 없으면 "-".
정지 처리일·해제 예정일·해제일 등 날짜+시각을 함께 보여줘야 하는 곳에 쓴다.
*/
export function formatDateTime(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
