import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ScheduleEditor } from "@/components/ScheduleEditor";
import type { ScheduleTrigger } from "@/api/iidx/crawl/types";

/*
대상 등록/수정 폼에 함께 붙는 스케줄 설정 카드. 등록·수정과 한 번에 저장할 수
있도록 스케줄 활성화 여부(enabled) + 실행 시각 목록(triggers)만 상태로 받고,
실제 저장(PUT /schedules/{target_key})은 호출부(등록/수정 페이지)가 대상 저장과
묶어서 처리한다.
*/
export function ScheduleSection({
  enabled,
  onEnabledChange,
  triggers,
  onTriggersChange,
}: {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  triggers: ScheduleTrigger[];
  onTriggersChange: (triggers: ScheduleTrigger[]) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>스케줄</CardTitle>
        <CardDescription>
          지정한 요일·시각에 자동으로 크롤을 실행합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Switch checked={enabled} onCheckedChange={onEnabledChange} />
          <span className="text-sm">스케줄 활성화</span>
        </div>

        <ScheduleEditor triggers={triggers} onChange={onTriggersChange} />
      </CardContent>
    </Card>
  );
}
