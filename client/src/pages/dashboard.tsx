import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import SidebarNav from "@/components/ui/sidebar-nav";
import ChatInterface from "@/components/chat/chat-interface";
import TemplateManager from "@/components/templates/template-manager";
import BroadcastComposer from "@/components/broadcast/broadcast-composer";
import ContactManager from "@/components/contacts/contact-manager";
import Settings from "@/pages/settings";
import Automation from "@/pages/automation";
import AIBot from "@/pages/ai-bot";
import Analytics from "@/pages/analytics";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MessageCircle, 
  Users, 
  TrendingUp, 
  Clock, 
  Settings as SettingsIcon,
  Bot,
  Zap,
  BarChart3,
  Plus,
  ArrowRight,
  Phone,
  Mail,
  Calendar,
  FileText,
  Play,
  Pause
} from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("chats");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  // Fetch real analytics data
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ["dashboard-analytics"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/v1/analytics/dashboard");
      if (!response.ok) throw new Error("Failed to fetch analytics");
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch recent conversations
  const { data: recentConversations = [], isLoading: conversationsLoading } = useQuery({
    queryKey: ["recent-conversations"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/v1/conversations?limit=5&sort=lastMessageAt");
      if (!response.ok) throw new Error("Failed to fetch recent conversations");
      return response.json();
    },
    refetchInterval: 15000, // Refetch every 15 seconds
  });

  // Fetch automation flows
  const { data: automationFlows = [], isLoading: automationLoading } = useQuery({
    queryKey: ["automation-flows"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/v1/automation/flows");
      if (!response.ok) throw new Error("Failed to fetch automation flows");
      return response.json();
    },
    refetchInterval: 60000, // Refetch every minute
  });

  // Fetch AI bots
  const { data: aiBots = [], isLoading: aiBotsLoading } = useQuery({
    queryKey: ["ai-bots"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/v1/ai/bots");
      if (!response.ok) throw new Error("Failed to fetch AI bots");
      return response.json();
    },
    refetchInterval: 60000, // Refetch every minute
  });

  const renderContent = () => {
    switch (activeTab) {
      case "chats":
        return (
          <ChatInterface
            selectedConversationId={selectedConversationId}
            onConversationSelect={setSelectedConversationId}
          />
        );
      case "templates":
        return <TemplateManager />;
      case "broadcast":
        return <BroadcastComposer />;
      case "contacts":
        return <ContactManager />;
      case "automation":
        return <Automation />;
      case "ai-bot":
        return <AIBot />;
      case "analytics":
        return <Analytics />;
      case "settings":
        return <Settings />;
      default:
        return (
          <ChatInterface
            selectedConversationId={selectedConversationId}
            onConversationSelect={setSelectedConversationId}
          />
        );
    }
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case "chats": return "WhatsApp Chat Hub";
      case "templates": return "Message Templates";
      case "broadcast": return "Broadcast Messages";
      case "contacts": return "Contact Management";
      case "automation": return "Automation Flows";
      case "ai-bot": return "AI Bot Management";
      case "analytics": return "Analytics & Reports";
      case "settings": return "Settings";
      default: return "WhatsApp Chat Hub";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'paused': return 'bg-orange-100 text-orange-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar Navigation */}
      <SidebarNav activeTab={activeTab} onTabChange={setActiveTab} />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {getTabTitle()}
              </h1>
              <p className="text-sm text-gray-600">
                Welcome back, {user?.firstName || 'Admin'}! 👋
              </p>
            </div>
            
            {/* Quick Stats for Dashboard */}
            {activeTab === "chats" && !analyticsLoading && analyticsData && (
              <div className="flex items-center space-x-4">
                <div className="text-center">
                  <div className="text-lg font-semibold text-green-600">
                    {analyticsData.totalMessages?.toLocaleString() || '0'}
                  </div>
                  <div className="text-xs text-gray-500">Total Messages</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-blue-600">
                    {analyticsData.activeContacts?.toLocaleString() || '0'}
                  </div>
                  <div className="text-xs text-gray-500">Active Contacts</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-purple-600">
                    {analyticsData.deliveryRate ? `${analyticsData.deliveryRate}%` : '0%'}
                  </div>
                  <div className="text-xs text-gray-500">Delivery Rate</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === "chats" ? (
            <div className="h-full">
              {renderContent()}
            </div>
          ) : (
            <div className="h-full overflow-y-auto">
              {renderContent()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
