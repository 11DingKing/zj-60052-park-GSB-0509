<template>
  <div class="zones-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>区域管理</span>
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>
            新增区域
          </el-button>
        </div>
      </template>

      <el-table :data="zones" stripe style="width: 100%" v-loading="loading">
        <el-table-column prop="name" label="区域名称" width="150">
          <template #default="{ row }">
            <span class="zone-name">{{ row.name }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="totalSpots" label="车位数" width="100" />
        <el-table-column prop="type" label="车位类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getSpotTypeTag(row.type)" size="small">
              {{ getSpotTypeLabel(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="firstHourRate" label="首小时费率" width="120">
          <template #default="{ row }">
            <span class="fee">¥{{ row.firstHourRate }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="subsequentRate" label="后续费率" width="120">
          <template #default="{ row }">
            <span class="fee">¥{{ row.subsequentRate }}/小时</span>
          </template>
        </el-table-column>
        <el-table-column label="车位状态" width="200">
          <template #default="{ row }">
            <div class="spot-status">
              <el-tag type="success" size="small">
                空闲: {{ getSpotCount(row.id, 'AVAILABLE') }}
              </el-tag>
              <el-tag type="danger" size="small">
                占用: {{ getSpotCount(row.id, 'OCCUPIED') }}
              </el-tag>
              <el-tag type="info" size="small">
                维修: {{ getSpotCount(row.id, 'MAINTENANCE') }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleEdit(row)">
              编辑
            </el-button>
            <el-button type="warning" size="small" @click="viewSpots(row)">
              查看车位
            </el-button>
            <el-button
              type="danger"
              size="small"
              @click="handleDelete(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
      @close="resetForm"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="120px"
      >
        <el-form-item label="区域名称" prop="name">
          <el-input
            v-model="formData.name"
            placeholder="如：A区、B区"
          />
        </el-form-item>
        <el-form-item label="车位数" prop="totalSpots">
          <el-input-number
            v-model="formData.totalSpots"
            :min="1"
            :max="100"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="车位类型" prop="type">
          <el-select v-model="formData.type" placeholder="请选择车位类型" style="width: 100%">
            <el-option label="小型车位" value="SMALL" />
            <el-option label="大型车位" value="LARGE" />
            <el-option label="VIP车位" value="VIP" />
          </el-select>
        </el-form-item>
        <el-form-item label="首小时费率" prop="firstHourRate">
          <el-input-number
            v-model="formData.firstHourRate"
            :min="0"
            :precision="2"
            style="width: 100%"
          />
          <span class="unit">元</span>
        </el-form-item>
        <el-form-item label="后续费率" prop="subsequentRate">
          <el-input-number
            v-model="formData.subsequentRate"
            :min="0"
            :precision="2"
            style="width: 100%"
          />
          <span class="unit">元/小时</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import { parkingApi } from '@/api/parking';
import type { Zone, Spot, SpotStatus, SpotType } from '@/types';

const router = useRouter();
const route = useRoute();
const loading = ref(false);
const submitting = ref(false);
const zones = ref<Zone[]>([]);
const spots = ref<Spot[]>([]);
const dialogVisible = ref(false);
const formRef = ref<FormInstance>();
const isEdit = ref(false);
const dialogTitle = ref('新增区域');

const formData = reactive({
  id: '',
  parkingId: '',
  name: '',
  totalSpots: 20,
  type: 'SMALL' as ZoneType,
  firstHourRate: 5,
  subsequentRate: 3,
});

const formRules: FormRules = {
  name: [{ required: true, message: '请输入区域名称', trigger: 'blur' }],
  totalSpots: [{ required: true, message: '请输入车位数', trigger: 'blur' }],
  type: [{ required: true, message: '请选择车位类型', trigger: 'change' }],
  firstHourRate: [{ required: true, message: '请输入首小时费率', trigger: 'blur' }],
  subsequentRate: [{ required: true, message: '请输入后续费率', trigger: 'blur' }],
};

const getSpotTypeLabel = (type: SpotType) => {
  const labels: Record<SpotType, string> = {
    SMALL: '小型车位',
    LARGE: '大型车位',
    VIP: 'VIP车位',
  };
  return labels[type];
};

const getSpotTypeTag = (type: SpotType) => {
  const tags: Record<SpotType, string> = {
    SMALL: 'primary',
    LARGE: 'warning',
    VIP: 'success',
  };
  return tags[type];
};

const getSpotCount = (zoneId: string, status: SpotStatus) => {
  return spots.value.filter((s) => s.zoneId === zoneId && s.status === status).length;
};

const loadData = async () => {
  loading.value = true;
  try {
    const [zonesRes, spotsRes] = await Promise.all([
      parkingApi.getZones(),
      parkingApi.getSpots(),
    ]);
    const parkingId = route.query.parkingId as string;
    if (parkingId) {
      zones.value = zonesRes.data.filter((z: Zone) => z.parkingId === parkingId);
      spots.value = spotsRes.data.filter((s: Spot) =>
        zones.value.some((z: Zone) => z.id === s.zoneId)
      );
    } else {
      zones.value = zonesRes.data;
      spots.value = spotsRes.data;
    }
  } catch (error) {
    ElMessage.error('加载数据失败');
  } finally {
    loading.value = false;
  }
};

const handleAdd = () => {
  isEdit.value = false;
  dialogTitle.value = '新增区域';
  resetForm();
  const parkingId = route.query.parkingId as string;
  if (parkingId) {
    formData.parkingId = parkingId;
  }
  dialogVisible.value = true;
};

const handleEdit = (row: Zone) => {
  isEdit.value = true;
  dialogTitle.value = '编辑区域';
  formData.id = row.id;
  formData.parkingId = row.parkingId;
  formData.name = row.name;
  formData.totalSpots = row.totalSpots;
  formData.type = row.type;
  formData.firstHourRate = row.firstHourRate;
  formData.subsequentRate = row.subsequentRate;
  dialogVisible.value = true;
};

const viewSpots = (row: Zone) => {
  router.push(`/parking/spots?zoneId=${row.id}`);
};

const handleDelete = (row: Zone) => {
  ElMessageBox.confirm(
    `确定要删除区域 ${row.name} 吗？该区域下的所有车位也将被删除。`,
    '删除确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
    .then(async () => {
      try {
        await parkingApi.deleteZone(row.id);
        ElMessage.success('删除成功');
        loadData();
      } catch (error) {
        ElMessage.error('删除失败');
      }
    })
    .catch(() => {});
};

const resetForm = () => {
  formData.id = '';
  formData.parkingId = '';
  formData.name = '';
  formData.totalSpots = 20;
  formData.type = 'SMALL';
  formData.firstHourRate = 5;
  formData.subsequentRate = 3;
  formRef.value?.resetFields();
};

const handleSubmit = async () => {
  if (!formRef.value) return;

  await formRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true;
      try {
        if (isEdit.value) {
          await parkingApi.updateZone(formData.id, {
            name: formData.name,
            firstHourRate: formData.firstHourRate,
            subsequentRate: formData.subsequentRate,
          });
          ElMessage.success('更新成功');
        } else {
          await parkingApi.createZone({
            parkingId: formData.parkingId,
            name: formData.name,
            totalSpots: formData.totalSpots,
            type: formData.type,
            firstHourRate: formData.firstHourRate,
            subsequentRate: formData.subsequentRate,
          });
          ElMessage.success('创建成功');
        }
        dialogVisible.value = false;
        loadData();
      } catch (error) {
        ElMessage.error('操作失败');
      } finally {
        submitting.value = false;
      }
    }
  });
};

onMounted(() => {
  loadData();
});
</script>

<style scoped lang="scss">
.zones-page {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.zone-name {
  font-weight: bold;
  font-size: 16px;
}

.fee {
  font-weight: bold;
  color: #f56c6c;
}

.spot-status {
  display: flex;
  gap: 8px;
}

.unit {
  margin-left: 10px;
  color: #999;
}
</style>
