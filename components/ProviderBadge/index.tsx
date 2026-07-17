import { Badge } from "@forestlee0513/iinfo-dx-design-system";
import { PROVIDER_LABELS } from "@/api/users/constants";

/*
가입 경로(provider)를 배지로 표기. 알 수 없는 값은 원문 그대로, 없으면 "-".
*/
export function ProviderBadge({ provider }: { provider?: string | null }) {
  return (
    <Badge variant="secondary">
      {provider ? (PROVIDER_LABELS[provider] ?? provider) : "-"}
    </Badge>
  );
}
