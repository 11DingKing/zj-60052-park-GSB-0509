<template>
  <div class="dashboard-container">
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon available">
              <el-icon :size="32"><Check /></el-icon>
            </div>
            <div class="stat-info">
              <div class="big-number">{{ dashboardData.summary?.availableSpots || 0 }}</div>
              <div class="big-number-label">可用车位</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon occupied">
              <el-icon :size="32"><Close /></el-icon>
            </div>
            <div class="stat-info">
              <div class="big-number">{{ dashboardData.summary?.occupiedSpots || 0 }}</div>
              <div class="big-number-label">已占用</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon entry">
              <el-icon :size="32"><Right /></el-icon>
            </div>
            <div class="stat-info">
              <div class="big-number">{{ dashboardData.summary?.todayEntries || 0 }}</div>
              <div class="big-number-label">今日入场</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon exit">
              <el-icon :size="32"><Left /></el-icon>
            </div>
            <div class="stat-info">
              <div class="big-number">{{ dashboardData.summary?.todayExits || 0 }}</div>
              <div class="big-number-label">今日出场</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="section-card">
      <template #header>
        <div class="card-header">
          <span>车位状态分布</span>
          <el-button type="primary" link @click="refreshData">
            <el-icon><Refresh /></el-icon> 刷新
          </el-button>
        </div>
      </template>
      
      <el-row :gutter="20">
        <el-col :span="24">
          <div class="legend">
            <span class="legend-item">
              <span class="legend-color available"></span> 空闲
            </span>
            <span class="legend-item">
              <span class="legend-color occupied"></span> 占用
            </span>
            <span class="legend-item">
              <span class="legend-color maintenance"></span> 维修
            </span>
          </div>
        </el-col>
      </el-row>

      <el-collapse v-model="activeZoneNames">
        <el-collapse-item
          v-for="zone in dashboardData.zones"
          :key="zone.id"
          :name="zone.id"
        >
          <template #title>
            <div class="zone-header">
              <el-tag :type="getZoneTypeColor(zone.type)" size="large">
                {{ zone.name }}
              </el-tag>
              <span class="zone-stats">
                共 {{ zone.total }} 个车位 | 
                <span class="text-available">空闲 {{ zone.available }}</span> | 
                <span class="text-occupied">占用 {{ zone.occupied }}</span> | 
                <span class="text-maintenance">维修 {{ zone.maintenance }}</span>
              </span>
            </div>
          </template>
          
          <div class="spot-grid">
            <div
              v-for="spot in zone.spots"
              :key="spot.id"
              class="spot-item"
              :class="spot.status.toLowerCase()"
              :title="`${spot.code} - ${getSpotStatusText(spot.status)}`"
            >
              {{ spot.number }}
            </div>
          </div>
        </el-collapse-item>
      </el-collapse>
    </el-card>

    <el-card class="section-card">
      <template #header>
        <div class="card-header">
          <span>当前在场车辆</span>
          <el-input
            v-model="searchPlateNumber"
            placeholder="搜索车牌号"
            style="width: 200px"
            clearable
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
      </template>
      
      <el-table :data="filteredCurrentVehicles" style="width: 100%" stripe>
        <el-table-column prop="plateNumber" label="车牌号" width="140">
          <template #default="{ row }">
            <el-tag :type="row.isMonthly ? 'success' : 'primary'">
              {{ row.plateNumber }}
              <el-tag v-if="row.isMonthly" type="success" effect="dark" size="small" style="margin-left: 4px">
                月卡
              </el-tag>
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="spotCode" label="车位号" width="100" />
        <el-table-column prop="zoneName" label="区域" width="100" />
        <el-table-column prop="entryTime" label="入场时间" width="200">
          <template #default="{ row }">
            {{ formatDateTime(row.entryTime) }}
          </template>
        </el-table-column>
        <el-table-column prop="duration" label="停车时长">
          <template #default="{ row }">
            {{ calculateDuration(row.entryTime) }}
          </template>
        </el-table-column>
      </el-table>
      
      <el-empty v-if="filteredCurrentVehicles.length === 0" description="暂无在场车辆" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { parkingApi } from '@/api/parking'
