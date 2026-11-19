import React, { useMemo } from "react";
import katex from "katex";

export default function MathBlock({ latex, displayMode = false, className = "" }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(latex || "", {
        throwOnError: false,
        displayMode,
      });
    } catch {
      return latex;
    }
  }, [latex, displayMode]);

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}