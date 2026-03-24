"use client";

import { useEffect } from "react";

export function WebVitals() {
  useEffect(() => {
    // Dynamic import to avoid bundling web-vitals when not needed
    import("web-vitals").then(({ onCLS, onINP, onLCP }) => {
      onCLS(sendToAnalytics);
      onINP(sendToAnalytics);
      onLCP(sendToAnalytics);
    }).catch(() => {
      // web-vitals not available — skip silently
    });
  }, []);

  return null;
}

function sendToAnalytics(metric: { name: string; value: number; id: string }) {
  // In production, send to your analytics service
  // For now, log to console in development
  if (process.env.NODE_ENV === "development") {
    console.log(`[Web Vitals] ${metric.name}: ${metric.value.toFixed(2)} (${metric.id})`);
  }

  // Future: send to analytics endpoint
  // fetch('/api/analytics', {
  //   method: 'POST',
  //   body: JSON.stringify(metric),
  // });
}
