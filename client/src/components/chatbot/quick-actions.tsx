import { GraduationCap, DollarSign, FileText, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuickActionsProps {
  onQuickAction: (query: string) => void;
}

const quickActions = [
  {
    id: "admissions",
    label: "Admissions",
    icon: GraduationCap,
    query: "Tell me about admissions for 2025-2026",
  },
  {
    id: "fees",
    label: "Fee Structure",
    icon: DollarSign,
    query: "What is the fee structure?",
  },
  {
    id: "documents",
    label: "Documents",
    icon: FileText,
    query: "What documents are required for admission?",
  },
  {
    id: "contact",
    label: "Contact Info",
    icon: Phone,
    query: "How can I contact the school?",
  },
];

export function QuickActions({ onQuickAction }: QuickActionsProps) {
  return (
    <div className="p-4 bg-school-light border-b">
      <p className="text-sm text-school-deep mb-3 font-medium">Quick Actions:</p>
      <div className="grid grid-cols-2 gap-2">
        {quickActions.map((action) => {
          const IconComponent = action.icon;
          return (
            <Button
              key={action.id}
              onClick={() => onQuickAction(action.query)}
              variant="outline"
              size="sm"
              className="bg-white border-school-blue text-school-blue px-3 py-2 text-xs hover:bg-school-blue hover:text-white transition-colors"
            >
              <IconComponent className="w-3 h-3 mr-1" />
              {action.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
