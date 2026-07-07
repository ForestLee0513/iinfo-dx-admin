import axios from "axios";
import type { AxiosError, InternalAxiosRequestConfig } from "axios";

import { AUTH_BASE } from "@/api/auth/constants";
import type { AuthRefreshResponse } from "@/api/auth/types";

// 프록시를 통해 same-origin으로 처리하므로 baseURL은 비워둔다.
// dev: Vite proxy(/api → localhost:8000), prod: nginx 등 리버스 프록시 필요
export const API_BASE_URL = "";

const REFRESH_URL = `${AUTH_BASE}/refresh`;
const LOGIN_URL_PREFIX = `${AUTH_BASE}/login`;

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // 세션(refresh) 쿠키를 모든 요청에 포함
  headers: {
    "Content-Type": "application/json",
  },
});

// HTTPBearer 보호 엔드포인트(/me 등)용 access token — 메모리에만 보관한다.
// 새로고침으로 사라지면 401 → refresh 인터셉터가 쿠키로 재발급받아 복구한다.
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

// refresh 후 재시도에도 401이면 호출되는 콜백 (Admin 레이아웃에서 등록)
let authErrorCallback: (() => void) | null = null;

export function setAuthErrorCallback(cb: (() => void) | null) {
  authErrorCallback = cb;
}

function handleAuthError() {
  setAccessToken(null);
  authErrorCallback?.();
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// 동시 다발 401에 대해 refresh 요청을 한 번만 보내기 위한 공유 프로미스
let refreshPromise: Promise<unknown> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as
      (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;

    const isAuthAttempt =
      original?.url === REFRESH_URL ||
      original?.url?.startsWith(LOGIN_URL_PREFIX);

    // 401이면 쿠키 기반 세션 갱신 후 원 요청을 1회 재시도한다.
    // 로그인/갱신 요청 자체의 401은 자격 증명 오류이므로 그대로 전파한다.
    if (
      error.response?.status === 401 &&
      original &&
      !original._retried &&
      !isAuthAttempt
    ) {
      refreshPromise ??= api
        .post<AuthRefreshResponse>(REFRESH_URL)
        .then((response) => {
          setAccessToken(response.data.session.access_token);
        })
        .finally(() => {
          refreshPromise = null;
        });

      try {
        await refreshPromise;
      } catch {
        // refresh 자체 실패 → 세션 완전 만료
        handleAuthError();
        return Promise.reject(error);
      }

      original._retried = true;
      return api(original);
    }

    // refresh 후 재시도에도 401 → 세션 만료로 강제 로그아웃
    if (error.response?.status === 401 && original?._retried && !isAuthAttempt) {
      handleAuthError();
    }

    return Promise.reject(error);
  },
);
