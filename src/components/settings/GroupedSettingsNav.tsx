import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Users,
  Mail,
  CreditCard,
  MessageSquare,
  Tags,
  CheckSquare,
  Building2,
  Calendar,
  Bot,
  MessageCircle,
  Shield,
  Bell,
  Key,
  Palette,
  Package,
  LucideIcon,
} from "lucide-react";

interface TabGroup {
  label: string;
  tabs: {
    value: string;
    label: string;
    icon: LucideIcon;
  }[];
}

interface GroupedSettingsNavProps {
  activeTab: string;
  onTabChange: (value: string) => void;
  isSuperAdmin: boolean;
}

export function GroupedSettingsNav({ activeTab, onTabChange, isSuperAdmin }: GroupedSettingsNavProps) {
  const tabGroups: TabGroup[] = [
    {
      label: "Account & Billing",
      tabs: [
        { value: "subscription", label: "Subscription", icon: CreditCard },
        { value: "inmail", label: "In-Mail", icon: Mail },
      ],
    },
    {
      label: "Communication",
      tabs: [
        { value: "channels", label: "Channels", icon: MessageSquare },
        { value: "webhooks", label: "Webhooks", icon: Key },
        { value: "canned", label: "Quick Replies", icon: MessageCircle },
        { value: "statuses", label: "Statuses", icon: Tags },
        { value: "message-categories", label: "Message Categories", icon: Package },
        { value: "tasks", label: "Tasks", icon: CheckSquare },
      ],
    },
    {
      label: "Marketing",
      tabs: [
        { value: "customer-segments", label: "Customer Segments", icon: Users },
      ],
    },
    {
      label: "Automation & AI",
      tabs: [
        { value: "ai", label: "AI Assistant", icon: Bot },
        { value: "ai-approval", label: "AI Approval", icon: Shield },
      ],
    },
    {
      label: "Workflow",
      tabs: [
        { value: "tasks", label: "Tasks", icon: CheckSquare },
        { value: "calendar", label: "Calendar", icon: Calendar },
      ],
    },
    {
      label: "Business",
      tabs: [
        { value: "business", label: "Business Info", icon: Building2 },
        ...(isSuperAdmin ? [{ value: "staff", label: "Staff & Teams", icon: Users }] : []),
      ],
    },
    {
      label: "Customization",
      tabs: [
        { value: "theme", label: "Theme Colors", icon: Palette },
        { value: "notifications", label: "Notifications", icon: Bell },
      ],
    },
    ...(isSuperAdmin
      ? [
          {
            label: "Advanced",
            tabs: [{ value: "api", label: "API Access", icon: Key }],
          },
        ]
      : []),
  ];

  return (
    <ScrollArea className="h-[calc(100vh-8rem)]">
      <nav className="space-y-6 pr-4">
        {tabGroups.map((group, idx) => (
          <div key={group.label}>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">
              {group.label}
            </h3>
            <div className="space-y-1">
              {group.tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.value;
                return (
                  <Button
                    key={tab.value}
                    variant="ghost"
                    onClick={() => onTabChange(tab.value)}
                    className={cn(
                      "w-full justify-start gap-3 h-10 px-3",
                      isActive && "bg-accent text-accent-foreground font-medium"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{tab.label}</span>
                  </Button>
                );
              })}
            </div>
            {idx < tabGroups.length - 1 && <Separator className="mt-4" />}
          </div>
        ))}
      </nav>
    </ScrollArea>
  );
}
