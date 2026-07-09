import type { ReactNode } from "react";

/*
라벨 + 입력 컨트롤을 세로로 묶는 폼 필드 래퍼.
*/
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}
