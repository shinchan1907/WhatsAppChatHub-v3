import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import ChatList from "./chat-list";
import MessageBubble from "./message-bubble";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Message, ConversationWithContact, Template } from "@shared/schema";

interface ChatInterfaceProps {
  selectedConversationId: string | null;
  onConversationSelect: (id: string) => void;
}

export default function ChatInterface({ selectedConversationId, onConversationSelect }: ChatInterfaceProps) {
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: conversations = [] } = useQuery<ConversationWithContact[]>({
    queryKey: ["/api/conversations"],
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/conversations", selectedConversationId, "messages"],
    enabled: !!selectedConversationId,
  });

  const { data: templates = [] } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
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
      // Subtle success feedback - message status will show in bubble
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

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      toast({
        title: "File selected",
        description: `${file.name} - File upload feature coming soon!`,
        variant: "default"
      });
    }
  };

  const handleSendTemplate = async (templateId: string) => {
    if (!selectedConversationId || isSending) return;

    setIsSending(true);
    try {
      await apiRequest("POST", "/api/messages", {
        conversationId: selectedConversationId,
        contactId: selectedConversation?.contactId,
        content: "Template message sent",
        type: "template",
        direction: "outbound",
        status: "sent",
        templateId: templateId,
        metadata: null,
      });

      setShowTemplateSelector(false);
    } catch (error) {
      toast({
        title: "Failed to send template",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
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
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white shadow-md">
                  <span className="text-sm font-medium">
                    {selectedConversation.contact.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900" data-testid="text-contact-name">
                    {selectedConversation.contact.name}
                  </h3>
                  <p className="text-xs text-gray-500">{selectedConversation.contact.phone}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
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
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-gray-600 hover:text-green-600"
                  onClick={handleFileUpload}
                  data-testid="button-upload-file"
                >
                  <i className="fas fa-paperclip" />
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                />
                
                <Popover open={showTemplateSelector} onOpenChange={setShowTemplateSelector}>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-gray-600 hover:text-green-600" 
                      data-testid="button-template"
                    >
                      <i className="fas fa-file-alt" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-3">
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Send Template Message</h4>
                      {templates.length === 0 ? (
                        <p className="text-sm text-gray-500">No templates available. Create templates in the Templates section.</p>
                      ) : (
                        <div className="space-y-2">
                          {templates.map((template) => (
                            <Button
                              key={template.id}
                              variant="outline"
                              size="sm"
                              className="w-full justify-start text-left"
                              onClick={() => handleSendTemplate(template.id)}
                              disabled={isSending}
                            >
                              <div>
                                <div className="font-medium">{template.name}</div>
                                <div className="text-xs text-gray-500 truncate">
                                  {template.content.substring(0, 50)}...
                                </div>
                              </div>
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
                
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
