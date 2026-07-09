/*
ISO 문자열을 "YYYY-MM-DD"로 자른다. 값이 없으면 "-".
*/
export function formatDate(iso?: string | null) {
  if (!iso) return "-";
  return iso.slice(0, 10);
}
