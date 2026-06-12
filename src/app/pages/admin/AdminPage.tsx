import {
  Users,
  FileText,
  MessageSquare,
  TrendingUp,
  BarChart3,
  Activity,
  Shield,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';

const stats = [
  {
    title: 'Tổng người dùng',
    value: '1,234',
    change: '+12.5%',
    icon: Users,
    trend: 'up'
  },
  {
    title: 'Tổng tài liệu',
    value: '5,678',
    change: '+8.2%',
    icon: FileText,
    trend: 'up'
  },
  {
    title: 'Chat sessions',
    value: '892',
    change: '+15.3%',
    icon: MessageSquare,
    trend: 'up'
  },
  {
    title: 'Storage used',
    value: '234 GB',
    change: '+5.1%',
    icon: TrendingUp,
    trend: 'up'
  }
];

const recentUsers = [
  {
    id: 1,
    name: 'Nguyễn Văn A',
    email: 'nguyenvana@example.com',
    role: 'Student',
    status: 'active',
    joinedAt: '2024-05-15'
  },
  {
    id: 2,
    name: 'Trần Thị B',
    email: 'tranthib@example.com',
    role: 'Student',
    status: 'active',
    joinedAt: '2024-05-14'
  },
  {
    id: 3,
    name: 'Lê Văn C',
    email: 'levanc@example.com',
    role: 'Student',
    status: 'inactive',
    joinedAt: '2024-05-13'
  }
];

const systemLogs = [
  {
    id: 1,
    action: 'User Login',
    user: 'nguyenvana@example.com',
    timestamp: '2024-05-17 10:30:00',
    status: 'success'
  },
  {
    id: 2,
    action: 'Document Upload',
    user: 'tranthib@example.com',
    timestamp: '2024-05-17 10:25:00',
    status: 'success'
  },
  {
    id: 3,
    action: 'Failed Login',
    user: 'unknown@example.com',
    timestamp: '2024-05-17 10:20:00',
    status: 'error'
  },
  {
    id: 4,
    action: 'AI Chat Request',
    user: 'levanc@example.com',
    timestamp: '2024-05-17 10:15:00',
    status: 'success'
  }
];

const chatbotStats = [
  { metric: 'Total Requests', value: '2,456', change: '+18%' },
  { metric: 'Avg Response Time', value: '1.2s', change: '-5%' },
  { metric: 'Success Rate', value: '98.5%', change: '+2%' },
  { metric: 'User Satisfaction', value: '4.8/5', change: '+0.2' }
];

export function AdminPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground mt-1">
            Quản lý hệ thống và theo dõi hoạt động
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index} className="border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <h3 className="text-2xl font-bold mt-1">{stat.value}</h3>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3 h-3 text-green-600" />
                    <p className="text-xs text-green-600">{stat.change}</p>
                  </div>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <stat.icon className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="bg-muted">
          <TabsTrigger value="users">
            <Users className="w-4 h-4 mr-2" />
            Người dùng
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="w-4 h-4 mr-2" />
            Tài liệu
          </TabsTrigger>
          <TabsTrigger value="chatbot">
            <MessageSquare className="w-4 h-4 mr-2" />
            Chatbot
          </TabsTrigger>
          <TabsTrigger value="logs">
            <Activity className="w-4 h-4 mr-2" />
            Logs
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Quản lý người dùng</CardTitle>
              <CardDescription>Danh sách người dùng trong hệ thống</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Người dùng</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Vai trò</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Ngày tham gia</TableHead>
                    <TableHead>Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                              {user.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{user.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{user.joinedAt}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          Chi tiết
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Tài liệu PDF</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">3,245</p>
                <p className="text-sm text-muted-foreground mt-1">57% tổng tài liệu</p>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Tài liệu DOCX</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">1,823</p>
                <p className="text-sm text-muted-foreground mt-1">32% tổng tài liệu</p>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Tài liệu khác</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">610</p>
                <p className="text-sm text-muted-foreground mt-1">11% tổng tài liệu</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Hoạt động upload</CardTitle>
              <CardDescription>Số lượng tài liệu được upload theo thời gian</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center bg-muted/30 rounded-lg">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Biểu đồ sẽ hiển thị ở đây</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Chatbot Tab */}
        <TabsContent value="chatbot" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {chatbotStats.map((stat, index) => (
              <Card key={index} className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-sm">{stat.metric}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-green-600 mt-1">{stat.change} so với tháng trước</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Chatbot Performance</CardTitle>
              <CardDescription>Thống kê hiệu suất AI chatbot</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center bg-muted/30 rounded-lg">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Biểu đồ analytics sẽ hiển thị ở đây</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>System Logs</CardTitle>
              <CardDescription>Nhật ký hoạt động hệ thống</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Thời gian</TableHead>
                    <TableHead>Hành động</TableHead>
                    <TableHead>Người dùng</TableHead>
                    <TableHead>Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {systemLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-muted-foreground font-mono text-sm">
                        {log.timestamp}
                      </TableCell>
                      <TableCell className="font-medium">{log.action}</TableCell>
                      <TableCell className="text-muted-foreground">{log.user}</TableCell>
                      <TableCell>
                        <Badge
                          variant={log.status === 'success' ? 'default' : 'destructive'}
                          className="gap-1"
                        >
                          {log.status === 'error' && <AlertCircle className="w-3 h-3" />}
                          {log.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
