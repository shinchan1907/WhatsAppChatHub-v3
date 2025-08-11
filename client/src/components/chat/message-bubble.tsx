import { Check, CheckCheck, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  message: {
    id: string;
    content: string;
    timestamp: string;
    direction: "inbound" | "outbound";
    status: "sent" | "delivered" | "read" | "failed";
    type: "text" | "image" | "video" | "audio" | "document" | "location" | "contact" | "sticker";
    mediaUrl?: string;
    mediaType?: string;
    isRead: boolean;
    readAt?: string;
    deliveredAt?: string;
    sentAt?: string;
  };
  isOwn: boolean;
}

export default function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const getStatusIcon = () => {
    if (!isOwn) return null;
    
    switch (message.status) {
      case "sent":
        return <Clock className="w-3 h-3 text-gray-400" />;
      case "delivered":
        return <CheckCheck className="w-3 h-3 text-gray-400" />;
      case "read":
        return <CheckCheck className="w-3 h-3 text-blue-500" />;
      case "failed":
        return <span className="text-red-500 text-xs">!</span>;
      default:
        return <Clock className="w-3 h-3 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    if (!isOwn) return null;
    
    switch (message.status) {
      case "sent":
        return "Sent";
      case "delivered":
        return "Delivered";
      case "read":
        return message.readAt ? `Read at ${new Date(message.readAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : "Read";
      case "failed":
        return "Failed to send";
      default:
        return "Sending...";
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={cn(
      "flex",
      isOwn ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "max-w-xs lg:max-w-md px-4 py-2 rounded-lg",
        isOwn 
          ? "bg-green-500 text-white rounded-br-md" 
          : "bg-white text-gray-900 rounded-bl-md border border-gray-200"
      )}>
        {/* Message Content */}
        {message.type === 'text' && (
          <p className="text-sm leading-relaxed">{message.content}</p>
        )}
        
        {message.type === 'image' && message.mediaUrl && (
          <div className="space-y-2">
            <img 
              src={message.mediaUrl} 
              alt="Image" 
              className="max-w-full rounded-lg"
            />
            {message.content && (
              <p className="text-sm leading-relaxed">{message.content}</p>
            )}
          </div>
        )}
        
        {message.type === 'video' && message.mediaUrl && (
          <div className="space-y-2">
            <video 
              src={message.mediaUrl} 
              controls 
              className="max-w-full rounded-lg"
            />
            {message.content && (
              <p className="text-sm leading-relaxed">{message.content}</p>
            )}
          </div>
        )}
        
        {message.type === 'audio' && message.mediaUrl && (
          <div className="space-y-2">
            <audio 
              src={message.mediaUrl} 
              controls 
              className="w-full"
            />
            {message.content && (
              <p className="text-sm leading-relaxed">{message.content}</p>
            )}
          </div>
        )}
        
        {message.type === 'document' && message.mediaUrl && (
          <div className="space-y-2">
            <div className="flex items-center space-x-2 p-2 bg-gray-100 rounded-lg">
              <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
                <span className="text-white text-xs font-bold">DOC</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{message.content || 'Document'}</p>
                <p className="text-xs text-gray-500">Click to download</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Message Footer */}
        <div className={cn(
          "flex items-center justify-end mt-1 space-x-1",
          isOwn ? "text-green-100" : "text-gray-500"
        )}>
          <span className="text-xs">{formatTimestamp(message.timestamp)}</span>
          {getStatusIcon()}
        </div>
        
        {/* Status Text for Outbound Messages */}
        {isOwn && message.status !== 'sent' && (
          <div className="text-xs text-green-100 mt-1 text-right">
            {getStatusText()}
          </div>
        )}
      </div>
    </div>
  );
}
