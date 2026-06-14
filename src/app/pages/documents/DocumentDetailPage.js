import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, FileText, Calendar, HardDrive } from 'lucide-react';
import { Button } from '../../components/ui/button';

export function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="space-y-6">
      {/* Nút quay lại */}
      <Button asChild variant="ghost" className="rounded-xl pl-2">
        <Link to="/documents">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Quay lại danh sách
        </Link>
      </Button>

      {/* Nội dung chi tiết giả lập */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6 text-indigo-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Chi tiết tài liệu (ID: {id})</h1>
            <p className="text-sm text-slate-400 mt-1">Đang xem chế độ Preview hệ thống</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-600 dark:text-slate-400 mb-6">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>Ngày tải lên: 2024-05-15</span>
          </div>
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-slate-400" />
            <span>Dung lượng: 2.4 MB</span>
          </div>
        </div>

        {/* Khung mô phỏng đọc file */}
        <div className="h-96 bg-slate-50 dark:bg-slate-950 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center">
          <p className="text-slate-400 dark:text-slate-600 text-sm font-medium">
            [Trình xem file PDF/Docx của tài liệu {id} đang được tải...]
          </p>
        </div>
      </div>
    </div>
  );
}