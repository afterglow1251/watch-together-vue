import { eden } from "./eden"

const r = eden.api

// First argument (request body) of an Eden endpoint method, taken straight from
// the server route. Thin alias over the built-in Parameters — needs the function
// constraint so TS accepts T, same constraint Parameters itself uses.
type Params<T extends (...args: any) => any> = Parameters<T>[0]

// Eden returns { data, error } per call. Errors now travel in the HTTP status, so
// they surface in Eden's `error` channel (logical errors carry { error: "<msg>" },
// transport failures carry their own value). Collapse the pair to the bare payload,
// throwing on any error so vue-query handles it natively. The only place that knows
// about the transport — nothing below restates a request or response shape by hand.
function errorMessage(value: unknown): string {
  return value && typeof value === "object" && "error" in value
    ? String((value as { error: unknown }).error)
    : "Something went wrong"
}

async function call<T>(req: Promise<{ data: T | null; error: { value: unknown } | null }>): Promise<T> {
  const { data, error } = await req
  if (error) throw new Error(errorMessage(error.value))
  return data as T
}

export const api = {
  auth: (data: Params<typeof r.auth.post>) => call(r.auth.post(data)),
  parse: (data: Params<typeof r.parse.post>) => call(r.parse.post(data)),
  stream: (data: Params<typeof r.stream.post>) => call(r.stream.post(data)),

  getWatched: (userId: number, sourceUrl: string) => call(r.watched.get({ query: { userId, sourceUrl } })),
  markWatched: (data: Params<typeof r.watched.post>) => call(r.watched.post(data)),
  unmarkWatched: (data: Params<typeof r.watched.delete>) => call(r.watched.delete(data)),

  getLibrary: (userId: number) => call(r.library.get({ query: { userId } })),
  addToLibrary: (data: Params<typeof r.library.post>) => call(r.library.post(data)),
  updateLibrary: (data: Params<typeof r.library.patch>) => call(r.library.patch(data)),
  removeFromLibrary: (data: Params<typeof r.library.delete>) => call(r.library.delete(data)),

  search: (q: string, page = 1) => call(r.search.get({ query: { q, page } })),
  browse: (category: string, page = 1) => call(r.browse.get({ query: { category, page } })),

  searchUsers: (q: string, userId: number) => call(r.users.search.get({ query: { q, userId } })),

  sendFriendRequest: (data: Params<typeof r.friends.request.post>) => call(r.friends.request.post(data)),
  acceptFriend: (data: Params<typeof r.friends.accept.post>) => call(r.friends.accept.post(data)),
  rejectFriend: (data: Params<typeof r.friends.reject.post>) => call(r.friends.reject.post(data)),
  removeFriend: (data: Params<typeof r.friends.delete>) => call(r.friends.delete(data)),
  getFriends: (userId: number) => call(r.friends.get({ query: { userId } })),
  getFriendRequests: (userId: number) => call(r.friends.requests.get({ query: { userId } })),
  getSentRequests: (userId: number) => call(r.friends.sent.get({ query: { userId } })),
  cancelFriendRequest: (data: Params<typeof r.friends.cancel.post>) => call(r.friends.cancel.post(data)),
  getSharedWatches: (userId: number, friendId: number) => call(r.friends.shared.get({ query: { userId, friendId } })),

  getSharedLibrary: (userId: number, friendId: number) =>
    call(r["shared-library"].get({ query: { userId, friendId } })),
  addToSharedLibrary: (data: Params<(typeof r)["shared-library"]["post"]>) => call(r["shared-library"].post(data)),
  updateSharedLibrary: (data: Params<(typeof r)["shared-library"]["patch"]>) => call(r["shared-library"].patch(data)),
  removeFromSharedLibrary: (data: Params<(typeof r)["shared-library"]["delete"]>) =>
    call(r["shared-library"].delete(data)),

  savePlaybackPosition: (data: Params<(typeof r)["playback-position"]["post"]>) =>
    call(r["playback-position"].post(data)),
  getPlaybackPositions: (userId: number) => call(r["playback-position"].get({ query: { userId } })),
  getPlaybackPosition: (userId: number, sourceUrl: string, episodeId?: string) =>
    call(r["playback-position"].single.get({ query: { userId, sourceUrl, episodeId } })),
}

// Server-sourced aliases for callers that must name a request/response shape
// (e.g. vue-query cache helpers). Derived from `api` itself — no hand duplication.
export type ApiResponse<K extends keyof typeof api> = Awaited<ReturnType<(typeof api)[K]>>
export type ApiArg<K extends keyof typeof api> = Params<(typeof api)[K]>
