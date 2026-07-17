import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@forestlee0513/iinfo-dx-design-system";

/*
테이블 컬럼 정의.
- header: 헤더 셀 내용
- cell: 행/인덱스를 받아 셀 내용을 렌더
- headerClassName/cellClassName: 지정 시 셀에 추가로 붙인다 (정렬·포맷 등 콘텐츠 성격의 클래스만)
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

const DEFAULT_SKELETON = <Skeleton className="h-4 w-16 rounded" />;

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
    <Card>
      {toolbar}

      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key} className={col.headerClassName}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: skeletonRows }, (_, i) => (
                <TableRow key={i}>
                  {columns.map((col) => (
                    <TableCell key={col.key} className={col.cellClassName}>
                      {col.skeleton ?? DEFAULT_SKELETON}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell
                  colSpan={colSpan}
                  className="py-16 text-center text-destructive"
                >
                  {errorMessage}
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={colSpan}
                  className="py-16 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, idx) => (
                <TableRow key={rowKey(row)} className={rowClassName?.(row)}>
                  {columns.map((col) => (
                    <TableCell key={col.key} className={col.cellClassName}>
                      {col.cell(row, idx)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>

      {footer}
    </Card>
  );
}
