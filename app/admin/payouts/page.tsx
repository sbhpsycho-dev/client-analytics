import { DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function Page() {
  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-orange-500" />
          Payouts
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">Rep commission payouts, take-home calculations, and payout history.</p>
      </div>
      <Card className="bg-card border-border">
        <CardContent className="py-16 text-center">
          <DollarSign className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Coming soon</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Rep commission payouts, take-home calculations, and payout history.</p>
        </CardContent>
      </Card>
    </div>
  );
}
