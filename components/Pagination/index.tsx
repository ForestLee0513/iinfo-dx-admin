import type { MouseEvent } from "react";
import {
  CardFooter,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Pagination as DSPagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@forestlee0513/iinfo-dx-design-system";
import { getPageNumbers } from "./utils";

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

/*
테이블 카드 하단 페이지네이션. 페이지당 개수 선택 + 현재 범위 표시 + 페이지 이동.
onPageChange/onPageSizeChange로 상태 갱신을 위임한다. (선택 해제 등 부수 처리는 호출부 몫)
*/
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS as readonly number[],
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: readonly number[];
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function goTo(e: MouseEvent, next: number) {
    e.preventDefault();
    onPageChange(Math.min(totalPages, Math.max(1, next)));
  }

  return (
    <CardFooter className="justify-between">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>페이지당</span>
        <Select
          value={String(pageSize)}
          items={pageSizeOptions.map((s) => ({ value: String(s), label: String(s) }))}
          onValueChange={(value) => {
            if (value !== null) onPageSizeChange(Number(value));
          }}
        >
          <SelectTrigger size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((s) => (
              <SelectItem key={s} value={String(s)}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span>개</span>
        <span>
          (
          {total === 0
            ? "0개"
            : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} / 총 ${total}개`}
          )
        </span>
      </div>

      <DSPagination className="mx-0 w-auto">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              text="이전"
              aria-disabled={page === 1}
              className={
                page === 1 ? "pointer-events-none opacity-50" : undefined
              }
              onClick={(e) => goTo(e, page - 1)}
            />
          </PaginationItem>
          {getPageNumbers(page, totalPages).map((p, i) =>
            p === "ellipsis" ? (
              <PaginationItem key={`ellipsis-${i}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={p}>
                <PaginationLink
                  href="#"
                  isActive={p === page}
                  onClick={(e) => goTo(e, p)}
                >
                  {p}
                </PaginationLink>
              </PaginationItem>
            ),
          )}
          <PaginationItem>
            <PaginationNext
              href="#"
              text="다음"
              aria-disabled={page >= totalPages}
              className={
                page >= totalPages
                  ? "pointer-events-none opacity-50"
                  : undefined
              }
              onClick={(e) => goTo(e, page + 1)}
            />
          </PaginationItem>
        </PaginationContent>
      </DSPagination>
    </CardFooter>
  );
}
