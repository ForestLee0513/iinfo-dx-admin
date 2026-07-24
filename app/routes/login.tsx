import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
  Input,
  Spinner,
} from "@forestlee0513/iinfo-dx-design-system";

import type { Route } from "./+types/login";
import {
  startOAuthLogin,
  useEmailLoginMutation,
  useMyInfoQuery,
} from "@/api/auth/requests";
import { canAccessAdmin } from "@/api/auth/roles";
import { ADMIN_LANDING_PATH } from "@/app/admin-nav";
import { ThemeToggle } from "@/components/ThemeToggle";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "IInfoDX Admin" },
    { name: "description", content: "IInfoDX 관리자 로그인" },
  ];
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const emailLogin = useEmailLoginMutation();

  const [oauthError] = useState(() => searchParams.get("error"));

  // 로그인 화면 진입 시 기존 세션을 검증한다. 인메모리 액세스 토큰은 새로고침으로
  // 사라지지만 httpOnly refresh 쿠키가 남아 있으면 /me 요청이 401 → refresh →
  // 재시도로 복구되므로(lib/axios.ts), 유효한 세션이면 아래 쿼리가 성공한다.
  const { data: me, isLoading: isCheckingSession } = useMyInfoQuery();
  const authorized = canAccessAdmin(me?.app_role);

  // 새로고침 시 재표시되지 않도록 URL에서 error 파라미터만 제거 (재렌더링 없이)
  useEffect(() => {
    if (oauthError) {
      window.history.replaceState(null, "", "/");
    }
  }, []);

  // 이미 인증된 세션이면 로그인 폼을 건너뛰고 사이드바 첫 번째 페이지로 이동한다.
  useEffect(() => {
    if (authorized) {
      navigate(ADMIN_LANDING_PATH, { replace: true });
    }
  }, [authorized, navigate]);

  function handleGoogleLogin() {
    startOAuthLogin({
      provider: "google",
      redirect: `${window.location.origin}${ADMIN_LANDING_PATH}`,
    });
  }

  // 세션 검증 중이거나 인증되어 리다이렉트가 진행되는 동안에는 로그인 폼이
  // 잠깐 노출되지 않도록 로딩 상태만 보여준다.
  if (isCheckingSession || authorized) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center px-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-2">
            Admin Console
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">IInfoDX</h1>
        </div>

        <Card>
          <CardContent className="flex flex-col gap-5">
            {oauthError && (
              <Alert variant="destructive">
                <AlertDescription>{oauthError}</AlertDescription>
              </Alert>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                emailLogin.mutate(
                  { email, password },
                  { onSuccess: () => navigate(ADMIN_LANDING_PATH) },
                );
              }}
            >
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="email">이메일</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@example.com"
                    autoComplete="email"
                    required
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="password">비밀번호</FieldLabel>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  {emailLogin.isError && (
                    <FieldError>
                      이메일 또는 비밀번호가 올바르지 않습니다.
                    </FieldError>
                  )}
                </Field>

                <Button type="submit" disabled={emailLogin.isPending}>
                  {emailLogin.isPending ? "로그인 중…" : "로그인"}
                </Button>

                <FieldSeparator>또는</FieldSeparator>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleLogin}
                >
                  <GoogleIcon />
                  Google 계정으로 로그인
                </Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
        fill="#EA4335"
      />
    </svg>
  );
}
