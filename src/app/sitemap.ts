import type { MetadataRoute } from "next";
import { allFiles, DEFAULT_OPEN } from "@/lib/files";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ypciiiak.online";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const files = allFiles
    .filter((f) => !f.id.startsWith("workspace/") && f.id !== DEFAULT_OPEN)
    .map((f) => ({
      url: `${SITE_URL}/?file=${encodeURIComponent(f.id)}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));
  return [
    { url: SITE_URL, lastModified: now, changeFrequency: "weekly", priority: 1 },
    ...files,
  ];
}
