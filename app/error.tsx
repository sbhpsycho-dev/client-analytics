"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="text-center space-y-4 max-w-md px-6">
        <p className="text-sm font-medium text-red-400">Something went wrong</p>
        <p className="text-xs text-zinc-500">{error.message || "An unexpected error occurred."}</p>
        <Button
          onClick={reset}
          variant="outline"
          size="sm"
          className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
        >
          Try again
        </Button>
      </div>
    </div>
  );
}