import type { DashboardData, CurrentVehicle, SpotStatus } from '@/types'

const dashboardData = ref<DashboardData>({
  summary: {
    totalSpots: 0,
    occupiedSpots: 0,
    availableSpots: 0,
    maintenanceSpots: 0,
    todayEntries: 0,
    todayExits: 0,
  },
  zones: [],
  currentVehicles: [],
})

const activeZoneNames = ref<string[]>([])
const searchPlateNumber = ref('')
let refreshInterval: number | null = null

const filteredCurrentVehicles = computed(() => {
  if (!searchPlateNumber.value) {
    return dashboardData.value.currentVehicles
  }
  return dashboardData.value.currentVehicles.filter(v =>
    v.plateNumber.toLowerCase().includes(searchPlateNumber.value.toLowerCase())
  )
})

const getZoneTypeColor = (type: string) => {
  switch (type) {
    case 'SMALL': return 'primary'
    case 'LARGE': return 'warning'
    case 'VIP': return 'danger'
    default: return 'info'
  }
}

const getSpotStatusText = (status: string) => {
  switch (status) {
    case 'AVAILABLE': return '空闲'
    case 'OCCUPIED': return '占用'
    case 'MAINTENANCE': return '维修'
    default: return status
  }
}

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

const calculateDuration = (entryTime: string) => {
  const now = new Date()
  const entry = new Date(entryTime)
  const diffMs = now.getTime() - entry.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMins / 60)
  const remainingMins = diffMins % 60
  
  if (diffHours > 0) {
    return `${diffHours}小时${remainingMins}分钟`
  }
  return `${diffMins}分钟`
}

const fetchDashboardData = async () => {
  try {
    const data = await parkingApi.getDashboard()
    dashboardData.value = data
    
    if (activeZoneNames.value.length === 0 && data.zones.length > 0) {
      activeZoneNames.value = data.zones.map((z: any) => z.id)
    }
  } catch (error) {
    console.error('获取看板数据失败:', error)
  }
}

const refreshData = () => {
  fetchDashboardData()
}

onMounted(() => {
  fetchDashboardData()
  refreshInterval = window.setInterval(() => {
    fetchDashboardData()
  }, 30000)
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})
</script>

<style scoped>
.dashboard-container {
  padding: 0;
}

.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 20px;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.stat-icon.available { background: rgba(103, 194, 58, 0.3); }
.stat-icon.occupied { background: rgba(245, 108, 108, 0.3); }
.stat-icon.entry { background: rgba(64, 158, 255, 0.3); }
.stat-icon.exit { background: rgba(230, 162, 60, 0.3); }

.stat-info {
  color: white;
}

.big-number {
  font-size: 36px;
  font-weight: bold;
  line-height: 1.2;
}

.big-number-label {
  font-size: 14px;
  opacity: 0.9;
  margin-top: 4px;
}

.section-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
}

.legend {
  display: flex;
  gap: 20px;
  margin-bottom: 16px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 4px;
}

.legend-color.available { background-color: #67c23a; }
.legend-color.occupied { background-color: #f56c6c; }
.legend-color.maintenance { background-color: #909399; }

.zone-header {
  display: flex;
  align-items: center;
  gap: 16px;
}

.zone-stats {
  font-size: 14px;
  color: #606266;
}

.text-available { color: #67c23a; }
.text-occupied { color: #f56c6c; }
.text-maintenance { color: #909399; }

.spot-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 0;
}

.spot-item {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  color: white;
  font-weight: 500;
}

.spot-item.available { background-color: #67c23a; }
.spot-item.occupied { background-color: #f56c6c; }
.spot-item.maintenance { background-color: #909399; }

.spot-item:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}
</style>
