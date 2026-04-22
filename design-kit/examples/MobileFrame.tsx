import type { ReactNode } from 'react';
import { cn } from '../utils/cn';

export interface MobileFrameProps {
  children: ReactNode;
  className?: string;
  /** Width/height in px; defaults to the iPhone 14-ish viewport 390×844. */
  width?: number;
  height?: number;
}

/**
 * A pure viewport wrapper — NOT a device frame. No notch, no status bar, no
 * rounded phone bezel implied; this is just a scroll container the size of a
 * mobile viewport so playground screens render at their intended dimensions.
 */
export function MobileFrame({ children, className, width = 390, height = 844 }: MobileFrameProps) {
  return (
    <div
      className={cn(
        'relative mx-auto my-8 overflow-hidden rounded-[40px] bg-canvas shadow-soft',
        className
      )}
      style={{ width, height }}
    >
      <div className="relative h-full w-full overflow-y-auto">{children}</div>
    </div>
  );
}
