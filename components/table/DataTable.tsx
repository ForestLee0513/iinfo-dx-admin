import type { ReactNode } from "react";

/*
테이블 컬럼 정의.
- header: 헤더 셀 내용
- cell: 행/인덱스를 받아 셀 내용을 렌더
- headerClassName/cellClassName: 지정 시 기본 클래스를 대체한다
- skeleton: 로딩 스켈레톤 셀에 넣을 placeholder (미지정 시 기본 막대)
*/
export type Column<T> = {
  key: string;
  header: ReactNode;
  cell: (row: T, index: number) => ReactNode;
  headerClassName?: string;
  cellClassName?: string;
  skeleton?: ReactNode;
};

const DEFAULT_HEADER_CLASS =
  "px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap first:px-5";
const DEFAULT_CELL_CLASS = "px-4 py-3.5";
const DEFAULT_SKELETON = <div className="h-4 w-16 rounded bg-gray-100" />;

/*
목록 화면 공통 테이블 카드. 상단 toolbar / 테이블 / 하단 footer로 구성되며,
로딩(스켈레톤)·에러·빈 상태를 내부에서 처리한다.
*/
export function DataTable<T>({
  columns,
  data,
  rowKey,
  isLoading = false,
  isError = false,
  skeletonRows = 10,
  emptyMessage = "검색 결과가 없습니다.",
  errorMessage = "목록을 불러오지 못했습니다.",
  rowClassName,
  toolbar,
  footer,
}: {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string;
  isLoading?: boolean;
  isError?: boolean;
  skeletonRows?: number;
  emptyMessage?: string;
  errorMessage?: string;
  rowClassName?: (row: T) => string;
  toolbar?: ReactNode;
  footer?: ReactNode;
}) {
  const colSpan = columns.length;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {toolbar}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={col.headerClassName ?? DEFAULT_HEADER_CLASS}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              Array.from({ length: skeletonRows }, (_, i) => (
                <tr key={i} className="animate-pulse">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={col.cellClassName ?? DEFAULT_CELL_CLASS}
                    >
                      {col.skeleton ?? DEFAULT_SKELETON}
                    </td>
                  ))}
                </tr>
              ))
            ) : isError ? (
              <tr>
                <td
                  colSpan={colSpan}
                  className="px-6 py-16 text-center text-red-500"
                >
                  {errorMessage}
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={colSpan}
                  className="px-6 py-16 text-center text-gray-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr
                  key={rowKey(row)}
                  className={`transition-colors hover:bg-gray-50/70 ${
                    rowClassName?.(row) ?? ""
                  }`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={col.cellClassName ?? DEFAULT_CELL_CLASS}
                    >
                      {col.cell(row, idx)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {footer}
    </div>
  );
}
