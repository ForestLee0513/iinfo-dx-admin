import { useMemo, useState } from "react";

export function meta() {
  return [{ title: "회원 관리 - IInfoDX Admin" }];
}

type Platform = "Google" | "이메일";

type Member = {
  id: number;
  name: string;
  email: string;
  platform: Platform;
  joinedAt: string;
  lastLogin: string;
  isActive: boolean;
};

const NAMES = [
  "홍길동",
  "김민지",
  "이수현",
  "박지훈",
  "최유나",
  "정민준",
  "한소희",
  "오태양",
  "임채원",
  "서예진",
  "강도현",
  "윤서연",
  "장현우",
  "신지아",
  "류준혁",
];

const PLATFORMS: Platform[] = ["Google", "이메일"];

const MOCK_MEMBERS: Member[] = Array.from({ length: 42 }, (_, i) => ({
  id: i + 1,
  name: NAMES[i % NAMES.length],
  email: `user${String(i + 1).padStart(3, "0")}@iinfo.co.kr`,
  platform: PLATFORMS[i % PLATFORMS.length],
  joinedAt: `2024-${String(((i * 3) % 12) + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`,
  lastLogin: `2024-06-${String((i % 28) + 1).padStart(2, "0")}`,
  isActive: i % 7 !== 4,
}));

const PLATFORM_OPTIONS = ["전체", "Google", "이메일"] as const;
const ACTIVE_OPTIONS = ["전체", "활성", "정지"] as const;
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:bg-white focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10";

export default function Members() {
  const [nameFilter, setNameFilter] = useState("");
  const [emailFilter, setEmailFilter] = useState("");
  const [platformFilter, setPlatformFilter] = useState("전체");
  const [activeFilter, setActiveFilter] = useState("전체");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = useMemo(() => {
    return MOCK_MEMBERS.filter((m) => {
      if (nameFilter && !m.name.includes(nameFilter)) return false;
      if (
        emailFilter &&
        !m.email.toLowerCase().includes(emailFilter.toLowerCase())
      )
        return false;
      if (platformFilter !== "전체" && m.platform !== platformFilter)
        return false;
      if (activeFilter === "활성" && !m.isActive) return false;
      if (activeFilter === "정지" && m.isActive) return false;
      return true;
    });
  }, [nameFilter, emailFilter, platformFilter, activeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  const allSelected =
    paginated.length > 0 && paginated.every((m) => selectedIds.has(m.id));

  function toggleAll() {
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        paginated.forEach((m) => next.delete(m.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        paginated.forEach((m) => next.add(m.id));
        return next;
      });
    }
  }

  function toggleOne(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleFilterChange<T extends string>(
    setter: (v: T) => void,
    value: T,
  ) {
    setter(value);
    setPage(1);
  }

  return (
    <div className="p-8">
      <h1 className="text-[2rem] font-semibold text-gray-900 mb-6">
        회원 관리
      </h1>

      {/* 필터 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
        <div className="grid grid-cols-4 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">회원명</label>
            <input
              type="text"
              value={nameFilter}
              onChange={(e) =>
                handleFilterChange(setNameFilter, e.target.value)
              }
              placeholder="홍길동"
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">이메일</label>
            <input
              type="text"
              value={emailFilter}
              onChange={(e) =>
                handleFilterChange(setEmailFilter, e.target.value)
              }
              placeholder="example@example.com"
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">플랫폼</label>
            <select
              value={platformFilter}
              onChange={(e) =>
                handleFilterChange(setPlatformFilter, e.target.value)
              }
              className={inputClass + " cursor-pointer"}
            >
              {PLATFORM_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              활성 여부
            </label>
            <select
              value={activeFilter}
              onChange={(e) =>
                handleFilterChange(setActiveFilter, e.target.value)
              }
              className={inputClass + " cursor-pointer"}
            >
              {ACTIVE_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 테이블 카드 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* 액션 바 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <p className="text-sm text-gray-500">
            총{" "}
            <span className="font-semibold text-gray-900">
              {filtered.length}
            </span>
            명
            {selectedIds.size > 0 && (
              <span className="ml-2 text-gray-400">
                ({selectedIds.size}명 선택됨)
              </span>
            )}
          </p>
          <div className="flex gap-2">
            <button
              disabled={selectedIds.size === 0}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              정지 처리
            </button>
            <button
              disabled={selectedIds.size === 0}
              className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-red-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              회원 탈퇴
            </button>
          </div>
        </div>

        {/* 테이블 */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="w-12 px-5 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="rounded border-gray-300 accent-gray-900 cursor-pointer"
                  />
                </th>
                {[
                  "No",
                  "회원명",
                  "이메일",
                  "플랫폼",
                  "가입일",
                  "최근 로그인",
                  "활성 여부",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-16 text-center text-gray-400"
                  >
                    검색 결과가 없습니다.
                  </td>
                </tr>
              ) : (
                paginated.map((member, idx) => (
                  <tr
                    key={member.id}
                    className={`transition-colors hover:bg-gray-50/70 ${
                      selectedIds.has(member.id) ? "bg-blue-50/40" : ""
                    }`}
                  >
                    <td className="w-12 px-5 py-3.5">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(member.id)}
                        onChange={() => toggleOne(member.id)}
                        className="rounded border-gray-300 accent-gray-900 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3.5 text-gray-400 tabular-nums">
                      {(safePage - 1) * pageSize + idx + 1}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-gray-900">
                      {member.name}
                    </td>
                    <td className="px-4 py-3.5 text-gray-600">
                      {member.email}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                        {member.platform}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-gray-500 tabular-nums">
                      {member.joinedAt}
                    </td>
                    <td className="px-4 py-3.5 text-gray-500 tabular-nums">
                      {member.lastLogin}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                          member.isActive
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-600"
                        }`}
                      >
                        {member.isActive ? "활성" : "정지"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>페이지당</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-sm outline-none focus:border-gray-900 cursor-pointer"
            >
              {PAGE_SIZE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <span>개</span>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>
              {filtered.length === 0
                ? "0개"
                : `${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filtered.length)} / 총 ${filtered.length}개`}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="rounded-lg border border-gray-200 w-8 h-8 flex items-center justify-center text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ‹
              </button>
              <span className="px-3 py-1 text-sm font-medium text-gray-700">
                {safePage} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="rounded-lg border border-gray-200 w-8 h-8 flex items-center justify-center text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ›
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
