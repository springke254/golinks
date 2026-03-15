import React, { useMemo } from 'react';
import { cn } from '../../utils/cn';

const WIDTH = 96;
const HEIGHT = 26;
const PADDING_X = 3;
const PADDING_Y = 3;

export default function LinkSparkline({ points = [], loading = false, className = '' }) {
  const pathData = useMemo(() => {
    if (!points.length) return null;

    const values = points.map((point) => Number(point.clicks ?? 0));
    const max = Math.max(...values, 1);
    const step = values.length > 1 ? (WIDTH - PADDING_X * 2) / (values.length - 1) : 0;

    const line = values
      .map((value, index) => {
        const x = PADDING_X + step * index;
        const normalized = value / max;
        const y = HEIGHT - PADDING_Y - normalized * (HEIGHT - PADDING_Y * 2);
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ');

    const lastIndex = values.length - 1;
    const lastX = PADDING_X + step * Math.max(lastIndex, 0);
    const lastY =
      HEIGHT -
      PADDING_Y -
      (values[lastIndex] / max) * (HEIGHT - PADDING_Y * 2);

    return {
      line,
      lastX,
      lastY,
      hasMovement: values.some((value) => value > 0),
    };
  }, [points]);

  if (loading && !pathData) {
    return <div className={cn('h-[26px] w-24 bg-dark-soft animate-pulse', className)} />;
  }

  if (!pathData || !pathData.hasMovement) {
    return (
      <div
        className={cn(
          'h-[26px] w-24 border border-border-strong bg-dark-elevated text-[10px] text-text-muted flex items-center justify-center',
          className
        )}
      >
        No trend
      </div>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className={cn('w-24 h-[26px] text-primary', className)}
      role="img"
      aria-label="Link click trend"
    >
      <polyline
        points={pathData.line}
        fill="none"
        stroke="#1DB954"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={pathData.lastX} cy={pathData.lastY} r="2" fill="#1DB954" />
    </svg>
  );
}
