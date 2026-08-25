import type { CrawlPreviewResponse } from "@/api/iidx/crawl/types";
import { PreviewSongResult } from "./parts/PreviewSongResult";
import { PreviewTableResult } from "./parts/PreviewTableResult";

/*
크롤 미리보기 응답의 kind에 따라 곡 마스터/난이도표 결과 렌더러로 분기한다.
*/
export function CrawlPreviewResult({
  result,
}: {
  result?: CrawlPreviewResponse | null;
}) {
  if (!result) return null;
  if (result.kind === "song") return <PreviewSongResult result={result.song_result} />;
  if (result.kind === "table") return <PreviewTableResult tables={result.tables} />;
  return null;
}
