import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/*
목록 상단의 필터 카드. 내부는 그리드로 Field들을 배치한다(기본 3열).
관련된 필드끼리 한 행에 묶어야 하는 폼(예: 대상 등록)은 columns={2}로 좁힌다.
*/
export function FilterCard({
  columns = 3,
  children,
}: {
  columns?: 2 | 3;
  children: ReactNode;
}) {
  return (
    <Card size="sm">
      <CardContent
        className={cn("grid gap-4", columns === 2 ? "grid-cols-2" : "grid-cols-3")}
      >
        {children}
      </CardContent>
    </Card>
  );
}
