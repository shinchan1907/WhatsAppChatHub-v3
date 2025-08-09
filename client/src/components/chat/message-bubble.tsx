import { Message } from "@shared/schema";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isOutbound = message.direction === "outbound";
  const isTemplate = message.type === "template";

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getStatusIcon = () => {
    switch (message.status) {
      case "sent":
        return <i className="fas fa-check text-gray-400 text-xs" title="Sent" />;
      case "delivered":
        return <i className="fas fa-check-double text-gray-500 text-xs" title="Delivered" />;
      case "read":
        return <i className="fas fa-check-double text-green-500 text-xs" title="Read" />;
      case "failed":
        return <i className="fas fa-exclamation-triangle text-red-500 text-xs" title="Failed to send" />;
      default:
        return <i className="fas fa-clock text-gray-300 text-xs" title="Sending..." />;
    }
  };

  return (
    <div className={cn("flex mb-4", isOutbound ? "justify-end" : "justify-start")}>
      <div className={cn("flex items-start space-x-2", isOutbound ? "max-w-md" : "max-w-xs")}>
        <div
          className={cn(
            "rounded-lg p-3 shadow-sm",
            isOutbound
              ? "message-bubble-sent"
              : "message-bubble-received",
            isTemplate && isOutbound && "border-l-4 border-whatsapp"
          )}
          data-testid={`message-${message.id}`}
        >
          {isTemplate && isOutbound && (
            <div className="text-xs text-whatsapp-dark font-medium mb-1">
              Template Message
            </div>
          )}
          
          <p className="text-gray-800 whitespace-pre-wrap break-words">
            {message.content}
          </p>
          
          {/* Template metadata */}
          {message.metadata && typeof message.metadata === 'object' && message.metadata && 'attachment' in message.metadata && (
            <div className="mt-2 p-2 bg-gray-50 rounded border">
              <div className="text-sm font-medium text-gray-700">
                📋 {(message.metadata as any).attachment?.name || "Attachment"}
              </div>
              <div className="text-xs text-gray-500">
                {(message.metadata as any).attachment?.type || "File"} • {(message.metadata as any).attachment?.size || "Unknown size"}
              </div>
            </div>
          )}
          
          <div className={cn(
            "flex items-center mt-1 space-x-1",
            isOutbound ? "justify-end" : "justify-start"
          )}>
            <span className="text-xs text-gray-500">
              {formatTime(message.timestamp || new Date())}
            </span>
            {isOutbound && getStatusIcon()}
          </div>
        </div>
      </div>
    </div>
  );
}
