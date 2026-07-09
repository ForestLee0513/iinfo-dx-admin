import type { ReactNode } from "react";

export type BadgeColor = "gray" | "green" | "red" | "blue" | "purple";

const BADGE_COLORS: Record<BadgeColor, string> = {
  gray: "bg-gray-100 text-gray-700",
  green: "bg-green-50 text-green-700",
  red: "bg-red-50 text-red-600",
  blue: "bg-blue-50 text-blue-700",
  purple: "bg-purple-50 text-purple-700",
};

/*
알약 형태의 상태/라벨 배지. color로 색을 고르고, className으로 추가 스타일을 덧붙인다.
*/
export function Badge({
  color = "gray",
  className = "",
  children,
}: {
  color?: BadgeColor;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${BADGE_COLORS[color]} ${className}`}
    >
      {children}
    </span>
  );
}
