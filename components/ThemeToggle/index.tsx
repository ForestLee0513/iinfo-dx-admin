import { IconMoon, IconSun } from "@tabler/icons-react";
import { Button } from "@forestlee0513/iinfo-dx-design-system";

import { useTheme } from "@/providers/ThemeProvider";

/*
아이콘을 두 개 다 렌더링해두고 Tailwind의 dark: 변형으로 보이는 쪽만 전환한다.
표시 여부가 CSS(= 이미 하이드레이션 전에 반영된 <html>의 dark 클래스)로만 결정되므로
서버/클라이언트 렌더 결과가 항상 동일해 하이드레이션 불일치나 아이콘 깜빡임이 없다.
*/
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
      onClick={toggleTheme}
      suppressHydrationWarning
    >
      <IconSun className="hidden dark:block" />
      <IconMoon className="block dark:hidden" />
    </Button>
  );
}
