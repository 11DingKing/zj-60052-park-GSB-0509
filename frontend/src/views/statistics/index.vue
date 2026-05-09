<template>
  <div class="statistics-page">
    <el-row :gutter="20">
      <el-col :span="12">
        <el-card class="chart-card">
          <template #header>
            <span>每日营收（近30天）</span>
          </template>
          <div ref="dailyRevenueRef" class="chart-container"></div>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card class="chart-card">
          <template #header>
            <span>各区域车位利用率</span>
          </template>
          <div ref="zoneUtilizationRef" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="12">
        <el-card class="chart-card">
          <template #header>
            <span>高峰时段分析（24小时）</span>
          </template>
          <div ref="peakAnalysisRef" class="chart-container"></div>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card class="chart-card">
          <template #header>
            <span>月卡与临时车占比</span>
          </template>
          <div ref="vehicleTypeRef" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row style="margin-top: 20px">
      <el-col :span="24">
        <el-card class="table-card">
          <template #header>
            <div class="card-header">
              <span>月度营收汇总</span>
              <el-date-picker
                v-model="selectedMonth"
                type="month"
                placeholder="选择月份"
                value-format="YYYY-MM"
                @change="loadMonthlyRevenue"
              />
            </div>
          </template>
          <el-table :data="monthlyRevenue" stripe style="width: 100%">
            <el-table-column prop="date" label="日期" width="120" />
            <el-table-column prop="totalRecords" label="总车次" width="100" />
            <el-table-column prop="monthlyCount" label="月卡车次" width="100" />
            <el-table-column prop="temporaryCount" label="临时车次" width="100" />
            <el-table-column prop="totalRevenue" label="总营收（元）" width="150">
              <template #default="{ row }">
                <span class="revenue">¥{{ row.totalRevenue }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="avgFee" label="平均费用（元）" width="150">
              <template #default="{ row }">
                ¥{{ row.avgFee }}
              </template>
            </el-table-column>
          </el-table>
          <div class="table-summary">
            <el-descriptions :column="4" border>
              <el-descriptions-item label="总营收">
                <span class="summary-revenue">¥{{ summary.totalRevenue }}</span>
              </el-descriptions-item>
              <el-descriptions-item label="总车次">
                {{ summary.totalRecords }}
              </el-descriptions-item>
              <el-descriptions-item label="月卡车次">
                {{ summary.monthlyCount }}
              </el-descriptions-item>
              <el-descriptions-item label="临时车次">
                {{ summary.temporaryCount }}
              </el-descriptions-item>
            </el-descriptions>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import * as echarts from 'echarts';
import { statisticsApi } from '@/api/statistics';
import type {
  DailyRevenueData,
  ZoneUtilizationData,
  PeakHourData,
  VehicleTypeData,
  MonthlyRevenueItem,
} from '@/types';

const dailyRevenueRef = ref<HTMLDivElement | null>(null);
const zoneUtilizationRef = ref<HTMLDivElement | null>(null);
const peakAnalysisRef = ref<HTMLDivElement | null>(null);
const vehicleTypeRef = ref<HTMLDivElement | null>(null);

const selectedMonth = ref(new Date().toISOString().slice(0, 7));
const monthlyRevenue = ref<MonthlyRevenueItem[]>([]);

let dailyRevenueChart: echarts.ECharts | null = null;
let zoneUtilizationChart: echarts.ECharts | null = null;
let peakAnalysisChart: echarts.ECharts | null = null;
let vehicleTypeChart: echarts.ECharts | null = null;

const summary = computed(() => {
  const data = monthlyRevenue.value;
  return {
    totalRevenue: data.reduce((sum, item) => sum + item.totalRevenue, 0).toFixed(2),
    totalRecords: data.reduce((sum, item) => sum + item.totalRecords, 0),
    monthlyCount: data.reduce((sum, item) => sum + item.monthlyCount, 0),
    temporaryCount: data.reduce((sum, item) => sum + item.temporaryCount, 0),
  };
});

const initDailyRevenueChart = (data: DailyRevenueData[]) => {
  if (!dailyRevenueRef.value) return;

  dailyRevenueChart = echarts.init(dailyRevenueRef.value);

  const dates = data.map((item) => item.date);
  const revenues = data.map((item) => item.revenue);

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
      formatter: '{b}<br/>营收: ¥{c}',
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: {
        rotate: 45,
        interval: Math.floor(dates.length / 6),
      },
    },
    yAxis: {
      type: 'value',
      name: '金额（元）',
    },
    series: [
      {
        name: '营收',
        type: 'bar',
        data: revenues,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#83bff6' },
            { offset: 0.5, color: '#188df0' },
            { offset: 1, color: '#188df0' },
          ]),
        },
        emphasis: {
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#2378f7' },
              { offset: 0.7, color: '#2378f7' },
              { offset: 1, color: '#83bff6' },
            ]),
          },
        },
      },
    ],
  };

  dailyRevenueChart.setOption(option);
};

