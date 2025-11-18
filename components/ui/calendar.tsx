"use client";
import * as React from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

export function Calendar({ value, onChange, disabled }: { value?: Date; onChange?: (d?: Date) => void; disabled?: any }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-2">
      <DayPicker
        mode="single"
        selected={value}
        onSelect={(d) => onChange?.(d ?? undefined)}
        disabled={disabled}
        styles={{
          caption: { color: "#0f172a" },
        }}
      />
    </div>
  );
}