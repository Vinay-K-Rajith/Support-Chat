import { Bot, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface MessageBubbleProps {
  content: string;
  isUser: boolean;
  timestamp: Date;
}

export function MessageBubble({ content, isUser, timestamp }: MessageBubbleProps) {
  return (
    <div className={`flex items-start space-x-3 animate-fade-in ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm ${isUser ? 'bg-school-orange' : 'bg-school-blue'}`}>
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>
      <div className={`rounded-2xl p-3 max-w-[80%] ${isUser ? 'bg-school-blue text-white rounded-tr-sm' : 'bg-gray-100 rounded-tl-sm'}`}>
        <div className={`text-sm whitespace-pre-line ${isUser ? 'text-white' : 'text-gray-800'}`}>
          {content}
        </div>
        <div className={`text-xs mt-1 opacity-70 ${isUser ? 'text-white' : 'text-gray-500'}`}>
          {formatDistanceToNow(timestamp, { addSuffix: true })}
        </div>
      </div>
    </div>
  );
}
