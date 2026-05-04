"use client";

import { useState } from "react";
import * as LucideIcons from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { LucideProps } from "lucide-react";

const ICON_OPTIONS = [
  "Activity", "Heart", "Brain", "Stethoscope", "Clipboard",
  "ClipboardList", "BookOpen", "Mic", "Music", "Dumbbell",
  "Apple", "Pill", "Syringe", "Thermometer", "Eye",
  "Ear", "Hand", "Baby", "User", "Users",
  "Star", "Sparkles", "Smile", "Zap", "Target",
  "Award", "CheckCircle", "PlayCircle", "Timer", "Calendar",
] as const;

type IconName = typeof ICON_OPTIONS[number];

interface IconPickerProps {
  value: string | null;
  onChange: (icon: string | null) => void;
}

function DynamicIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<LucideProps>>)[name];
  return Icon ? <Icon {...props} /> : null;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = ICON_OPTIONS.filter((name) =>
    name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="w-full justify-start gap-2">
          {value ? (
            <>
              <DynamicIcon name={value} className="h-4 w-4 shrink-0" />
              <span className="text-sm">{value}</span>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">Selecionar ícone</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <Input
          placeholder="Buscar ícone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-xs mb-2"
        />
        <div className="grid grid-cols-6 gap-1 max-h-40 overflow-y-auto">
          {filtered.map((name) => (
            <button
              key={name}
              type="button"
              title={name}
              className={cn(
                "flex items-center justify-center h-8 w-8 rounded border transition-colors hover:bg-accent",
                value === name ? "bg-primary/10 border-primary" : "border-transparent"
              )}
              onClick={() => { onChange(name as IconName); setOpen(false); }}
            >
              <DynamicIcon name={name} className="h-4 w-4" />
            </button>
          ))}
        </div>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full mt-2 text-xs text-muted-foreground"
            onClick={() => { onChange(null); setOpen(false); }}
          >
            Remover ícone
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
