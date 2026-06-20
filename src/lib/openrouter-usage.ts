/**
 * Real OpenRouter usage snapshot — the AI runtime behind this site's assistant
 * plus experiments across many models. Exported from the OpenRouter dashboard
 * (Activity) for 2025-06-18 → 2026-06-19. Merged from two CSVs: tokens + cost.
 * Static by design — OpenRouter has no public per-day history API.
 */
export interface OrModel {
  model: string;
  tokens: number;
  cost: number;
}

// Merged per-model totals, sorted by tokens (most used first).
export const OR_MODELS: OrModel[] = [
  { model: "Owl Alpha", tokens: 47_185_000, cost: 0.01 },
  { model: "Qwen3.6 Plus", tokens: 45_287_068, cost: 1.639309 },
  { model: "Ling-2.6-1T", tokens: 38_660_131, cost: 0 },
  { model: "Hy3 preview", tokens: 35_668_610, cost: 1.197618 },
  { model: "Nemotron 3 Super", tokens: 23_909_006, cost: 0 },
  { model: "Gemini 3.1 Flash Lite Preview", tokens: 20_333_316, cost: 2.078803 },
  { model: "KAT-Coder-Pro V2", tokens: 17_877_812, cost: 2.217821 },
  { model: "DeepSeek V4 Flash", tokens: 15_105_615, cost: 0.915478 },
  { model: "Ring-2.6-1T", tokens: 15_064_233, cost: 0.554856 },
  { model: "Qwen3.6 Plus Preview", tokens: 7_031_959, cost: 0 },
  { model: "GLM 5.1", tokens: 6_029_902, cost: 4.424414 },
  { model: "Step 3.5 Flash", tokens: 2_342_112, cost: 0 },
  { model: "MiniMax M2.5", tokens: 1_836_319, cost: 0 },
  { model: "MiniMax M3", tokens: 1_564_920, cost: 0.242928 },
  { model: "Gemini 3.1 Flash Lite", tokens: 1_247_950, cost: 0.13929 },
  { model: "Qwen3 235B A22B Thinking 2507", tokens: 553_344, cost: 1.102569 },
  { model: "Qwen3 VL 235B A22B Thinking", tokens: 527_378, cost: 0.101303 },
  { model: "MiniMax M2.7", tokens: 491_936, cost: 0.148031 },
  { model: "Qwen3.6 Flash", tokens: 483_899, cost: 0.124844 },
  { model: "Laguna M.1", tokens: 268_801, cost: 0 },
  { model: "Laguna XS.2", tokens: 235_070, cost: 0 },
  { model: "gpt-oss-120b", tokens: 188_037, cost: 0 },
  { model: "Sonar", tokens: 159_262, cost: 0.70426 },
  { model: "Gemini 3 Flash Preview", tokens: 83_899, cost: 0.113586 },
  { model: "GLM 4.7 Flash", tokens: 76_744, cost: 0.017145 },
  { model: "o4 Mini Deep Research", tokens: 62_527, cost: 1.744252 },
  { model: "o3 Mini", tokens: 33_834, cost: 0.111512 },
  { model: "R1 0528", tokens: 31_813, cost: 0 },
  { model: "Kimi K2.5", tokens: 21_956, cost: 0.033449 },
  { model: "Mistral Small 3.2 24B", tokens: 21_849, cost: 0.003514 },
  { model: "Claude Sonnet 4.6", tokens: 17_736, cost: 0.073476 },
  { model: "Kimi K2.6", tokens: 16_867, cost: 0.054997 },
  { model: "Nemotron 3 Ultra", tokens: 14_204, cost: 0 },
  { model: "Nemotron 3 Nano Omni", tokens: 13_759, cost: 0 },
  { model: "Gemini 2.5 Pro", tokens: 11_296, cost: 0.110884 },
  { model: "Gemini 3.5 Flash", tokens: 7_782, cost: 0.053597 },
  { model: "Nano Banana Pro (Gemini 3 Pro Image Preview)", tokens: 3_281, cost: 0.278112 },
  { model: "Claude 3.5 Sonnet", tokens: 2_424, cost: 0.06396 },
  { model: "Llama 3.1 70B Instruct", tokens: 1_980, cost: 0.000791 },
  { model: "Mercury 2", tokens: 1_177, cost: 0.000869 },
  { model: "MiMo-V2.5", tokens: 576, cost: 0.000884 },
  { model: "Trinity Large Preview", tokens: 149, cost: 0 },
];

const totalTokens = OR_MODELS.reduce((s, m) => s + m.tokens, 0);
const totalCost = OR_MODELS.reduce((s, m) => s + m.cost, 0);

export const OPENROUTER = {
  capturedAt: "2026-06-19",
  rangeStart: "2025-06-18",
  rangeEnd: "2026-06-19",
  models: OR_MODELS.length,
  totalTokens,
  totalCost,
  topByTokens: OR_MODELS[0].model,
  costLeader: [...OR_MODELS].sort((a, b) => b.cost - a.cost)[0].model,
};
