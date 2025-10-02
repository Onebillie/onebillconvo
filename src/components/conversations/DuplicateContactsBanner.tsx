import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { MergeConversationsDialog } from "./MergeConversationsDialog";
import { useDuplicateDetection } from "@/hooks/useDuplicateDetection";

export const DuplicateContactsBanner = () => {
  const { duplicates, loading, refresh } = useDuplicateDetection();
  const [selectedDuplicateIndex, setSelectedDuplicateIndex] = useState<number | null>(null);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);

  if (loading || duplicates.length === 0) {
    return null;
  }

  const handleMerge = (index: number) => {
    setSelectedDuplicateIndex(index);
    setMergeDialogOpen(true);
  };

  const selectedDuplicate = selectedDuplicateIndex !== null ? duplicates[selectedDuplicateIndex] : null;

  return (
    <>
      <div className="space-y-2 mb-4">
        {duplicates.map((duplicate, index) => (
          <Alert key={index} variant="default" className="border-warning bg-warning/10">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertTitle>Duplicate Contacts Detected</AlertTitle>
            <AlertDescription className="mt-2 flex items-center justify-between">
              <span>
                {duplicate.customers.length} contacts found with matching {duplicate.matchType}:{" "}
                <strong>{duplicate.matchValue}</strong>
                {" "}({duplicate.conversations.length} total conversations)
              </span>
              <Button size="sm" onClick={() => handleMerge(index)}>
                Review & Merge
              </Button>
            </AlertDescription>
          </Alert>
        ))}
      </div>

      {selectedDuplicate && (
        <MergeConversationsDialog
          open={mergeDialogOpen}
          onOpenChange={setMergeDialogOpen}
          duplicateCustomers={selectedDuplicate.customers}
          conversations={selectedDuplicate.conversations}
          onMergeComplete={() => {
            refresh();
            setSelectedDuplicateIndex(null);
          }}
        />
      )}
    </>
  );
};