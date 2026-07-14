import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormSectionProps {
  /** Icon shown in the highlighted badge to the left of the title. */
  icon: LucideIcon;
  /** Section title, e.g. "Firm & Owner Details". */
  title: string;
  /** Optional one-line helper text under the title. */
  description?: string;
  /** Extra classes for the wrapper (grid span is applied by default). */
  className?: string;
}

/**
 * Section heading for the create/edit forms — a brand-tinted icon badge next to
 * the title, with an accent divider so each part of the form reads as a distinct
 * block. Spans the full form grid.
 */
export function FormSection({
  icon: Icon,
  title,
  description,
  className,
}: FormSectionProps) {
  return (
    <div className={cn("col-span-full mt-6", className)}>
      <div className="flex items-center gap-3 border-b-2 border-primary/30 pb-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
          <Icon className="size-5" />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
}
