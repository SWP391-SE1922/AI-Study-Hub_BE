import { Link } from 'react-router-dom';
import {
  FileText,
  Upload,
  MessageSquare,
  TrendingUp,
  Clock,
  Star,
  FolderOpen,
  Sparkles
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';

const stats = [
  { title: 'Tổng tài liệu', value: '48', change: '+12%', icon: FileText, color: 'text-blue-600' },
  { title: 'Đã upload tháng này', value: '12', change: '+4', icon: Upload, color: 'text-green-600' },
  { title: 'AI Chat Sessions', value: '23', change: '+8', icon: MessageSquare, color: 'text-purple-600' },
  { title: 'Dung lượng', value: '2.4 GB', change: '/ 5 GB', icon: TrendingUp, color: 'text-orange-600' }
];

const recentDocuments = [
  { id: 1, name: 'Bài giảng Cấu trúc dữ liệu - Chương 3.pdf', subject: 'Cấu trúc dữ liệu', size: '2.4 MB', uploadedAt: '2 giờ trước', starred: true },
  { id: 2, name: 'Đề thi giữa kỳ Toán cao cấp.docx', subject: 'Toán cao cấp', size: '1.1 MB', uploadedAt: '5 giờ trước', starred: false },
  { id: 3, name: 'Source code Java - Project quản lý.zip', subject: 'Lập trình Java', size: '8.2 MB', uploadedAt: 'Hôm qua', starred: true },
  { id: 4, name: 'Slide bài thuyết trình AI.pptx', subject: 'Trí tuệ nhân tạo', size: '5.6 MB', uploadedAt: '2 ngày trước', starred: false }
];

export function DashboardPage() {
  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100">
      {/* Tiêu đề */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Chào mừng trở lại! Đây là tổng quan tài liệu của bạn.</p>
        </div>
        <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md">
          <Upload className="w-4 h-4 mr-2" />
          Upload tài liệu
        </Button>
      </div>

      {/* Thẻ Thống kê */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index} className="border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <h3 className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{stat.value}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
                </div>
                <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center">
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dung lượng */}
      <Card className="border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <CardHeader>
          <CardTitle className="text-slate-900 dark:text-white">Dung lượng lưu trữ</CardTitle>
          <CardDescription>Đã sử dụng 2.4 GB / 5 GB</CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={48} className="h-2 bg-slate-100 dark:bg-slate-800" />
          <p className="text-sm text-muted-foreground mt-2">Còn lại 2.6 GB dung lượng trống</p>
        </CardContent>
      </Card>

      {/* Bố cục lưới */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-slate-900 dark:text-white">Tài liệu gần đây</CardTitle>
              <CardDescription>Các tài liệu bạn vừa truy cập</CardDescription>
            </div>
            <Link to="/documents">
              <Button variant="ghost" size="sm" className="hover:bg-slate-100 dark:hover:bg-slate-800">Xem tất cả</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentDocuments.map((doc) => (
                <div key={doc.id} className="flex items-center gap-4 p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors border border-slate-100/50 dark:border-slate-800">
                  <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-slate-800 dark:text-slate-200 truncate">{doc.name}</h4>
                      {doc.starred && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                      <FolderOpen className="w-3 h-3" />
                      <span>{doc.subject}</span>
                      <span>•</span>
                      <span>{doc.size}</span>
                    </div>
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{doc.uploadedAt}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Thao tác nhanh */}
        <Card className="border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-900 dark:text-white">Thao tác nhanh</CardTitle>
            <CardDescription>Shortcuts tiện ích</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/documents" className="block p-4 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-sm hover:opacity-95 transition-opacity">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center"><Upload className="w-5 h-5" /></div>
                <div>
                  <h4 className="font-semibold text-sm">Upload tài liệu</h4>
                  <p className="text-xs text-white/80">Thêm tài liệu mới</p>
                </div>
              </div>
            </Link>

            <Link to="/ai-chat" className="block p-4 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-sm hover:opacity-95 transition-opacity">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center"><MessageSquare className="w-5 h-5" /></div>
                <div>
                  <h4 className="font-semibold text-sm">AI Chat</h4>
                  <p className="text-xs text-white/80">Hỏi đáp với trợ lý thông minh</p>
                </div>
              </div>
            </Link>

            <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/50">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-lg flex items-center justify-center"><Sparkles className="w-4 h-4" /></div>
                <div>
                  <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200">AI Assistant</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Tóm tắt và giải đáp thắc mắc tài liệu tự động</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}