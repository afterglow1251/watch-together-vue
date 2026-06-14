import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query"
import { computed } from "vue"
import { api } from "../services/api"
import type { ApiResponse } from "../services/api"

export function useFriends(userId: () => number | undefined) {
  return useQuery({
    queryKey: computed(() => ["friends", userId()]),
    queryFn: () => api.getFriends(userId()!),
    enabled: computed(() => !!userId()),
    select: (data) => data.friends ?? [],
  })
}

export function useFriendRequests(userId: () => number | undefined) {
  return useQuery({
    queryKey: computed(() => ["friend-requests", userId()]),
    queryFn: () => api.getFriendRequests(userId()!),
    enabled: computed(() => !!userId()),
    select: (data) => data.requests ?? [],
  })
}

export function useSentRequests(userId: () => number | undefined) {
  return useQuery({
    queryKey: computed(() => ["sent-requests", userId()]),
    queryFn: () => api.getSentRequests(userId()!),
    enabled: computed(() => !!userId()),
    select: (data) => data.sent ?? [],
  })
}

export function useSharedWatches(userId: () => number | undefined, friendId: () => number | undefined) {
  return useQuery({
    queryKey: computed(() => ["shared-watches", userId(), friendId()]),
    queryFn: () => api.getSharedWatches(userId()!, friendId()!),
    enabled: computed(() => !!userId() && !!friendId()),
    select: (data) => data.items ?? [],
  })
}

export function useSendFriendRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { userId: number; friendUsername: string }) => api.sendFriendRequest(data),
    onMutate: async (data: { userId: number; friendUsername: string }) => {
      await qc.cancelQueries({ queryKey: ["sent-requests"] })
      const prev = qc.getQueriesData<ApiResponse<"getSentRequests">>({ queryKey: ["sent-requests"] })
      qc.setQueriesData<ApiResponse<"getSentRequests">>({ queryKey: ["sent-requests"] }, (old) => {
        if (!old?.sent) return old
        return {
          ...old,
          sent: [
            ...old.sent,
            {
              friendshipId: -Date.now(),
              receiverId: 0,
              receiverUsername: data.friendUsername,
              createdAt: new Date().toISOString(),
            },
          ],
        }
      })
      return { prev }
    },
    onError: (_err, _data, context) => {
      context?.prev?.forEach(([key, data]) => qc.setQueryData(key, data))
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["sent-requests"] })
    },
  })
}

export function useAcceptFriend() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { friendshipId: number }) => api.acceptFriend(data),
    onMutate: async (data: { friendshipId: number }) => {
      await qc.cancelQueries({ queryKey: ["friend-requests"] })
      await qc.cancelQueries({ queryKey: ["friends"] })
      const prevRequests = qc.getQueriesData<ApiResponse<"getFriendRequests">>({ queryKey: ["friend-requests"] })
      const prevFriends = qc.getQueriesData<ApiResponse<"getFriends">>({ queryKey: ["friends"] })

      let acceptedSenderId = 0
      let acceptedSenderUsername = ""
      qc.setQueriesData<ApiResponse<"getFriendRequests">>({ queryKey: ["friend-requests"] }, (old) => {
        if (!old?.requests) return old
        const req = old.requests.find((r) => r.friendshipId === data.friendshipId)
        if (req) {
          acceptedSenderId = req.senderId
          acceptedSenderUsername = req.senderUsername
        }
        return { ...old, requests: old.requests.filter((r) => r.friendshipId !== data.friendshipId) }
      })

      if (acceptedSenderId) {
        qc.setQueriesData<ApiResponse<"getFriends">>({ queryKey: ["friends"] }, (old) => {
          if (!old?.friends) return old
          return {
            ...old,
            friends: [
              ...old.friends,
              {
                friendshipId: data.friendshipId,
                userId: acceptedSenderId,
                username: acceptedSenderUsername,
                since: new Date().toISOString(),
              },
            ],
          }
        })
      }

      return { prevRequests, prevFriends }
    },
    onError: (_err, _data, context) => {
      context?.prevRequests?.forEach(([key, data]) => qc.setQueryData(key, data))
      context?.prevFriends?.forEach(([key, data]) => qc.setQueryData(key, data))
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["friends"] })
      qc.invalidateQueries({ queryKey: ["friend-requests"] })
    },
  })
}

export function useRejectFriend() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { friendshipId: number }) => api.rejectFriend(data),
    onMutate: async (data: { friendshipId: number }) => {
      await qc.cancelQueries({ queryKey: ["friend-requests"] })
      const prev = qc.getQueriesData<ApiResponse<"getFriendRequests">>({ queryKey: ["friend-requests"] })
      qc.setQueriesData<ApiResponse<"getFriendRequests">>({ queryKey: ["friend-requests"] }, (old) => {
        if (!old?.requests) return old
        return { ...old, requests: old.requests.filter((r) => r.friendshipId !== data.friendshipId) }
      })
      return { prev }
    },
    onError: (_err, _data, context) => {
      context?.prev?.forEach(([key, data]) => qc.setQueryData(key, data))
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["friend-requests"] })
    },
  })
}

export function useCancelRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { friendshipId: number }) => api.cancelFriendRequest(data),
    onMutate: async (data: { friendshipId: number }) => {
      await qc.cancelQueries({ queryKey: ["sent-requests"] })
      const prev = qc.getQueriesData<ApiResponse<"getSentRequests">>({ queryKey: ["sent-requests"] })
      qc.setQueriesData<ApiResponse<"getSentRequests">>({ queryKey: ["sent-requests"] }, (old) => {
        if (!old?.sent) return old
        return { ...old, sent: old.sent.filter((r) => r.friendshipId !== data.friendshipId) }
      })
      return { prev }
    },
    onError: (_err, _data, context) => {
      context?.prev?.forEach(([key, data]) => qc.setQueryData(key, data))
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["sent-requests"] })
    },
  })
}

export function useRemoveFriend() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { friendshipId: number; userId: number }) => api.removeFriend(data),
    onMutate: async (data: { friendshipId: number; userId: number }) => {
      await qc.cancelQueries({ queryKey: ["friends"] })
      const prev = qc.getQueriesData<ApiResponse<"getFriends">>({ queryKey: ["friends"] })
      qc.setQueriesData<ApiResponse<"getFriends">>({ queryKey: ["friends"] }, (old) => {
        if (!old?.friends) return old
        return { ...old, friends: old.friends.filter((f) => f.friendshipId !== data.friendshipId) }
      })
      return { prev }
    },
    onError: (_err, _data, context) => {
      context?.prev?.forEach(([key, data]) => qc.setQueryData(key, data))
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["friends"] })
      qc.invalidateQueries({ queryKey: ["shared-watches"] })
    },
  })
}
