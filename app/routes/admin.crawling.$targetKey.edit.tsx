import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  useCrawlTargetDetailQuery,
  useCrawlTargetsQuery,
  usePreviewCrawlMutation,
  useSchedulesQuery,
  useUpdateCrawlTargetMutation,
  useUpdateScheduleMutation,
} from "@/api/iidx/crawl/requests";
import { CRAWL_KIND_OPTIONS } from "@/api/iidx/crawl/constants";
import type { ScheduleTrigger } from "@/api/iidx/crawl/types";
import { CrawlPreviewResult } from "@/components/CrawlPreviewResult";
import { Field } from "@/components/Field";
import { FilterCard } from "@/components/FilterCard";
import { ScheduleSection } from "@/components/ScheduleSection";
import { getApiErrorMessage } from "@/lib/api-error";

const PLAY_STYLE_OPTIONS = ["미지정", "SP", "DP"].map((o) => ({
  value: o,
  label: o,
}));

export function meta() {
  return [{ title: "대상 수정 - IInfoDX Admin" }];
}

/*
크롤 대상 수정 페이지. kind/id는 target_key로 고정되어 변경할 수 없어 읽기
전용으로 보여주고, url 등 크롤러별 설정은 GET /targets/{target_key}로 상세를
불러와 프리필한다. 신규 등록은 종류별 페이지(admin.crawling.new(.song).tsx)로
분리되어 있어 이 페이지는 수정 전용이다. 스케줄도 같은 화면에서 함께 저장한다.
*/
export default function CrawlingTargetEdit() {
  const navigate = useNavigate();
  const { targetKey: encodedKey } = useParams<{ targetKey: string }>();
  const targetKey = decodeURIComponent(encodedKey ?? "");

  const targetsQuery = useCrawlTargetsQuery();
  const detailQuery = useCrawlTargetDetailQuery(targetKey);
  const schedulesQuery = useSchedulesQuery();
  const previewMutation = usePreviewCrawlMutation();
  const updateMutation = useUpdateCrawlTargetMutation();
  const updateScheduleMutation = useUpdateScheduleMutation();

  const [label, setLabel] = useState("");
  const [crawler, setCrawler] = useState("");
  const [url, setUrl] = useState("");
  const [playStyle, setPlayStyle] = useState("미지정");
  const [level, setLevel] = useState("");
  const [slug, setSlug] = useState("");
  const [tableName, setTableName] = useState("");
  const [source, setSource] = useState("");
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleTriggers, setScheduleTriggers] = useState<ScheduleTrigger[]>(
    [],
  );
  const [error, setError] = useState<string | null>(null);
  const [prefilled, setPrefilled] = useState(false);

  // 상세 조회가 끝나면 이름/크롤러/크롤러별 설정을 한 번만 폼에 채워 넣는다.
  useEffect(() => {
    if (!detailQuery.data || prefilled) return;
    const detail = detailQuery.data;
    setLabel(detail.label);
    setCrawler(detail.crawler);
    setUrl(typeof detail.url === "string" ? detail.url : "");
    setPlayStyle(
      typeof detail.play_style === "string" ? detail.play_style : "미지정",
    );
    setLevel(typeof detail.level === "number" ? String(detail.level) : "");
    setSlug(typeof detail.slug === "string" ? detail.slug : "");
    setTableName(typeof detail.name === "string" ? detail.name : "");
    setSource(typeof detail.source === "string" ? detail.source : "");
    setPrefilled(true);
  }, [detailQuery.data, prefilled]);

  // 등록된 스케줄이 있으면 한 번만 프리필한다. 없으면 기본값(비활성)을 그대로 쓴다.
  const currentSchedule = schedulesQuery.data?.schedules.find(
    (s) => s.target_key === targetKey,
  );
  const [schedulePrefilled, setSchedulePrefilled] = useState(false);
  useEffect(() => {
    if (!currentSchedule || schedulePrefilled) return;
    setScheduleEnabled(currentSchedule.enabled);
    setScheduleTriggers(currentSchedule.triggers);
    setSchedulePrefilled(true);
  }, [currentSchedule, schedulePrefilled]);

  const detail = detailQuery.data;
  const isTable = detail?.kind === "table";
  const crawlerOptions = detail
    ? (targetsQuery.data?.registered_crawlers[detail.kind] ?? [])
    : [];
  const crawlerSelectItems = crawlerOptions.map((c) => ({
    value: c,
    label: c,
  }));
  const formInvalid = !label.trim() || !crawler;

  function buildTargetFields(): Record<string, unknown> {
    const fields: Record<string, unknown> = {};
    if (url.trim()) fields.url = url.trim();
    if (playStyle !== "미지정") fields.play_style = playStyle;
    if (level.trim()) fields.level = Number(level);
    if (slug.trim()) fields.slug = slug.trim();
    if (tableName.trim()) fields.name = tableName.trim();
    if (source.trim()) fields.source = source.trim();
    return fields;
  }

  async function handlePreview() {
    if (!detail) return;
    setError(null);
    try {
      await previewMutation.mutateAsync({
        kind: detail.kind,
        crawler,
        target: buildTargetFields(),
      });
    } catch {
      // 오류 메시지는 previewMutation.error에서 렌더링한다.
    }
  }

  async function handleSubmit() {
    setError(null);
    try {
      await updateMutation.mutateAsync({
        targetKey,
        label: label.trim(),
        crawler,
        ...buildTargetFields(),
      });
      await updateScheduleMutation.mutateAsync({
        targetKey,
        enabled: scheduleEnabled,
        triggers: scheduleTriggers,
      });
      navigate("/crawling");
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  const isPending =
    updateMutation.isPending || updateScheduleMutation.isPending;

  return (
    <div className="p-8">
      <Link
        to="/crawling"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        ← 크롤링 관리
      </Link>

      <h1 className="text-[2rem] font-semibold text-foreground mb-6">
        대상 수정
      </h1>

      <div className="flex flex-col gap-5">
        <Card>
          <CardHeader>
            <CardTitle>{detail?.label ?? "대상 수정"}</CardTitle>
            <CardDescription>
              등록된 크롤 대상의 이름·크롤러 설정을 수정합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {detailQuery.isPending ? (
              <Skeleton className="h-64 rounded" />
            ) : detailQuery.isError || !detail ? (
              <Alert variant="destructive">
                <AlertDescription>
                  대상 정보를 불러오지 못했습니다.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <FilterCard columns={2}>
                  <Field label="분류" required>
                    <div className="py-2 text-sm">
                      {CRAWL_KIND_OPTIONS.find((o) => o.value === detail.kind)
                        ?.label ?? detail.kind}
                    </div>
                  </Field>
                  {isTable && (
                    <Field label="레벨">
                      <Input
                        type="number"
                        min={1}
                        max={12}
                        value={level}
                        onChange={(e) => setLevel(e.target.value)}
                        placeholder="1~12"
                      />
                    </Field>
                  )}

                  <Field label="ID" required>
                    <div className="py-2 text-sm text-muted-foreground">
                      {detail.id}
                    </div>
                  </Field>
                  <Field label="이름" required>
                    <Input
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                    />
                  </Field>

                  <Field label="크롤링 방법" required>
                    <Select
                      value={crawler}
                      items={crawlerSelectItems}
                      onValueChange={(value) => {
                        if (value !== null) setCrawler(value);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {crawlerOptions.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  {isTable && (
                    <Field label="URL">
                      <Input
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://docs.google.com/spreadsheets/d/.../pubhtml"
                      />
                    </Field>
                  )}

                  {isTable && (
                    <>
                      <Field label="플레이 스타일">
                        <Select
                          value={playStyle}
                          items={PLAY_STYLE_OPTIONS}
                          onValueChange={(value) => {
                            if (value !== null) setPlayStyle(value);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PLAY_STYLE_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="표 slug">
                        <Input
                          value={slug}
                          onChange={(e) => setSlug(e.target.value)}
                        />
                      </Field>

                      <Field label="표 이름">
                        <Input
                          value={tableName}
                          onChange={(e) => setTableName(e.target.value)}
                        />
                      </Field>
                      <Field label="출처">
                        <Input
                          value={source}
                          onChange={(e) => setSource(e.target.value)}
                          placeholder="5ch, cpi 등"
                        />
                      </Field>
                    </>
                  )}
                </FilterCard>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handlePreview}
                    disabled={!crawler || previewMutation.isPending}
                  >
                    {previewMutation.isPending
                      ? "미리보기 조회 중…"
                      : "미리보기"}
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={formInvalid || isPending}
                  >
                    {isPending ? "저장 중…" : "저장"}
                  </Button>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {previewMutation.isError && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      {getApiErrorMessage(previewMutation.error)}
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <ScheduleSection
          enabled={scheduleEnabled}
          onEnabledChange={setScheduleEnabled}
          triggers={scheduleTriggers}
          onTriggersChange={setScheduleTriggers}
        />
        <Card>
          <CardHeader>
            <CardTitle>미리보기 결과</CardTitle>
            <CardDescription>
              크롤러가 실제로 어떤 데이터를 가져오는지 미리 확인합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CrawlPreviewResult result={previewMutation.data} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
