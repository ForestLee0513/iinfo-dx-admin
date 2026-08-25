import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { NotesRadar, RadarValues } from "@/api/iidx/profile/types";

const RADAR_METRICS: { key: keyof RadarValues; label: string }[] = [
  { key: "notes", label: "NOTES" },
  { key: "chord", label: "CHORD" },
  { key: "peak", label: "PEAK" },
  { key: "charge", label: "CHARGE" },
  { key: "scratch", label: "SCRATCH" },
  { key: "softLan", label: "SOF-LAN" },
  { key: "total", label: "TOTAL" },
];

const STYLES = ["SP", "DP"] as const;

function formatRadarValue(value?: number | null) {
  return value != null ? value.toFixed(2) : "-";
}

export function NotesRadarTable({
  notesRadar,
}: {
  notesRadar?: NotesRadar | null;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium">노트 레이더</p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>플레이 방식</TableHead>
            {RADAR_METRICS.map(({ key, label }) => (
              <TableHead key={key}>{label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {STYLES.map((style) => (
            <TableRow key={style}>
              <TableCell className="text-muted-foreground">{style}</TableCell>
              {RADAR_METRICS.map(({ key }) => (
                <TableCell key={key}>
                  {formatRadarValue(notesRadar?.[style]?.[key])}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
