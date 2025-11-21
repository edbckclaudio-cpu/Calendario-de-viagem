"use client";
import * as React from "react";
import { DayPicker, DateRange } from "react-day-picker";
import "react-day-picker/dist/style.css";

export function Calendar({
  value,
  onChange,
  disabled,
  defaultMonth,
  mode = "single",
  rangeValue,
  onRangeChange,
  modifiers,
  styles,
  modifiersStyles,
  fromMonth,
  toMonth,
}: {
  value?: Date;
  onChange?: (d?: Date) => void;
  disabled?: any;
  defaultMonth?: Date;
  mode?: "single" | "range";
  rangeValue?: DateRange;
  onRangeChange?: (r?: DateRange) => void;
  modifiers?: any;
  styles?: any;
  modifiersStyles?: any;
  fromMonth?: Date;
  toMonth?: Date;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-2 max-w-full overflow-x-auto">
      <DayPicker
        mode={mode}
        selected={mode === "range" ? (rangeValue as any) : (value as any)}
        onSelect={(d: any) => {
          if (mode === "range") onRangeChange?.(d || undefined);
          else onChange?.(d ?? undefined);
        }}
        disabled={disabled}
        defaultMonth={defaultMonth}
        fromMonth={fromMonth}
        toMonth={toMonth}
        styles={{
          caption: { color: "#0f172a" },
          ...styles,
        }}
        modifiers={modifiers}
        modifiersStyles={modifiersStyles}
      />
    </div>
  );
}