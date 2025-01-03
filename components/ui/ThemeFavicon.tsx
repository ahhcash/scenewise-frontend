"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

export function ThemeFavicon() {
  const { theme } = useTheme();

  useEffect(() => {
    const favicon = document.querySelector(
      'link[rel="icon"]',
    ) as HTMLLinkElement;
    if (favicon) {
      favicon.href =
        theme === "dark" ? "/favicon-dark.svg" : "/favicon-light.svg";
    }
  }, [theme]);

  return null;
}
