import type { ReactNode } from "react";
import {
  Field as DSField,
  FieldLabel,
} from "@forestlee0513/iinfo-dx-design-system";

/*
라벨 + 입력 컨트롤을 세로로 묶는 폼 필드 래퍼.
required가 true면 라벨 옆에 필수 표시(*)를 붙인다.
*/
export function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <DSField>
      <FieldLabel>
        {label}
        {required && <RequiredMark />}
      </FieldLabel>
      {children}
    </DSField>
  );
}

/*
필수 입력 항목임을 나타내는 별표(*). FieldLabel을 직접 쓰는 폼에서도
동일한 표시를 재사용할 수 있도록 별도로 내보낸다.
*/
export function RequiredMark() {
  return (
    <span className="ml-0.5 text-destructive" aria-label="필수 입력">
      *
    </span>
  );
}
