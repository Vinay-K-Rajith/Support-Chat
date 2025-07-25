import { Bot } from "lucide-react";

export function TypingIndicator() {
  return (
    <div className="flex items-center space-x-3">
      <div className="w-8 h-8 bg-school-blue rounded-full flex items-center justify-center text-white text-sm">
        <Bot className="w-4 h-4" />
      </div>
      <div className="bg-gray-100 rounded-2xl rounded-tl-sm p-3">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    </div>
  );
}
