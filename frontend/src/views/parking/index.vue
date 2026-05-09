<template>
  <div class="parking-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>停车场信息</span>
        </div>
      </template>

      <el-table :data="parkings" stripe style="width: 100%" v-loading="loading">
        <el-table-column prop="name" label="停车场名称" width="200" />
        <el-table-column prop="address" label="地址" />
        <el-table-column prop="totalSpots" label="总车位数" width="120">
          <template #default="{ row }">
            <span class="total-spots">{{ row.totalSpots }}</span>
          </template>
        </el-table-column>
        <el-table-column label="可用车位" width="120">
          <template #default="{ row }">
            <span class="available-spots">{{ getAvailableSpots(row.id) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleEdit(row)">
              编辑
            </el-button>
            <el-button type="warning" size="small" @click="viewZones(row)">
              查看区域
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
        <el-form-item label="停车场名称" prop="name">
          <el-input
            v-model="formData.name"
            placeholder="请输入停车场名称"
          />
        </el-form-item>
        <el-form-item label="地址" prop="address">
          <el-input
            v-model="formData.address"
            type="textarea"
            :rows="2"
            placeholder="请输入地址"
          />
        </el-form-item>
        <el-form-item label="总车位数" prop="totalSpots">
          <el-input-number
            v-model="formData.totalSpots"
            :min="1"
            style="width: 100%"
          />
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
import { ref, reactive, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { parkingApi } from '@/api/parking';
import type { Parking, Zone, Spot } from '@/types';
import { SpotStatus } from '@/types';

const router = useRouter();
const loading = ref(false);
const submitting = ref(false);
const parkings = ref<Parking[]>([]);
const zones = ref<Zone[]>([]);
const spots = ref<Spot[]>([]);
const dialogVisible = ref(false);
const formRef = ref<FormInstance>();
const isEdit = ref(false);
const dialogTitle = ref('编辑停车场');

const formData = reactive({
  id: '',
  name: '',
  address: '',
  totalSpots: 0,
});

const formRules: FormRules = {
  name: [{ required: true, message: '请输入停车场名称', trigger: 'blur' }],
  address: [{ required: true, message: '请输入地址', trigger: 'blur' }],
  totalSpots: [
    { required: true, message: '请输入总车位数', trigger: 'blur' },
    { type: 'number', min: 1, message: '总车位数必须大于0', trigger: 'blur' },
  ],
};

const getAvailableSpots = (parkingId: string) => {
  const zoneIds = zones.value
    .filter((z) => z.parkingId === parkingId)
    .map((z) => z.id);
  return spots.value.filter(
    (s) => zoneIds.includes(s.zoneId) && s.status === SpotStatus.AVAILABLE
  ).length;
};

const loadData = async () => {
  loading.value = true;
  try {
    const [parkingRes, zonesRes, spotsRes] = await Promise.all([
      parkingApi.getAll(),
      parkingApi.getZones(),
      parkingApi.getSpots(),
    ]);
    parkings.value = parkingRes.data;
    zones.value = zonesRes.data;
    spots.value = spotsRes.data;
  } catch (error) {
    ElMessage.error('加载数据失败');
  } finally {
    loading.value = false;
  }
};

const handleEdit = (row: Parking) => {
  isEdit.value = true;
  formData.id = row.id;
  formData.name = row.name;
  formData.address = row.address;
  formData.totalSpots = row.totalSpots;
  dialogVisible.value = true;
};

const viewZones = (row: Parking) => {
  router.push(`/parking/zones?parkingId=${row.id}`);
};

const resetForm = () => {
  formData.id = '';
  formData.name = '';
  formData.address = '';
  formData.totalSpots = 0;
  formRef.value?.resetFields();
};

const handleSubmit = async () => {
  if (!formRef.value) return;

  await formRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true;
      try {
        await parkingApi.update(formData.id, {
          name: formData.name,
          address: formData.address,
          totalSpots: formData.totalSpots,
        });
        ElMessage.success('更新成功');
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
.parking-page {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.total-spots {
  font-weight: bold;
}

.available-spots {
  font-weight: bold;
  color: #67c23a;
}
</style>
