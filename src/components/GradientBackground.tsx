import React from "react";

/**
 * Fixed, masked gradient background with optional noise overlay.
 * Place once near the root of your app layout.
 */
export function GradientBackground() {
  return (
    <>
      <div className="gradient-bg" aria-hidden="true" />
      <div className="gradient-noise" aria-hidden="true" />
    </>
  );
}

export default GradientBackground;
