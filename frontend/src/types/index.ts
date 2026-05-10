export enum UserRole {
  ADMIN = 'ADMIN',
  PARKING_ATTENDANT = 'PARKING_ATTENDANT',
}

export enum ZoneType {
  SMALL = 'SMALL',
  LARGE = 'LARGE',
  VIP = 'VIP',
}

export enum SpotStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  MAINTENANCE = 'MAINTENANCE',
}

export enum ParkingRecordStatus {
  PARKING = 'PARKING',
  COMPLETED = 'COMPLETED',
}

export interface User {
  id: string
  username: string
  name: string
  role: UserRole
  phone?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface LoginResponse {
  accessToken: string
  user: Omit<User, 'password'>
}

export interface Parking {
  id: string
  name: string
  address: string
  totalSpots: number
  description?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Zone {
  id: string
  parkingId: string
  name: string
  code: string
  totalSpots: number
  type: ZoneType
  firstHourRate: number
  subsequentRate: number
  description?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Reservation {
  id: string
  spotId: string
  plateNumber: string
  startTime: string
  endTime: string
  createdAt: string
  spot?: Spot
}

export interface Spot {
  id: string
  zoneId: string
  code: string
  number: number
  status: SpotStatus
  description?: string
  createdAt: string
  updatedAt: string
  zone?: Zone
  activeReservation?: Reservation
  effectiveStatus?: string
}

export interface MonthlyCard {
  id: string
  plateNumber: string
  ownerName: string
  phone: string
  zoneId: string
  startDate: string
  endDate: string
  fee: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  zone?: Zone
}

export interface ParkingRecord {
  id: string
  plateNumber: string
  spotId: string
  entryTime: string
  exitTime?: string
  duration?: number
  amount?: number
  isMonthly: boolean
  status: ParkingRecordStatus
  createdAt: string
  updatedAt: string
  spot?: Spot
}

export interface DashboardData {
  summary: {
    totalSpots: number
    occupiedSpots: number
    availableSpots: number
    maintenanceSpots: number
    todayEntries: number
    todayExits: number
  }
  zones: ZoneStats[]
  currentVehicles: CurrentVehicle[]
}

export interface ZoneStats {
  id: string
  code: string
  name: string
  type: ZoneType
  total: number
  occupied: number
  available: number
  maintenance: number
  spots: Spot[]
}

export interface CurrentVehicle {
  id: string
  plateNumber: string
  spotCode: string
  zoneCode: string
  zoneName: string
  entryTime: string
  isMonthly: boolean
  currentDurationMinutes?: number
  currentDurationHours?: number
}

export interface DailyRevenue {
  date: string
  revenue: number
}

export interface ZoneUtilization {
  id: string
  code: string
  name: string
  type: ZoneType
  total: number
  occupied: number
  available: number
  utilization: number
}

export interface PeakHourData {
  hour: number
  hourLabel: string
  averageCount: number
  totalCount: number
}

export interface VehicleRatio {
  monthlyCards: number
  recentMonthlyEntries: number
  recentTempEntries: number
  monthlyPercentage: number
  tempPercentage: number
  breakdown: { name: string; value: number }[]
}

export interface MonthlySummary {
  year: number
  month: number
  totalRevenue: number
  totalEntries: number
  monthlyEntries: number
  tempEntries: number
  newCards: number
  renewedCards: number
  dailyBreakdown: DailyBreakdown[]
}

export interface DailyBreakdown {
  date: string
  revenue: number
  entries: number
  exits: number
}

export interface ExitReceipt {
  plateNumber: string
  spotCode: string
  zoneName: string
  entryTime: string
  exitTime: string
  durationMinutes: number
  durationHours: number
  amount: number
  isMonthly: boolean
  isMonthlyFree: boolean
  rateDetail: string
}

export interface DailyRevenueData {
  date: string
  revenue: number
}

export interface ZoneUtilizationData {
  id: string
  code: string
  zoneName: string
  type: ZoneType
  total: number
  occupied: number
  available: number
  utilization: number
}

export interface VehicleTypeData {
  monthly: number
  temporary: number
  monthlyCards?: number
  recentMonthlyEntries?: number
  recentTempEntries?: number
  monthlyPercentage?: number
  tempPercentage?: number
  breakdown?: { name: string; value: number }[]
}

export interface MonthlyRevenueItem {
  date: string
  totalRecords: number
  monthlyCount: number
  temporaryCount: number
  totalRevenue: number
  avgFee: number
}
