import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  useCrawlTargetsQuery,
  useCreateCrawlTargetMutation,
  usePreviewCrawlMutation,
  useUpdateScheduleMutation,
} from "@/api/iidx/crawl/requests";
import { CRAWL_KIND_OPTIONS } from "@/api/iidx/crawl/constants";
import type { CrawlKind, ScheduleTrigger } from "@/api/iidx/crawl/types";
import { CrawlPreviewResult } from "@/components/CrawlPreviewResult";
import { Field } from "@/components/Field";
import { FilterCard } from "@/components/FilterCard";
import { ScheduleSection } from "@/components/ScheduleSection";
import { getApiErrorMessage } from "@/lib/api-error";

const KIND: CrawlKind = "table";

export function meta() {
  return [{ title: "크롤링 등록 - IInfoDX Admin" }];
}

/*
난이도표 크롤 대상 등록 페이지. 기존에는 크롤링 관리 목록의 모달에서
등록했지만, 미리보기 결과를 충분히 확인한 뒤 등록할 수 있도록 페이지
단위로 분리했다. 곡목록(수록곡 정보) 등록은 필요한 필드가 달라
admin.crawling.new.song.tsx로 별도 분리되어 있다.
*/
export default function CrawlingNewTable() {
  const navigate = useNavigate();
  const targetsQuery = useCrawlTargetsQuery();
  const previewMutation = usePreviewCrawlMutation();
  const createMutation = useCreateCrawlTargetMutation();
  const updateScheduleMutation = useUpdateScheduleMutation();

  const crawlerOptions = targetsQuery.data?.registered_crawlers[KIND] ?? [];
  const crawlerSelectItems = crawlerOptions.map((c) => ({ value: c, label: c }));

  const [crawler, setCrawler] = useState("");
  const [level, setLevel] = useState("");
  const [id, setId] = useState("");
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleTriggers, setScheduleTriggers] = useState<ScheduleTrigger[]>(
    [],
  );
  const [error, setError] = useState<string | null>(null);

  // 등록된 크롤러 목록이 로드되면 첫 번째 크롤러를 기본 선택한다.
  useEffect(() => {
    if (crawler || crawlerOptions.length === 0) return;
    setCrawler(crawlerOptions[0]);
  }, [crawler, crawlerOptions]);

  const formInvalid = !id.trim() || !label.trim() || !crawler;

  function buildTargetFields(): Record<string, unknown> {
    const fields: Record<string, unknown> = {};
    if (url.trim()) fields.url = url.trim();
    if (level.trim()) fields.level = Number(level);
    return fields;
  }

  async function handlePreview() {
    setError(null);
    try {
      await previewMutation.mutateAsync({
        kind: KIND,
        crawler,
        target: buildTargetFields(),
      });
    } catch {
      // 오류 메시지는 previewMutation.error에서 렌더링한다.
    }
  }

  async function handleRegister() {
    setError(null);
    try {
      const created = await createMutation.mutateAsync({
        kind: KIND,
        id: id.trim(),
        label: label.trim(),
        crawler,
        ...buildTargetFields(),
      });
      if (scheduleEnabled) {
        try {
          await updateScheduleMutation.mutateAsync({
            targetKey: created.key,
            enabled: scheduleEnabled,
            triggers: scheduleTriggers,
          });
        } catch (scheduleErr) {
          window.alert(
            `대상은 등록되었지만 스케줄 저장에 실패했습니다: ${getApiErrorMessage(scheduleErr)}`,
          );
          navigate("/crawling");
          return;
        }
      }
      navigate("/crawling");
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  return (
    <div className="p-8">
      <Link
        to="/crawling"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        ← 크롤링 관리
      </Link>

      <h1 className="text-[2rem] font-semibold text-foreground mb-6">
        크롤링 등록
      </h1>

      <div className="flex flex-col gap-5">
        <Card>
          <CardHeader>
            <CardTitle>미리보기 &amp; 등록 · 난이도표</CardTitle>
            <CardDescription>
              대상을 직접 지정해 크롤 결과를 미리 확인하고, 문제가 없으면 바로
              등록합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <FilterCard columns={2}>
              <Field label="분류" required>
                <div className="py-2 text-sm">
                  {CRAWL_KIND_OPTIONS.find((o) => o.value === KIND)?.label}
                </div>
              </Field>
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
              <Field label="ID" required>
                <Input
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  placeholder="5ch_sp12"
                />
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
              <Field label="URL">
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/.../pubhtml"
                />
              </Field>
            </FilterCard>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handlePreview}
                disabled={!crawler || previewMutation.isPending}
              >
                {previewMutation.isPending ? "미리보기 조회 중…" : "미리보기"}
              </Button>
              <Button
                onClick={handleRegister}
                disabled={formInvalid || createMutation.isPending}
              >
                {createMutation.isPending ? "등록 중…" : "등록"}
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
