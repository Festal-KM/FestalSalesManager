import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  eyebrow,
  description,
  backHref,
  children,
}: {
  title: string;
  /** 英語の小見出し（例: DASHBOARD）。JPタイトルと併記する */
  eyebrow?: string;
  description?: string;
  backHref?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="flex items-center gap-3">
        {backHref && (
          <Link
            href={backHref}
            className={cn(buttonVariants({ variant: "back", size: "icon" }))}
            aria-label="戻る"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
        )}
        <div>
          {eyebrow && <div className="eyebrow mb-1.5 text-brand">{eyebrow}</div>}
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-fg">{description}</p>}
        </div>
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
