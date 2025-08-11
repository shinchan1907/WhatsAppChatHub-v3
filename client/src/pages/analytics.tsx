import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  TrendingUp, 
  TrendingDown, 
  MessageSquare, 
  Users, 
  Clock, 
  CheckCircle,
  XCircle,
  Eye,
  MousePointer,
  BarChart3,
  Calendar,
  Download,
  RefreshCw
} from "lucide-react";

interface MetricData {
  label: string;
  value: number;
  change: number;
  trend: 'up' | 'down';
  format?: 'number' | 'percentage' | 'currency';
}

interface ChartData {
  date: string;
  messages: number;
  delivered: number;
  read: number;
  replies: number;
}

export default function Analytics() {
  const [timeRange, setTimeRange] = useState('7d');
  const [isLoading, setIsLoading] = useState(false);

  const metrics: MetricData[] = [
    {
      label: 'Total Messages',
      value: 15420,
      change: 12.5,
      trend: 'up',
      format: 'number'
    },
    {
      label: 'Delivery Rate',
      value: 95.8,
      change: 2.1,
      trend: 'up',
      format: 'percentage'
    },
    {
      label: 'Read Rate',
      value: 78.3,
      change: -1.2,
      trend: 'down',
      format: 'percentage'
    },
    {
      label: 'Reply Rate',
      value: 23.7,
      change: 8.4,
      trend: 'up',
      format: 'percentage'
    },
    {
      label: 'Avg Response Time',
      value: 2.4,
      change: -0.8,
      trend: 'up',
      format: 'number'
    },
    {
      label: 'Active Contacts',
      value: 2847,
      change: 15.2,
      trend: 'up',
      format: 'number'
    }
  ];

  const chartData: ChartData[] = [
    { date: 'Jan 1', messages: 120, delivered: 115, read: 92, replies: 28 },
    { date: 'Jan 2', messages: 135, delivered: 129, read: 103, replies: 31 },
    { date: 'Jan 3', messages: 98, delivered: 94, read: 75, replies: 22 },
    { date: 'Jan 4', messages: 156, delivered: 149, read: 118, replies: 35 },
    { date: 'Jan 5', messages: 142, delivered: 136, read: 108, replies: 32 },
    { date: 'Jan 6', messages: 178, delivered: 170, read: 136, replies: 41 },
    { date: 'Jan 7', messages: 165, delivered: 158, read: 126, replies: 38 }
  ];

  const formatValue = (value: number, format: string) => {
    switch (format) {
      case 'percentage':
        return `${value}%`;
      case 'currency':
        return `$${value.toLocaleString()}`;
      case 'number':
      default:
        return value.toLocaleString();
    }
  };

  const getTrendIcon = (trend: 'up' | 'down') => {
    return trend === 'up' ? 
      <TrendingUp className="w-4 h-4 text-green-600" /> : 
      <TrendingDown className="w-4 h-4 text-red-600" />;
  };

  const getTrendColor = (trend: 'up' | 'down') => {
    return trend === 'up' ? 'text-green-600' : 'text-red-600';
  };

  const refreshData = () => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => setIsLoading(false), 1000);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics & Reports</h1>
            <p className="text-gray-600">Track your messaging performance and insights</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
                <SelectItem value="1y">Last Year</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" onClick={refreshData} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            <Button>
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {metrics.map((metric, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-medium text-gray-600">{metric.label}</p>
                  <div className="flex items-center gap-1">
                    {getTrendIcon(metric.trend)}
                    <span className={`text-sm font-medium ${getTrendColor(metric.trend)}`}>
                      {metric.change > 0 ? '+' : ''}{metric.change}%
                    </span>
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {formatValue(metric.value, metric.format || 'number')}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Message Volume Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Message Volume
              </CardTitle>
              <CardDescription>Daily message volume over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-end justify-between gap-2">
                {chartData.map((data, index) => (
                  <div key={index} className="flex flex-col items-center">
                    <div className="w-8 bg-blue-500 rounded-t" style={{ height: `${(data.messages / 200) * 200}px` }}></div>
                    <p className="text-xs text-gray-500 mt-2">{data.date}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  <span>Total Messages</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Metrics Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Performance Metrics
              </CardTitle>
              <CardDescription>Delivery, read, and reply rates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-end justify-between gap-2">
                {chartData.map((data, index) => (
                  <div key={index} className="flex flex-col items-center gap-1">
                    <div className="w-6 bg-green-500 rounded-t" style={{ height: `${(data.delivered / 200) * 200}px` }}></div>
                    <div className="w-6 bg-blue-500 rounded-t" style={{ height: `${(data.read / 200) * 200}px` }}></div>
                    <div className="w-6 bg-purple-500 rounded-t" style={{ height: `${(data.replies / 200) * 200}px` }}></div>
                    <p className="text-xs text-gray-500 mt-2">{data.date}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span>Delivered</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  <span>Read</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-500 rounded"></div>
                  <span>Replies</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Performing Templates */}
          <Card>
            <CardHeader>
              <CardTitle>Top Templates</CardTitle>
              <CardDescription>Best performing message templates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { name: 'Welcome Message', sent: 1247, delivered: 1198, read: 956, replies: 234 },
                { name: 'Order Confirmation', sent: 892, delivered: 867, read: 723, replies: 89 },
                { name: 'Follow-up Reminder', sent: 654, delivered: 623, read: 498, replies: 156 },
                { name: 'Promotional Offer', sent: 445, delivered: 412, read: 298, replies: 67 }
              ].map((template, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{template.name}</p>
                    <p className="text-sm text-gray-500">{template.sent} sent</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{template.delivered} delivered</p>
                    <p className="text-xs text-gray-500">{template.read} read</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Contact Engagement */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Engagement</CardTitle>
              <CardDescription>How your contacts interact</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <span>Total Contacts</span>
                </div>
                <Badge variant="secondary">2,847</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-green-600" />
                  <span>Active This Week</span>
                </div>
                <Badge variant="secondary">1,234</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-orange-600" />
                  <span>New This Month</span>
                </div>
                <Badge variant="secondary">456</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-purple-600" />
                  <span>Engaged (30d)</span>
                </div>
                <Badge variant="secondary">1,789</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest messaging activity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { action: 'Message sent', contact: 'John Doe', time: '2 min ago', status: 'delivered' },
                { action: 'Template used', contact: 'Jane Smith', time: '5 min ago', status: 'read' },
                { action: 'Reply received', contact: 'Mike Johnson', time: '12 min ago', status: 'replied' },
                { action: 'Broadcast sent', contact: 'Group A', time: '1 hour ago', status: 'sent' },
                { action: 'Contact added', contact: 'Sarah Wilson', time: '2 hours ago', status: 'new' }
              ].map((activity, index) => (
                <div key={index} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                    <p className="text-xs text-gray-500">{activity.contact} • {activity.time}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {activity.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Performance Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Summary</CardTitle>
            <CardDescription>Overall messaging performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">95.8%</p>
                <p className="text-sm text-gray-600">Delivery Rate</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Eye className="w-8 h-8 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">78.3%</p>
                <p className="text-sm text-gray-600">Read Rate</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <MousePointer className="w-8 h-8 text-purple-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">23.7%</p>
                <p className="text-sm text-gray-600">Reply Rate</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Clock className="w-8 h-8 text-orange-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">2.4s</p>
                <p className="text-sm text-gray-600">Avg Response</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
