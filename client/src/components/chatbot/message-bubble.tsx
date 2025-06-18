import { Bot, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useMemo } from "react";

interface MessageBubbleProps {
  content: string;
  isUser: boolean;
  timestamp: Date;
}

// Format text content with basic markdown-like styling
function formatMessageContent(content: string, isUser: boolean): JSX.Element {
  if (isUser) {
    return <span>{content}</span>;
  }

  // Split content by lines and process each line
  const lines = content.split('\n');
  const elements: JSX.Element[] = [];
  
  lines.forEach((line, index) => {
    const key = `line-${index}`;
    
    // Handle headers (starting with **)
    if (line.match(/^\*\*(.+)\*\*:?$/)) {
      const headerText = line.replace(/^\*\*(.+)\*\*:?$/, '$1');
      elements.push(
        <div key={key} className="font-semibold text-school-deep mb-2 mt-3 first:mt-0">
          {headerText}
        </div>
      );
    }
    // Handle bullet points (starting with * or •)
    else if (line.match(/^[\s]*[\*•]\s+(.+)$/)) {
      const bulletText = line.replace(/^[\s]*[\*•]\s+(.+)$/, '$1');
      elements.push(
        <div key={key} className="flex items-start ml-2 mb-1">
          <span className="text-school-blue mr-2 mt-0.5">•</span>
          <span className="flex-1">{bulletText}</span>
        </div>
      );
    }
    // Handle nested bullet points (with indentation)
    else if (line.match(/^[\s]{4,}[\*•]\s+(.+)$/)) {
      const bulletText = line.replace(/^[\s]{4,}[\*•]\s+(.+)$/, '$1');
      elements.push(
        <div key={key} className="flex items-start ml-6 mb-1">
          <span className="text-school-orange mr-2 mt-0.5">◦</span>
          <span className="flex-1">{bulletText}</span>
        </div>
      );
    }
    // Handle emoji bullets (✅, 📸, etc.)
    else if (line.match(/^[\s]*[✅📸📜☝️🚫]\s+(.+)$/)) {
      const match = line.match(/^[\s]*([✅📸📜☝️🚫])\s+(.+)$/);
      if (match) {
        const emoji = match[1];
        const text = match[2];
        elements.push(
          <div key={key} className="flex items-start ml-2 mb-1">
            <span className="mr-2 mt-0.5">{emoji}</span>
            <span className="flex-1">{text}</span>
          </div>
        );
      }
    }
    // Handle regular lines
    else if (line.trim()) {
      elements.push(
        <div key={key} className="mb-1">
          {line}
        </div>
      );
    }
    // Handle empty lines (spacing)
    else {
      elements.push(<div key={key} className="mb-2"></div>);
    }
  });

  return <>{elements}</>;
}

export function MessageBubble({ content, isUser, timestamp }: MessageBubbleProps) {
  const formattedContent = useMemo(() => formatMessageContent(content, isUser), [content, isUser]);

  return (
    <div className={`flex items-start space-x-3 animate-fade-in ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm flex-shrink-0 ${isUser ? 'bg-school-orange' : 'bg-school-blue'}`}>
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>
      <div className={`rounded-2xl p-4 max-w-[85%] ${isUser ? 'bg-school-blue text-white rounded-tr-sm' : 'bg-gray-50 rounded-tl-sm border border-gray-200'}`}>
        <div className={`text-sm leading-relaxed ${isUser ? 'text-white' : 'text-gray-800'}`}>
          {formattedContent}
        </div>
        <div className={`text-xs mt-2 opacity-70 ${isUser ? 'text-white' : 'text-gray-500'}`}>
          {formatDistanceToNow(timestamp, { addSuffix: true })}
        </div>
      </div>
    </div>
  );
}
