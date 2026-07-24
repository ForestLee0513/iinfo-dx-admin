import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  Input,
  ToggleGroup,
  ToggleGroupItem,
} from "@forestlee0513/iinfo-dx-design-system";
import { RequiredMark } from "@/components/Field";
import { BAN_DURATION_OPTIONS } from "./types";
import type { BanDurationPickerProps, BanDurationValue } from "./types";
import { formatKoreanDateTime } from "./utils";

/*
정지 처리 모달의 기간 선택 필드. 프리셋 토글 + 커스텀 날짜 입력 + 해제 예정 안내를 함께 렌더한다.
회원 목록의 일괄 정지, 회원 상세의 개별 정지 모달이 함께 쓴다.
*/
export function BanDurationPicker({
  duration,
  onDurationChange,
  untilDate,
  onUntilDateChange,
  minDate,
  releaseDate,
  required = false,
}: BanDurationPickerProps) {
  return (
    <Field>
      <FieldLabel>
        정지 기간
        {required && <RequiredMark />}
      </FieldLabel>
      <FieldContent>
        <ToggleGroup
          variant="outline"
          value={[duration]}
          onValueChange={(value) => {
            const next = value[value.length - 1];
            if (next) onDurationChange(next as BanDurationValue);
          }}
        >
          {BAN_DURATION_OPTIONS.map((o) => (
            <ToggleGroupItem key={o.value} value={o.value}>
              {o.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        {duration === "custom" && (
          <Input
            type="date"
            value={untilDate}
            min={minDate}
            onChange={(e) => onUntilDateChange(e.target.value)}
            className="w-auto"
          />
        )}
        {duration !== "permanent" && releaseDate && (
          <FieldDescription>
            {formatKoreanDateTime(releaseDate)}에 정지가 해제됩니다.
          </FieldDescription>
        )}
      </FieldContent>
    </Field>
  );
}

export { BAN_DURATION_OPTIONS } from "./types";
export type { BanDurationValue } from "./types";
export { localDateAfter, resolveBanUntilDate } from "./utils";
