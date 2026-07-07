import { QueryClient, defaultShouldDehydrateQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";

const isServer = typeof document === "undefined";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        // 4xx는 재시도해도 결과가 같으므로 중단한다.
        // (401은 axios 인터셉터가 refresh 후 1회 재시도까지 마친 최종 실패)
        retry: (failureCount, error) => {
          if (
            isAxiosError(error) &&
            error.response &&
            error.response.status < 500
          ) {
            return false;
          }
          return failureCount < 3;
        },
      },
      dehydrate: {
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

export function getQueryClient() {
  if (isServer) {
    // 서버: 요청마다 새 클라이언트를 만든다.
    return makeQueryClient();
  }
  // 브라우저: 초기 렌더 중 suspend로 재생성되지 않도록 싱글턴을 유지한다.
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}
