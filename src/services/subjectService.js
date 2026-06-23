const prisma = require('../config/database');

const createSubject = async (data) => {
  const { name, description, teacherId } = data;

  const exists = await prisma.subject.findUnique({ where: { name } });
  if (exists) {
    const error = new Error('Bộ môn đã tồn tại.');
    error.statusCode = 409;
    throw error;
  }

  if (teacherId) {
    const teacherExists = await prisma.user.findUnique({ where: { id: teacherId } });
    if (!teacherExists) {
      const error = new Error('Giảng viên không tồn tại.');
      error.statusCode = 404;
      throw error;
    }
  }

  const subject = await prisma.subject.create({
    data: { name, description, teacherId },
    include: {
      teacher: {
        select: { id: true, fullName: true, email: true },
      },
    },
  });

  return subject;
};

const getAllSubjects = async () => {
  const subjects = await prisma.subject.findMany({
    include: {
      teacher: {
        select: { id: true, fullName: true, email: true },
      },
      _count: {
        select: { documents: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  return subjects;
};

const getSubjectById = async (id) => {
  const subject = await prisma.subject.findUnique({
    where: { id },
    include: {
      teacher: {
        select: { id: true, fullName: true, email: true },
      },
      documents: {
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, title: true, fileUrl: true, createdAt: true,
        },
      },
    },
  });

  if (!subject) {
    const error = new Error('Bộ môn không tồn tại.');
    error.statusCode = 404;
    throw error;
  }

  return subject;
};

const updateSubject = async (id, data) => {
  await getSubjectById(id);

  const { name, description, teacherId } = data;

  if (teacherId) {
    const teacherExists = await prisma.user.findUnique({ where: { id: teacherId } });
    if (!teacherExists) {
      const error = new Error('Giảng viên không tồn tại.');
      error.statusCode = 404;
      throw error;
    }
  }

  if (name) {
    const exists = await prisma.subject.findUnique({ where: { name } });
    if (exists && exists.id !== id) {
      const error = new Error('Tên bộ môn đã tồn tại.');
      error.statusCode = 409;
      throw error;
    }
  }

  const subject = await prisma.subject.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(teacherId !== undefined && { teacherId }),
    },
    include: {
      teacher: {
        select: { id: true, fullName: true, email: true },
      },
    },
  });

  return subject;
};

const deleteSubject = async (id) => {
  await getSubjectById(id);
  await prisma.subject.delete({ where: { id } });
  return true;
};

module.exports = {
  createSubject,
  getAllSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
};
