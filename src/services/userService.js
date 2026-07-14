const prisma = require('../config/database');
const { getPaginationParams, getPaginationMetadata } = require('../utils/pagination');
const { STORAGE_LIMITS } = require('../config/constants');

/**
 * Lấy danh sách người dùng kèm phân trang & tìm kiếm (Admin Only)
 */
const getAllUsers = async (queryParams) => {
  const { page, limit, skip, take } = getPaginationParams(queryParams);
  const { search } = queryParams;

  // Xây dựng điều kiện lọc
  const where = {};
  if (search) {
    where.OR = [
      { email: { contains: search } },
      { fullName: { contains: search } },
    ];
  }

  // Lấy tổng số người dùng thỏa mãn điều kiện
  const total = await prisma.user.count({ where });

  // Lấy danh sách dữ liệu
  const users = await prisma.user.findMany({
    where,
    skip,
    take,
    select: {
      id: true,
      email: true,
      fullName: true,
      avatarUrl: true,
      role: true,
      isVerified: true,
      usedStorage: true,
      storageLimit: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const pagination = getPaginationMetadata(total, page, limit);

  return { users, pagination };
};

/**
 * Lấy thông tin người dùng theo ID (Admin Only)
 */
const getUserById = async (id) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      fullName: true,
      avatarUrl: true,
      role: true,
      isVerified: true,
      usedStorage: true,
      storageLimit: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    const error = new Error('Không tìm thấy người dùng.');
    error.statusCode = 404;
    throw error;
  }

  if (Number(user.storageLimit || 0) < STORAGE_LIMITS.BASIC) {
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { storageLimit: STORAGE_LIMITS.BASIC },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        role: true,
        isVerified: true,
        usedStorage: true,
        storageLimit: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return updatedUser;
  }

  return user;
};

/**
 * Cập nhật quyền của người dùng (Admin Only)
 */
const updateUserRole = async (id, role) => {
  const user = await getUserById(id);

  if (user.role === 'ADMIN' && role !== 'ADMIN') {
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
    if (adminCount <= 1) {
      const error = new Error('Không thể hạ quyền admin cuối cùng của hệ thống.');
      error.statusCode = 400;
      throw error;
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: { role },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
    },
  });

  return updatedUser;
};

/**
 * Xóa người dùng (Admin Only)
 */
const deleteUser = async (id, currentUserId) => {
  if (id === currentUserId) {
    const error = new Error('Không thể xóa chính tài khoản đang đăng nhập.');
    error.statusCode = 400;
    throw error;
  }

  const user = await getUserById(id);

  if (user.role === 'ADMIN') {
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
    if (adminCount <= 1) {
      const error = new Error('Không thể xóa admin cuối cùng của hệ thống.');
      error.statusCode = 400;
      throw error;
    }
  }

  // Xóa tài khoản (các Document liên kết sẽ tự động bị xóa qua onDelete: Cascade)
  await prisma.user.delete({ where: { id } });
  return true;
};

/**
 * Khóa hoặc mở khóa người dùng (Admin Only)
 */
const lockUser = async (id, duration) => {
  const user = await getUserById(id);

  if (user.role === 'ADMIN') {
    const error = new Error('Không thể khóa tài khoản admin.');
    error.statusCode = 400;
    throw error;
  }

  let lockedUntil = null;
  let isLocked = false;

  if (duration === '3d') {
    isLocked = true;
    lockedUntil = new Date();
    lockedUntil.setDate(lockedUntil.getDate() + 3);
  } else if (duration === '7d') {
    isLocked = true;
    lockedUntil = new Date();
    lockedUntil.setDate(lockedUntil.getDate() + 7);
  } else if (duration === 'permanent') {
    isLocked = true;
    lockedUntil = new Date('9999-12-31T23:59:59Z'); // Vĩnh viễn
  } else if (duration === 'unlock') {
    isLocked = false;
    lockedUntil = null;
  } else {
    const error = new Error('Thời hạn khóa không hợp lệ.');
    error.statusCode = 400;
    throw error;
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: { isLocked, lockedUntil },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      isLocked: true,
      lockedUntil: true,
    },
  });

  return updatedUser;
};

/**
 * Cập nhật thông tin cá nhân của User hiện tại
 */
const updateProfile = async (userId, data) => {
  const { fullName, avatarUrl } = data;

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(fullName && { fullName }),
      ...(avatarUrl !== undefined && { avatarUrl }),
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      avatarUrl: true,
      role: true,
      isVerified: true,
      usedStorage: true,
      storageLimit: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return updatedUser;
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUserRole,
  deleteUser,
  lockUser,
  updateProfile,
};
