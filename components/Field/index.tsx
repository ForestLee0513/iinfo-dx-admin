import type { ReactNode } from "react";
import {
  Field as DSField,
  FieldLabel,
} from "@forestlee0513/iinfo-dx-design-system";

/*
라벨 + 입력 컨트롤을 세로로 묶는 폼 필드 래퍼.
*/
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <DSField>
      <FieldLabel>{label}</FieldLabel>
      {children}
    </DSField>
  );
}
