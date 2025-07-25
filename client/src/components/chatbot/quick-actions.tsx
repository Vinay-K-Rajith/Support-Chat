import { FileText, FileSpreadsheet, AlertCircle, Users, ReceiptText, BadgeCheck, RefreshCcw, ListOrdered, FileCheck2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuickActionsProps {
  onQuickAction: (query: string) => void;
}

const quickActions = [
  {
    id: "fee-not-reflecting",
    label: "Fee Not Reflecting",
    icon: AlertCircle,
    query: "Parent has posted fee but not reflecting in ERP.",
  },
  {
    id: "concession-new-student",
    label: "Concession for New Student",
    icon: BadgeCheck,
    query: "Concession for New Students",
  },
  {
    id: "fine-setting",
    label: "Fine Setting",
    icon: RefreshCcw,
    query: "How to do fine setting?",
  },
  {
    id: "defaulter-installment",
    label: "Defaulter Data (Installment)",
    icon: ListOrdered,
    query: "How to check defaulter data of instalment wise?",
  },
  {
    id: "online-payment-enable",
    label: "Enable Online Payment",
    icon: FileCheck2,
    query: "How can we enable online payment for parent?",
  },
  {
    id: "late-fine-waive",
    label: "Waive Late Fine (New Student)",
    icon: BadgeCheck,
    query: "How can we waive off late fine for new student?",
  },
  {
    id: "transfer-fee-setting",
    label: "Transfer Fee Setting",
    icon: RefreshCcw,
    query: "How can we transfer this year fee setting in next upcoming academic session?",
  },
  {
    id: "concession-entry",
    label: "Concession Entry",
    icon: BadgeCheck,
    query: "How to do the concession entry",
  },
  {
    id: "fee-not-posted",
    label: "Fee Not Posted",
    icon: AlertCircle,
    query: "Fee is not posted in the system against the student",
  },
  {
    id: "receipt-not-printing",
    label: "Receipt Not Printing",
    icon: FileText,
    query: "In the Parent Portal, the fee receipt is not printing.",
  },
];

export function QuickActions({ onQuickAction }: QuickActionsProps) {
  return (
    <div className="p-2 bg-school-light border-b">
      <p className="text-sm text-school-deep mb-2 font-medium">
        Quick Actions:
      </p>
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
