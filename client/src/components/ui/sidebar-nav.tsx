import { useLogout } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SidebarNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: "chats", icon: "fas fa-comments", label: "Chats" },
  { id: "templates", icon: "fas fa-file-alt", label: "Templates" },
  { id: "broadcast", icon: "fas fa-bullhorn", label: "Broadcast" },
  { id: "contacts", icon: "fas fa-address-book", label: "Contacts" },
];

export default function SidebarNav({ activeTab, onTabChange }: SidebarNavProps) {
  const logoutMutation = useLogout();

  return (
    <div className="w-16 bg-whatsapp-dark flex flex-col items-center py-4 space-y-6">
      {navItems.map((item) => (
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
          <i className={`${item.icon} text-xl`} />
        </Button>
      ))}
      
      <div className="flex-1" />
      
      <Button
        variant="ghost"
        size="icon"
        className="p-3 rounded-lg text-white/70 hover:bg-red-600 hover:text-white transition-colors"
        onClick={() => logoutMutation.mutate()}
        data-testid="button-logout"
        title="Logout"
      >
        <i className="fas fa-sign-out-alt text-xl" />
      </Button>
    </div>
  );
}
