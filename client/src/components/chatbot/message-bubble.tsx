import { Bot, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useMemo } from "react";

interface MessageBubbleProps {
  content: string;
  isUser: boolean;
  timestamp: Date;
}

// Helper to linkify URLs and emails in a string or array of strings/JSX
function linkify(text: string | (string | JSX.Element)[]): (string | JSX.Element)[] {
  // If already an array (from bold splitting), process each part
  if (Array.isArray(text)) {
    return text.flatMap((part, idx) => {
      if (typeof part === "string") {
        return linkify(part);
      }
      return part;
    });
  }

  // Regex for URLs (http, https, www)
  const urlRegex = /((https?:\/\/[^\s<]+)|(www\.[^\s<]+))/gi;
  // Regex for emails
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;

  // Split by URLs and emails in one pass to avoid duplicate rendering
  const parts: (string | JSX.Element)[] = [];
  let lastIndex = 0;
  const combinedRegex = new RegExp(`${urlRegex.source}|${emailRegex.source}`, "gi");

  let match: RegExpExecArray | null;
  while ((match = combinedRegex.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const matchedText = match[0];

    // Check if it's an email
    if (matchedText.match(emailRegex)) {
      parts.push(
        <a
          key={`email-${match.index}-${matchedText}`}
          href={`mailto:${matchedText}`}
          className="underline text-blue-600 break-all hover:text-blue-800"
        >
          {matchedText}
        </a>
      );
    }
    // Otherwise, it's a URL
    else if (matchedText.match(urlRegex)) {
      // Remove trailing punctuation (like www.x.comwww.)
      let cleanUrl = matchedText.replace(/([.,!?;:]+)$/g, "");
      let displayUrl = cleanUrl;
      // If the next part of the string is the same as the displayUrl, skip it
      // (prevents www.x.comwww.x.com)
      // But this is handled by splitting, so just render once

      // Ensure protocol for www.
      const href = cleanUrl.startsWith("http") ? cleanUrl : `https://${cleanUrl}`;
      parts.push(
        <a
          key={`url-${match.index}-${cleanUrl}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-blue-600 break-all hover:text-blue-800"
        >
          {displayUrl}
        </a>
      );
    }
    lastIndex = match.index + matchedText.length;
  }
  // Add any remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

// Format text content with basic markdown-like styling and linkification
function formatMessageContent(content: string, isUser: boolean): JSX.Element {
  if (isUser) {
    // For user, just linkify
    return <span>{linkify(content)}</span>;
  }

  // Split content by lines and process each line
  const lines = content.split('\n');
  const elements: JSX.Element[] = [];
  
  lines.forEach((line, index) => {
    const key = `line-${index}`;
    
    // Remove asterisk if it appears just before bold (e.g., "* **Nursery:** ...")
    line = line.replace(/^[\s]*\*[\s]*(\*\*)/, ' $1');

    // Handle headers (starting with **)
    if (line.match(/^\*\*(.+)\*\*:?$/)) {
      const headerText = line.replace(/^\*\*(.+)\*\*:?$/, '$1');
      elements.push(
        <div key={key} className="font-semibold text-school-deep mb-2 mt-3 first:mt-0">
          {linkify(headerText)}
        </div>
      );
    }
    // Handle inline bold text within lines
    else if (line.includes('**')) {
      const processedLine = line.split(/(\*\*[^*]+\*\*)/).map((part, idx) => {
        if (part.match(/^\*\*(.+)\*\*$/)) {
          const boldText = part.replace(/^\*\*(.+)\*\*$/, '$1');
          return <strong key={`bold-${idx}`} className="font-semibold text-school-deep">{linkify(boldText)}</strong>;
        }
        return linkify(part);
      });
      elements.push(
        <div key={key} className="mb-1">
          {processedLine}
        </div>
      );
    }
    // Handle bullet points (starting with * or •)
    else if (line.match(/^[\s]*[\*•]\s+(.+)$/)) {
      const bulletText = line.replace(/^[\s]*[\*•]\s+(.+)$/, '$1');
      const processedBulletText = bulletText.includes('**') 
        ? bulletText.split(/(\*\*[^*]+\*\*)/).map((part, index) => {
            if (part.match(/^\*\*(.+)\*\*$/)) {
              const boldText = part.replace(/^\*\*(.+)\*\*$/, '$1');
              return <strong key={`bullet-bold-${index}`} className="font-semibold text-school-deep">{boldText}</strong>;
            }
            return linkify(part);
          })
        : linkify(bulletText);
      
      elements.push(
        <div key={key} className="flex items-start ml-2 mb-1">
          <span className="text-blue-500 mr-2 text-lg align-top">&bull;</span>
          <span className="flex-1">{processedBulletText}</span>
        </div>
      );
    }
    // Handle nested bullet points (with indentation)
    else if (line.match(/^[\s]{4,}[\*•]\s+(.+)$/)) {
      const bulletText = line.replace(/^[\s]{4,}[\*•]\s+(.+)$/, '$1');
      const processedBulletText = bulletText.includes('**') 
        ? bulletText.split(/(\*\*[^*]+\*\*)/).map((part, idx) => {
            if (part.match(/^\*\*(.+)\*\*$/)) {
              const boldText = part.replace(/^\*\*(.+)\*\*$/, '$1');
              return <strong key={`nested-bold-${idx}`} className="font-semibold text-school-deep">{linkify(boldText)}</strong>;
            }
            return linkify(part);
          })
        : linkify(bulletText);
      
      elements.push(
        <div key={key} className="flex items-start ml-6 mb-1">
          <span className="text-school-orange mr-2 mt-0.5">◦</span>
          <span className="flex-1">{processedBulletText}</span>
        </div>
      );
    }
    // Handle emoji bullets (✅, 📸, 📜, ☝️, 🚫, etc.)
    else if (line.match(/^[\s]*[✅📸📜☝️🚫🔗📅📞📧📝📂📁📌📍💡🔔🕒🏫👨‍🎓👩‍🎓🏆🎓📚🏅🗂️🗃️🗄️🗓️🗒️🗳️🗝️🗺️🗨️🗯️🗳️🗞️🗿🛎️🛡️🧾🧑‍🏫🧑‍🎓]\s+(.+)$/)) {
      const match = line.match(/^[\s]*([✅📸📜☝️🚫🔗📅📞📧📝📂📁📌📍💡🔔🕒🏫👨‍🎓👩‍🎓🏆🎓📚🏅🗂️🗃️🗄️🗓️🗒️🗳️🗝️🗺️🗨️🗯️🗳️🗞️🗿🛎️🛡️🧾🧑‍🏫🧑‍🎓])\s+(.+)$/);
      if (match) {
        const emoji = match[1];
        const text = match[2];
        const processedText = text.includes('**') 
          ? text.split(/(\*\*[^*]+\*\*)/).map((part, index) => {
              if (part.match(/^\*\*(.+)\*\*$/)) {
                const boldText = part.replace(/^\*\*(.+)\*\*$/, '$1');
                return <strong key={`emoji-bold-${index}`} className="font-semibold text-school-deep">{boldText}</strong>;
              }
              return linkify(part);
            })
          : linkify(text);
        
        elements.push(
          <div key={key} className="flex items-start ml-2 mb-1">
            <span className="mr-2 mt-1 text-lg">{emoji}</span>
            <span className="flex-1">{processedText}</span>
          </div>
        );
      }
    }
    // Handle regular lines
    else if (line.trim()) {
      const processedLine = line.includes('**') 
        ? line.split(/(\*\*[^*]+\*\*)/).map((part, idx) => {
            if (part.match(/^\*\*(.+)\*\*$/)) {
              const boldText = part.replace(/^\*\*(.+)\*\*$/, '$1');
              return <strong key={`regular-bold-${idx}`} className="font-semibold text-school-deep">{linkify(boldText)}</strong>;
            }
            return linkify(part);
          })
        : linkify(line);
      
      elements.push(
        <div key={key} className="mb-1">
          {processedLine}
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
