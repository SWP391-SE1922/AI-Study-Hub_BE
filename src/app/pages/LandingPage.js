import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  Sparkles,
  BookOpen,
  MessageSquare,
  Shield,
  Zap,
  Cloud,
  Search,
  ArrowRight,
  Check,
  LogOut
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';

const features = [
  {
    icon: Cloud,
    title: 'Cloud Storage',
    description: 'Lưu trữ tài liệu an toàn trên cloud, truy cập mọi lúc mọi nơi'
  },
  {
    icon: Search,
    title: 'Tìm kiếm thông minh',
    description: 'Tìm tài liệu nhanh chóng với công nghệ AI'
  },
  {
    icon: MessageSquare,
    title: 'AI Assistant',
    description: 'Chatbot AI hỗ trợ học tập 24/7'
  },
  {
    icon: Shield,
    title: 'Bảo mật cao',
    description: 'Dữ liệu được mã hóa và bảo vệ tuyệt đối'
  },
  {
    icon: Zap,
    title: 'Nhanh chóng',
    description: 'Upload và download tốc độ cao'
  },
  {
    icon: BookOpen,
    title: 'Quản lý dễ dàng',
    description: 'Giao diện trực quan, dễ sử dụng'
  }
];

const stats = [
  { value: '10,000+', label: 'Sinh viên' },
  { value: '50,000+', label: 'Tài liệu' },
  { value: '1M+', label: 'Lượt tải' },
  { value: '99.9%', label: 'Uptime' }
];

const pricing = [
  {
    name: 'Free',
    price: '0đ',
    features: [
      '5 GB lưu trữ',
      '100 tài liệu',
      'AI Chat cơ bản',
      'Hỗ trợ community'
    ]
  },
  {
    name: 'Pro',
    price: '99,000đ/tháng',
    popular: true,
    features: [
      '50 GB lưu trữ',
      'Không giới hạn tài liệu',
      'AI Chat nâng cao',
      'Hỗ trợ ưu tiên',
      'Tính năng nâng cao'
    ]
  },
  {
    name: 'Team',
    price: '299,000đ/tháng',
    features: [
      '200 GB lưu trữ',
      'Không giới hạn tài liệu',
      'AI Chat premium',
      'Hỗ trợ 24/7',
      'Quản lý team',
      'Analytics'
    ]
  }
];

export function LandingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('authToken');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">AI Study Hub</span>
            </div>

            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-sm hover:text-primary transition-colors">
                Tính năng
              </a>
              <a href="#pricing" className="text-sm hover:text-primary transition-colors">
                Giá cả
              </a>
              <a href="#about" className="text-sm hover:text-primary transition-colors">
                Về chúng tôi
              </a>
            </div>

            <div className="flex items-center gap-3">
              {isLoggedIn ? (
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  className="flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Đăng xuất
                </Button>
              ) : (
                <>
                  <Link to="/login">
                    <Button variant="ghost">Đăng nhập</Button>
                  </Link>
                  <Link to="/register">
                    <Button className="bg-gradient-to-r from-primary to-secondary">
                      Bắt đầu miễn phí
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/5 to-background" />
        <div className="container mx-auto px-4 py-20 md:py-32 relative">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted rounded-full text-sm">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>Nền tảng quản lý tài liệu học tập thông minh</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold leading-tight">
              Học tập hiệu quả hơn với
              <br />
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                AI Study Hub
              </span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Lưu trữ, tìm kiếm và học tập với sự hỗ trợ của AI. Mọi tài liệu học tập của bạn ở một nơi, an toàn và dễ dàng truy cập.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <Button size="lg" className="bg-gradient-to-r from-primary to-secondary text-lg h-12 px-8">
                  Bắt đầu miễn phí
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="text-lg h-12 px-8">
                Xem demo
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-12">
              {stats.map((stat, index) => (
                <div key={index}>
                  <h3 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    {stat.value}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Tính năng nổi bật
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Tất cả công cụ bạn cần để quản lý và học tập hiệu quả
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="border-border/50 hover:border-primary/50 transition-all hover:shadow-lg">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Bảng giá đơn giản
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Chọn gói phù hợp với nhu cầu của bạn
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricing.map((plan, index) => (
              <Card
                key={index}
                className={`border-border/50 relative ${plan.popular ? 'border-primary shadow-xl scale-105' : ''
                  }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-gradient-to-r from-primary to-secondary text-white text-sm px-4 py-1 rounded-full">
                      Phổ biến nhất
                    </span>
                  </div>
                )}
                <CardContent className="p-8">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <div className="mb-6">
                    <span className="text-4xl font-bold">{plan.price}</span>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full ${plan.popular
                        ? 'bg-gradient-to-r from-primary to-secondary'
                        : ''
                      }`}
                    variant={plan.popular ? 'default' : 'outline'}
                  >
                    Chọn gói {plan.name}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary to-secondary text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-white/10 backdrop-blur-3xl" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold">
              Sẵn sàng bắt đầu?
            </h2>
            <p className="text-lg text-white/90">
              Tham gia cùng hàng ngàn sinh viên đang sử dụng AI Study Hub để học tập hiệu quả hơn
            </p>
            <Link to="/register">
              <Button size="lg" variant="secondary" className="text-lg h-12 px-8">
                Tạo tài khoản miễn phí
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-muted/30 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold">AI Study Hub</span>
            </div>

            <p className="text-sm text-muted-foreground">
              © 2024 AI Study Hub. All rights reserved.
            </p>

            <div className="flex items-center gap-6">
              <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Privacy
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Terms
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
