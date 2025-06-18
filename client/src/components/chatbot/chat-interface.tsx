import { useState, useRef, useEffect } from "react";
import { X, Send, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "./message-bubble";
import { QuickActions } from "./quick-actions";
import { TypingIndicator } from "./typing-indicator";
import { useChat } from "@/hooks/use-chat";

interface ChatInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChatInterface({ isOpen, onClose }: ChatInterfaceProps) {
  const [message, setMessage] = useState("");
  const { messages, sendMessage, isLoading, sessionId } = useChat();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    await sendMessage(message);
    setMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleQuickAction = (query: string) => {
    sendMessage(query);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-end justify-end p-6">
      <div className="w-96 max-w-[calc(100vw-2rem)] h-[32rem] bg-white rounded-2xl shadow-2xl flex flex-col animate-slide-up">
        {/* Chat Header */}
        <div className="bg-gradient-to-r from-school-blue to-school-deep text-white p-4 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold">St. Xavier's AI Assistant</h3>
              <p className="text-xs opacity-90">
                {isLoading ? "Typing..." : "Online • Ready to help"}
              </p>
            </div>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white hover:bg-opacity-20 w-8 h-8 rounded-full"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Quick Actions */}
        <QuickActions onQuickAction={handleQuickAction} />

        {/* Chat Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {/* Welcome Message */}
            <MessageBubble
              content="Hello! I'm your St. Xavier's School assistant. I can help you with admissions, fees, documents required, and school policies. How can I assist you today?"
              isUser={false}
              timestamp={new Date()}
            />
            
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                content={msg.content}
                isUser={msg.isUser}
                timestamp={msg.timestamp}
              />
            ))}
            
            {isLoading && <TypingIndicator />}
          </div>
        </ScrollArea>

        {/* Chat Input */}
        <div className="p-4 border-t bg-white rounded-b-2xl">
          <div className="flex items-center space-x-2">
            <Input
              type="text"
              placeholder="Ask about admissions, fees, documents..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-school-blue focus:ring-2 focus:ring-school-blue focus:ring-opacity-20"
              disabled={isLoading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!message.trim() || isLoading}
              className="bg-school-blue hover:bg-school-deep text-white w-10 h-10 rounded-full"
              size="icon"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Powered by Google Gemini AI
          </p>
        </div>
      </div>
    </div>
  );
}
