<template>
  <div class="spots-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>车位管理</span>
        </div>
      </template>

      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="车位状态">
          <el-select v-model="searchForm.status" placeholder="全部状态" clearable>
            <el-option label="空闲" value="AVAILABLE" />
            <el-option label="已预约" value="RESERVED" />
            <el-option label="占用" value="OCCUPIED" />
            <el-option label="维修" value="MAINTENANCE" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadSpots">搜索</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>

      <div class="spot-legend">
        <span class="legend-item">
          <span class="legend-color available"></span>
          空闲
        </span>
        <span class="legend-item">
          <span class="legend-color reserved"></span>
          已预约
        </span>
        <span class="legend-item">
          <span class="legend-color occupied"></span>
          占用
        </span>
        <span class="legend-item">
          <span class="legend-color maintenance"></span>
          维修
        </span>
      </div>

      <div class="spot-grid">
        <div
          v-for="spot in filteredSpots"
          :key="spot.id"
          class="spot-item"
          :class="getSpotItemClass(spot)"
          @click="handleSpotClick(spot)"
        >
          <span class="spot-code">{{ spot.code }}</span>
        </div>
      </div>

      <el-divider />

      <el-table :data="filteredSpots" stripe style="width: 100%" v-loading="loading">
        <el-table-column prop="code" label="车位编号" width="120">
          <template #default="{ row }">
            <span class="spot-code-table">{{ row.code }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="zone.name" label="所属区域" width="120">
          <template #default="{ row }">
            {{ row.zone?.name }}
          </template>
        </el-table-column>
        <el-table-column prop="zone.type" label="车位类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getSpotTypeTag(row.zone?.type)" size="small">
              {{ getSpotTypeLabel(row.zone?.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getEffectiveStatusTag(row)" size="small">
              {{ getEffectiveStatusLabel(row) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <template v-if="row.status === 'AVAILABLE' && !row.isReserved">
              <el-button
                type="primary"
                size="small"
                @click.stop="openReserveDialog(row)"
              >
                预约
              </el-button>
              <el-button
                type="warning"
                size="small"
                @click="toggleMaintenance(row, true)"
              >
                设为维修
              </el-button>
            </template>
            <template v-else-if="row.status === 'AVAILABLE' && row.isReserved">
              <el-tag type="warning" size="small">已预约</el-tag>
            </template>
            <template v-else-if="row.status === 'MAINTENANCE'">
              <el-button
                type="success"
                size="small"
                @click="toggleMaintenance(row, false)"
              >
                恢复可用
              </el-button>
            </template>
            <template v-else>
              <el-button
                type="info"
                size="small"
                disabled
              >
                占用中
              </el-button>
            </template>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="reserveDialogVisible"
      title="预约车位"
      width="420px"
      :close-on-click-modal="false"
    >
      <el-form :model="reserveForm" label-width="100px">
        <el-form-item label="车位编号">
          <span>{{ reserveForm.spotCode }}</span>
        </el-form-item>
        <el-form-item label="车牌号">
          <el-input v-model="reserveForm.plateNumber" placeholder="请输入车牌号（可选）" />
        </el-form-item>
        <el-form-item label="预约日期">
          <el-date-picker
            v-model="reserveForm.date"
            type="date"
            placeholder="选择日期"
            :disabled-date="disablePastDate"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="开始时间">
          <el-select v-model="reserveForm.startTime" placeholder="选择开始时间" style="width: 100%">
            <el-option
              v-for="t in timeOptions"
              :key="'start-' + t.value"
              :label="t.label"
              :value="t.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="结束时间">
          <el-select v-model="reserveForm.endTime" placeholder="选择结束时间" style="width: 100%">
            <el-option
              v-for="t in endTimeOptions"
              :key="'end-' + t.value"
              :label="t.label"
              :value="t.value"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reserveDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitReservation" :loading="reserveLoading">确认预约</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { parkingApi } from '@/api/parking';
import { reservationsApi } from '@/api/reservations';
import type { Spot, SpotStatus, SpotType } from '@/types';

const route = useRoute();
const loading = ref(false);
const spots = ref<any[]>([]);

const searchForm = reactive({
  status: '',
});

const reserveDialogVisible = ref(false);
const reserveLoading = ref(false);
const reserveForm = reactive({
  spotId: '',
  spotCode: '',
  plateNumber: '',
  date: '' as any,
  startTime: '',
  endTime: '',
});

const filteredSpots = computed(() => {
  if (!searchForm.status) return spots.value;
  if (searchForm.status === 'RESERVED') {
    return spots.value.filter((s) => s.status === 'AVAILABLE' && s.isReserved);
  }
  return spots.value.filter((s) => s.status === searchForm.status);
});

const generateTimeOptions = () => {
  const options: { value: string; label: string }[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hh = String(h).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      const value = `${hh}:${mm}`;
      options.push({ value, label: value });
    }
  }
  return options;
};

const timeOptions = generateTimeOptions();

const endTimeOptions = computed(() => {
  if (!reserveForm.startTime) return timeOptions;
  return timeOptions.filter((t) => t.value > reserveForm.startTime);
});

const disablePastDate = (date: Date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
};

const getSpotTypeLabel = (type?: SpotType) => {
  if (!type) return '-';
  const labels: Record<SpotType, string> = {
    SMALL: '小型车位',
    LARGE: '大型车位',
    VIP: 'VIP车位',
  };
  return labels[type];
};

const getSpotTypeTag = (type?: SpotType) => {
  if (!type) return 'info';
  const tags: Record<SpotType, string> = {
    SMALL: 'primary',
    LARGE: 'warning',
    VIP: 'success',
  };
  return tags[type];
};

const getStatusLabel = (status: SpotStatus) => {
  const labels: Record<SpotStatus, string> = {
    AVAILABLE: '空闲',
    OCCUPIED: '占用',
    MAINTENANCE: '维修',
  };
  return labels[status];
};

const getStatusTag = (status: SpotStatus) => {
  const tags: Record<SpotStatus, string> = {
    AVAILABLE: 'success',
    OCCUPIED: 'danger',
    MAINTENANCE: 'info',
  };
  return tags[status];
};

const getEffectiveStatusLabel = (spot: any) => {
  if (spot.status === 'AVAILABLE' && spot.isReserved) return '已预约';
  return getStatusLabel(spot.status);
};

const getEffectiveStatusTag = (spot: any) => {
  if (spot.status === 'AVAILABLE' && spot.isReserved) return 'warning';
  return getStatusTag(spot.status);
};

const getSpotItemClass = (spot: any) => {
  if (spot.status === 'AVAILABLE' && spot.isReserved) {
    return ['status-reserved', { 'can-toggle': false }];
  }
  return [
    `status-${spot.status.toLowerCase()}`,
    { 'can-toggle': spot.status !== 'OCCUPIED' },
  ];
};

const loadSpots = async () => {
  loading.value = true;
  try {
    const response = await parkingApi.getSpots();
    const zoneId = route.query.zoneId as string;
    if (zoneId) {
      spots.value = response.data.filter((s: Spot) => s.zoneId === zoneId);
    } else {
      spots.value = response.data;
    }
  } catch (error) {
    ElMessage.error('加载数据失败');
  } finally {
    loading.value = false;
  }
};

const resetSearch = () => {
  searchForm.status = '';
};

const handleSpotClick = (spot: any) => {
  if (spot.status === 'OCCUPIED') {
    ElMessage.info('该车位已被占用');
    return;
  }
  if (spot.status === 'AVAILABLE' && spot.isReserved) {
    ElMessage.info('该车位已被预约');
    return;
  }
  if (spot.status === 'AVAILABLE') {
    ElMessageBox.confirm(
      `确定要将车位 ${spot.code} 设为维修状态吗？`,
      '状态确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
      .then(() => toggleMaintenance(spot, true))
      .catch(() => {});
  } else {
    ElMessageBox.confirm(
      `确定要将车位 ${spot.code} 恢复为可用状态吗？`,
      '状态确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
      .then(() => toggleMaintenance(spot, false))
      .catch(() => {});
  }
};

const toggleMaintenance = async (spot: Spot, toMaintenance: boolean) => {
  try {
    await parkingApi.updateSpot(spot.id, {
      status: toMaintenance ? 'MAINTENANCE' : 'AVAILABLE',
    });
    ElMessage.success('状态更新成功');
    loadSpots();
  } catch (error) {
    ElMessage.error('操作失败');
  }
};

const openReserveDialog = (spot: any) => {
  reserveForm.spotId = spot.id;
  reserveForm.spotCode = spot.code;
  reserveForm.plateNumber = '';
  reserveForm.date = new Date();
  reserveForm.startTime = '';
  reserveForm.endTime = '';
  reserveDialogVisible.value = true;
};

const submitReservation = async () => {
  if (!reserveForm.date) {
    ElMessage.warning('请选择预约日期');
    return;
  }
  if (!reserveForm.startTime) {
    ElMessage.warning('请选择开始时间');
    return;
  }
  if (!reserveForm.endTime) {
    ElMessage.warning('请选择结束时间');
    return;
  }

  const d = new Date(reserveForm.date);
  const [startH, startM] = reserveForm.startTime.split(':').map(Number);
  const [endH, endM] = reserveForm.endTime.split(':').map(Number);

  const startDt = new Date(d);
  startDt.setHours(startH, startM, 0, 0);
  const endDt = new Date(d);
  endDt.setHours(endH, endM, 0, 0);

  if (endDt <= startDt) {
    ElMessage.warning('结束时间必须晚于开始时间');
    return;
  }

  const durationMinutes = (endDt.getTime() - startDt.getTime()) / (1000 * 60);
  if (durationMinutes < 30) {
    ElMessage.warning('预约时长最少30分钟');
    return;
  }
  if (durationMinutes % 30 !== 0) {
    ElMessage.warning('预约时长必须为30分钟的整数倍');
    return;
  }

  reserveLoading.value = true;
  try {
    await reservationsApi.create({
      spotId: reserveForm.spotId,
      startTime: startDt.toISOString(),
      endTime: endDt.toISOString(),
      plateNumber: reserveForm.plateNumber || undefined,
    });
    ElMessage.success('预约成功');
    reserveDialogVisible.value = false;
    loadSpots();
  } catch (error: any) {
    const msg = error?.response?.data?.message || '预约失败';
    ElMessage.error(msg);
  } finally {
    reserveLoading.value = false;
  }
};

onMounted(() => {
  loadSpots();
});
</script>

<style scoped lang="scss">
.spots-page {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.search-form {
  margin-bottom: 20px;
}

.spot-legend {
  display: flex;
  gap: 30px;
  margin-bottom: 20px;
  padding: 10px;
  background: #f5f7fa;
  border-radius: 4px;

  .legend-item {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .legend-color {
    width: 16px;
    height: 16px;
    border-radius: 4px;

    &.available {
      background: #67c23a;
    }

    &.reserved {
      background: #e6a23c;
    }

    &.occupied {
      background: #f56c6c;
    }

    &.maintenance {
      background: #909399;
    }
  }
}

.spot-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.spot-item {
  width: 80px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  cursor: default;
  transition: all 0.3s;
  border: 2px solid transparent;

  &.can-toggle {
    cursor: pointer;

    &:hover {
      transform: scale(1.05);
      border-color: #409eff;
    }
  }

  .spot-code {
    font-size: 14px;
    font-weight: bold;
    color: #fff;
  }

  &.status-available {
    background: #67c23a;
  }

  &.status-reserved {
    background: #e6a23c;
  }

  &.status-occupied {
    background: #f56c6c;
  }

  &.status-maintenance {
    background: #909399;
  }
}

.spot-code-table {
  font-weight: bold;
  color: #409eff;
}
</style>
