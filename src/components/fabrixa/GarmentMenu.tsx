// Garment picker with nested Women / Men / Unisex submenus.
// Used in both the desktop top-bar and the mobile bar so the picker
// stays consistent across viewports.

import { ChevronDown, Shirt } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type GarmentTypeId, type GarmentType } from "@/lib/fabrixa/garments";
import { usePlanGarments } from "@/lib/fabrixa/planAccess";
import { toast } from "sonner";
import { openSubscriptionDialog } from "@/components/fabrixa/SubscriptionRequiredDialog";

interface Props {
  value: GarmentTypeId;
  onChange: (id: GarmentTypeId) => void;
  className?: string;
  /** Show full label on the trigger button (defaults true on >= sm). */
  compact?: boolean;
  mobile?: boolean;
}

const GROUPS: Array<{ id: "women" | "men" | "unisex"; label: string; emoji: string }> = [
  { id: "women", label: "Women", emoji: "👩" },
  { id: "men", label: "Men", emoji: "👨" },
  { id: "unisex", label: "Unisex", emoji: "🧑" },
];

export function GarmentMenu({ value, onChange, className, compact, mobile }: Props) {
  const planGarments = usePlanGarments();
  const itemsForGender = (g: "women" | "men" | "unisex") =>
    planGarments.filter((x) => x.gender === g);

  const pick = (id: GarmentTypeId) => {
    if (!planGarments.some((g) => g.id === id)) {
      toast.error("This garment requires a higher plan.");
      openSubscriptionDialog("APPLY_TO_MODEL");
      return;
    }
    onChange(id);
  };

  const current = planGarments.find((g) => g.id === value) ?? planGarments[0];
  if (!current) {
    return (
      <Button variant="outline" size="sm" disabled className={className}>
        No garments on plan
      </Button>
    );
  }

  if (mobile) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={
              "h-10 justify-between gap-2 px-3 font-medium " + (className ?? "")
            }
          >
            <span className="flex min-w-0 items-center gap-1.5 truncate">
              <Shirt className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="truncate">{current.emoji} {current.label}</span>
            </span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" side="bottom" sideOffset={8} className="w-[calc(100vw-1.5rem)] max-h-[70vh] overflow-y-auto">
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Choose a garment
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {GROUPS.map((grp) => {
            const items = itemsForGender(grp.id);
            if (items.length === 0) return null;
            return (
              <div key={grp.id} className="py-1">
                <div className="px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {grp.emoji} {grp.label}
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {items.map((g) => (
                    <DropdownMenuItem
                      key={g.id}
                      onSelect={() => pick(g.id)}
                      className={
                        "min-h-10 gap-2 rounded-md " +
                        (value === g.id ? "bg-primary/10 font-medium text-primary" : "")
                      }
                    >
                      <span className="text-base leading-none">{g.emoji}</span>
                      <span className="truncate">{g.label}</span>
                    </DropdownMenuItem>
                  ))}
                </div>
              </div>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={
            "h-9 justify-between gap-2 px-3 font-medium " + (className ?? "")
          }
        >
          <span className="flex items-center gap-1.5 truncate">
            <Shirt className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="truncate">
              {current.emoji} {compact ? current.label : `${current.label}`}
            </span>
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Choose a garment
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {GROUPS.map((grp) => {
          const items = itemsForGender(grp.id);
          if (items.length === 0) return null;
          return (
            <DropdownMenuSub key={grp.id}>
              <DropdownMenuSubTrigger className="gap-2">
                <span className="text-base leading-none">{grp.emoji}</span>
                <span>{grp.label}</span>
                <span className="ml-auto text-[10px] text-muted-foreground">
                  {items.length}
                </span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-52 max-h-[60vh] overflow-y-auto">
                {items.map((g) => (
                  <DropdownMenuItem
                    key={g.id}
                    onSelect={() => pick(g.id)}
                    className={
                      "gap-2 " +
                      (value === g.id ? "bg-primary/10 font-medium text-primary" : "")
                    }
                  >
                    <span className="text-base leading-none">{g.emoji}</span>
                    <span>{g.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
