import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import { useUserStore } from '@/stores/user'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    redirect: '/dashboard',
    meta: { requiresAuth: true },
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: { title: '实时看板', icon: 'DataLine' },
      },
      {
        path: 'parking',
        name: 'ParkingManagement',
        component: () => import('@/views/parking/index.vue'),
        meta: { title: '停车场管理', icon: 'OfficeBuilding', adminOnly: true },
      },
      {
        path: 'parking/zones',
        name: 'ZoneManagement',
        component: () => import('@/views/parking/zones.vue'),
        meta: { title: '区域管理', icon: 'Grid', adminOnly: true, hidden: true },
      },
      {
        path: 'parking/spots',
        name: 'SpotManagement',
        component: () => import('@/views/parking/spots.vue'),
        meta: { title: '车位管理', icon: 'Location', adminOnly: true, hidden: true },
      },
      {
        path: 'entry',
        name: 'EntryManagement',
        component: () => import('@/views/entry-exit/entry.vue'),
        meta: { title: '入场登记', icon: 'Right' },
      },
      {
        path: 'exit',
        name: 'ExitManagement',
        component: () => import('@/views/entry-exit/exit.vue'),
        meta: { title: '出场结算', icon: 'Left' },
      },
      {
        path: 'monthly-cards',
        name: 'MonthlyCards',
        component: () => import('@/views/monthly-cards/index.vue'),
        meta: { title: '月卡管理', icon: 'CreditCard' },
      },
      {
        path: 'statistics',
        name: 'Statistics',
        component: () => import('@/views/statistics/index.vue'),
        meta: { title: '数据报表', icon: 'TrendCharts', adminOnly: true },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to, _from, next) => {
  const userStore = useUserStore()

  if (!userStore.isLoggedIn.value) {
    userStore.initFromStorage()
  }

  if (to.meta.requiresAuth !== false && !userStore.isLoggedIn.value) {
    next('/login')
    return
  }

  if (to.meta.adminOnly && !userStore.isAdmin.value) {
    next('/dashboard')
    return
  }

  if (to.path === '/login' && userStore.isLoggedIn.value) {
    next('/dashboard')
    return
  }

  next()
})

export default router
