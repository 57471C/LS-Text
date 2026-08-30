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
        axis === "x"
          ? "w-px shrink-0 cursor-col-resize bg-border hover:bg-accent"
          : "h-px shrink-0 cursor-row-resize bg-border hover:bg-accent",
        className,
      )}
      onPointerDown={(e) => {
        dragging.current = true;
        last.current = axis === "x" ? e.clientX : e.clientY;
        e.preventDefault();
      }}
    />
  );
}
