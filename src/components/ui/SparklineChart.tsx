"use client";

import { useId, useState } from "react";

interface Point {
  date: string;
  value: number;
}

interface Props {
  points: Point[];
  min?: number;
  max?: number;
  height?: number;
  formatValue?: (v: number) => string;
}

/** Один ряд — легенда не нужна (заголовок графика её заменяет). Ховер-слой обязателен даже для маленького графика. */
export function SparklineChart({ points, min = 0, max = 10, height = 120, formatValue }: Props) {
  const gradientId = useId();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (points.length === 0) {
    return <p className="text-sm text-foreground-muted py-8 text-center">Пока нет данных</p>;
  }

  const width = 100; // viewBox units, масштабируется через preserveAspectRatio
  const padY = 8;
  const usableHeight = height - padY * 2;

  const xStep = points.length > 1 ? width / (points.length - 1) : 0;
  const valueToY = (v: number) => padY + usableHeight - ((v - min) / (max - min || 1)) * usableHeight;

  const coords = points.map((p, i) => ({ x: points.length > 1 ? i * xStep : width / 2, y: valueToY(p.value), ...p }));
  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");
  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${height - padY} L ${coords[0].x} ${height - padY} Z`;

  const hovered = hoverIndex !== null ? coords[hoverIndex] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height }}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>

        <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
        <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />

        {coords.map((c, i) => (
          <circle
            key={i}
            cx={c.x}
            cy={c.y}
            r={i === hoverIndex ? 3.5 : 2.5}
            fill="var(--surface)"
            stroke="var(--accent)"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {coords.map((c, i) => (
          <rect
            key={`hit-${i}`}
            x={c.x - width / Math.max(points.length, 1) / 2}
            y={0}
            width={width / Math.max(points.length, 1)}
            height={height}
            fill="transparent"
            onMouseEnter={() => setHoverIndex(i)}
          />
        ))}
      </svg>

      {hovered && (
        <div
          className="absolute -translate-x-1/2 -translate-y-full pointer-events-none bg-surface border border-border rounded-lg px-2 py-1 text-xs shadow-md whitespace-nowrap"
          style={{ left: `${(hovered.x / width) * 100}%`, top: `${((hovered.y - 6) / height) * 100}%` }}
        >
          <span className="font-medium">{formatValue ? formatValue(hovered.value) : hovered.value}</span>
          <span className="text-foreground-muted ml-1">{hovered.date}</span>
        </div>
      )}
    </div>
  );
}
