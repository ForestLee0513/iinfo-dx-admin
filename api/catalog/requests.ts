import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query";

import { api } from "@/lib/axios";
import {
  CATALOG_BASE,
  CATALOG_SONGS_DEFAULT_PAGE,
  CATALOG_SONGS_DEFAULT_PER_PAGE,
} from "./constants";
import type {
  SongDetail,
  SongListRequest,
  SongListResponse,
  TableDetail,
  TableDetailRequest,
  TableListResponse,
  VersionListResponse,
} from "./types";

/*
쿼리 키 - Query Keys
*/
export const catalogKeys = {
  all: ["catalog"] as const,
  tables: () => [...catalogKeys.all, "tables"] as const,
  tableDetail: (slug: string, params: TableDetailRequest) =>
    [...catalogKeys.tables(), slug, params] as const,
  songs: () => [...catalogKeys.all, "songs"] as const,
  songList: (params: SongListRequest) =>
    [...catalogKeys.songs(), "list", params] as const,
  songDetail: (songId: string) =>
    [...catalogKeys.songs(), "detail", songId] as const,
  versions: () => [...catalogKeys.all, "versions"] as const,
};

/*
GET /api/v1/admin/tables — 난이도표 목록 조회 (엔트리 제외)
*/
export async function getTableList() {
  const { data } = await api.get<TableListResponse>(`${CATALOG_BASE}/tables`);
  return data;
}

export function tableListQueryOptions() {
  return queryOptions({
    queryKey: catalogKeys.tables(),
    queryFn: getTableList,
  });
}

export function useTableListQuery() {
  return useQuery(tableListQueryOptions());
}

/*
GET /api/v1/admin/tables/{slug} — 난이도표 1개 + 엔트리 조회
*/
export async function getTableDetail(slug: string, params: TableDetailRequest = {}) {
  const { data } = await api.get<TableDetail>(`${CATALOG_BASE}/tables/${slug}`, {
    params,
  });
  return data;
}

export function tableDetailQueryOptions(
  slug: string,
  params: TableDetailRequest = {},
) {
  return queryOptions({
    queryKey: catalogKeys.tableDetail(slug, params),
    queryFn: () => getTableDetail(slug, params),
  });
}

export function useTableDetailQuery(
  slug: string,
  params: TableDetailRequest = {},
  enabled = true,
) {
  return useQuery({ ...tableDetailQueryOptions(slug, params), enabled });
}

/*
GET /api/v1/admin/songs — 곡 목록 조회 (채보 제외)
빈 값/미지정 필터는 파라미터에서 제외해 쿼리 키를 안정적으로 유지한다.
*/
export async function getSongList(params: SongListRequest = {}) {
  const { data } = await api.get<SongListResponse>(`${CATALOG_BASE}/songs`, {
    params,
  });
  return data;
}

export function songListQueryOptions({
  page = CATALOG_SONGS_DEFAULT_PAGE,
  per_page = CATALOG_SONGS_DEFAULT_PER_PAGE,
  title,
  version,
  in_ac,
  sort,
  order,
}: SongListRequest = {}) {
  const params: SongListRequest = { page, per_page };
  if (title) params.title = title;
  if (version !== undefined) params.version = version;
  if (in_ac !== undefined) params.in_ac = in_ac;
  if (sort) params.sort = sort;
  if (order) params.order = order;

  return queryOptions({
    queryKey: catalogKeys.songList(params),
    queryFn: () => getSongList(params),
    // 페이지/필터 전환 시 이전 목록을 유지해 깜빡임을 줄인다.
    placeholderData: keepPreviousData,
  });
}

export function useSongListQuery(params?: SongListRequest) {
  return useQuery(songListQueryOptions(params));
}

/*
GET /api/v1/admin/songs/{song_id} — 곡 1개 + 채보 조회
*/
export async function getSongDetail(songId: string) {
  const { data } = await api.get<SongDetail>(`${CATALOG_BASE}/songs/${songId}`);
  return data;
}

export function songDetailQueryOptions(songId: string) {
  return queryOptions({
    queryKey: catalogKeys.songDetail(songId),
    queryFn: () => getSongDetail(songId),
  });
}

export function useSongDetailQuery(songId: string, enabled = true) {
  return useQuery({ ...songDetailQueryOptions(songId), enabled });
}

/*
GET /api/v1/admin/versions — 시리즈 버전 목록 (곡 필터 드롭다운/표시용)
*/
export async function getVersionList() {
  const { data } = await api.get<VersionListResponse>(
    `${CATALOG_BASE}/versions`,
  );
  return data;
}

export function versionListQueryOptions() {
  return queryOptions({
    queryKey: catalogKeys.versions(),
    queryFn: getVersionList,
    // 버전 목록은 자주 바뀌지 않으므로 재요청을 줄인다.
    staleTime: 5 * 60 * 1000,
  });
}

export function useVersionListQuery() {
  return useQuery(versionListQueryOptions());
}
