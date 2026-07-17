import { useEffect, useState } from "react";
import { IconMoon, IconSun } from "@tabler/icons-react";
import { Button } from "@forestlee0513/iinfo-dx-design-system";

import { useTheme } from "@/providers/ThemeProvider";

/*
서버 렌더링 시점엔 실제 테마를 알 수 없어 라이트 모드 아이콘으로 고정 렌더링되므로,
마운트 전에는 항상 같은 자리표시 아이콘을 보여줘 하이드레이션 불일치를 막는다.
*/
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={mounted && theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
      onClick={toggleTheme}
    >
      {mounted && theme === "dark" ? <IconSun /> : <IconMoon />}
    </Button>
  );
}
