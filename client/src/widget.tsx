import React from "react";
import { createRoot } from "react-dom/client";
import { ChatInterface } from "./components/chatbot/chat-interface";

const container = document.getElementById("root");
if (container) {
  createRoot(container).render(<ChatInterface isOpen={true} onClose={() => {}} />);
}