import type { ReactNode } from "react";

/*
목록 상단의 필터 카드. 내부는 3열 그리드로 Field들을 배치한다.
*/
export function FilterCard({ children }: { children: ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
      <div className="grid grid-cols-3 gap-4">{children}</div>
    </div>
  );
}
