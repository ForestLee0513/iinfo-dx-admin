import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ArenaClassByStyle, DanByStyle } from "@/api/iidx/profile/types";

export function DanArenaTable({
  dan,
  arenaClass,
}: {
  dan?: DanByStyle | null;
  arenaClass?: ArenaClassByStyle | null;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium">단위 · 아레나 클래스</p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>구분</TableHead>
            <TableHead>SP</TableHead>
            <TableHead>DP</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="text-muted-foreground">단위</TableCell>
            <TableCell>{dan?.SP ?? "-"}</TableCell>
            <TableCell>{dan?.DP ?? "-"}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="text-muted-foreground">
              아레나 클래스
            </TableCell>
            <TableCell>{arenaClass?.SP ?? "-"}</TableCell>
            <TableCell>{arenaClass?.DP ?? "-"}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
