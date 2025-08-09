import { useState } from "react";
import { useWebSocket } from "@/hooks/use-websocket";
import SidebarNav from "@/components/ui/sidebar-nav";
import ChatInterface from "@/components/chat/chat-interface";
import TemplateManager from "@/components/templates/template-manager";
import BroadcastComposer from "@/components/broadcast/broadcast-composer";
import ContactManager from "@/components/contacts/contact-manager";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("chats");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  
  // Initialize WebSocket connection
  useWebSocket();

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
      default:
        return <ChatInterface selectedConversationId={selectedConversationId} onConversationSelect={setSelectedConversationId} />;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <SidebarNav activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 flex flex-col">
        {renderContent()}
      </div>
    </div>
  );
}
