import { PROVIDER_LABELS } from "@/components/constants";

/*
가입 경로(provider)를 회색 알약으로 표기. 알 수 없는 값은 원문 그대로, 없으면 "-".
*/
export function ProviderBadge({ provider }: { provider?: string | null }) {
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
      {provider ? (PROVIDER_LABELS[provider] ?? provider) : "-"}
    </span>
  );
}
