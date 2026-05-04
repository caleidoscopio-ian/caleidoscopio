"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const PALETTE = [
  "#ef4444", "#f97316", "#f59e0b", "#84cc16",
  "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
  "#64748b", "#78716c", "#a3a3a3", "#1e293b",
];

interface ColorPickerProps {
  value: string | null;
  onChange: (color: string | null) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(value || "");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start gap-2"
        >
          <span
            className="h-4 w-4 rounded-full border border-border shrink-0"
            style={{ backgroundColor: value || "#e2e8f0" }}
          />
          <span className="text-sm">{value || "Selecionar cor"}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="grid grid-cols-8 gap-1 mb-3">
          {PALETTE.map((cor) => (
            <button
              key={cor}
              type="button"
              className={cn(
                "h-6 w-6 rounded-full border-2 transition-transform hover:scale-110",
                value === cor ? "border-primary scale-110" : "border-transparent"
              )}
              style={{ backgroundColor: cor }}
              onClick={() => { onChange(cor); setOpen(false); }}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="#hexcor"
            value={custom}
            maxLength={7}
            onChange={(e) => setCustom(e.target.value)}
            className="h-8 text-xs"
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => {
              if (/^#[0-9a-fA-F]{6}$/.test(custom)) {
                onChange(custom);
                setOpen(false);
              }
            }}
          >
            OK
          </Button>
        </div>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full mt-2 text-xs text-muted-foreground"
            onClick={() => { onChange(null); setOpen(false); }}
          >
            Remover cor
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
