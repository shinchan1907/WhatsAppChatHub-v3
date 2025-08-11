import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Send, 
  Paperclip, 
  Smile, 
  MoreVertical, 
  Search,
  MessageCircle,
  Plus,
  Image,
  Video,
  FileText,
  X,
  File
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import MessageBubble from "./message-bubble";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Conversation {
  id: string;
  contactId: string;
  contact: {
    id: string;
    name: string;
    phone: string;
    avatar?: string;
  };
  lastMessageAt: string;
  lastMessageId: string;
  unreadCount: number;
  status: string;
  lastMessage?: {
    content: string;
    direction: string;
    type: string;
  };
}

interface Message {
  id: string;
  content: string;
  timestamp: string;
  direction: "inbound" | "outbound";
  status: "sent" | "delivered" | "read" | "failed";
  type: "text" | "image" | "video" | "audio" | "document" | "location" | "contact" | "sticker" | "template";
  mediaUrl?: string;
  mediaType?: string;
  templateId?: string;
  templateVariables?: Record<string, any>;
  isRead: boolean;
  readAt?: string;
  deliveredAt?: string;
  sentAt?: string;
}

interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  avatar?: string;
}

interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  variables: string[];
  mediaUrl?: string;
  mediaType?: string;
  status: string;
}

