import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import ChatList from "./chat-list";
import MessageBubble from "./message-bubble";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Message, ConversationWithContact } from "@shared/schema";

interface ChatInterfaceProps {
  selectedConversationId: string | null;
  onConversationSelect: (id: string) => void;
}

export default function ChatInterface({ selectedConversationId, onConversationSelect }: ChatInterfaceProps) {
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const { data: conversations = [] } = useQuery<ConversationWithContact[]>({
    queryKey: ["/api/conversations"],
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/conversations", selectedConversationId, "messages"],
    enabled: !!selectedConversationId,
  });

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedConversationId || isSending) return;

    setIsSending(true);
    try {
      await apiRequest("POST", "/api/messages", {
        conversationId: selectedConversationId,
        contactId: selectedConversation?.contactId,
        content: messageText,
        type: "text",
        direction: "outbound",
        status: "sent",
        templateId: null,
        metadata: null,
      });

      setMessageText("");
      toast({
        title: "Message sent",
        description: "Your message has been sent successfully.",
      });
    } catch (error) {
      toast({
        title: "Failed to send message",
        description: "There was an error sending your message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-full bg-gray-100">
      {/* Chat List Panel - Left Side */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="bg-whatsapp text-white p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Conversations</h2>
            <Button variant="ghost" size="icon" className="text-white hover:bg-green-600">
              <i className="fas fa-search" />
            </Button>
          </div>
          <div className="relative">
            <Input
              type="text"
              placeholder="Search conversations..."
              className="w-full pl-10"
              data-testid="input-search-conversations"
            />
            <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <ChatList
            conversations={conversations}
            selectedConversationId={selectedConversationId}
            onConversationSelect={onConversationSelect}
          />
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="bg-gray-50 p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <img
                  src={selectedConversation.contact.profileImageUrl || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&w=40&h=40&fit=crop&crop=face"}
                  alt="Contact profile"
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <h3 className="font-medium text-gray-900" data-testid="text-contact-name">
                    {selectedConversation.contact.name}
                  </h3>
                  <p className="text-sm text-gray-500">Online</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="icon" className="text-gray-600">
                  <i className="fas fa-phone" />
                </Button>
                <Button variant="ghost" size="icon" className="text-gray-600">
                  <i className="fas fa-video" />
                </Button>
                <Button variant="ghost" size="icon" className="text-gray-600">
                  <i className="fas fa-ellipsis-v" />
                </Button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 chat-bg">
              {messagesLoading ? (
                <div className="flex justify-center items-center h-full">
                  <div className="text-gray-500">Loading messages...</div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex justify-center items-center h-full">
                  <div className="text-gray-500">No messages yet. Start a conversation!</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))}
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="bg-white p-4 border-t border-gray-200">
              <div className="flex items-center space-x-3">
                <Button variant="ghost" size="icon" className="text-gray-600">
                  <i className="fas fa-paperclip" />
                </Button>
                <Button variant="ghost" size="icon" className="text-gray-600" data-testid="button-template">
                  <i className="fas fa-file-alt" />
                </Button>
                <div className="flex-1 relative">
                  <Input
                    type="text"
                    placeholder="Type a message..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="w-full pl-4 pr-12 py-3 rounded-full"
                    data-testid="input-message"
                  />
                  <Button
                    size="icon"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 rounded-full whatsapp-green"
                    onClick={handleSendMessage}
                    disabled={!messageText.trim() || isSending}
                    data-testid="button-send-message"
                  >
                    <i className="fas fa-paper-plane" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <i className="fas fa-comments text-6xl mb-4 text-gray-300" />
              <h3 className="text-xl font-medium mb-2">Welcome to WhatsApp Business</h3>
              <p>Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
