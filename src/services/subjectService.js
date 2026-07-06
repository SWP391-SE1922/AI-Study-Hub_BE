const prisma = require('../config/database');

const getAllSubjects = async (query = {}) => {
  const { search } = query;

  const where = search
    ? {
        OR: [
          { name: { contains: search } },
          { code: { contains: search } },
          { description: { contains: search } },
        ],
      }
    : {};

  return prisma.subject.findMany({
    where,
    select: {
      id: true,
      name: true,
      code: true,
      description: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          documents: true,
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });
};

const createSubject = async (userId, data) => {
  const { name, code, description } = data;

  const duplicate = await prisma.subject.findFirst({
    where: {
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

  if (!subject) {
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

  if (!subject) {
    const error = new Error('Không tìm thấy môn học');
    error.statusCode = 404;
    throw error;
  }

  await prisma.subject.delete({
    where: { id },
  });

  return true;
};

module.exports = {
  getAllSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
};