export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

/*
테이블 카드 하단 페이지네이션. 페이지당 개수 선택 + 현재 범위 표시 + 이전/다음 이동.
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

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span>페이지당</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-sm outline-none focus:border-gray-900 cursor-pointer"
        >
          {pageSizeOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <span>개</span>
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-600">
        <span>
          {total === 0
            ? "0개"
            : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} / 총 ${total}개`}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className="rounded-lg border border-gray-200 w-8 h-8 flex items-center justify-center text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ‹
          </button>
          <span className="px-3 py-1 text-sm font-medium text-gray-700">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="rounded-lg border border-gray-200 w-8 h-8 flex items-center justify-center text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
}
