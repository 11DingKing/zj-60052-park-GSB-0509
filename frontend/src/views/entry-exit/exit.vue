<template>
  <div class="exit-page">
    <el-card class="search-card">
      <template #header>
        <div class="card-header">
          <span>出场结算</span>
        </div>
      </template>
      <el-form :inline="true" :model="searchForm">
        <el-form-item label="车牌号">
          <el-input
            v-model="searchForm.plateNumber"
            placeholder="请输入车牌号"
            clearable
            @keyup.enter="searchVehicle"
          >
            <template #append>
              <el-button @click="searchVehicle">查询</el-button>
            </template>
          </el-input>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card v-if="currentRecord" class="record-card">
      <template #header>
        <div class="card-header">
          <span>出场信息</span>
          <el-tag :type="currentRecord.isMonthly ? 'success' : 'info'">
            {{ currentRecord.isMonthly ? '月卡车辆' : '临时车辆' }}
          </el-tag>
        </div>
      </template>

      <el-descriptions :column="2" border>
        <el-descriptions-item label="车牌号">
          <span class="plate-number">{{ currentRecord.plateNumber }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="车位编号">
          {{ currentRecord.spot?.code }}
        </el-descriptions-item>
        <el-descriptions-item label="入场时间">
          {{ formatDateTime(currentRecord.entryTime) }}
        </el-descriptions-item>
        <el-descriptions-item label="出场时间">
          {{ formatDateTime(currentTime) }}
        </el-descriptions-item>
        <el-descriptions-item label="停车时长" :span="2">
          <span class="duration">{{ formatDuration(currentRecord.entryTime, currentTime) }}</span>
        </el-descriptions-item>
      </el-descriptions>

      <el-divider />

      <div class="fee-section">
        <h3>费用明细</h3>
        <el-table :data="feeDetail" border style="width: 100%">
          <el-table-column prop="name" label="项目" width="200" />
          <el-table-column prop="value" label="详情" />
          <el-table-column prop="amount" label="金额（元）" width="120" align="right" />
        </el-table>

        <div class="total-fee">
          <span>应收金额：</span>
          <span class="fee-amount" :class="{ 'free': currentRecord.isMonthly }">
            {{ currentRecord.isMonthly ? '月卡免费' : `¥${totalFee}` }}
          </span>
        </div>
      </div>

      <el-divider />

      <div class="action-section">
        <el-button type="primary" size="large" @click="handleExit">
          确认放行
        </el-button>
        <el-button size="large" @click="printReceipt">
          打印小票
        </el-button>
      </div>
    </el-card>

    <el-card v-else-if="searchAttempted && !currentRecord" class="no-record-card">
      <el-empty description="未找到该车辆的入场记录，请检查车牌号是否正确" />
    </el-card>

    <el-card class="list-card">
      <template #header>
        <div class="card-header">
          <span>当前在场车辆</span>
          <el-input
            v-model="listSearch"
            placeholder="搜索车牌号"
            style="width: 200px"
            clearable
          />
        </div>
      </template>
      <el-table :data="filteredRecords" stripe style="width: 100%">
        <el-table-column prop="plateNumber" label="车牌号" width="150">
          <template #default="{ row }">
            <span class="plate-number-small">{{ row.plateNumber }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="spot.code" label="车位" width="100" />
        <el-table-column prop="entryTime" label="入场时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.entryTime) }}
          </template>
        </el-table-column>
        <el-table-column prop="isMonthly" label="车辆类型" width="100">
          <template #default="{ row }">
            <el-tag :type="row.isMonthly ? 'success' : 'info'" size="small">
              {{ row.isMonthly ? '月卡' : '临时' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="selectRecord(row)">
              出场
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="receiptVisible" title="停车小票" width="500px">
      <div class="receipt-content" id="receipt-content">
        <div class="receipt-header">
          <h2>智能停车场</h2>
          <p>出场凭证</p>
        </div>
        <el-divider />
        <div class="receipt-info">
          <p><span>车牌号：</span>{{ receiptData?.plateNumber }}</p>
          <p><span>车位编号：</span>{{ receiptData?.spotCode }}</p>
          <p><span>入场时间：</span>{{ receiptData?.entryTime }}</p>
          <p><span>出场时间：</span>{{ receiptData?.exitTime }}</p>
          <p><span>停车时长：</span>{{ receiptData?.duration }}</p>
        </div>
        <el-divider />
        <div class="receipt-fee">
          <p><span>车辆类型：</span>{{ receiptData?.isMonthly ? '月卡车辆' : '临时车辆' }}</p>
          <p v-if="!receiptData?.isMonthly"><span>收费标准：</span>{{ receiptData?.feeInfo }}</p>
          <p class="total">
            <span>实收金额：</span>
            <span class="amount">{{ receiptData?.isMonthly ? '免费' : `¥${receiptData?.totalFee}` }}</span>
          </p>
        </div>
        <el-divider />
        <div class="receipt-footer">
          <p>出场时间：{{ formatDateTime(currentTime) }}</p>
          <p>感谢您的光临！</p>
        </div>
      </div>
      <template #footer>
        <el-button type="primary" @click="doPrint">打印</el-button>
        <el-button @click="receiptVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { parkingRecordsApi } from '@/api/parking-records';
import type { ParkingRecord } from '@/types';

const searchForm = ref({
  plateNumber: '',
});
const currentRecord = ref<ParkingRecord | null>(null);
const searchAttempted = ref(false);
const listSearch = ref('');
const currentTime = ref(new Date());
const receiptVisible = ref(false);
const receiptData = ref<any>(null);
const activeRecords = ref<ParkingRecord[]>([]);

let timer: NodeJS.Timeout;

const filteredRecords = computed(() => {
  if (!listSearch.value) return activeRecords.value;
  return activeRecords.value.filter((r) =>
    r.plateNumber.toLowerCase().includes(listSearch.value.toLowerCase())
  );
});

const totalFee = computed(() => {
  if (!currentRecord.value) return 0;
  const duration = calculateDuration(currentRecord.value.entryTime, currentTime.value);
  const hours = Math.ceil(duration / 60);
  if (hours <= 0) return 0;
  
  const zone = currentRecord.value.spot?.zone;
  if (!zone) return 0;
  
  if (hours === 1) {
    return zone.firstHourRate;
  } else {
    return zone.firstHourRate + (hours - 1) * zone.subsequentRate;
  }
});

const feeDetail = computed(() => {
  if (!currentRecord.value) return [];
  const duration = calculateDuration(currentRecord.value.entryTime, currentTime.value);
  const hours = Math.ceil(duration / 60);
  const zone = currentRecord.value.spot?.zone;
  
  if (!zone) return [];
  
  const details = [
    {
      name: '停车时长',
      value: `${hours}小时（${formatDuration(currentRecord.value.entryTime, currentTime.value)}）`,
      amount: '',
    },
  ];
  
  if (currentRecord.value.isMonthly) {
    details.push({
      name: '月卡优惠',
      value: '月卡车辆免费停车',
      amount: '免费',
    });
  } else {
    details.push({
      name: '收费标准',
      value: `首小时${zone.firstHourRate}元，之后每小时${zone.subsequentRate}元`,
      amount: '',
    });
    
    if (hours >= 1) {
      details.push({
        name: '首小时费用',
        value: '1小时',
        amount: `¥${zone.firstHourRate}`,
      });
      
      if (hours > 1) {
        details.push({
          name: '后续小时费用',
          value: `${hours - 1}小时 × ¥${zone.subsequentRate}`,
          amount: `¥${(hours - 1) * zone.subsequentRate}`,
        });
      }
    }
    
    details.push({
      name: '合计',
      value: '',
      amount: `¥${totalFee.value}`,
    });
  }
  
  return details;
});

const formatDateTime = (date: Date | string) => {
  const d = new Date(date);
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const calculateDuration = (start: Date | string, end: Date | string) => {
  const s = new Date(start);
  const e = new Date(end);
  return Math.floor((e.getTime() - s.getTime()) / 60000);
};

const formatDuration = (start: Date | string, end: Date | string) => {
  const minutes = calculateDuration(start, end);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) {
    return `${mins}分钟`;
  }
  return `${hours}小时${mins}分钟`;
};

const loadActiveRecords = async () => {
  try {
    const response = await parkingRecordsApi.getActive();
    activeRecords.value = response.data;
  } catch (error) {
    console.error('加载在场车辆失败:', error);
  }
};

const searchVehicle = async () => {
  if (!searchForm.value.plateNumber.trim()) {
    ElMessage.warning('请输入车牌号');
    return;
  }
  
  searchAttempted.value = true;
  currentRecord.value = null;
  
  try {
    const response = await parkingRecordsApi.getActive();
    const found = response.data.find(
      (r: ParkingRecord) => r.plateNumber.toUpperCase() === searchForm.value.plateNumber.trim().toUpperCase()
    );
    
    if (found) {
      currentRecord.value = found;
    }
  } catch (error) {
    ElMessage.error('查询失败');
  }
};

const selectRecord = (record: ParkingRecord) => {
  currentRecord.value = record;
  searchForm.value.plateNumber = record.plateNumber;
  searchAttempted.value = true;
};

const handleExit = async () => {
  if (!currentRecord.value) return;
  
  try {
    await ElMessageBox.confirm(
      `确认放行车牌号为 ${currentRecord.value.plateNumber} 的车辆？`,
      '确认放行',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );
    
    const response = await parkingRecordsApi.exit(currentRecord.value.plateNumber);
    
    ElMessage.success('放行成功');
    
    receiptData.value = {
      plateNumber: response.data.plateNumber,
      spotCode: response.data.spot?.code,
      entryTime: formatDateTime(response.data.entryTime),
      exitTime: formatDateTime(response.data.exitTime!),
      duration: formatDuration(response.data.entryTime, response.data.exitTime!),
      isMonthly: response.data.isMonthly,
      totalFee: response.data.fee,
      feeInfo: `首小时${currentRecord.value.spot?.zone?.firstHourRate}元，之后每小时${currentRecord.value.spot?.zone?.subsequentRate}元`,
    };
    
    receiptVisible.value = true;
    currentRecord.value = null;
    searchForm.value.plateNumber = '';
    searchAttempted.value = false;
    loadActiveRecords();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.message || '放行失败');
    }
  }
};

const printReceipt = () => {
  if (!currentRecord.value) return;
  
  receiptData.value = {
    plateNumber: currentRecord.value.plateNumber,
    spotCode: currentRecord.value.spot?.code,
    entryTime: formatDateTime(currentRecord.value.entryTime),
    exitTime: formatDateTime(currentTime.value),
    duration: formatDuration(currentRecord.value.entryTime, currentTime.value),
    isMonthly: currentRecord.value.isMonthly,
    totalFee: totalFee.value,
    feeInfo: `首小时${currentRecord.value.spot?.zone?.firstHourRate}元，之后每小时${currentRecord.value.spot?.zone?.subsequentRate}元`,
  };
  
  receiptVisible.value = true;
};

const doPrint = () => {
  const content = document.getElementById('receipt-content');
  if (content) {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>停车小票</title>
            <style>
              body { font-family: 'Microsoft YaHei', sans-serif; padding: 20px; }
              .receipt-header { text-align: center; }
              .receipt-header h2 { margin: 0; font-size: 20px; }
              .receipt-header p { margin: 5px 0 0; color: #666; }
              .receipt-info p, .receipt-fee p { margin: 8px 0; }
              .receipt-info span, .receipt-fee span { color: #666; }
              .receipt-fee .total { font-size: 16px; font-weight: bold; margin-top: 15px; }
              .receipt-fee .amount { color: #f56c6c; }
              .receipt-footer { text-align: center; color: #999; font-size: 12px; }
              hr { border: none; border-top: 1px dashed #ddd; margin: 15px 0; }
            </style>
          </head>
          <body>
            ${content.innerHTML}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  }
};

onMounted(() => {
  loadActiveRecords();
  timer = setInterval(() => {
    currentTime.value = new Date();
  }, 1000);
});

onUnmounted(() => {
  if (timer) {
    clearInterval(timer);
  }
});
</script>

<style scoped lang="scss">
.exit-page {
  padding: 20px;
}

.search-card,
.record-card,
.list-card,
.no-record-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.plate-number {
  font-size: 20px;
  font-weight: bold;
  color: #409eff;
}

.plate-number-small {
  font-weight: bold;
  color: #409eff;
}

.duration {
  font-size: 18px;
  font-weight: bold;
}

.fee-section {
  h3 {
    margin: 0 0 15px 0;
    font-size: 16px;
  }
}

.total-fee {
  margin-top: 20px;
  padding: 15px;
  background: #f5f7fa;
  border-radius: 4px;
  text-align: right;
  font-size: 16px;

  .fee-amount {
    font-size: 24px;
    font-weight: bold;
    color: #f56c6c;

    &.free {
      color: #67c23a;
    }
  }
}

.action-section {
  text-align: center;

  .el-button {
    margin: 0 10px;
    padding: 12px 40px;
  }
}

.receipt-content {
  font-family: 'Microsoft YaHei', sans-serif;

  .receipt-header {
    text-align: center;

    h2 {
      margin: 0;
      font-size: 20px;
    }

    p {
      margin: 5px 0 0;
      color: #666;
    }
  }

  .receipt-info p,
  .receipt-fee p {
    margin: 8px 0;
  }

  .receipt-info span,
  .receipt-fee span {
    color: #666;
  }

  .receipt-fee .total {
    font-size: 16px;
    font-weight: bold;
    margin-top: 15px;
  }

  .receipt-fee .amount {
    color: #f56c6c;
    font-size: 20px;
  }

  .receipt-footer {
    text-align: center;
    color: #999;
    font-size: 12px;
  }
}
</style>
