/**
 * Real snapshot of Claude Code usage while building this portfolio.
 * Exported with `npx ccusage daily --json` on 2026-06-19.
 * Vercel can't read local ~/.claude logs, so the numbers are baked in here.
 */
export interface CcDay {
  date: string;
  cost: number;
  tokens: number;
}

export const CCUSAGE = {
  capturedAt: "2026-06-19",
  rangeStart: "2026-06-02",
  rangeEnd: "2026-06-19",
  days: 18,
  totalCost: 728.64,
  inputTokens: 2_771_979,
  outputTokens: 5_242_803,
  cacheCreateTokens: 18_379_983,
  cacheReadTokens: 822_548_269,
  totalTokens: 848_943_034,
  models: ["claude-opus-4-8", "claude-sonnet-4-6", "claude-fable-5"],
  primaryModel: "Claude Opus 4.8",
  peakDay: "2026-06-03",
  daily: [
    { date: "2026-06-02", cost: 8.85, tokens: 7_887_488 },
    { date: "2026-06-03", cost: 91.6, tokens: 92_498_899 },
    { date: "2026-06-04", cost: 77.64, tokens: 117_643_436 },
    { date: "2026-06-05", cost: 57.1, tokens: 73_602_583 },
    { date: "2026-06-06", cost: 5.62, tokens: 14_353_209 },
    { date: "2026-06-07", cost: 67.54, tokens: 75_445_559 },
    { date: "2026-06-08", cost: 10.32, tokens: 9_365_268 },
    { date: "2026-06-09", cost: 48.17, tokens: 63_074_003 },
    { date: "2026-06-10", cost: 30.74, tokens: 39_400_106 },
    { date: "2026-06-11", cost: 65.04, tokens: 73_587_063 },
    { date: "2026-06-12", cost: 76.17, tokens: 63_994_030 },
    { date: "2026-06-13", cost: 34.37, tokens: 43_738_152 },
    { date: "2026-06-14", cost: 28.62, tokens: 33_581_704 },
    { date: "2026-06-15", cost: 45.17, tokens: 61_606_630 },
    { date: "2026-06-16", cost: 27.77, tokens: 27_935_430 },
    { date: "2026-06-17", cost: 13.07, tokens: 15_801_406 },
    { date: "2026-06-18", cost: 2.56, tokens: 1_019_338 },
    { date: "2026-06-19", cost: 38.29, tokens: 34_408_730 },
  ] as CcDay[],
};
