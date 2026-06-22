"use client";

import { CSSProperties, ReactNode, useEffect, useRef } from "react";

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  style?: CSSProperties;
  as?: "div" | "section" | "article" | "li";
}

export function FadeIn({ children, delay = 0, y = 24, className = "", style, as: Tag = "div" }: FadeInProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.opacity = "1";
          el.style.transform = "translateY(0)";
          observer.unobserve(el);
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -32px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as never}
      className={className}
      style={{
        opacity: 0,
        transform: `translateY(${y}px)`,
        transition: `opacity 0.72s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform 0.72s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}
