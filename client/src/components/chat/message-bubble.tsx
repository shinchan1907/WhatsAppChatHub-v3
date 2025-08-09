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
          
          {/* Media content */}
          {message.type === "media" && message.metadata && typeof message.metadata === 'object' && message.metadata && (
            <div className="mt-2">
              {(message.metadata as any).mediaType?.startsWith('image/') && (
                <div className="relative">
                  <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-center min-h-[100px]">
                    <i className="fas fa-image text-gray-400 text-2xl" />
                    <span className="ml-2 text-gray-600">Image</span>
                  </div>
                  {(message.metadata as any).filename && (
                    <div className="text-xs text-gray-500 mt-1">
                      📎 {(message.metadata as any).filename}
                    </div>
                  )}
                </div>
              )}
              
              {(message.metadata as any).mediaType?.startsWith('video/') && (
                <div className="relative">
                  <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-center min-h-[100px]">
                    <i className="fas fa-video text-gray-400 text-2xl" />
                    <span className="ml-2 text-gray-600">Video</span>
                  </div>
                  {(message.metadata as any).filename && (
                    <div className="text-xs text-gray-500 mt-1">
                      📎 {(message.metadata as any).filename}
                    </div>
                  )}
                </div>
              )}
              
              {!(message.metadata as any).mediaType?.startsWith('image/') && 
               !(message.metadata as any).mediaType?.startsWith('video/') && (
                <div className="bg-gray-50 rounded border p-3">
                  <div className="flex items-center">
                    <i className="fas fa-file text-gray-400 text-lg" />
                    <div className="ml-2">
                      <div className="text-sm font-medium text-gray-700">
                        {(message.metadata as any).filename || "Document"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {(message.metadata as any).mediaType || "Unknown type"}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {(message.metadata as any).caption && (
                <div className="text-sm text-gray-600 mt-2">
                  {(message.metadata as any).caption}
                </div>
              )}
            </div>
          )}

          {/* Template metadata */}
          {message.type === "template" && message.metadata && typeof message.metadata === 'object' && message.metadata && (
            <div className="mt-2">
              {(message.metadata as any).variables && Object.keys((message.metadata as any).variables).length > 0 && (
                <div className="text-xs text-gray-500 mt-1">
                  <span className="font-medium">Variables:</span>
                  {Object.entries((message.metadata as any).variables).map(([key, value]) => (
                    <div key={key} className="ml-2">
                      {key}: {String(value)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Legacy attachment metadata */}
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
