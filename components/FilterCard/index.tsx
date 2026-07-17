import type { ReactNode } from "react";
import { Card, CardContent } from "@forestlee0513/iinfo-dx-design-system";

/*
목록 상단의 필터 카드. 내부는 3열 그리드로 Field들을 배치한다.
*/
export function FilterCard({ children }: { children: ReactNode }) {
  return (
    <Card size="sm">
      <CardContent className="grid grid-cols-3 gap-4">{children}</CardContent>
    </Card>
  );
}
