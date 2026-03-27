/**
 * marquee.tsx
 * ============
 * Simple CSS-based scrolling marquee component.
 */

import React from "react";
import { cn } from "@/lib/utils";

interface MarqueeProps {
  children: React.ReactNode;
  className?: string;
  speed?: number; // duration in seconds
}

export function Marquee({ children, className, speed = 20 }: MarqueeProps) {
  return (
    <div className={cn("overflow-hidden whitespace-nowrap", className)}>
      <div 
        className="inline-block animate-marquee" 
        style={{ animationDuration: `${speed}s` }}
      >
        <div className="flex gap-8 px-4">
          {children}
          {/* Double children for seamless loop */}
          {children}
        </div>
      </div>
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee linear infinite;
        }
      `}</style>
    </div>
  );
}
