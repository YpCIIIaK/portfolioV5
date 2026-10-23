"use client";

import { useEffect } from "react";

/**
 * Opens the English part straight away for visitors who use the site in English
 * (or whose browser isn't set to Russian/Kazakh and who never picked a language).
 */
export function LangJump() {
  useEffect(() => {
    if (location.hash) return;
    let stored: string | null = null;
    try {
      stored = localStorage.getItem("portfolio-lang");
    } catch {
      /* storage blocked */
    }
    const english = stored ? stored === "en" : !/^(ru|kk|uk|be)/i.test(navigator.language);
    if (english) document.getElementById("en")?.scrollIntoView();
  }, []);
  return null;
}