const initZoneUtilizationChart = (data: ZoneUtilizationData[]) => {
  if (!zoneUtilizationRef.value) return;

  zoneUtilizationChart = echarts.init(zoneUtilizationRef.value);

  const zones = data.map((item) => item.zoneName);
  const utilization = data.map((item) => item.utilization * 100);

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
      formatter: '{b}<br/>利用率: {c}%',
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: zones,
    },
    yAxis: {
      type: 'value',
      name: '利用率（%）',
      max: 100,
    },
    series: [
      {
        name: '利用率',
        type: 'bar',
        data: utilization,
        itemStyle: {
          color: (params) => {
            const value = params.value as number;
            if (value < 50) return '#67c23a';
            if (value < 80) return '#e6a23c';
            return '#f56c6c';
          },
        },
        label: {
          show: true,
          position: 'top',
          formatter: '{c}%',
        },
      },
    ],
  };

  zoneUtilizationChart.setOption(option);
};

const initPeakAnalysisChart = (data: PeakHourData[]) => {
  if (!peakAnalysisRef.value) return;

  peakAnalysisChart = echarts.init(peakAnalysisRef.value);

  const hours = data.map((item) => `${item.hour}:00`);
  const avgCars = data.map((item) => item.avgCars);

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
    },
    legend: {
      data: ['平均在场车辆数'],
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: hours,
      axisLabel: {
        interval: 2,
      },
    },
    yAxis: {
      type: 'value',
      name: '车辆数',
    },
    series: [
      {
        name: '平均在场车辆数',
        type: 'line',
        stack: 'Total',
        data: avgCars,
        smooth: true,
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(102, 126, 234, 0.5)' },
            { offset: 1, color: 'rgba(118, 75, 162, 0.1)' },
          ]),
        },
        lineStyle: {
          color: '#667eea',
          width: 2,
        },
        itemStyle: {
          color: '#667eea',
        },
      },
    ],
  };

  peakAnalysisChart.setOption(option);
};

const initVehicleTypeChart = (data: VehicleTypeData) => {
  if (!vehicleTypeRef.value) return;

  vehicleTypeChart = echarts.init(vehicleTypeRef.value);

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      left: 'left',
    },
    series: [
      {
        name: '车辆类型占比',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: true,
          formatter: '{b}: {d}%',
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 16,
            fontWeight: 'bold',
          },
        },
        labelLine: {
          show: true,
        },
        data: [
          { value: data.monthly, name: '月卡车辆', itemStyle: { color: '#67c23a' } },
          { value: data.temporary, name: '临时车辆', itemStyle: { color: '#409eff' } },
        ],
      },
    ],
  };

  vehicleTypeChart.setOption(option);
};

const loadCharts = async () => {
  try {
    const [dailyRes, zoneRes, peakRes, vehicleRes] = await Promise.all([
      statisticsApi.getDailyRevenue(),
      statisticsApi.getZoneUtilization(),
      statisticsApi.getPeakHours(),
      statisticsApi.getVehicleTypeRatio(),
    ]);

    initDailyRevenueChart(dailyRes.data);
    initZoneUtilizationChart(zoneRes.data);
    initPeakAnalysisChart(peakRes.data);
    initVehicleTypeChart(vehicleRes.data);
  } catch (error) {
    console.error('加载图表数据失败:', error);
  }
};

const loadMonthlyRevenue = async () => {
  try {
    const response = await statisticsApi.getMonthlyRevenue(selectedMonth.value);
    monthlyRevenue.value = response.data;
  } catch (error) {
    console.error('加载月度营收数据失败:', error);
  }
};

const handleResize = () => {
  dailyRevenueChart?.resize();
  zoneUtilizationChart?.resize();
  peakAnalysisChart?.resize();
  vehicleTypeChart?.resize();
};

onMounted(() => {
  loadCharts();
  loadMonthlyRevenue();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  dailyRevenueChart?.dispose();
  zoneUtilizationChart?.dispose();
  peakAnalysisChart?.dispose();
  vehicleTypeChart?.dispose();
  window.removeEventListener('resize', handleResize);
});
</script>

<style scoped lang="scss">
.statistics-page {
  padding: 20px;
}

.chart-card,
.table-card {
  height: 100%;
}

.chart-container {
  height: 350px;
  width: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-summary {
  margin-top: 20px;
}

.revenue {
  font-weight: bold;
  color: #f56c6c;
}

.summary-revenue {
  font-weight: bold;
  color: #f56c6c;
  font-size: 18px;
}
</style>
