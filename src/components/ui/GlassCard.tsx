import { type ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
}

/**
 * GlassCard — Glass-like card component with blur and subtle border
 * Following PulsePlan design spec: glass panels, dark backgrounds
 */
export function GlassCard({ children, className = '' }: GlassCardProps) {
  return (
    <div className={`glass-card p-4 ${className}`}>
      {children}
    </div>
  );
}
