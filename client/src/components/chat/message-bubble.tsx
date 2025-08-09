import { Message } from "@shared/schema";
import { cn } from "@/lib/utils";
import { CheckIcon, CheckCheckIcon, ClockIcon, XCircleIcon } from "lucide-react";

interface MessageBubbleProps {
  message: Message;
}

interface MessageMetadata {
  mediaType?: string;
  filename?: string;
  caption?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  variables?: Record<string, any>;
  attachment?: {
    name?: string;
    type?: string;
    size?: string;
  };
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
        return <CheckIcon className="w-3 h-3 text-gray-400" title="Sent" />;
      case "delivered":
        return <CheckCheckIcon className="w-3 h-3 text-gray-500" title="Delivered" />;
      case "read":
        return <CheckCheckIcon className="w-3 h-3 text-blue-500" title="Read" />;
      case "failed":
        return <XCircleIcon className="w-3 h-3 text-red-500" title="Failed to send" />;
      default:
        return <ClockIcon className="w-3 h-3 text-gray-300" title="Sending..." />;
    }
  };

  const metadata = message.metadata as MessageMetadata | null;

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
          {message.type === "media" && metadata && (
            <div className="mt-2">
              {metadata.mediaType?.startsWith('image/') && (
                <div className="relative">
                  {metadata.mediaUrl ? (
                    <img
                      src={metadata.mediaUrl}
                      alt={metadata.filename || "Image"}
                      className="max-w-full max-h-80 rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(metadata.mediaUrl, '_blank')}
                      loading="lazy"
                    />
                  ) : (
                    <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-center min-h-[100px]">
                      <span className="text-gray-600">🖼️ Image</span>
                    </div>
                  )}
                  {metadata.filename && (
                    <div className="text-xs text-gray-500 mt-1">
                      📎 {metadata.filename}
                    </div>
                  )}
                </div>
              )}
              
              {metadata.mediaType?.startsWith('video/') && (
                <div className="relative">
                  {metadata.mediaUrl ? (
                    <video
                      src={metadata.mediaUrl}
                      controls
                      className="max-w-full max-h-80 rounded-lg"
                      poster={metadata.thumbnailUrl}
                    >
                      Your browser does not support the video tag.
                    </video>
                  ) : (
                    <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-center min-h-[100px]">
                      <span className="text-gray-600">🎥 Video</span>
                    </div>
                  )}
                  {metadata.filename && (
                    <div className="text-xs text-gray-500 mt-1">
                      📎 {metadata.filename}
                    </div>
                  )}
                </div>
              )}
              
              {metadata.mediaType && !metadata.mediaType.startsWith('image/') && !metadata.mediaType.startsWith('video/') && (
                <div className="bg-gray-50 rounded border p-3">
                  <div className="flex items-center">
                    <span className="text-gray-400 text-lg">📄</span>
                    <div className="ml-2">
                      <div className="text-sm font-medium text-gray-700">
                        {metadata.filename || "Document"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {metadata.mediaType || "Unknown type"}
                      </div>
                      {metadata.mediaUrl && (
                        <a
                          href={metadata.mediaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:underline"
                        >
                          Download
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {metadata.caption && (
                <div className="text-sm text-gray-600 mt-2">
                  {metadata.caption}
                </div>
              )}
            </div>
          )}

          {/* Template metadata */}
          {message.type === "template" && metadata && (
            <div className="mt-2">
              {metadata.variables && Object.keys(metadata.variables).length > 0 && (
                <div className="text-xs text-gray-500 mt-1">
                  <span className="font-medium">Variables:</span>
                  {Object.entries(metadata.variables).map(([key, value]) => (
                    <div key={key} className="ml-2">
                      {key}: {String(value)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Legacy attachment metadata */}
          {metadata && metadata.attachment && (
            <div className="mt-2 p-2 bg-gray-50 rounded border">
              <div className="text-sm font-medium text-gray-700">
                📋 {metadata.attachment.name || "Attachment"}
              </div>
              <div className="text-xs text-gray-500">
                {metadata.attachment.type || "File"} • {metadata.attachment.size || "Unknown size"}
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
