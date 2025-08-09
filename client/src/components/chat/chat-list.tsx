import { ConversationWithContact } from "@shared/schema";
import { cn } from "@/lib/utils";

interface ChatListProps {
  conversations: ConversationWithContact[];
  selectedConversationId: string | null;
  onConversationSelect: (id: string) => void;
}

export default function ChatList({ conversations, selectedConversationId, onConversationSelect }: ChatListProps) {
  const formatTime = (date: Date) => {
    const now = new Date();
    const messageDate = new Date(date);
    const diffMs = now.getTime() - messageDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffHours < 1) {
      return "now";
    } else if (diffHours < 24) {
      return messageDate.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } else if (diffDays < 7) {
      return messageDate.toLocaleDateString("en-US", { weekday: "short" });
    } else {
      return messageDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  };

  return (
    <div className="divide-y divide-gray-100">
      {conversations.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          <i className="fas fa-inbox text-4xl mb-3 text-gray-300" />
          <p>No conversations yet</p>
        </div>
      ) : (
        conversations.map((conversation) => (
          <div
            key={conversation.id}
            className={cn(
              "p-4 hover:bg-gray-50 cursor-pointer transition-colors",
              selectedConversationId === conversation.id && "bg-gray-100"
            )}
            onClick={() => onConversationSelect(conversation.id)}
            data-testid={`chat-item-${conversation.id}`}
          >
            <div className="flex items-center space-x-3">
              <img
                src={conversation.contact.profileImageUrl || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&w=48&h=48&fit=crop&crop=face"}
                alt={`${conversation.contact.name} profile`}
                className="w-12 h-12 rounded-full object-cover"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900 truncate" data-testid={`text-contact-name-${conversation.id}`}>
                    {conversation.contact.name}
                  </h3>
                  <span className="text-xs text-gray-500">
                    {formatTime(conversation.updatedAt || new Date())}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-sm text-gray-600 truncate">
                    {conversation.contact.phone}
                  </p>
                  {(conversation.unreadCount || 0) > 0 && (
                    <span className="bg-whatsapp text-white text-xs rounded-full px-2 py-1 min-w-[1.25rem] text-center">
                      {conversation.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
