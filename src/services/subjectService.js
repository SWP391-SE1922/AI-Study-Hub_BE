const prisma = require('../config/database');
const { markUniqueDeleted, restoreUniqueValue, notDeleted } = require('../utils/softDelete');

const getAllSubjects = async (query = {}) => {
  const { search, includeDeleted } = query;
  const showDeleted = includeDeleted === true || includeDeleted === 'true';

  const where = {
    ...(showDeleted ? {} : notDeleted()),
  };

  if (search) {
    where.AND = [
      ...(where.AND || []),
      {
        OR: [
          { name: { contains: search } },
          { code: { contains: search } },
          { description: { contains: search } },
        ],
      },
    ];
  }

  const subjects = await prisma.subject.findMany({
    where,
    select: {
      id: true,
      name: true,
      code: true,
      description: true,
      deletedAt: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          documents: true,
        },
      },
    },
    orderBy: [{ deletedAt: 'asc' }, { name: 'asc' }],
  });

  return subjects.map((s) => ({
    ...s,
    name: s.deletedAt ? restoreUniqueValue(s.name) : s.name,
    code: s.deletedAt && s.code ? restoreUniqueValue(s.code) : s.code,
  }));
};

const createSubject = async (userId, data) => {
  const { name, code, description } = data;

  const duplicate = await prisma.subject.findFirst({
    where: {
      ...notDeleted(),
      OR: [{ name }, ...(code ? [{ code }] : [])],
    },
  });

  if (duplicate) {
    const error = new Error('Môn học đã tồn tại');
    error.statusCode = 409;
    throw error;
  }

  return prisma.subject.create({
    data: {
      name,
      code: code || null,
      description,
      createdBy: userId || null,
    },
  });
};

const updateSubject = async (id, data) => {
  const subject = await prisma.subject.findUnique({
    where: { id },
  });

  if (!subject || subject.deletedAt) {
    const error = new Error('Không tìm thấy môn học');
    error.statusCode = 404;
    throw error;
  }

  return prisma.subject.update({
    where: { id },
    data: {
      name: data.name,
      code: data.code || null,
      description: data.description,
    },
  });
};

const deleteSubject = async (id) => {
  const subject = await prisma.subject.findUnique({
    where: { id },
  });

  if (!subject || subject.deletedAt) {
    const error = new Error('Không tìm thấy môn học');
    error.statusCode = 404;
    throw error;
  }

  await prisma.subject.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      name: markUniqueDeleted(subject.name, id),
      code: subject.code ? markUniqueDeleted(subject.code, id) : null,
    },
  });

  return true;
};

const restoreSubject = async (id) => {
  const subject = await prisma.subject.findUnique({ where: { id } });
  if (!subject) {
    const error = new Error('Không tìm thấy môn học');
    error.statusCode = 404;
    throw error;
  }
  if (!subject.deletedAt) {
    const error = new Error('Môn học này chưa bị xóa.');
    error.statusCode = 400;
    throw error;
  }

  const name = restoreUniqueValue(subject.name);
  const code = subject.code ? restoreUniqueValue(subject.code) : null;

  const clash = await prisma.subject.findFirst({
    where: {
      ...notDeleted(),
      NOT: { id },
      OR: [{ name }, ...(code ? [{ code }] : [])],
    },
  });
  if (clash) {
    const error = new Error('Tên/mã môn học đã được sử dụng. Không thể khôi phục.');
    error.statusCode = 409;
    throw error;
  }

  return prisma.subject.update({
    where: { id },
    data: { deletedAt: null, name, code },
  });
};

module.exports = {
  getAllSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  restoreSubject,
};
