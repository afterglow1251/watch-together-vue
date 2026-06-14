import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router"
import { useAuthStore } from "../stores/auth"
import AuthPage from "../routes/AuthPage.vue"
import HomePage from "../routes/HomePage.vue"
import FriendsPage from "../routes/FriendsPage.vue"
import RoomPage from "../routes/RoomPage.vue"
import AppLayout from "../components/layout/AppLayout.vue"

const routes: RouteRecordRaw[] = [
  { path: "/auth", component: AuthPage },
  {
    path: "/",
    component: AppLayout,
    meta: { requiresAuth: true },
    children: [
      { path: "", component: HomePage },
      { path: "loved-ones", component: FriendsPage },
      { path: "loved-ones/:friendId", component: FriendsPage },
    ],
  },
  { path: "/room/:code", component: RoomPage, meta: { requiresAuth: true } },
  // Legacy redirects
  { path: "/search", redirect: "/loved-ones" },
  { path: "/library", redirect: "/loved-ones" },
  { path: "/friends", redirect: "/loved-ones" },
  { path: "/friends/:friendId", redirect: (to) => `/loved-ones/${to.params.friendId}` },
  { path: "/:pathMatch(.*)*", redirect: "/" },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return "/auth"
  }
  if (to.path === "/auth" && auth.isLoggedIn) {
    return "/"
  }
  return true
})
