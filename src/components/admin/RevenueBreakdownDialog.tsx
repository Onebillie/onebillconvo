import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign } from "lucide-react";

interface RevenueSource {
  businessName: string;
  tier: string;
  amount: number;
  status: string;
  isEnterprise: boolean;
}

interface RevenueBreakdownDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sources: RevenueSource[];
  totalMRR: number;
}

export default function RevenueBreakdownDialog({
  open,
  onOpenChange,
  sources,
  totalMRR
}: RevenueBreakdownDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Monthly Recurring Revenue Breakdown
          </DialogTitle>
          <DialogDescription>
            Detailed breakdown of all active subscription revenue sources
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Card className="p-4 bg-primary/5">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Total MRR</span>
              <span className="text-2xl font-bold">${totalMRR.toFixed(2)}</span>
            </div>
          </Card>

          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase">Revenue Sources</h3>
            {sources.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No active subscriptions generating revenue</p>
              </Card>
            ) : (
              sources.map((source, idx) => (
                <Card key={idx} className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{source.businessName}</p>
                        {source.isEnterprise && (
                          <Badge variant="default">Enterprise</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {source.tier}
                        </Badge>
                        <Badge 
                          variant={source.status === "active" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {source.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold">${source.amount.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">per month</p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          <Card className="p-4 bg-muted">
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active Subscriptions:</span>
                <span className="font-medium">{sources.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Average Revenue per Account:</span>
                <span className="font-medium">
                  ${sources.length > 0 ? (totalMRR / sources.length).toFixed(2) : "0.00"}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
