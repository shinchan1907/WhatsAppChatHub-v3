import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  MessageCircle, 
  FileText, 
  Megaphone, 
  Users, 
  Settings, 
  Zap, 
  Bot, 
  BarChart3,
  LogOut
} from "lucide-react";

interface SidebarNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: "chats", icon: MessageCircle, label: "Chats" },
  { id: "templates", icon: FileText, label: "Templates" },
  { id: "broadcast", icon: Megaphone, label: "Broadcast" },
  { id: "contacts", icon: Users, label: "Contacts" },
  { id: "automation", icon: Zap, label: "Automation" },
  { id: "ai-bot", icon: Bot, label: "AI Bot" },
  { id: "analytics", icon: BarChart3, label: "Analytics" },
  { id: "settings", icon: Settings, label: "Settings" },
];

export default function SidebarNav({ activeTab, onTabChange }: SidebarNavProps) {
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  return (
    <div className="w-16 bg-whatsapp-dark flex flex-col items-center py-4 space-y-6">
      {navItems.map((item) => {
        const IconComponent = item.icon;
        return (
          <Button
            key={item.id}
            variant="ghost"
            size="icon"
            className={cn(
              "p-3 rounded-lg transition-colors",
              activeTab === item.id
                ? "bg-whatsapp text-white"
                : "text-white/70 hover:bg-whatsapp-dark/50 hover:text-white"
            )}
            onClick={() => onTabChange(item.id)}
            data-testid={`nav-${item.id}`}
            title={item.label}
          >
            <IconComponent className="w-5 h-5" />
          </Button>
        );
      })}
      
      <div className="flex-1" />
      
      <Button
        variant="ghost"
        size="icon"
        className="p-3 rounded-lg text-white/70 hover:bg-red-600 hover:text-white transition-colors"
        onClick={handleLogout}
        data-testid="button-logout"
        title="Logout"
      >
        <LogOut className="w-5 h-5" />
      </Button>
    </div>
  );
}
