import type { ReactNode } from "react";
import { createPortal } from "react-dom";

/*
가운데 정렬 모달 셸. 배경(backdrop) 클릭 시 닫히며, closeDisabled면 닫기를 막는다.
createPortal로 document.body에 렌더링해 호출부 DOM 트리(overflow/z-index/stacking)에
종속되지 않는다.
- title: 상단 제목
- description: 제목 아래 보조 설명(선택)
- footer: 하단 버튼 영역(선택). 제공 시 우측 정렬로 배치한다.
*/
export function Modal({
  onClose,
  closeDisabled = false,
  title,
  description,
  footer,
  children,
}: {
  onClose: () => void;
  closeDisabled?: boolean;
  title: string;
  description?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
}) {
  // SSR(서버 빌드)에는 document가 없으므로 포털을 만들지 않는다.
  // 모달은 클라이언트 상호작용으로만 열리므로 서버 렌더 대상이 아니다.
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4"
      onClick={() => !closeDisabled && onClose()}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        )}
        {children}
        {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
