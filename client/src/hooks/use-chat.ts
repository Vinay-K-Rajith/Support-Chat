import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { nanoid } from "nanoid";
import type { ChatMessage } from "@shared/schema";

interface ChatResponse {
  userMessage: ChatMessage;
  aiMessage: ChatMessage;
}

export function useChat() {
  const [sessionId, setSessionId] = useState<string>("");
  const [schoolCode, setSchoolCode] = useState<string | null>(null); // Use null to indicate not loaded yet
  const queryClient = useQueryClient();

  // Extract school code from URL on mount
  useEffect(() => {
    console.log('🌍 FRONTEND - Full URL:', window.location.href);
    const urlParams = new URLSearchParams(window.location.search);
    const schoolCodeParam = urlParams.get('schoolCode'); // Use 'schoolCode' to match existing URL format
    console.log('🗺️ FRONTEND - URL params:', window.location.search);
    console.log('🏫 FRONTEND - Extracted school code:', schoolCodeParam);
    console.log('🗺️ FRONTEND - All URL params:', Object.fromEntries(urlParams));
    // Always set schoolCode, even if null (indicates we've checked)
    setSchoolCode(schoolCodeParam || "");
  }, []);

  // Create session only after school code has been determined
  useEffect(() => {
    // Don't create session until we've extracted school code (null -> string)
    if (schoolCode === null) return;
    
    const initSession = async () => {
      try {
        console.log('🚀 Creating session with schoolCode:', schoolCode);
        const response = await apiRequest("POST", "/api/chat/session", {
          schoolCode: schoolCode || null
        });
        const data = await response.json();
        setSessionId(data.sessionId);
      } catch (error) {
        console.error("Failed to create chat session:", error);
        // Fallback to client-side session ID
        setSessionId(nanoid());
      }
    };

    initSession();
  }, [schoolCode]);

  // Get chat history
  const { data: historyData } = useQuery({
    queryKey: ["/api/chat/history", sessionId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/chat/history/${sessionId}`);
      return response.json();
    },
    enabled: !!sessionId,
  });

  const messages: ChatMessage[] = historyData?.messages || [];

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      console.log('📝 Sending message with schoolCode:', schoolCode);
      const response = await apiRequest("POST", "/api/chat/message", {
        sessionId,
        content,
        schoolCode: schoolCode || null,
      });
      return response.json() as Promise<ChatResponse>;
    },
    onSuccess: (data) => {
      // Update the cache directly with the new messages
      queryClient.setQueryData(["/api/chat/history", sessionId], (oldData: any) => {
        const currentMessages = oldData?.messages || [];
        return {
          messages: [...currentMessages, data.userMessage, data.aiMessage]
        };
      });
    },
  });

  const sendMessage = async (content: string) => {
    if (!sessionId || !content.trim()) return;
    
    try {
      await sendMessageMutation.mutateAsync(content);
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  return {
    sessionId,
    schoolCode,
    messages,
    sendMessage,
    isLoading: sendMessageMutation.isPending,
  };
}
