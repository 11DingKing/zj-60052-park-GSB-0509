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
          <el-select
            v-model="searchForm.status"
            placeholder="全部状态"
            clearable
          >
            <el-option label="空闲" value="AVAILABLE" />
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
          :class="[
            `status-${spot.status.toLowerCase()}`,
            { 'can-toggle': spot.status !== 'OCCUPIED' },
          ]"
          @click="handleSpotClick(spot)"
        >
          <span class="spot-code">{{ spot.code }}</span>
        </div>
      </div>

      <el-divider />

      <el-table
        :data="filteredSpots"
        stripe
        style="width: 100%"
        v-loading="loading"
      >
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
            <el-tag :type="getStatusTag(row.status)" size="small">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'AVAILABLE'"
              type="warning"
              size="small"
              @click="toggleMaintenance(row, true)"
            >
              设为维修
            </el-button>
            <el-button
              v-else-if="row.status === 'MAINTENANCE'"
              type="success"
              size="small"
              @click="toggleMaintenance(row, false)"
            >
              恢复可用
            </el-button>
            <el-button v-else type="info" size="small" disabled>
              占用中
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { parkingApi } from "@/api/parking";
import type { Spot, SpotStatus, SpotType } from "@/types";

const route = useRoute();
const loading = ref(false);
const spots = ref<Spot[]>([]);

const searchForm = reactive({
  status: "",
});

const filteredSpots = computed(() => {
  if (!searchForm.status) return spots.value;
  return spots.value.filter((s) => s.status === searchForm.status);
});

const getSpotTypeLabel = (type?: SpotType) => {
  if (!type) return "-";
  const labels: Record<SpotType, string> = {
    SMALL: "小型车位",
    LARGE: "大型车位",
    VIP: "VIP车位",
  };
  return labels[type];
};

const getSpotTypeTag = (type?: SpotType) => {
  if (!type) return "info";
  const tags: Record<SpotType, string> = {
    SMALL: "primary",
    LARGE: "warning",
    VIP: "success",
  };
  return tags[type];
};

const getStatusLabel = (status: SpotStatus) => {
  const labels: Record<SpotStatus, string> = {
    AVAILABLE: "空闲",
    OCCUPIED: "占用",
    MAINTENANCE: "维修",
  };
  return labels[status];
};

const getStatusTag = (status: SpotStatus) => {
  const tags: Record<SpotStatus, string> = {
    AVAILABLE: "success",
    OCCUPIED: "danger",
    MAINTENANCE: "info",
  };
  return tags[status];
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
    ElMessage.error("加载数据失败");
  } finally {
    loading.value = false;
  }
};

const resetSearch = () => {
  searchForm.status = "";
};

const handleSpotClick = (spot: Spot) => {
  if (spot.status === "OCCUPIED") {
    ElMessage.info("该车位已被占用");
    return;
  }
  if (spot.status === "AVAILABLE") {
    ElMessageBox.confirm(
      `确定要将车位 ${spot.code} 设为维修状态吗？`,
      "状态确认",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      },
    )
      .then(() => toggleMaintenance(spot, true))
      .catch(() => {});
  } else {
    ElMessageBox.confirm(
      `确定要将车位 ${spot.code} 恢复为可用状态吗？`,
      "状态确认",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      },
    )
      .then(() => toggleMaintenance(spot, false))
      .catch(() => {});
  }
};

const toggleMaintenance = async (spot: Spot, toMaintenance: boolean) => {
  try {
    await parkingApi.updateSpot(spot.id, {
      status: toMaintenance ? "MAINTENANCE" : "AVAILABLE",
    });
    ElMessage.success("状态更新成功");
    loadSpots();
  } catch (error) {
    ElMessage.error("操作失败"
};

const filteredSpots = computed(() => {
  if (!searchForm.status) return spots.value;
  return spots.value.filter((s) => getDisplayStatus(s) === searchForm.status);
});

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

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    AVAILABLE: '空闲',
    RESERVED: '已预约',
    OCCUPIED: '占用',
    MAINTENANCE: '维修',
  };
  return labels[status] || status;
};

const getStatusTag = (status: string) => {
  const tags: Record<string, string> = {
    AVAILABLE: 'success',
    RESERVED: 'warning',
    OCCUPIED: 'danger',
    MAINTENANCE: 'info',
  };
  return tags[status] || 'info';
};

const formatTime = (time: string) => {
  const date = new Date(time);
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
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
    await loadReservationsForSpots();
  } catch (error) {
    ElMessage.error('加载数据失败');
  } finally {
    loading.value = false;
  }
};

