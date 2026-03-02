import React from 'react';
import { cn } from '../../utils/cn';

export default function Skeleton({ width, height, className = '' }) {
  return (
    <div
      className={cn('bg-dark-soft animate-pulse', className)}
      style={{ width, height }}
    />
  );
}
