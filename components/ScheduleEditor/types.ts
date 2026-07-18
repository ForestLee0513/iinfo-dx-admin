import type { ScheduleTrigger } from "@/api/crawl/types";

export interface ScheduleEditorProps {
  triggers: ScheduleTrigger[];
  onChange: (triggers: ScheduleTrigger[]) => void;
}
