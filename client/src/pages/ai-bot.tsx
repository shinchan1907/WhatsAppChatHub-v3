import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Bot, 
  Brain, 
  MessageSquare, 
  Settings, 
  Play, 
  Pause, 
  Edit, 
  Trash2,
  Plus,
  Zap,
  Users,
  Clock,
  TrendingUp,
  Smartphone,
  Globe,
  Shield
} from "lucide-react";

interface AIBot {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'training';
  model: string;
  accuracy: number;
  totalConversations: number;
  avgResponseTime: number;
  createdAt: string;
}

export default function AIBot() {
  const [bots, setBots] = useState<AIBot[]>([
    {
      id: '1',
      name: 'Customer Support Bot',
      description: 'Handles common customer inquiries and support requests',
      status: 'active',
      model: 'GPT-4',
      accuracy: 94.2,
      totalConversations: 1247,
      avgResponseTime: 1.2,
      createdAt: '2024-01-01T00:00:00Z'
    },
    {
      id: '2',
      name: 'Sales Assistant Bot',
      description: 'Helps qualify leads and answer product questions',
      status: 'active',
      model: 'GPT-3.5',
      accuracy: 89.7,
      totalConversations: 856,
      avgResponseTime: 0.8,
      createdAt: '2024-01-05T00:00:00Z'
    },
    {
      id: '3',
      name: 'Order Status Bot',
      description: 'Provides order updates and tracking information',
      status: 'training',
      model: 'Custom',
      accuracy: 0,
      totalConversations: 0,
      avgResponseTime: 0,
      createdAt: '2024-01-10T00:00:00Z'
    }
  ]);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newBot, setNewBot] = useState({
    name: '',
    description: '',
    model: 'GPT-3.5',
    purpose: 'customer_support'
  });

  const [botSettings, setBotSettings] = useState({
    autoReply: true,
    humanHandoff: true,
    sentimentAnalysis: true,
    multilingual: false,
    responseDelay: 0,
    maxConversationLength: 50
  });

  const handleCreateBot = () => {
    if (newBot.name && newBot.description) {
      const bot: AIBot = {
        id: Date.now().toString(),
        name: newBot.name,
        description: newBot.description,
        status: 'training',
        model: newBot.model,
        accuracy: 0,
        totalConversations: 0,
        avgResponseTime: 0,
        createdAt: new Date().toISOString()
      };
      setBots([...bots, bot]);
      setNewBot({ name: '', description: '', model: 'GPT-3.5', purpose: 'customer_support' });
      setShowCreateForm(false);
    }
  };

  const toggleBotStatus = (id: string) => {
    setBots(bots.map(bot => 
      bot.id === id 
        ? { ...bot, status: bot.status === 'active' ? 'inactive' : 'active' }
        : bot
    ));
  };

  const deleteBot = (id: string) => {
    setBots(bots.filter(bot => bot.id !== id));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'training': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getModelIcon = (model: string) => {
    switch (model) {
      case 'GPT-4': return <Brain className="w-4 h-4 text-purple-600" />;
      case 'GPT-3.5': return <Brain className="w-4 h-4 text-blue-600" />;
      case 'Custom': return <Bot className="w-4 h-4 text-green-600" />;
      default: return <Bot className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">AI Bot Manager</h1>
            <p className="text-gray-600">Create and manage intelligent chatbots for your business</p>
          </div>
          <Button 
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Bot
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Bots</p>
                  <p className="text-2xl font-bold text-gray-900">{bots.length}</p>
                </div>
                <Bot className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Bots</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {bots.filter(b => b.status === 'active').length}
                  </p>
                </div>
                <Play className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Conversations</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {bots.reduce((sum, b) => sum + b.totalConversations, 0)}
                  </p>
                </div>
                <MessageSquare className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {bots.length > 0 ? 
                      (bots.reduce((sum, b) => sum + b.avgResponseTime, 0) / bots.length).toFixed(1) 
                      : '0'
                    }s
                  </p>
                </div>
                <Clock className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Create Bot Form */}
        {showCreateForm && (
          <Card>
            <CardHeader>
              <CardTitle>Create New AI Bot</CardTitle>
              <CardDescription>Set up a new intelligent chatbot</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="botName">Bot Name</Label>
                <Input
                  id="botName"
                  value={newBot.name}
                  onChange={(e) => setNewBot({ ...newBot, name: e.target.value })}
                  placeholder="e.g., Customer Support Bot"
                />
              </div>
              
              <div>
                <Label htmlFor="botDescription">Description</Label>
                <Textarea
                  id="botDescription"
                  value={newBot.description}
                  onChange={(e) => setNewBot({ ...newBot, description: e.target.value })}
                  placeholder="Describe what this bot does..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="botModel">AI Model</Label>
                  <select
                    id="botModel"
                    value={newBot.model}
                    onChange={(e) => setNewBot({ ...newBot, model: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="GPT-3.5">GPT-3.5 (Fast & Cost-effective)</option>
                    <option value="GPT-4">GPT-4 (Most Intelligent)</option>
                    <option value="Custom">Custom Model</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="botPurpose">Primary Purpose</Label>
                  <select
                    id="botPurpose"
                    value={newBot.purpose}
                    onChange={(e) => setNewBot({ ...newBot, purpose: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="customer_support">Customer Support</option>
                    <option value="sales">Sales & Lead Generation</option>
                    <option value="order_status">Order Status</option>
                    <option value="appointment">Appointment Booking</option>
                    <option value="general">General Information</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleCreateBot} disabled={!newBot.name || !newBot.description}>
                  Create Bot
                </Button>
                <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bot Configuration */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bot List */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Your AI Bots</h2>
            
            {bots.map((bot) => (
              <Card key={bot.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getModelIcon(bot.model)}
                        <h3 className="text-lg font-semibold text-gray-900">{bot.name}</h3>
                        <Badge className={getStatusColor(bot.status)}>
                          {bot.status}
                        </Badge>
                      </div>
                      
                      <p className="text-gray-600 mb-3">{bot.description}</p>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="text-center">
                          <p className="font-medium text-gray-900">{bot.accuracy}%</p>
                          <p className="text-gray-500">Accuracy</p>
                        </div>
                        <div className="text-center">
                          <p className="font-medium text-gray-900">{bot.totalConversations}</p>
                          <p className="text-gray-500">Conversations</p>
                        </div>
                        <div className="text-center">
                          <p className="font-medium text-gray-900">{bot.avgResponseTime}s</p>
                          <p className="text-gray-500">Avg Response</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleBotStatus(bot.id)}
                        disabled={bot.status === 'training'}
                      >
                        {bot.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        {bot.status === 'active' ? 'Pause' : 'Activate'}
                      </Button>
                      
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4" />
                        Configure
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteBot(bot.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Bot Settings */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Global Bot Settings</h2>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  General Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="autoReply">Auto Reply</Label>
                    <p className="text-sm text-gray-500">Allow bots to respond automatically</p>
                  </div>
                  <Switch 
                    id="autoReply"
                    checked={botSettings.autoReply}
                    onCheckedChange={(checked) => setBotSettings(prev => ({ ...prev, autoReply: checked }))}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="humanHandoff">Human Handoff</Label>
                    <p className="text-sm text-gray-500">Transfer complex queries to humans</p>
                  </div>
                  <Switch 
                    id="humanHandoff"
                    checked={botSettings.humanHandoff}
                    onCheckedChange={(checked) => setBotSettings(prev => ({ ...prev, humanHandoff: checked }))}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="sentimentAnalysis">Sentiment Analysis</Label>
                    <p className="text-sm text-gray-500">Analyze customer mood and tone</p>
                  </div>
                  <Switch 
                    id="sentimentAnalysis"
                    checked={botSettings.sentimentAnalysis}
                    onCheckedChange={(checked) => setBotSettings(prev => ({ ...prev, sentimentAnalysis: checked }))}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="multilingual">Multilingual Support</Label>
                    <p className="text-sm text-gray-500">Support multiple languages</p>
                  </div>
                  <Switch 
                    id="multilingual"
                    checked={botSettings.multilingual}
                    onCheckedChange={(checked) => setBotSettings(prev => ({ ...prev, multilingual: checked }))}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Response Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="responseDelay">Response Delay (seconds)</Label>
                  <Input 
                    id="responseDelay" 
                    type="number" 
                    value={botSettings.responseDelay}
                    onChange={(e) => setBotSettings(prev => ({ ...prev, responseDelay: parseInt(e.target.value) || 0 }))}
                    min="0"
                    max="10"
                  />
                  <p className="text-sm text-gray-500 mt-1">Artificial delay to make responses feel more natural</p>
                </div>
                
                <div>
                  <Label htmlFor="maxConversationLength">Max Conversation Length</Label>
                  <Input 
                    id="maxConversationLength" 
                    type="number" 
                    value={botSettings.maxConversationLength}
                    onChange={(e) => setBotSettings(prev => ({ ...prev, maxConversationLength: parseInt(e.target.value) || 50 }))}
                    min="10"
                    max="200"
                  />
                  <p className="text-sm text-gray-500 mt-1">Maximum messages before forcing human handoff</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common bot templates and configurations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button variant="outline" className="h-auto p-4 flex-col items-start">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold">Customer Support Bot</span>
                </div>
                <p className="text-sm text-gray-600 text-left">
                  Pre-configured bot for handling customer inquiries
                </p>
              </Button>
              
              <Button variant="outline" className="h-auto p-4 flex-col items-start">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <span className="font-semibold">Sales Bot</span>
                </div>
                <p className="text-sm text-gray-600 text-left">
                  Lead qualification and product recommendation bot
                </p>
              </Button>
              
              <Button variant="outline" className="h-auto p-4 flex-col items-start">
                <div className="flex items-center gap-2 mb-2">
                  <Smartphone className="w-5 h-5 text-purple-600" />
                  <span className="font-semibold">Appointment Bot</span>
                </div>
                <p className="text-sm text-gray-600 text-left">
                  Schedule and manage appointments automatically
                </p>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
