export interface CreateGearData {
  name: string;
  description: string;
  brand: string;
  model?: string;
  serialNumber?: string;
  categoryId: string;
  providerId: string;
  dailyRate: number;
  weeklyRate?: number;
  monthlyRate?: number;
  depositAmount?: number;
  specifications?: any;
  images?: string[];
  isAvailable?: boolean;
  stockQuantity?: number;
  location?: string;
}

export interface UpdateGearData {
  name?: string;
  description?: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  categoryId?: string;
  dailyRate?: number;
  weeklyRate?: number;
  monthlyRate?: number;
  depositAmount?: number;
  specifications?: any;
  images?: string[];
  isAvailable?: boolean;
  stockQuantity?: number;
  currentStock?: number;
  location?: string;
}

export interface GearQueryParams {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  brand?: string;
  search?: string;
  isAvailable?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
}
