import {
  Button,
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@forestlee0513/iinfo-dx-design-system";
import { SCHEDULE_DAY_OPTIONS } from "@/api/iidx/crawl/constants";
import type { ScheduleDay } from "@/api/iidx/crawl/types";
import type { ScheduleEditorProps } from "./types";

const pad2 = (n: number) => String(n).padStart(2, "0");

/*
{hour, minute} ↔ <input type="time">의 "HH:MM" 문자열 변환. 디자인 시스템에는
전용 시각 선택 컴포넌트가 없어(shadcn도 마찬가지) 네이티브 time input을 쓴다 —
브라우저가 유효한 시:분만 입력되도록 강제해 준다.
*/
function toTimeValue(hour: number, minute: number) {
  return `${pad2(hour)}:${pad2(minute)}`;
}

function parseTimeValue(
  value: string,
): { hour: number; minute: number } | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

/*
크롤 스케줄의 요일+시각 트리거 목록을 추가/삭제/수정하는 편집기.
크롤링 관리 페이지의 스케줄 설정 모달이 사용한다.
*/
export function ScheduleEditor({ triggers, onChange }: ScheduleEditorProps) {
  function addTrigger() {
    onChange([...triggers, { day: "mon", hour: 3, minute: 0 }]);
  }

  function removeTrigger(index: number) {
    onChange(triggers.filter((_, i) => i !== index));
  }

  function updateTrigger(
    index: number,
    patch: Partial<(typeof triggers)[number]>,
  ) {
    onChange(triggers.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  }

  return (
    <Field>
      <FieldLabel>실행 시각</FieldLabel>
      <FieldContent>
        {triggers.length === 0 && (
          <FieldDescription>등록된 실행 시각이 없습니다.</FieldDescription>
        )}

        {triggers.map((trigger, i) => (
          <div key={i} className="flex items-center gap-2">
            <Select
              value={trigger.day}
              items={SCHEDULE_DAY_OPTIONS}
              onValueChange={(value) => {
                if (value !== null)
                  updateTrigger(i, { day: value as ScheduleDay });
              }}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCHEDULE_DAY_OPTIONS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="time"
              value={toTimeValue(trigger.hour, trigger.minute)}
              onChange={(e) => {
                const parsed = parseTimeValue(e.target.value);
                if (parsed) updateTrigger(i, parsed);
              }}
              className="w-auto"
            />
            <Button variant="ghost" size="sm" onClick={() => removeTrigger(i)}>
              삭제
            </Button>
          </div>
        ))}

        <Button
          variant="outline"
          size="sm"
          onClick={addTrigger}
          className="self-start"
        >
          시각 추가
        </Button>
      </FieldContent>
    </Field>
  );
}
