/**
 * Helpers soft-delete dùng chung.
 * Free unique field khi xóa mềm để tạo lại được bản ghi cùng tên/email.
 */

function markUniqueDeleted(value, id) {
  if (!value) return value;
  const marker = `.__del__.${id}`;
  if (String(value).includes('.__del__.')) return value;
  // Truncate để tránh vượt giới hạn cột ngắn (email, code…)
  const raw = String(value);
  const maxLen = 180;
  const kept = raw.slice(0, Math.max(0, maxLen - marker.length));
  return `${kept}${marker}`;
}

function restoreUniqueValue(value) {
  if (!value) return value;
  const idx = String(value).indexOf('.__del__.');
  return idx >= 0 ? String(value).slice(0, idx) : value;
}

function notDeleted() {
  return { deletedAt: null };
}

function softDeleteData(extra = {}) {
  return {
    deletedAt: new Date(),
    ...extra,
  };
}

module.exports = {
  markUniqueDeleted,
  restoreUniqueValue,
  notDeleted,
  softDeleteData,
};
