import { prisma } from '../../config/database';
import { Prisma } from '../../../generated/prisma/client';
import { CreateGearData, UpdateGearData, GearQueryParams } from './gear.interface';

/**
 * Get all gear with filtering and pagination
 */
export const getAllGearService = async (params: GearQueryParams) => {
  const {
    category,
    minPrice,
    maxPrice,
    brand,
    search,
    isAvailable,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = params;

  const skip = (page - 1) * limit;

  // Build where clause
  const where: any = {};

  if (category) {
    where.categoryId = category;
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    where.dailyRate = {};
    if (minPrice !== undefined) {
      where.dailyRate.gte = new Prisma.Decimal(minPrice);
    }
    if (maxPrice !== undefined) {
      where.dailyRate.lte = new Prisma.Decimal(maxPrice);
    }
  }

  if (brand) {
    where.brand = {
      contains: brand,
      mode: 'insensitive',
    };
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { brand: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (isAvailable !== undefined) {
    where.isAvailable = isAvailable;
  }

  // Execute queries in parallel
  const [gearItems, total] = await Promise.all([
    prisma.gearItem.findMany({
      where,
      skip,
      take: limit,
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        provider: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
          },
        },
        _count: {
          select: {
            reviews: true,
          },
        },
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
    }),
    prisma.gearItem.count({ where }),
  ]);

  return {
    gearItems,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get single gear item by ID
 */
export const getGearByIdService = async (id: string) => {
  const gearItem = await prisma.gearItem.findUnique({
    where: { id },
    include: {
      category: true,
      provider: {
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
        },
      },
      reviews: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10,
      },
    },
  });

  if (!gearItem) {
    throw new Error('Gear item not found');
  }

  return gearItem;
};

/**
 * Create new gear item
 */
export const createGearService = async (data: CreateGearData) => {
  const {
    name,
    description,
    brand,
    model,
    serialNumber,
    categoryId,
    providerId,
    dailyRate,
    weeklyRate,
    monthlyRate,
    depositAmount,
    specifications,
    images,
    isAvailable = true,
    stockQuantity = 1,
    location,
  } = data;

  // Verify category exists
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
  });

  if (!category) {
    throw new Error('Category not found');
  }

  // Check if serial number is unique (if provided)
  if (serialNumber) {
    const existingGear = await prisma.gearItem.findUnique({
      where: { serialNumber },
    });

    if (existingGear) {
      throw new Error('Gear item with this serial number already exists');
    }
  }

  // Create gear item
  const gearItem = await prisma.gearItem.create({
    data: {
      name,
      description,
      brand,
      model,
      serialNumber,
      categoryId,
      providerId,
      dailyRate: new Prisma.Decimal(dailyRate),
      weeklyRate: weeklyRate ? new Prisma.Decimal(weeklyRate) : null,
      monthlyRate: monthlyRate ? new Prisma.Decimal(monthlyRate) : null,
      depositAmount: depositAmount ? new Prisma.Decimal(depositAmount) : null,
      specifications,
      images: images || [],
      isAvailable,
      stockQuantity,
      currentStock: stockQuantity,
      location,
    },
    include: {
      category: true,
      provider: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return gearItem;
};

/**
 * Update gear item
 */
export const updateGearService = async (id: string, providerId: string, data: UpdateGearData) => {
  // Check if gear exists and belongs to provider
  const existingGear = await prisma.gearItem.findUnique({
    where: { id },
  });

  if (!existingGear) {
    throw new Error('Gear item not found');
  }

  if (existingGear.providerId !== providerId) {
    throw new Error('You do not have permission to update this gear item');
  }

  // Check serial number uniqueness if being updated
  if (data.serialNumber && data.serialNumber !== existingGear.serialNumber) {
    const duplicateSerial = await prisma.gearItem.findUnique({
      where: { serialNumber: data.serialNumber },
    });

    if (duplicateSerial) {
      throw new Error('Gear item with this serial number already exists');
    }
  }

  // Update gear item
  const updatedGear = await prisma.gearItem.update({
    where: { id },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.description && { description: data.description }),
      ...(data.brand && { brand: data.brand }),
      ...(data.model !== undefined && { model: data.model || null }),
      ...(data.serialNumber !== undefined && { serialNumber: data.serialNumber || null }),
      ...(data.categoryId && { categoryId: data.categoryId }),
      ...(data.dailyRate !== undefined && { dailyRate: new Prisma.Decimal(data.dailyRate) }),
      ...(data.weeklyRate !== undefined && { weeklyRate: data.weeklyRate ? new Prisma.Decimal(data.weeklyRate) : null }),
      ...(data.monthlyRate !== undefined && { monthlyRate: data.monthlyRate ? new Prisma.Decimal(data.monthlyRate) : null }),
      ...(data.depositAmount !== undefined && { depositAmount: data.depositAmount ? new Prisma.Decimal(data.depositAmount) : null }),
      ...(data.specifications !== undefined && { specifications: data.specifications }),
      ...(data.images !== undefined && { images: data.images }),
      ...(data.isAvailable !== undefined && { isAvailable: data.isAvailable }),
      ...(data.stockQuantity !== undefined && { stockQuantity: data.stockQuantity }),
      ...(data.currentStock !== undefined && { currentStock: data.currentStock }),
      ...(data.location !== undefined && { location: data.location || null }),
    },
    include: {
      category: true,
      provider: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return updatedGear;
};

/**
 * Delete gear item
 */
export const deleteGearService = async (id: string, providerId: string) => {
  // Check if gear exists and belongs to provider
  const existingGear = await prisma.gearItem.findUnique({
    where: { id },
  });

  if (!existingGear) {
    throw new Error('Gear item not found');
  }

  if (existingGear.providerId !== providerId) {
    throw new Error('You do not have permission to delete this gear item');
  }

  // Check if gear is currently rented
  const activeRentals = await prisma.rentalOrderItem.findMany({
    where: {
      gearId: id,
      order: {
        status: {
          in: ['CONFIRMED', 'PAID', 'PICKED_UP'],
        },
      },
    },
  });

  if (activeRentals.length > 0) {
    throw new Error('Cannot delete gear item with active rentals');
  }

  // Delete gear item
  await prisma.gearItem.delete({
    where: { id },
  });

  return { message: 'Gear item deleted successfully' };
};

/**
 * Get all categories
 */
export const getAllCategoriesService = async () => {
  const categories = await prisma.category.findMany({
    include: {
      _count: {
        select: {
          gearItems: true,
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });

  return categories;
};

/**
 * Get single category by ID
 */
export const getCategoryByIdService = async (id: string) => {
  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      gearItems: {
        where: {
          isAvailable: true,
        },
        include: {
          provider: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        take: 10,
      },
      _count: {
        select: {
          gearItems: true,
        },
      },
    },
  });

  if (!category) {
    throw new Error('Category not found');
  }

  return category;
};

/**
 * Create new category
 */
export const createCategoryService = async (name: string, description?: string) => {
  // Check if category already exists
  const existingCategory = await prisma.category.findUnique({
    where: { name },
  });

  if (existingCategory) {
    throw new Error('Category with this name already exists');
  }

  const category = await prisma.category.create({
    data: {
      name,
      description,
    },
  });

  return category;
};