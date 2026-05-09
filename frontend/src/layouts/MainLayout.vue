<template>
  <el-container class="main-container">
    <el-aside width="200px" class="sidebar">
      <div class="logo">
        <el-icon :size="24" class="logo-icon"><Car /></el-icon>
        <span class="logo-text">停车场管理</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        class="sidebar-menu"
        router
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
      >
        <el-menu-item index="/dashboard">
          <el-icon><DataLine /></el-icon>
          <span>实时看板</span>
        </el-menu-item>
        <el-menu-item v-if="userStore.isAdmin" index="/parking">
          <el-icon><OfficeBuilding /></el-icon>
          <span>停车场管理</span>
        </el-menu-item>
        <el-menu-item index="/entry">
          <el-icon><Right /></el-icon>
          <span>入场登记</span>
        </el-menu-item>
        <el-menu-item index="/exit">
          <el-icon><Left /></el-icon>
          <span>出场结算</span>
        </el-menu-item>
        <el-menu-item index="/monthly-cards">
          <el-icon><CreditCard /></el-icon>
          <span>月卡管理</span>
        </el-menu-item>
        <el-menu-item v-if="userStore.isAdmin" index="/statistics">
          <el-icon><TrendCharts /></el-icon>
          <span>数据报表</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="header">
        <div class="header-left">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item v-if="currentRoute.meta?.title">{{ currentRoute.meta.title }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <el-dropdown @command="handleCommand">
            <span class="user-info">
              <el-icon class="user-icon"><UserFilled /></el-icon>
              <span>{{ userStore.userInfo?.name }}</span>
              <el-tag :type="userStore.isAdmin ? 'danger' : 'primary'" size="small">
                {{ userStore.isAdmin ? '管理员' : '收费员' }}
              </el-tag>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人信息</el-dropdown-item>
                <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-main class="main-content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessageBox } from 'element-plus'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const activeMenu = computed(() => route.path)
const currentRoute = computed(() => route)

const handleCommand = (command: string) => {
  if (command === 'logout') {
    ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }).then(() => {
      userStore.logout()
      router.push('/login')
    }).catch(() => {})
  }
}
</script>

<style scoped>
.main-container {
  height: 100%;
}

.sidebar {
  background-color: #304156;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background-color: #2b3a4a;
}

.logo-icon {
  color: #409EFF;
}

.logo-text {
  color: white;
  font-size: 16px;
  font-weight: bold;
}

.sidebar-menu {
  border-right: none;
}

.header {
  background-color: white;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}

.header-right {
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.user-icon {
  font-size: 20px;
  color: #409EFF;
}

.main-content {
  background-color: #f0f2f5;
  padding: 20px;
}
</style>
