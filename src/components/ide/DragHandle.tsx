import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export function DragHandle({
  axis,
  onDrag,
  className,
}: {
  axis: "x" | "y";
  onDrag: (delta: number) => void;
  className?: string;
}) {
  const dragging = useRef(false);
  const last = useRef(0);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (!dragging.current) return;
      const pos = axis === "x" ? e.clientX : e.clientY;
      onDrag(pos - last.current);
      last.current = pos;
    };
    const up = () => {
      dragging.current = false;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [axis, onDrag]);

  return (
    <div
      role="separator"
      aria-orientation={axis === "x" ? "vertical" : "horizontal"}
      className={cn(
        "relative z-10 shrink-0 touch-none",
        axis === "x"
          ? "w-3 -mx-1 cursor-col-resize"
          : "h-3 -my-1 cursor-row-resize",
        className,
      )}
      onPointerDown={(e) => {
        dragging.current = true;
        last.current = axis === "x" ? e.clientX : e.clientY;
        e.preventDefault();
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }}
    >
      <span
        className={cn(
          "pointer-events-none absolute bg-border",
          axis === "x"
            ? "inset-y-0 left-1/2 w-px -translate-x-1/2"
            : "inset-x-0 top-1/2 h-px -translate-y-1/2",
        )}
      />
    </div>
  );
}
