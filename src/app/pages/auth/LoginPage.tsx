import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';

export function LoginPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('isAuthenticated', 'true');
    window.dispatchEvent(new Event('authChange'));
    navigate('/dashboard');
  };

  const handleGoogleLogin = () => {
    localStorage.setItem('isAuthenticated', 'true');
    window.dispatchEvent(new Event('authChange'));
    navigate('/dashboard');
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6 p-6">

      {/* Tiêu đề chào mừng */}
      <div className="space-y-2 text-center">
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Welcome Back</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Enter your email and password to access your account.
        </p>
      </div>

      {/* Biểu mẫu đăng nhập */}
      <form onSubmit={handleLogin} className="space-y-4">
        {/* Input Email */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Email
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Mail className="w-4 h-4" />
            </div>
            <input
              type="email"
              required
              placeholder="sellostore@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}

              className="w-full pl-10 pr-4 py-2.5 bg-white text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-transparent transition-all text-sm placeholder:text-slate-400 font-medium shadow-sm"
            />
          </div>
        </div>

        {/* Input Password */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}

              className="w-full pl-10 pr-10 py-2.5 bg-white text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-transparent transition-all text-sm placeholder:text-slate-400 font-medium shadow-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Khối Remember Me & Forgot Password */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none text-sm font-medium text-slate-600 dark:text-slate-400">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500 accent-violet-600 cursor-pointer"
            />
            <span>Remember Me</span>
          </label>
          <Link to="/forgot-password" className="text-sm font-bold text-violet-600 hover:text-violet-500 transition-colors">
            Forgot Your Password?
          </Link>
        </div>

        {/* Nút Đăng nhập chính */}
        <button
          type="submit"
          className="w-full mt-2 py-2.5 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
        >
          Log In
        </button>
      </form>

      {/* Đường gạch phân cách "Or Login With" */}
      <div className="relative flex py-1 items-center">
        <div className="flex-grow border-t border-slate-300"></div>
        <span className="flex-shrink mx-4 text-slate-500 text-xs font-bold uppercase tracking-wider">Or Login With</span>
        <div className="flex-grow border-t border-slate-300"></div>
      </div>

      {/* Nút Đăng nhập Google sắc nét */}
      <button
        type="button"
        onClick={handleGoogleLogin}
      
        className="w-full py-2.5 px-4 bg-white border border-slate-300 hover:bg-slate-50 font-bold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200"
      >
        <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
          <path
            fill="#EA4335"
            d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.33 0 3.32 2.69 1.386 6.618l3.88 3.147z"
          />
          <path
            fill="#4285F4"
            d="M16.04 15.345c-1.077.736-2.423 1.164-4.04 1.164a7.077 7.077 0 0 1-6.734-4.855L1.386 14.8c1.934 3.93 5.943 6.617 10.614 6.617 3.11 0 5.941-1.026 8.04-2.8l-4-3.272z"
          />
          <path
            fill="#FBBC05"
            d="M5.266 14.235A7.042 7.042 0 0 1 4.909 12c0-.79.13-1.55.357-2.235L1.386 6.618A11.942 11.942 0 0 0 0 12c0 1.92.454 3.734 1.264 5.35l4.002-3.115z"
          />
          <path
            fill="#34A853"
            d="M23.491 10.09c.334.628.509 1.31.509 2.02 0 .617-.064 1.226-.191 1.817l-1.818-.218H12v-4h7.827c-.454-1.39-1.427-2.545-2.69-3.272l4-3.272C21.465 5.174 23.018 7.428 23.49 10.09z"
          />
        </svg>
        <span>Google</span>
      </button>

      {/* Dòng chuyển hướng Đăng ký tài khoản */}
      <p className="text-center text-sm text-slate-500">
        Don't Have An Account?{' '}
        <Link to="/register" className="font-extrabold text-violet-600 hover:text-violet-500 underline-offset-2 hover:underline transition-all">
          Register Now.
        </Link>
      </p>

    </div>
  );
}