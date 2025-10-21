import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { InMailInbox } from "./InMailInbox";

interface InMailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const InMailSheet = ({ open, onOpenChange }: InMailSheetProps) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-4xl p-0">
        <SheetHeader className="p-6 pb-4 border-b">
          <SheetTitle>Internal Messages</SheetTitle>
        </SheetHeader>
        <div className="p-6 overflow-y-auto h-[calc(100vh-80px)]">
          <InMailInbox />
        </div>
      </SheetContent>
    </Sheet>
  );
};
