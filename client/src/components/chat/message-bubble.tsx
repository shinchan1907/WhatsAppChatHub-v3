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
          {metadata?.mediaUrl && (
            <div className="mt-2">
              {metadata.mediaType?.startsWith('image/') ? (
                <div className="rounded-lg overflow-hidden">
                  <img
                    src={metadata.mediaUrl}
                    alt={metadata.filename || 'Image'}
                    className="max-w-full h-auto max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => window.open(metadata.mediaUrl, '_blank')}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = `<div class="p-3 bg-gray-100 rounded text-sm text-gray-600">📷 Image: ${metadata.filename || 'attachment'}</div>`;
                      }
                    }}
                  />
                  {metadata.caption && (
                    <p className="text-sm text-gray-600 mt-1 italic">{metadata.caption}</p>
                  )}
                </div>
              ) : metadata.mediaType?.startsWith('video/') ? (
                <div className="rounded-lg overflow-hidden">
                  <video
                    src={metadata.mediaUrl}
                    controls
                    className="max-w-full h-auto max-h-64 object-cover"
                    poster={metadata.thumbnailUrl}
                    onError={(e) => {
                      const target = e.target as HTMLVideoElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = `<div class="p-3 bg-gray-100 rounded text-sm text-gray-600">🎥 Video: ${metadata.filename || 'attachment'}</div>`;
                      }
                    }}
                  >
                    Your browser does not support the video tag.
                  </video>
                  {metadata.caption && (
                    <p className="text-sm text-gray-600 mt-1 italic">{metadata.caption}</p>
                  )}
                </div>
              ) : metadata.mediaType?.startsWith('audio/') ? (
                <div className="p-3 bg-gray-100 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-lg">🎵</span>
                    <span className="text-sm font-medium text-gray-700">
                      {metadata.filename || 'Audio message'}
                    </span>
                  </div>
                  <audio
                    src={metadata.mediaUrl}
                    controls
                    className="w-full"
                    onError={(e) => {
                      const target = e.target as HTMLAudioElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        const errorDiv = document.createElement('div');
                        errorDiv.innerHTML = '<p class="text-xs text-red-500">Audio playback not supported</p>';
                        parent.appendChild(errorDiv);
                      }
                    }}
                  >
                    Your browser does not support the audio tag.
                  </audio>
                </div>
              ) : (
                <div className="p-3 bg-gray-100 rounded-lg border border-gray-200">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">📎</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-700">
                        {metadata.filename || 'Document'}
                      </p>
                      {metadata.attachment?.size && (
                        <p className="text-xs text-gray-500">{metadata.attachment.size}</p>
                      )}
                    </div>
                    <a
                      href={metadata.mediaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 transition-colors"
                    >
                      Download
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Fallback for attachment info without URL */}
          {!metadata?.mediaUrl && metadata?.attachment && (
            <div className="mt-2 p-3 bg-gray-100 rounded-lg border border-gray-200">
              <div className="flex items-center space-x-2">
                <span className="text-lg">📎</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">
                    {metadata.attachment.name || 'Attachment'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {metadata.attachment.type} {metadata.attachment.size && `• ${metadata.attachment.size}`}
                  </p>
                </div>
              </div>
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
