import React from "react";
import { createRoot } from "react-dom/client";
import { ChatInterface } from "./components/chatbot/chat-interface";

const container = document.createElement("div");
container.id = "my-chatbot-widget";
document.body.appendChild(container);

const root = createRoot(container);
root.render(<ChatInterface isOpen={true} onClose={() => container.remove()} />);