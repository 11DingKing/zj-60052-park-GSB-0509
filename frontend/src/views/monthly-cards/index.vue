<template>
  <div class="monthly-cards-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>月卡管理</span>
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>
            新增月卡
          </el-button>
        </div>
      </template>

      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="车牌号">
          <el-input
            v-model="searchForm.plateNumber"
            placeholder="请输入车牌号"
            clearable
          />
        </el-form-item>
        <el-form-item label="车主姓名">
          <el-input
            v-model="searchForm.ownerName"
            placeholder="请输入车主姓名"
            clearable
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部状态" clearable>
            <el-option label="有效" value="active" />
            <el-option label="已过期" value="expired" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadCards">搜索</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="cards" stripe style="width: 100%" v-loading="loading">
        <el-table-column prop="plateNumber" label="车牌号" width="120">
          <template #default="{ row }">
            <span class="plate-number">{{ row.plateNumber }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="ownerName" label="车主姓名" width="100" />
        <el-table-column prop="phone" label="手机号" width="120" />
        <el-table-column prop="zone.name" label="绑定区域" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.zone" size="small">{{ row.zone.name }}</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="startDate" label="有效期开始" width="110">
          <template #default="{ row }">
            {{ formatDate(row.startDate) }}
          </template>
        </el-table-column>
        <el-table-column prop="endDate" label="有效期结束" width="110">
          <template #default="{ row }">
            {{ formatDate(row.endDate) }}
          </template>
        </el-table-column>
        <el-table-column prop="fee" label="月卡费用" width="100">
          <template #default="{ row }">
            <span class="fee">¥{{ row.fee }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="isExpired(row) ? 'danger' : 'success'" size="small">
              {{ isExpired(row) ? '已过期' : '有效' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleEdit(row)">
              编辑
            </el-button>
            <el-button
              type="danger"
              size="small"
              @click="handleDelete(row)"
            >
              删除
            </el-button>
            <el-button
              type="warning"
              size="small"
              @click="handleRenew(row)"
              v-if="isExpired(row)"
            >
              续费
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
        <el-form-item label="车牌号" prop="plateNumber">
          <el-input
            v-model="formData.plateNumber"
            placeholder="请输入车牌号"
            :disabled="isEdit"
          />
        </el-form-item>
        <el-form-item label="车主姓名" prop="ownerName">
          <el-input
            v-model="formData.ownerName"
            placeholder="请输入车主姓名"
          />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input
            v-model="formData.phone"
            placeholder="请输入手机号"
            maxlength="11"
          />
        </el-form-item>
        <el-form-item label="绑定区域" prop="zoneId">
          <el-select
            v-model="formData.zoneId"
            placeholder="请选择绑定区域（可选）"
            clearable
            style="width: 100%"
          >
            <el-option
              v-for="zone in zones"
              :key="zone.id"
              :label="zone.name"
              :value="zone.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="有效期开始" prop="startDate">
          <el-date-picker
            v-model="formData.startDate"
            type="date"
            placeholder="选择开始日期"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="有效期结束" prop="endDate">
          <el-date-picker
            v-model="formData.endDate"
            type="date"
            placeholder="选择结束日期"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="月卡费用" prop="fee">
          <el-input-number
            v-model="formData.fee"
            :min="0"
            :precision="2"
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

    <el-dialog
      v-model="renewDialogVisible"
      title="月卡续费"
      width="500px"
    >
      <el-descriptions :column="1" border>
        <el-descriptions-item label="车牌号">
          <span class="plate-number">{{ renewCard?.plateNumber }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="车主姓名">
          {{ renewCard?.ownerName }}
        </el-descriptions-item>
        <el-descriptions-item label="当前有效期">
          {{ formatDate(renewCard?.startDate) }} 至 {{ formatDate(renewCard?.endDate) }}
        </el-descriptions-item>
      </el-descriptions>

      <el-form :model="renewForm" label-width="120px" style="margin-top: 20px">
        <el-form-item label="续包月数">
          <el-select v-model="renewForm.months" placeholder="请选择月数">
            <el-option :label="1 + '个月'" :value="1" />
            <el-option :label="3 + '个月'" :value="3" />
            <el-option :label="6 + '个月'" :value="6" />
            <el-option :label="12 + '个月'" :value="12" />
          </el-select>
        </el-form-item>
        <el-form-item label="续费费用">
          <span class="fee">¥{{ renewForm.months * (renewCard?.fee || 0) }}</span>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="renewDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleRenewSubmit" :loading="submitting">
          确认续费
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import { monthlyCardsApi } from '@/api/monthly-cards';
import { parkingApi } from '@/api/parking';
import type { MonthlyCard, Zone } from '@/types';

const loading = ref(false);
const submitting = ref(false);
const cards = ref<MonthlyCard[]>([]);
const zones = ref<Zone[]>([]);
const dialogVisible = ref(false);
const renewDialogVisible = ref(false);
const isEdit = ref(false);
const formRef = ref<FormInstance>();
const renewCard = ref<MonthlyCard | null>(null);

const searchForm = reactive({
  plateNumber: '',
  ownerName: '',
  status: '',
});

const formData = reactive({
  id: '',
  plateNumber: '',
  ownerName: '',
  phone: '',
  zoneId: '',
  startDate: '',
  endDate: '',
  fee: 0,
});

const renewForm = reactive({
  months: 1,
});

const formRules: FormRules = {
  plateNumber: [{ required: true, message: '请输入车牌号', trigger: 'blur' }],
  ownerName: [{ required: true, message: '请输入车主姓名', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' },
  ],
  startDate: [{ required: true, message: '请选择开始日期', trigger: 'change' }],
  endDate: [{ required: true, message: '请选择结束日期', trigger: 'change' }],
  fee: [{ required: true, message: '请输入月卡费用', trigger: 'blur' }],
};

const dialogTitle = ref('新增月卡');

const formatDate = (date: string | Date | undefined) => {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString('zh-CN');
};

const isExpired = (card: MonthlyCard) => {
  return new Date(card.endDate) < new Date();
};

const loadZones = async () => {
  try {
    const response = await parkingApi.getZones();
    zones.value = response.data;
  } catch (error) {
    console.error('加载区域失败:', error);
  }
};

const loadCards = async () => {
  loading.value = true;
  try {
    const response = await monthlyCardsApi.getAll();
    let data = response.data;
    
    if (searchForm.plateNumber) {
      data = data.filter((c: MonthlyCard) =>
        c.plateNumber.toLowerCase().includes(searchForm.plateNumber.toLowerCase())
      );
    }
    if (searchForm.ownerName) {
      data = data.filter((c: MonthlyCard) =>
        c.ownerName.includes(searchForm.ownerName)
      );
    }
    if (searchForm.status) {
      const now = new Date();
      data = data.filter((c: MonthlyCard) => {
        const expired = new Date(c.endDate) < now;
        if (searchForm.status === 'active') return !expired;
        return expired;
      });
    }
    
    cards.value = data;
  } catch (error) {
    ElMessage.error('加载月卡列表失败');
  } finally {
    loading.value = false;
  }
};

const resetSearch = () => {
  searchForm.plateNumber = '';
  searchForm.ownerName = '';
  searchForm.status = '';
  loadCards();
};

const handleAdd = () => {
  isEdit.value = false;
  dialogTitle.value = '新增月卡';
  resetForm();
  dialogVisible.value = true;
};

const handleEdit = (row: MonthlyCard) => {
  isEdit.value = true;
  dialogTitle.value = '编辑月卡';
  formData.id = row.id;
  formData.plateNumber = row.plateNumber;
  formData.ownerName = row.ownerName;
  formData.phone = row.phone;
  formData.zoneId = row.zoneId || '';
  formData.startDate = row.startDate;
  formData.endDate = row.endDate;
  formData.fee = row.fee;
  dialogVisible.value = true;
};

const handleDelete = (row: MonthlyCard) => {
  ElMessageBox.confirm(
    `确定要删除车牌号为 ${row.plateNumber} 的月卡吗？`,
    '删除确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
    .then(async () => {
      try {
        await monthlyCardsApi.delete(row.id);
        ElMessage.success('删除成功');
        loadCards();
      } catch (error) {
        ElMessage.error('删除失败');
      }
    })
    .catch(() => {});
};

const handleRenew = (row: MonthlyCard) => {
  renewCard.value = row;
  renewForm.months = 1;
  renewDialogVisible.value = true;
};

const handleRenewSubmit = async () => {
  if (!renewCard.value) return;
  
  submitting.value = true;
  try {
    const newEndDate = new Date(renewCard.value.endDate);
    newEndDate.setMonth(newEndDate.getMonth() + renewForm.months);
    
    await monthlyCardsApi.update(renewCard.value.id, {
      endDate: newEndDate.toISOString().split('T')[0],
    });
    
    ElMessage.success('续费成功');
    renewDialogVisible.value = false;
    loadCards();
  } catch (error) {
    ElMessage.error('续费失败');
  } finally {
    submitting.value = false;
  }
};

const resetForm = () => {
  formData.id = '';
  formData.plateNumber = '';
  formData.ownerName = '';
  formData.phone = '';
  formData.zoneId = '';
  formData.startDate = new Date().toISOString().split('T')[0];
  const defaultEnd = new Date();
  defaultEnd.setMonth(defaultEnd.getMonth() + 1);
  formData.endDate = defaultEnd.toISOString().split('T')[0];
  formData.fee = 0;
  formRef.value?.resetFields();
};

const handleSubmit = async () => {
  if (!formRef.value) return;
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true;
      try {
        const data = {
          plateNumber: formData.plateNumber.toUpperCase(),
          ownerName: formData.ownerName,
          phone: formData.phone,
          zoneId: formData.zoneId || undefined,
          startDate: formData.startDate,
          endDate: formData.endDate,
          fee: formData.fee,
        };
        
        if (isEdit.value) {
          await monthlyCardsApi.update(formData.id, data);
          ElMessage.success('更新成功');
        } else {
          await monthlyCardsApi.create(data);
          ElMessage.success('创建成功');
        }
        
        dialogVisible.value = false;
        loadCards();
      } catch (error: any) {
        ElMessage.error(error.response?.data?.message || '操作失败');
      } finally {
        submitting.value = false;
      }
    }
  });
};

onMounted(() => {
  loadZones();
  loadCards();
});
</script>

<style scoped lang="scss">
.monthly-cards-page {
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

.plate-number {
  font-weight: bold;
  color: #409eff;
}

.fee {
  font-weight: bold;
  color: #f56c6c;
}
</style>
