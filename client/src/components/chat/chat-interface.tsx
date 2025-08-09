import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import ChatList from "./chat-list";
import MessageBubble from "./message-bubble";
import TemplateVariableDialog from "@/components/chat/template-variable-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showVariableDialog, setShowVariableDialog] = useState(false);
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConversationId) return;

    // Check file type and size
    const maxSize = 100 * 1024 * 1024; // 100MB limit
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please select a file smaller than 100MB.",
        variant: "destructive"
      });
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'video/mp4', 'video/mov', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Unsupported file type",
        description: "Please select an image, video, or document file.",
        variant: "destructive"
      });
      return;
    }

    setIsSending(true);
    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]); // Remove data:mime;base64, prefix
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Determine media type
      let mediaType = 'document';
      if (file.type.startsWith('image/')) {
        mediaType = 'image';
      } else if (file.type.startsWith('video/')) {
        mediaType = 'video';
      }

      // Send media message
      await apiRequest("POST", "/api/messages/media", {
        conversationId: selectedConversationId,
        contactId: selectedConversation?.contactId,
        mediaType: file.type,
        mediaData: base64,
        filename: file.name,
        caption: "",
      });

      toast({
        title: "Media sent",
        description: `${file.name} sent successfully!`,
      });
    } catch (error) {
      toast({
        title: "Failed to send media",
        description: "There was an error sending your file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSendTemplate = async (templateId: string) => {
    if (!selectedConversationId || isSending) return;

    const template = templates.find(t => t.id === templateId);
    if (!template) {
      toast({
        title: "Template not found",
        description: "Please select a valid template.",
        variant: "destructive",
      });
      return;
    }

    // Check if template has variables
    const templateVariables = template.variables && Array.isArray(template.variables) ? template.variables as string[] : [];
    
    if (templateVariables.length > 0) {
      // Show variable input dialog
      setSelectedTemplate(template);
      setShowVariableDialog(true);
      setShowTemplateSelector(false);
      return;
    }

    // Send template without variables
    setIsSending(true);
    try {
      await apiRequest("POST", "/api/messages/template", {
        conversationId: selectedConversationId,
        contactId: selectedConversation?.contactId,
        templateId: templateId,
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

  const handleSendTemplateWithVariables = async (variables: Record<string, string>) => {
    if (!selectedConversationId || !selectedTemplate || isSending) return;

    setIsSending(true);
    try {
      await apiRequest("POST", "/api/messages/template-with-variables", {
        conversationId: selectedConversationId,
        contactId: selectedConversation?.contactId,
        templateId: selectedTemplate.id,
        variables: variables,
      });

      setShowVariableDialog(false);
      setSelectedTemplate(null);
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
                
                {showTemplateSelector ? (
                  <div className="relative">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-green-600 bg-green-50" 
                      onClick={() => setShowTemplateSelector(false)}
                      data-testid="button-template-close"
                    >
                      <i className="fas fa-times" />
                    </Button>
                    <div className="absolute bottom-full left-0 mb-2 w-80 bg-white border rounded-lg shadow-lg p-3 z-50">
                      <div className="space-y-3">
                        <h4 className="font-medium text-sm">Send Template Message</h4>
                        {templates.length === 0 ? (
                          <p className="text-sm text-gray-500">No templates available. Sync templates from Facebook Business Manager.</p>
                        ) : (
                          <div className="space-y-2 max-h-40 overflow-y-auto">
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
                    </div>
                  </div>
                ) : (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-gray-600 hover:text-green-600" 
                    onClick={() => setShowTemplateSelector(true)}
                    data-testid="button-template"
                  >
                    <i className="fas fa-file-alt" />
                  </Button>
                )}
                
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

      {/* Template Variable Dialog */}
      {selectedTemplate && (
        <TemplateVariableDialog
          template={selectedTemplate}
          isOpen={showVariableDialog}
          onClose={() => setShowVariableDialog(false)}
          onSend={handleSendTemplateWithVariables}
          isSending={isSending}
        />
      )}
    </div>
  );
}
