import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MONTH_NAMES } from "@/lib/monthRange";

interface MonthSelectorProps {
  value: number;
  onChange: (monthIndex: number) => void;
  className?: string;
}

/** Dropdown to pick a month (0-11). Defaults visually to current month when value matches. */
export function MonthSelector({ value, onChange, className }: MonthSelectorProps) {
  return (
    <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger className={className ?? "h-9 w-[140px]"}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {MONTH_NAMES.map((name, idx) => (
          <SelectItem key={name} value={String(idx)}>{name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
