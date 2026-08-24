import type { BookingStatus } from "@/Types/booking";
import { CheckCircle2 } from "lucide-react";

export default function BookingTimeline({
  status,
}: {
  status: BookingStatus;
}) {
  const steps = [
    { label: "Requested", done: true },
    {
      label: "Owner review",
      done: ["awaiting_payment", "confirmed", "active", "completed"].includes(status),
    },
    {
      label: "Payment",
      done: ["confirmed", "active", "completed"].includes(status),
    },
    {
      label: "Active",
      done: ["active", "completed"].includes(status),
    },
    { label: "Completed", done: status === "completed" },
  ];

  return (
    <div className="rounded-3xl border border-[#E5E7EB] bg-white p-6">
      <h2 className="text-xl font-bold">Transaction timeline</h2>

      <div className="mt-5 space-y-4">
        {steps.map((step, index) => (
          <div key={step.label} className="flex items-center gap-3">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full ${
                step.done
                  ? "bg-[#0B5D3B] text-white"
                  : "border border-[#E5E7EB] text-gray-400"
              }`}
            >
              {step.done ? <CheckCircle2 size={18} /> : index + 1}
            </div>
            <p className={`font-medium ${step.done ? "text-[#202124]" : "text-gray-500"}`}>
              {step.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
