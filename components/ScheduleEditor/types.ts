import type { ScheduleTrigger } from "@/api/iidx/crawl/types";

export interface ScheduleEditorProps {
  triggers: ScheduleTrigger[];
  onChange: (triggers: ScheduleTrigger[]) => void;
}
