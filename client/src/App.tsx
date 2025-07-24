import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import NotFound from "@/pages/not-found";
import { ChatInterface } from "./components/chatbot/chat-interface";
import EntabSupportDashboard from "@/pages/entab-support-dashboard";
import LoginPage from "@/pages/login";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={LoginPage} />
      <Route path="/entab-support" component={() => {
        if (typeof window !== 'undefined' && localStorage.getItem('entab-support-auth') !== 'true') {
          window.location.href = '/login';
          return null;
        }
        return <EntabSupportDashboard />;
      }} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
