"use client";

import { useEffect, useState } from "react";
import { IDE } from "./IDE";
import { Showcase } from "./v6/Showcase";
import { DesignPrompt } from "./v6/DesignPrompt";
import { Splash } from "./Splash";
import { VisitTracker } from "./VisitTracker";
import { SessionRecorder } from "./SessionRecorder";
import { ReplayReceiver } from "./ReplayReceiver";
import { PrivacyBanner } from "./PrivacyBanner";
import { setDesign, useDesign } from "@/lib/design";
import { isReplayMode } from "@/lib/replay";
import { useEditor } from "@/lib/store";

/**
 * Picks the look: the VS Code IDE (default, also during SSR and in the replay player)
 * or the 6.0 showcase. First-time visitors get a prompt after the splash.
 */
export function DesignRoot({ initialFile }: { initialFile?: string }) {
  const design = useDesign();
  const replay = typeof window !== "undefined" && isReplayMode();
  const [splashDone, setSplashDone] = useState(false);
  const hydrateSettings = useEditor((s) => s.hydrateSettings);

  useEffect(() => {
    hydrateSettings();
  }, [hydrateSettings]);

  const showV6 = design === "v6";

  // Effects run in render order: the URL readers must come before the IDE, which rewrites the URL.
  return (
    <>
      <DesignParam />
      <VisitTracker />
      <SessionRecorder />
      <ReplayReceiver />
      {showV6 ? <Showcase /> : <IDE initialFile={initialFile} />}
      <Splash onDone={() => setSplashDone(true)} />
      {design === null && !replay && splashDone && <DesignPrompt />}
      <PrivacyBanner />
    </>
  );
}

/** ?design=v6 / ?design=ide in a link picks the look up front (e.g. for a design-minded reader). */
function DesignParam() {
  useEffect(() => {
    const want = new URLSearchParams(location.search).get("design");
    if (want === "v6" || want === "ide") setDesign(want);
  }, []);
  return null;
}
