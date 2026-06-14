import { Outlet } from 'react-router-dom';
import { BookOpen, Sparkles } from 'lucide-react';

export function AuthLayout() {
  return (
    <div className="min-h-screen flex">
      {/* Left Side - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <Outlet />
      </div>

      {/* Right Side - Branding */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-primary via-secondary to-primary p-12 items-center justify-center relative overflow-hidden">
        {/* Glassmorphism overlay */}
        <div className="absolute inset-0 bg-white/10 backdrop-blur-3xl" />

        <div className="relative z-10 text-white max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-bold">AI Study Hub</h1>
          </div>

          <h2 className="text-4xl font-bold mb-6 leading-tight">
            Quản lý tài liệu học tập thông minh
          </h2>

          <p className="text-lg text-white/90 mb-8">
            Lưu trữ, tìm kiếm và học tập hiệu quả hơn với sự hỗ trợ của AI
          </p>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-white/20 backdrop-blur-xl rounded-lg flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Cloud Storage</h3>
                <p className="text-sm text-white/80">Lưu trữ tài liệu an toàn trên cloud</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-white/20 backdrop-blur-xl rounded-lg flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">AI Assistant</h3>
                <p className="text-sm text-white/80">Chatbot AI hỗ trợ học tập 24/7</p>
              </div>
            </div>
          </div>

          {/* Decorative elements */}
          <div className="absolute top-10 right-10 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-10 left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        </div>
      </div>
    </div>
  );
}
