<template>
  <div class="entry-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>车辆入场登记</span>
        </div>
      </template>

      <el-form
        ref="entryFormRef"
        :model="entryForm"
        :rules="entryRules"
        label-width="100px"
        class="entry-form"
      >
        <el-form-item label="车牌号" prop="plateNumber">
          <el-input
            v-model="entryForm.plateNumber"
            placeholder="请输入车牌号"
            size="large"
            style="width: 300px"
            @blur="checkMonthlyCard"
          >
            <template #prefix>
              <el-icon><Document /></el-icon>
            </template>
          </el-input>
          <el-tag v-if="monthlyCardInfo" type="success" style="margin-left: 10px">
            <el-icon><Check /></el-icon> 月卡车辆
          </el-tag>
        </el-form-item>

        <el-form-item label="选择区域" prop="zoneId">
          <el-select
            v-model="entryForm.zoneId"
            placeholder="请选择停车区域（月卡车辆自动分配）"
            size="large"
            style="width: 300px"
            :disabled="!!monthlyCardInfo"
          >
            <el-option
              v-for="zone in zones"
              :key="zone.id"
              :label="`${zone.name} (${zone.type === 'SMALL' ? '小型车' : zone.type === 'LARGE' ? '大型车' : 'VIP'}) - 可用${zone._count?.spots || 0}个`"
              :value="zone.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item v-if="monthlyCardInfo">
          <el-alert
            title="月卡车辆信息"
            type="success"
            show-icon
          >
            <template #default>
              <div>车主: {{ monthlyCardInfo.ownerName }}</div>
              <div>联系电话: {{ monthlyCardInfo.phone }}</div>
              <div>绑定区域: {{ monthlyCardInfo.zone?.name }}</div>
              <div>有效期: {{ formatDate(monthlyCardInfo.startDate) }} 至 {{ formatDate(monthlyCardInfo.endDate) }}</div>
            </template>
          </el-alert>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" size="large" :loading="loading" @click="handleEntry">
            <el-icon><Right /></el-icon> 确认入场
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card style="margin-top: 20px">
      <template #header>
        <span>入场历史（最近10条）</span>
      </template>
      
      <el-table :data="recentEntries" style="width: 100%" stripe>
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
        <el-table-column prop="spotCode" label="车位号" width="100">
          <template #default="{ row }">
            {{ row.spot?.code }}
          </template>
        </el-table-column>
        <el-table-column prop="zoneName" label="区域" width="100">
          <template #default="{ row }">
            {{ row.spot?.zone?.name }}
          </template>
        </el-table-column>
        <el-table-column prop="entryTime" label="入场时间" width="200">
          <template #default="{ row }">
            {{ formatDateTime(row.entryTime) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'PARKING' ? 'warning' : 'info'">
              {{ row.status === 'PARKING' ? '在场' : '已离场' }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { parkingApi } from '@/api/parking'
import { parkingRecordsApi } from '@/api/parking-records'
import { monthlyCardsApi } from '@/api/monthly-cards'
import type { Zone, MonthlyCard, ParkingRecord } from '@/types'

const router = useRouter()
const entryFormRef = ref<FormInstance>()
const loading = ref(false)

const entryForm = ref({
  plateNumber: '',
  zoneId: '',
})

const entryRules: FormRules = {
  plateNumber: [
    { required: true, message: '请输入车牌号', trigger: 'blur' },
    { pattern: /^[\u4e00-\u9fa5][A-Z][A-Z0-9]{5,6}$/, message: '车牌号格式不正确', trigger: 'blur' },
  ],
  zoneId: [
    { required: true, message: '请选择停车区域', trigger: 'change' },
  ],
}

const zones = ref<Zone[]>([])
const monthlyCardInfo = ref<MonthlyCard | null>(null)
const recentEntries = ref<ParkingRecord[]>([])

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN')
}

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const fetchZones = async () => {
  try {
    const data = await parkingApi.getZones()
    zones.value = data
  } catch (error) {
    console.error('获取区域列表失败:', error)
  }
}

const fetchRecentEntries = async () => {
  try {
    const data = await parkingRecordsApi.getAll()
    recentEntries.value = data.slice(0, 10)
  } catch (error) {
    console.error('获取入场历史失败:', error)
  }
}

const checkMonthlyCard = async () => {
  monthlyCardInfo.value = null
  if (!entryForm.value.plateNumber) return
  
  try {
    const card = await monthlyCardsApi.getByPlateNumber(entryForm.value.plateNumber.toUpperCase())
    if (card) {
      monthlyCardInfo.value = card
      entryForm.value.zoneId = card.zoneId
    }
  } catch (error) {
    // 月卡不存在是正常情况，不报错
  }
}

const handleEntry = async () => {
  if (!entryFormRef.value) return
  
  await entryFormRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true
      try {
        const result = await parkingRecordsApi.entry(
          entryForm.value.plateNumber.toUpperCase(),
          entryForm.value.zoneId
        )
        
        ElMessage.success(`入场成功！已分配车位: ${result.spot.code}`)
        
        entryForm.value = { plateNumber: '', zoneId: '' }
        monthlyCardInfo.value = null
        fetchRecentEntries()
      } catch (error: any) {
        ElMessage.error(error.response?.data?.message || '入场失败')
      } finally {
        loading.value = false
      }
    }
  })
}

onMounted(() => {
  fetchZones()
  fetchRecentEntries()
})
</script>

<style scoped>
.entry-container {
  max-width: 800px;
}

.card-header {
  font-weight: bold;
}

.entry-form {
  max-width: 600px;
  padding: 20px;
}
</style>
