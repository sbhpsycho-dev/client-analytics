import { type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      {Icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-800">
          <Icon className="h-6 w-6 text-zinc-400" />
        </div>
      )}
      <h3 className="text-base font-semibold text-white mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-zinc-400 max-w-sm mb-5">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick} size="sm" className="bg-violet-600 hover:bg-violet-700 text-white">
          {action.label}
        </Button>
      )}
    </div>
  );
}