export default function ChatInterface({ 
  selectedConversationId, 
  onConversationSelect 
}: { 
  selectedConversationId: string | null;
  onConversationSelect: (id: string) => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [selectedContact, setSelectedContact] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({});
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [messageType, setMessageType] = useState<"text" | "image" | "video" | "document">("text");

  // Fetch conversations with real-time data
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery<Conversation[]>({
    queryKey: ["conversations"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/v1/conversations");
      if (!response.ok) throw new Error("Failed to fetch conversations");
      const data = await response.json();
      return data.data || [];
    },
    refetchInterval: 10000, // Refetch every 10 seconds for real-time updates
  });

  // Fetch messages for selected conversation
  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["messages", selectedConversationId],
    queryFn: async () => {
      if (!selectedConversationId) return [];
      const response = await apiRequest("GET", `/api/v1/conversations/${selectedConversationId}/messages`);
      if (!response.ok) throw new Error("Failed to fetch messages");
      const data = await response.json();
      return data.data || [];
    },
    enabled: !!selectedConversationId,
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
  });

  // Fetch contacts for new chat
  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["contacts"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/v1/contacts");
      if (!response.ok) throw new Error("Failed to fetch contacts");
      const data = await response.json();
      return data.data || [];
    },
  });

  // Fetch approved templates for new chat
  const { data: templates = [] } = useQuery<MessageTemplate[]>({
    queryKey: ["approved-templates"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/v1/templates/approved/list");
      if (!response.ok) throw new Error("Failed to fetch templates");
      const data = await response.json();
      return data.data || [];
    },
  });

  // Mark conversation as read when selected
  const markAsReadMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      const response = await apiRequest("POST", `/api/v1/conversations/${conversationId}/mark-read`);
      if (!response.ok) throw new Error("Failed to mark as read");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["messages", selectedConversationId] });
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: { content?: string; type: string; mediaUrl?: string; mediaType?: string; templateId?: string; templateVariables?: Record<string, any> }) => {
      if (!selectedConversationId) throw new Error("No conversation selected");
      const response = await apiRequest("POST", `/api/v1/conversations/${selectedConversationId}/messages`, messageData);
      if (!response.ok) throw new Error("Failed to send message");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", selectedConversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setNewMessage("");
      setSelectedFile(null);
      setShowMediaUpload(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Start new conversation mutation
  const startNewChatMutation = useMutation({
    mutationFn: async (data: { contactId: string; templateId?: string; templateVariables?: Record<string, any> }) => {
      const response = await apiRequest("POST", "/api/v1/conversations", data);
      if (!response.ok) throw new Error("Failed to start new conversation");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setShowNewChatDialog(false);
      setSelectedContact("");
      setSelectedTemplate("");
      setTemplateVariables({});
      
      // Select the new conversation
      if (data.data?.conversation?.id) {
        onConversationSelect(data.data.conversation.id);
      }
      
      toast({
        title: "New chat started",
        description: "Conversation created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to start new chat",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mark conversation as read when selected
  useEffect(() => {
    if (selectedConversationId) {
      markAsReadMutation.mutate(selectedConversationId);
    }
  }, [selectedConversationId]);

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);

  const handleSendMessage = () => {
    if (!selectedConversationId) return;

    if (messageType === "text" && !newMessage.trim()) return;
    if (messageType !== "text" && !selectedFile) return;

    if (messageType === "text") {
      sendMessageMutation.mutate({
        content: newMessage,
        type: "text"
      });
    } else {
      // Handle media upload and sending
      handleSendMediaMessage();
    }
  };

  const handleSendMediaMessage = async () => {
    if (!selectedFile) return;

    try {
      // For now, we'll simulate file upload
      // In a real implementation, you'd upload to your CDN/storage service
      const mediaUrl = URL.createObjectURL(selectedFile);
      const mediaType = selectedFile.type;

      sendMessageMutation.mutate({
        type: messageType,
        mediaUrl,
        mediaType
      });
    } catch (error) {
      toast({
        title: "Failed to send media",
        description: "Error processing media file",
        variant: "destructive",
      });
    }
  };

  const handleStartNewChat = () => {
    if (!selectedContact) {
      toast({
        title: "Contact required",
        description: "Please select a contact to start a chat with",
        variant: "destructive",
      });
      return;
    }

    if (!selectedTemplate) {
      toast({
        title: "Template required",
        description: "According to Meta's policy, business-initiated conversations must use approved templates",
        variant: "destructive",
      });
      return;
    }

    startNewChatMutation.mutate({
      contactId: selectedContact,
      templateId: selectedTemplate,
      templateVariables
    });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      
      // Determine message type based on file
      if (file.type.startsWith('image/')) {
        setMessageType('image');
      } else if (file.type.startsWith('video/')) {
        setMessageType('video');
      } else {
        setMessageType('document');
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      case 'archived': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'image': return <Image className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      case 'document': return <FileText className="w-4 h-4" />;
      case 'template': return <File className="w-4 h-4" />;
      default: return <MessageCircle className="w-4 h-4" />;
    }
  };

  if (conversationsLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Conversations List */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Conversations</h2>
            <Dialog open={showNewChatDialog} onOpenChange={setShowNewChatDialog}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700">
                  <Plus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Start New Chat</DialogTitle>
                  <DialogDescription>
                    Start a new conversation with a contact. According to Meta's policy, 
                    business-initiated conversations must use approved templates.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="contact">Select Contact</Label>
                    <Select value={selectedContact} onValueChange={setSelectedContact}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a contact" />
                      </SelectTrigger>
                      <SelectContent>
                        {contacts.map((contact) => (
                          <SelectItem key={contact.id} value={contact.id}>
                            {contact.name} ({contact.phone})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="template">Select Template *</Label>
                    <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose an approved template" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedTemplate && (
                    <div>
                      <Label>Template Preview</Label>
                      <div className="p-3 bg-gray-50 rounded-md text-sm">
                        {templates.find(t => t.id === selectedTemplate)?.content}
                      </div>
                    </div>
                  )}

                  {selectedTemplate && templates.find(t => t.id === selectedTemplate)?.variables?.length > 0 && (
                    <div>
                      <Label>Template Variables</Label>
                      <div className="space-y-2">
                        {templates.find(t => t.id === selectedTemplate)?.variables.map((variable) => (
                          <div key={variable}>
                            <Label htmlFor={variable}>{variable}</Label>
                            <Input
                              id={variable}
                              value={templateVariables[variable] || ''}
                              onChange={(e) => setTemplateVariables(prev => ({
                                ...prev,
                                [variable]: e.target.value
                              }))}
                              placeholder={`Enter ${variable}`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowNewChatDialog(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleStartNewChat}
                      disabled={!selectedContact || !selectedTemplate || startNewChatMutation.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {startNewChatMutation.isPending ? "Starting..." : "Start Chat"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-50 border-gray-200"
            />
          </div>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <MessageCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No conversations yet</p>
              <p className="text-sm">Start a chat to see conversations here</p>
            </div>
          ) : (
            conversations
              .filter(conv => 
                conv.contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                conv.contact.phone.includes(searchQuery)
              )
              .map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => onConversationSelect(conversation.id)}
                  className={`p-4 border-b border-gray-100 cursor-pointer transition-colors hover:bg-gray-50 ${
                    selectedConversationId === conversation.id ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={conversation.contact.avatar} />
                        <AvatarFallback className="bg-gray-200 text-gray-600">
                          {conversation.contact.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      {conversation.unreadCount > 0 && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                          {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900 truncate">{conversation.contact.name}</h3>
                        <span className="text-xs text-gray-500">
                          {conversation.lastMessageAt ? formatTimestamp(conversation.lastMessageAt) : ''}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1">
                          {conversation.lastMessage && (
                            <>
                              {getMessageIcon(conversation.lastMessage.type)}
                              <p className="text-sm text-gray-600 truncate">
                                {conversation.lastMessage.direction === 'outbound' ? 'You: ' : ''}
                                {conversation.lastMessage.content || 'Media message'}
                              </p>
                            </>
                          )}
                        </div>
                        <Badge className={getStatusColor(conversation.status)}>
                          {conversation.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={selectedConversation.contact.avatar} />
                    <AvatarFallback className="bg-gray-200 text-gray-600">
                      {selectedConversation.contact.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-gray-900">{selectedConversation.contact.name}</h3>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-sm text-gray-500">online</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm">
                    <Search className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messagesLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-gray-500 mt-8">
                  <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p>No messages yet</p>
                  <p className="text-sm">Start the conversation!</p>
                </div>
              ) : (
                messages.map((message) => (
                  <MessageBubble 
                    key={message.id} 
                    message={{
                      ...message,
                      type: message.type === 'template' ? 'text' : message.type
                    }} 
                    isOwn={message.direction === 'outbound'}
                  />
                ))
              )}
            </div>

            {/* Message Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="space-y-3">
                {/* Media Upload Preview */}
                {selectedFile && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <div className="flex items-center space-x-2">
                      {getMessageIcon(messageType)}
                      <span className="text-sm text-gray-600">{selectedFile.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedFile(null);
                        setMessageType("text");
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <input
                      type="file"
                      id="media-upload"
                      className="hidden"
                      accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                      onChange={handleFileSelect}
                    />
                    <label htmlFor="media-upload">
                      <Button variant="ghost" size="sm" asChild>
                        <span>
                          <Paperclip className="w-4 h-4" />
                        </span>
                      </Button>
                    </label>
                  </div>
                  
                  <div className="flex-1 relative">
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="pr-12"
                      disabled={sendMessageMutation.isPending || messageType !== "text"}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2"
                    >
                      <Smile className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <Button 
                    onClick={handleSendMessage}
                    disabled={
                      (messageType === "text" && !newMessage.trim()) || 
                      (messageType !== "text" && !selectedFile) ||
                      sendMessageMutation.isPending
                    }
                    className="bg-green-600 hover:bg-green-700"
                    size="sm"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Welcome Screen */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <MessageCircle className="w-12 h-12 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Welcome to WhatsApp Hub</h3>
              <p className="text-gray-600 mb-6">Select a conversation to start messaging or start a new chat</p>
              <Dialog open={showNewChatDialog} onOpenChange={setShowNewChatDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-green-600 hover:bg-green-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Start New Chat
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Start New Chat</DialogTitle>
                    <DialogDescription>
                      Start a new conversation with a contact. According to Meta's policy, 
                      business-initiated conversations must use approved templates.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="contact">Select Contact</Label>
                      <Select value={selectedContact} onValueChange={setSelectedContact}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a contact" />
                        </SelectTrigger>
                        <SelectContent>
                          {contacts.map((contact) => (
                            <SelectItem key={contact.id} value={contact.id}>
                              {contact.name} ({contact.phone})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="template">Select Template *</Label>
                      <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose an approved template" />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedTemplate && (
                      <div>
                        <Label>Template Preview</Label>
                        <div className="p-3 bg-gray-50 rounded-md text-sm">
                          {templates.find(t => t.id === selectedTemplate)!.content}
                        </div>
                      </div>
                    )}

                    {selectedTemplate && (() => {
                      const template = templates.find(t => t.id === selectedTemplate);
                      return template?.variables && template.variables.length > 0 ? (
                        <div>
                          <Label>Template Variables</Label>
                          <div className="space-y-2">
                            {template.variables.map((variable) => (
                              <div key={variable}>
                                <Label htmlFor={variable}>{variable}</Label>
                                <Input
                                  id={variable}
                                  value={templateVariables[variable] || ''}
                                  onChange={(e) => setTemplateVariables(prev => ({
                                    ...prev,
                                    [variable]: e.target.value
                                  }))}
                                  placeholder={`Enter ${variable}`}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null;
                    })()}

                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setShowNewChatDialog(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleStartNewChat}
                        disabled={!selectedContact || !selectedTemplate || startNewChatMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {startNewChatMutation.isPending ? "Starting..." : "Start Chat"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
