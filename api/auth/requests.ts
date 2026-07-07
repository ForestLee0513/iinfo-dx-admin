import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { api, setAccessToken } from "@/lib/axios";
import { AUTH_BASE, AUTH_OAUTH_PROVIDER_PROMPT } from "./constants";
import type {
  AuthLoginRequest,
  AuthLoginResponse,
  AuthMyInfoResponse,
  AuthOAuthLoginRequest,
  AuthRefreshResponse,
} from "./types";

/*
쿼리 키 - Query Keys
*/
export const authKeys = {
  all: ["auth"] as const,
  me: () => [...authKeys.all, "me"] as const,
};

/*
POST /api/v1/web/auth/login — 이메일 로그인
성공 시 서버가 세션(refresh) 쿠키를 설정한다 (withCredentials 필수).
*/
export async function loginWithEmail(body: AuthLoginRequest) {
  const { data } = await api.post<AuthLoginResponse>(
    `${AUTH_BASE}/login`,
    body,
  );
  setAccessToken(data.session.access_token);
  return data;
}

/*
로그인 응답의 user로 me 쿼리 캐시를 즉시 채워
로그인 직후 /me를 다시 요청하지 않게 한다.
*/
function seedMyInfo(
  queryClient: ReturnType<typeof useQueryClient>,
  { user }: AuthLoginResponse,
) {
  queryClient.setQueryData<AuthMyInfoResponse>(authKeys.me(), {
    id: user.id,
    email: user.email ?? "",
    provider: user.provider ?? "email",
    app_role: user.app_role,
  });
}

export function useEmailLoginMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: loginWithEmail,
    onSuccess: (data) => {
      seedMyInfo(queryClient, data);
    },
  });
}

/*
GET /api/v1/web/auth/login/{provider} — OAuth 로그인
XHR이 아닌 전체 페이지 리다이렉트로 진입해야 하며,
공급자 인증 완료 후 콜백에서 세션 쿠키가 설정된다.
*/
export function getOAuthLoginUrl({
  provider,
  redirect,
  prompt,
}: AuthOAuthLoginRequest) {
  const query = new URLSearchParams({ redirect });
  const promptValue = prompt ?? AUTH_OAUTH_PROVIDER_PROMPT[provider];
  if (promptValue) query.set("prompt", promptValue);
  return `${api.defaults.baseURL}${AUTH_BASE}/login/${provider}?${query}`;
}

export function startOAuthLogin(request: AuthOAuthLoginRequest) {
  window.location.assign(getOAuthLoginUrl(request));
}

/*
POST /api/v1/web/auth/refresh — 세션 갱신 (쿠키 기반, 본문 불필요)
*/
export async function refreshSession() {
  const { data } = await api.post<AuthRefreshResponse>(`${AUTH_BASE}/refresh`);
  setAccessToken(data.session.access_token);
  return data;
}

export function useRefreshSessionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: refreshSession,
    onSuccess: (data) => {
      seedMyInfo(queryClient, data);
    },
  });
}

/*
GET /api/v1/web/auth/me — 현재 로그인 사용자 조회
*/
export async function getMyInfo() {
  const { data } = await api.get<AuthMyInfoResponse>(`${AUTH_BASE}/me`);
  return data;
}

export const myInfoQueryOptions = queryOptions({
  queryKey: authKeys.me(),
  queryFn: getMyInfo,
});

export function useMyInfoQuery() {
  return useQuery(myInfoQueryOptions);
}

/*
POST /api/v1/web/auth/logout — 로그아웃
성공 시 서버가 세션 쿠키를 제거한다 (withCredentials 필수).
*/
export async function logout() {
  await api.post(`${AUTH_BASE}/logout`);
  setAccessToken(null);
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: authKeys.all });
    },
  });
}
