import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { api } from "@/lib/axios";
import {
  USERS_BASE,
  USERS_DEFAULT_PAGE,
  USERS_DEFAULT_PER_PAGE,
} from "./constants";
import type {
  UserBanListResponse,
  UserBanRecord,
  UserBanRequest,
  UserDetail,
  UserListRequest,
  UserListResponse,
  UserRoleUpdateRequest,
  UserRoleUpdateResponse,
} from "./types";

/*
쿼리 키 - Query Keys
*/
export const userKeys = {
  all: ["users"] as const,
  lists: () => [...userKeys.all, "list"] as const,
  list: (params: UserListRequest) => [...userKeys.lists(), params] as const,
  details: () => [...userKeys.all, "detail"] as const,
  detail: (userId: string) => [...userKeys.details(), userId] as const,
  bans: (userId: string) => [...userKeys.all, "bans", userId] as const,
};

/*
GET /api/v1/admin/users — 회원 목록 조회
Supabase Auth 사용자 + 현재 정지 여부.
*/
export async function getUserList(params: UserListRequest = {}) {
  const { data } = await api.get<UserListResponse>(USERS_BASE, { params });
  return data;
}

/*
빈 문자열/미지정 필터는 파라미터에서 제외해 쿼리 키를 안정적으로 유지한다.
*/
export function userListQueryOptions({
  page = USERS_DEFAULT_PAGE,
  per_page = USERS_DEFAULT_PER_PAGE,
  email,
  provider,
  is_banned,
}: UserListRequest = {}) {
  const params: UserListRequest = { page, per_page };
  if (email) params.email = email;
  if (provider) params.provider = provider;
  if (is_banned !== undefined) params.is_banned = is_banned;

  return queryOptions({
    queryKey: userKeys.list(params),
    queryFn: () => getUserList(params),
    // 페이지/필터 전환 시 이전 목록을 유지해 깜빡임을 줄인다.
    placeholderData: keepPreviousData,
  });
}

export function useUserListQuery(params?: UserListRequest) {
  return useQuery(userListQueryOptions(params));
}

/*
GET /api/v1/admin/users/{user_id} — 회원 상세 조회
Auth 정보 + user_profiles + 현재 활성 정지.
*/
export async function getUserDetail(userId: string) {
  const { data } = await api.get<UserDetail>(`${USERS_BASE}/${userId}`);
  return data;
}

export function userDetailQueryOptions(userId: string) {
  return queryOptions({
    queryKey: userKeys.detail(userId),
    queryFn: () => getUserDetail(userId),
  });
}

export function useUserDetailQuery(userId: string) {
  return useQuery(userDetailQueryOptions(userId));
}

/*
GET /api/v1/admin/users/{user_id}/bans — 접근 제한 이력 조회 (최신 순)
*/
export async function getUserBans(userId: string) {
  const { data } = await api.get<UserBanListResponse>(
    `${USERS_BASE}/${userId}/bans`,
  );
  return data;
}

export function userBansQueryOptions(userId: string) {
  return queryOptions({
    queryKey: userKeys.bans(userId),
    queryFn: () => getUserBans(userId),
  });
}

export function useUserBansQuery(userId: string) {
  return useQuery(userBansQueryOptions(userId));
}

/*
정지/해제 후 해당 사용자와 목록 캐시를 함께 무효화한다.
(목록의 is_banned, 상세의 active_ban, 이력이 모두 바뀌므로)
*/
function invalidateUser(
  queryClient: ReturnType<typeof useQueryClient>,
  userId: string,
) {
  queryClient.invalidateQueries({ queryKey: userKeys.lists() });
  queryClient.invalidateQueries({ queryKey: userKeys.detail(userId) });
  queryClient.invalidateQueries({ queryKey: userKeys.bans(userId) });
}

/*
POST /api/v1/admin/users/{user_id}/ban — 사용자 접근 제한
ban_until 미지정 시 영구 정지.
*/
export async function banUser(userId: string, body: UserBanRequest) {
  const { data } = await api.post<UserBanRecord>(
    `${USERS_BASE}/${userId}/ban`,
    body,
  );
  return data;
}

export function useBanUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      ...body
    }: UserBanRequest & { userId: string }) => banUser(userId, body),
    onSuccess: (_data, { userId }) => {
      invalidateUser(queryClient, userId);
    },
  });
}

/*
PUT /api/v1/admin/users/{user_id}/role — 역할 변경 (SUPER_ADMIN 전용)
SUPER_ADMIN 부여와 본인 역할 변경은 서버가 400으로 거부한다.
*/
export async function updateUserRole(
  userId: string,
  body: UserRoleUpdateRequest,
) {
  const { data } = await api.put<UserRoleUpdateResponse>(
    `${USERS_BASE}/${userId}/role`,
    body,
  );
  return data;
}

export function useUpdateUserRoleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      ...body
    }: UserRoleUpdateRequest & { userId: string }) =>
      updateUserRole(userId, body),
    // 역할은 목록(role)과 상세(profile.role) 양쪽에서 읽으므로 함께 무효화한다.
    onSuccess: (_data, { userId }) => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      queryClient.invalidateQueries({ queryKey: userKeys.detail(userId) });
    },
  });
}

/*
DELETE /api/v1/admin/users/{user_id}/ban — 현재 활성 접근 제한 해제
*/
export async function unbanUser(userId: string) {
  await api.delete(`${USERS_BASE}/${userId}/ban`);
}

export function useUnbanUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: unbanUser,
    onSuccess: (_data, userId) => {
      invalidateUser(queryClient, userId);
    },
  });
}
