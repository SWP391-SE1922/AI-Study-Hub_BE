import * as React from 'react';
import { useState } from 'react';
import { User, Mail, IdCard, Phone, Camera, Save, GraduationCap, Calendar, Users } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';

export function ProfilePage() {
  // Mock dữ liệu profile sinh viên mở rộng
  const [formData, setFormData] = useState({
    fullName: 'Sinh viên',
    studentId: 'SV001',
    email: 'student@gmail.com',
    phone: '0123456789',
    major: 'Công nghệ thông tin',
    batch: 'Khóa 2023 (K19)',
    classGroup: 'SE1922',
    avatarUrl: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Đã lưu thay đổi thông tin cá nhân thành công!');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 text-slate-700 dark:text-slate-300 p-2">
      {/* Tiêu đề trang */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Thông tin cá nhân</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Quản lý và cập nhật thông tin tài khoản học tập của bạn.
        </p>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* CỘT 1: THAY ĐỔI AVATAR */}
        <Card className="md:col-span-1 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm h-fit">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-200">Ảnh đại diện</CardTitle>
            <CardDescription className="text-xs">Ảnh hiển thị của bạn trên hệ thống</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center p-6 pt-2 space-y-4">
            <div className="relative group">
              <Avatar className="w-28 h-28 border-4 border-slate-100 dark:border-slate-800 shadow-md">
                <AvatarImage src={formData.avatarUrl} alt={formData.fullName} />
                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-3xl select-none">
                  SV
                </AvatarFallback>
              </Avatar>
              <label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg cursor-pointer transition-transform hover:scale-105"
                title="Thay đổi ảnh"
              >
                <Camera className="w-4 h-4" />
                <input type="file" id="avatar-upload" className="hidden" accept="image/*" />
              </label>
            </div>

            <div className="text-center">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base">{formData.fullName}</h3>
              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold font-mono mt-0.5">{formData.studentId}</p>
            </div>
          </CardContent>
        </Card>

        {/* CỘT 2 & 3: FORM THÔNG TIN CHUNG */}
        <Card className="md:col-span-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-200">Thông tin chi tiết</CardTitle>
            <CardDescription className="text-xs">Cập nhật thông tin liên hệ và quản lý thông tin lớp học của bạn.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-0 space-y-6">

            {/* Nhóm 1: Thông tin liên hệ cơ bản */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Thông tin liên lạc</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Họ và tên */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" /> Họ và tên
                  </label>
                  <Input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    className="h-11 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:bg-white rounded-xl text-sm transition-all text-slate-900 dark:text-slate-100"
                    required
                  />
                </div>

                {/* Mã sinh viên */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <IdCard className="w-3.5 h-3.5 text-slate-400" /> Mã sinh viên
                  </label>
                  <Input
                    type="text"
                    name="studentId"
                    value={formData.studentId}
                    disabled
                    className="h-11 bg-slate-100 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 rounded-xl text-sm font-mono text-slate-500 cursor-not-allowed select-none"
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" /> Email
                  </label>
                  <Input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="h-11 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:bg-white rounded-xl text-sm transition-all text-slate-900 dark:text-slate-100"
                    required
                  />
                </div>

                {/* Số điện thoại */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" /> Số điện thoại
                  </label>
                  <Input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="h-11 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:bg-white rounded-xl text-sm transition-all text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
            </div>

            <hr className="border-slate-100 dark:border-slate-800" />

            {/* Nhóm 2: Thông tin tổ chức lớp học bổ sung mới */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Thông tin đào tạo</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Chuyên ngành */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-slate-400" /> Ngành học
                  </label>
                  <Input
                    type="text"
                    name="major"
                    value={formData.major}
                    onChange={handleChange}
                    className="h-11 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:bg-white rounded-xl text-sm transition-all text-slate-900 dark:text-slate-100"
                  />
                </div>

                {/* Niên khóa */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" /> Khóa học
                  </label>
                  <Input
                    type="text"
                    name="batch"
                    value={formData.batch}
                    onChange={handleChange}
                    className="h-11 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:bg-white rounded-xl text-sm transition-all text-slate-900 dark:text-slate-100"
                  />
                </div>

                {/* Lớp sinh hoạt */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-400" /> Lớp sinh hoạt
                  </label>
                  <Input
                    type="text"
                    name="classGroup"
                    value={formData.classGroup}
                    onChange={handleChange}
                    className="h-11 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:bg-white rounded-xl text-sm transition-all text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
            </div>

            <hr className="border-slate-100 dark:border-slate-800" />

            {/* Khối Actions: Chỉ còn duy nhất nút Lưu căn phải cực đẹp */}
            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                className="w-full sm:w-auto bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl px-6 h-11 font-medium shadow-md shadow-indigo-500/10 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                Lưu thay đổi
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}