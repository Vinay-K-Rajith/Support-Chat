import { useState, useRef, useEffect } from "react";
import { Send, LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "./message-bubble";
import { TypingIndicator } from "./typing-indicator";
import { useChat } from "@/hooks/use-chat";
import { getSupportContext } from "@/../../server/services/support-context";
import { useIsMobile } from "@/hooks/use-mobile";

interface ChatInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChatInterface({ isOpen, onClose }: ChatInterfaceProps) {
  const [message, setMessage] = useState("");
  const { messages, sendMessage, isLoading } = useChat();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Expanded question variations for suggestions
  const questionVariations = [
    // 1. Parent has posted fee but not reflecting in ERP.
    "Why is the fee payment not showing up in ERP after the parent paid?",
    "Parent paid online but the fee isn't updated in the system.",
    "How do I verify a parent's payment that isn't reflecting?",
    "What to do if a parent's fee payment is missing in ERP?",
    "Fee posted by parent is not visible—how to resolve?",
    // 2. How to do the Cheque Bounce Entry
    "How do I record a cheque bounce in Entab?",
    "Steps to mark a cheque as bounced in the system.",
    "Where do I enter cheque bounce details?",
    "How can I update a payment as cheque bounced?",
    "What is the process for cheque bounce entry?",
    // 3. How to Post Fee Receipts in Bulk Using Excel Format
    "How do I upload fee receipts in bulk?",
    "Steps to import fee receipts from Excel.",
    "Can I post multiple fee receipts at once?",
    "How to use the bulk entry for fee receipts?",
    "What's the process for uploading fee receipts via Excel?",
    // 4. How to Preview the Fee Defaulters Report
    "How do I view the fee defaulters report?",
    "Where can I find the student defaulter summary?",
    "Steps to preview defaulter details in Entab.",
    "How to generate a list of fee defaulters?",
    "How do I check which students are fee defaulters?",
    // 5. How to Preview the Fee Requisition Slip
    "How do I preview a fee requisition slip?",
    "Where can I find the requisition slip for a student?",
    "Steps to view the fee requisition slip.",
    "How to generate a requisition slip in Entab?",
    "How do I get a preview of the fee requisition slip?",
    // 6. How to Preview the Tuition Fee Certificate
    "How do I preview a tuition fee certificate?",
    "Steps to generate a tuition fee certificate.",
    "Where can I find the tuition fee certificate for a student?",
    "How to get a preview of the tuition fee certificate?",
    "How do I print a tuition fee certificate?",
    // 7. Fee Structure Update and Realignment
    "How do I update the fee structure for a new session?",
    "Steps to realign fee structure class-wise.",
    "What to do if fee collection was done on the old structure?",
    "How to adjust fee groups for a new academic year?",
    "How do I fix discrepancies after updating the fee structure?",
    // 8. Application of Concessions to Students
    "How do I apply a concession to a student?",
    "Steps to assign a new concession type.",
    "Can a student have more than one concession?",
    "How to update or replace a student's concession?",
    "What's the process for documenting concession changes?",
    // 9. Duplicate Fee Heads During Online Payment Process
    "Why are there duplicate fee heads in the payment form?",
    "How do I fix duplicate fee heads during online payment?",
    "Steps to remove duplicate fee heads from the system.",
    "What causes duplicate fee heads in online payment?",
    "How to update the payment form to remove duplicates?",
    // 10. Cheque Bounce Entry Process
    "How do I mark a cheque as bounced in receipt details?",
    "What happens when I click the cross sign for a cheque payment?",
    "Steps to confirm a cheque bounce in the system.",
    "How does the system update after a cheque is bounced?",
    "How do I adjust student records for a bounced cheque?",
    // 11. Error: 'Contact with School' During Online Payment
    "What does 'Contact with school' mean during payment?",
    "How do I fix the 'Contact with school' error?",
    "Why am I getting a 'Contact with school' message online?",
    "Steps to resolve payment gateway errors.",
    "How to troubleshoot online payment issues in Entab?",
    // 12. Duplicate Receipt Numbers Assigned to Multiple Students
    "Why are receipt numbers duplicated for students?",
    "How do I prevent duplicate receipt numbers?",
    "Steps to ensure unique receipt numbers for each student.",
    "What setting controls multiple students on a single receipt?",
    "How to enforce unique receipts in the system?",
    // 13. Parent paid but receipt not generated
    "Parent's payment successful but no receipt generated—what to do?",
    "How do I manually post a fee if the receipt isn't created?",
    "Steps to generate a receipt after successful payment.",
    "Why is the receipt missing after online payment?",
    "How to resolve missing receipt issues for parents?",
  ];

  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (message.trim().length > 0) {
      const lower = message.toLowerCase();
      // Substring match first
      let filtered = questionVariations.filter(q => q.toLowerCase().includes(lower));
      // If not enough, fallback to fuzzy (word overlap)
      if (filtered.length < 2) {
        filtered = questionVariations
          .map(q => ({ q, score: q.toLowerCase().split(' ').filter(word => lower.includes(word)).length }))
          .sort((a, b) => b.score - a.score)
          .map(x => x.q)
          .filter((q, i, arr) => arr.indexOf(q) === i && !filtered.includes(q));
        filtered = [...filtered, ...filtered].slice(0, 2);
      } else {
        filtered = filtered.slice(0, 2);
      }
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  }, [message]);

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    await sendMessage(message);
    setMessage("");
    setSuggestions([]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-end"
      onClick={onClose}
      style={{ background: "rgba(30, 41, 59, 0.08)" }}
    >
      <div
        className={
          isMobile
            ? "w-screen h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex flex-col animate-slide-up overflow-hidden"
            : "w-full md:w-[453px] max-w-[calc(100vw-1rem)] h-[calc(85vh+59px)] md:h-[43.6875rem] bg-gradient-to-br from-blue-50 via-white to-blue-100 rounded-3xl shadow-2xl border border-gray-200 flex flex-col animate-slide-up overflow-hidden m-2 md:m-4"
        }
        onClick={e => e.stopPropagation()}
        style={
          isMobile
            ? { boxShadow: undefined, border: undefined, borderRadius: 0, margin: 0, padding: 0 }
            : { boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.18)", border: "1.5px solid #e5e7eb" }
        }
      >
        {/* Support Desk Cover/Header */}
        {!isMobile && (
          <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-600/90 to-blue-400/80 border-b border-blue-200 shadow-md rounded-t-3xl">
            <div className="flex items-center justify-center w-11 h-11 rounded-full bg-white shadow text-blue-700 border-2 border-blue-100">
              <img
                src="https://www.entab.in/images-latest/about.webp"
                alt="Entab Logo"
                className="w-8 h-8 object-contain rounded-full"
                style={{ display: 'block' }}
              />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xl text-white tracking-tight">Support Desk</span>
              <span className="text-xs text-blue-100 font-medium">ENTAB Support Desk</span>
            </div>
          </div>
        )}
        {/* Chat Messages */}
        <ScrollArea className="flex-1 px-4 py-6 bg-transparent" ref={scrollAreaRef}>
          <div className="space-y-6 pb-4">
            {/* Intro message as a normal bot message */}
            <div className="flex justify-start">
              <div className="max-w-[95%] bg-white/90 border border-blue-100 rounded-2xl shadow-sm px-5 py-3">
                <MessageBubble
                  content={`👋 **Welcome to the ENTAB Support Desk**\n\n_Efficient, professional assistance for all your Entab ERP modules: Fees, Academics, Online Payment, Reports, and more._\n\n**What can support assist with today?**`.trim()}
                  isUser={false}
                  timestamp={new Date()}
                  isFirstBotMessage={true}
                />
              </div>
            </div>
            {messages.map((msg, idx) => (
              <div
                key={msg.id}
                className={`flex ${msg.isUser ? "justify-end" : "justify-start"}`}
                ref={idx === messages.length - 1 ? lastMessageRef : undefined}
              >
                <div className={`max-w-[95%] ${msg.isUser ? "bg-blue-50" : "bg-white/90 border border-blue-100"} rounded-2xl shadow-sm px-5 py-3`}>
                  <MessageBubble
                    content={msg.content}
                    isUser={msg.isUser}
                    timestamp={msg.timestamp ? new Date(msg.timestamp) : new Date()}
                    isFirstBotMessage={false}
                  />
                </div>
              </div>
            ))}
            {isLoading && <TypingIndicator />}
          </div>
        </ScrollArea>
        {/* Chat Input and Suggestions */}
        <div className="px-4 py-4 border-t bg-white rounded-b-3xl shadow-inner">
          <div className="flex items-center space-x-2">
            <Input
              type="text"
              placeholder="Type your question about any Entab module..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 border-gray-300 rounded-full px-4 py-3 text-base focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 shadow-sm bg-blue-50"
              disabled={isLoading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!message.trim() || isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white w-12 h-12 rounded-full shadow-lg"
              size="icon"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
          {/* Suggestions Dropdown */}
          {suggestions.length > 0 && (
            <div className="mt-2 bg-white border border-gray-200 rounded shadow-sm">
              {suggestions.map((s, idx) => (
                <div
                  key={idx}
                  className="px-3 py-2 cursor-pointer hover:bg-blue-50 text-sm text-gray-700"
                  onClick={async () => {
                    setMessage("");
                    setSuggestions([]);
                    await sendMessage(s);
                  }}
                >
                  {s}
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-400 mt-3 text-center flex items-center justify-center gap-1">
            <span>Powered by</span>
            <img src="https://images.yourstory.com/cs/images/companies/Entab-300X300-1615358510008.jpg?fm=auto&ar=1%3A1&mode=fill&fill=solid&fill-color=fff&format=auto&w=384&q=75" alt="Entab Logo" className="h-9 w-9 inline-block rounded-full mx-1" style={{ display: 'inline', verticalAlign: 'middle' }} />
            <span>BETA version</span>
          </p>
        </div>
      </div>
    </div>
  );
}
