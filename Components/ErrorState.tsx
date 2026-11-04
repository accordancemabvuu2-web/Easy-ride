import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";

interface ErrorStateProps {
  title?: string;
  description: string;
  action?: ReactNode;
}

export default function ErrorState({
  title = "Something went wrong",
  description,
  action,
}: ErrorStateProps) {
  return (
    <div role="alert" className="rounded-3xl border border-red-200 bg-red-50 px-6 py-12 text-center text-red-950">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-700">
        <AlertTriangle />
      </div>
      <h3 className="mt-5 text-xl font-bold">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-red-800/80">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
