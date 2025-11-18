"use client";
import React from "react";

type ToastProps = {
  message: string;
  type?: "success" | "error" | "info";
  onClose?: () => void;
  position?: "bottom-left" | "bottom-right" | "top-right" | "top-left";
};

const positionClass = (pos: ToastProps["position"]) => {
  switch (pos) {
    case "bottom-right":
      return "fixed bottom-4 right-4";
    case "top-right":
      return "fixed top-4 right-4";
    case "top-left":
      return "fixed top-4 left-4";
    case "bottom-left":
    default:
      return "fixed bottom-4 left-4";
  }
};

export function Toast({ message, type = "info", onClose, position = "bottom-left" }: ToastProps) {
  const bg = type === "error" ? "bg-red-600" : type === "success" ? "bg-green-600" : "bg-slate-700";
  return (
    <div className={`${positionClass(position)} z-50`}> 
      <div className={`px-3 py-2 rounded shadow text-white ${bg} flex items-center gap-3`}> 
        <span className="text-sm">{message}</span>
        {onClose && (
          <button className="text-white/80 hover:text-white text-xs" onClick={onClose}>Fechar</button>
        )}
      </div>
    </div>
  );
}

export default Toast;