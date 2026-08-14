import { RiCheckboxCircleLine, RiErrorWarningLine } from "@remixicon/react";
import type { ReactNode } from "react";

export function Alert({
  tone = "danger",
  children,
}: {
  tone?: "danger" | "success";
  children: ReactNode;
}) {
  const Icon = tone === "success" ? RiCheckboxCircleLine : RiErrorWarningLine;
  return (
    <div
      className={
        tone === "success"
          ? "flex gap-2.5 rounded-[10px] border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
          : "flex gap-2.5 rounded-[10px] border border-red-200 bg-red-50 p-3 text-sm text-red-800"
      }
      role={tone === "success" ? "status" : "alert"}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
