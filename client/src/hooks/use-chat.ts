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
  const queryClient = useQueryClient();

  // Create session on mount
  useEffect(() => {
    const initSession = async () => {
      try {
        const response = await apiRequest("POST", "/api/chat/session");
        const data = await response.json();
        setSessionId(data.sessionId);
      } catch (error) {
        console.error("Failed to create chat session:", error);
        // Fallback to client-side session ID
        setSessionId(nanoid());
      }
    };

    initSession();
  }, []);

  // Get chat history
  const { data: historyData } = useQuery({
    queryKey: ["/api/chat/history", sessionId],
    enabled: !!sessionId,
  });

  const messages: ChatMessage[] = historyData?.messages || [];

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", "/api/chat/message", {
        sessionId,
        content,
      });
      return response.json() as Promise<ChatResponse>;
    },
    onSuccess: () => {
      // Invalidate and refetch chat history
      queryClient.invalidateQueries({
        queryKey: ["/api/chat/history", sessionId],
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
    messages,
    sendMessage,
    isLoading: sendMessageMutation.isPending,
  };
}
