import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@forestlee0513/iinfo-dx-design-system";

/*
가운데 정렬 모달. 디자인 시스템 Dialog 위에 title/description/footer를 조합해 렌더한다.
closeDisabled면 배경 클릭·ESC·닫기 버튼으로 닫히지 않는다.
- title: 상단 제목
- description: 제목 아래 보조 설명(선택)
- footer: 하단 버튼 영역(선택)
*/
export function Modal({
  onClose,
  closeDisabled = false,
  title,
  description,
  footer,
  children,
  className,
}: {
  onClose: () => void;
  closeDisabled?: boolean;
  title: string;
  description?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  className?: string; // 기본 max-w-md보다 넓혀야 할 때(표가 넓은 모달 등) 오버라이드
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !closeDisabled) onClose();
      }}
    >
      <DialogContent showCloseButton={!closeDisabled} className={className}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}
