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
            <el-button
              v-else
              type="info"
              size="small"
              disabled
            >
              占用中
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { parkingApi } from '@/api/parking';
import type { Spot, SpotStatus, SpotType } from '@/types';

const route = useRoute();
const loading = ref(false);
const spots = ref<Spot[]>([]);

const searchForm = reactive({
  status: '',
});

const filteredSpots = computed(() => {
  if (!searchForm.status) return spots.value;
  return spots.value.filter((s) => s.status === searchForm.status);
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

const handleSpotClick = (spot: Spot) => {
  if (spot.status === 'OCCUPIED') {
    ElMessage.info('该车位已被占用');
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
