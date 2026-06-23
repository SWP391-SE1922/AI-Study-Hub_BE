const prisma = require('../config/database');
const { getPaginationParams, getPaginationMetadata } = require('../utils/pagination');

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
      phoneNumber: true,
      avatarUrl: true,
      role: { select: { id: true, name: true } },
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
      phoneNumber: true,
      avatarUrl: true,
      role: { select: { id: true, name: true } },
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

  return user;
};

/**
 * Cập nhật quyền của người dùng (Admin Only)
 */
const updateUserRole = async (id, roleName) => {
  // Kiểm tra user có tồn tại không
  await getUserById(id);

  const roleRecord = await prisma.role.findUnique({ where: { name: roleName } });
  if (!roleRecord) {
    const error = new Error('Role không hợp lệ.');
    error.statusCode = 400;
    throw error;
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: { roleId: roleRecord.id },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: { select: { id: true, name: true } },
    },
  });

  return updatedUser;
};

/**
 * Xóa người dùng (Admin Only)
 */
const deleteUser = async (id) => {
  // Kiểm tra user có tồn tại không
  await getUserById(id);

  // Xóa tài khoản (các Document liên kết sẽ tự động bị xóa qua onDelete: Cascade)
  await prisma.user.delete({ where: { id } });
  return true;
};

/**
 * Cập nhật thông tin cá nhân của User hiện tại
 */
const updateProfile = async (userId, data) => {
  const { fullName, phoneNumber, avatarUrl } = data;

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(fullName && { fullName }),
      ...(phoneNumber !== undefined && { phoneNumber }),
      ...(avatarUrl !== undefined && { avatarUrl }),
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      phoneNumber: true,
      avatarUrl: true,
      role: { select: { id: true, name: true } },
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
  updateProfile,
};
