import { queryOptions, useQuery } from "@tanstack/react-query";

import { api } from "@/lib/axios";
import { IIDX_PROFILE_BASE } from "./constants";
import type { AdminIidxProfileDetail } from "./types";

/*
쿼리 키 - Query Keys
*/
export const iidxProfileKeys = {
  all: ["iidxProfile"] as const,
  details: () => [...iidxProfileKeys.all, "detail"] as const,
  detail: (userId: string) => [...iidxProfileKeys.details(), userId] as const,
};

/*
GET /api/v1/iidx/admin/users/{user_id} — 어드민 회원 상세용 IIDX 서비스 프로필
*/
export async function getUserIidxProfile(userId: string) {
  const { data } = await api.get<AdminIidxProfileDetail>(
    `${IIDX_PROFILE_BASE}/${userId}`,
  );
  return data;
}

export function userIidxProfileQueryOptions(userId: string) {
  return queryOptions({
    queryKey: iidxProfileKeys.detail(userId),
    queryFn: () => getUserIidxProfile(userId),
  });
}

export function useUserIidxProfileQuery(userId: string) {
  return useQuery(userIidxProfileQueryOptions(userId));
}