const loadReservationsForSpots = async () => {
  try {
    const allReservations = await reservationsApi.getAllReservations();
    const now = new Date();
    const bufferMinutes = 15;

    for (const spot of spots.value) {
      const spotReservations = allReservations.data.filter(
        (r: Reservation) => r.spotId === spot.id
      );
      for (const reservation of spotReservations) {
        const start = new Date(reservation.startTime);
        const bufferStart = new Date(start.getTime() - bufferMinutes * 60 * 1000);
        const end = new Date(reservation.endTime);
        if (now >= bufferStart && now <= end) {
          spot.activeReservation = reservation;
          break;
        }
      }
    }
  } catch (error) {
    console.error('加载预约信息失败', error);
  }
};

const resetSearch = () => {
  searchForm.status = '';
};

const handleSpotClick = (spot: Spot) => {
  if (spot.status === 'OCCUPIED') {
    ElMessage.info('该车位已被占用');
    return;
  }
  if (spot.activeReservation) {
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

const openReservationDialog = (spot: Spot) => {
  selectedSpot.value = spot;
  reservationForm.plateNumber = '';
  const now = new Date();
  now.setMinutes(Math.ceil(now.getMinutes() / 30) * 30);
  now.setSeconds(0);
  reservationForm.startTime = now.toISOString().slice(0, 19);
  const endTime = new Date(now.getTime() + 30 * 60 * 1000);
  reservationForm.endTime = endTime.toISOString().slice(0, 19);
  reservationDialogVisible.value = true;
};

const disableStartDate = (date: Date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
};

const disableEndDate = (date: Date) => {
  if (!reservationForm.startTime) return false;
  const startDate = new Date(reservationForm.startTime);
  return date < startDate;
};

const getDurationText = () => {
  if (!reservationForm.startTime || !reservationForm.endTime) return '-';
  const start = new Date(reservationForm.startTime);
  const end = new Date(reservationForm.endTime);
  const diffMs = end.getTime() - start.getTime();
  if (diffMs <= 0) return '请选择有效时间';
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  if (hours === 0) return `${minutes}分钟`;
  if (minutes === 0) return `${hours}小时`;
  return `${hours}小时${minutes}分钟`;
};

const validateTimeRange = () => {
  if (!reservationForm.startTime || !reservationForm.endTime) {
    return { valid: false, message: '请选择时间' };
  }
  const start = new Date(reservationForm.startTime);
  const end = new Date(reservationForm.endTime);
  const now = new Date();
  if (start <= now) {
    return { valid: false, message: '开始时间必须晚于当前时间' };
  }
  if (end <= start) {
    return { valid: false, message: '结束时间必须晚于开始时间' };
  }
  const diffMs = end.getTime() - start.getTime();
  const diffMinutes = diffMs / (1000 * 60);
  if (diffMinutes < 30) {
    return { valid: false, message: '预约时长至少为30分钟' };
  }
  if (diffMinutes % 30 !== 0) {
    return { valid: false, message: '预约时长必须为30分钟的整数倍' };
  }
  if (start.getMinutes() % 30 !== 0 || end.getMinutes() % 30 !== 0) {
    return { valid: false, message: '时间必须选择30分钟整点（如 10:00、10:30）' };
  }
  return { valid: true };
};

const submitReservation = async () => {
  if (!reservationFormRef.value || !selectedSpot.value) return;
  await reservationFormRef.value.validate(async (valid) => {
    if (!valid) return;
    const validation = validateTimeRange();
    if (!validation.valid) {
      ElMessage.error(validation.message);
      return;
    }
    submitting.value = true;
    try {
      await reservationsApi.createReservation({
        spotId: selectedSpot.value.id,
        plateNumber: reservationForm.plateNumber,
        startTime: reservationForm.startTime,
        endTime: reservationForm.endTime,
      });
      ElMessage.success('预约成功');
      reservationDialogVisible.value = false;
      loadSpots();
    } catch (error: any) {
      ElMessage.error(error.response?.data?.message || '预约失败');
    } finally {
      submitting.value = false;
    }
  });
};

const cancelReservation = async (reservation: Reservation) => {
  try {
    await ElMessageBox.confirm(
      `确定要取消预约吗？`,
      '取消预约',
      {
        confirmButtonText: '确定取消',
        cancelButtonText: '返回',
        type: 'warning',
      }
    );
    await reservationsApi.cancelReservation(reservation.id, reservation.plateNumber);
    ElMessage.success('预约已取消');
    loadSpots();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('取消预约失败');
    }
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
  position: relative;

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

  .spot-badge {
    position: absolute;
    top: -8px;
    right: -8px;
    background: #e6a23c;
    color: #fff;
    font-size: 10px;
    padding: 2px 4px;
    border-radius: 4px;
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

.reservation-info {
  font-size: 12px;
  line-height: 1.4;

  .reservation-time {
    color: #606266;
  }
}
</style>
