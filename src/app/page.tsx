import type { Metadata } from "next";
import { IDE } from "@/components/IDE";
import { fileById, fileTitle, fileSummary } from "@/lib/files";

type SearchParams = Promise<{ file?: string | string[] }>;

/** Validate the ?file= param against the real file tree. */
function pickFile(raw?: string | string[]): string | null {
  const id = Array.isArray(raw) ? raw[0] : raw;
  return id && fileById(id) ? id : null;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const id = pickFile((await searchParams).file);
  if (!id) return {};

  const title = `${fileTitle(id)} · Vladimir`;
  const description = fileSummary(id) || "Портфолио Владимира — fullstack-разработчик.";
  const og = `/api/og?file=${encodeURIComponent(id)}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      url: `/?file=${encodeURIComponent(id)}`,
      siteName: "Vladimir · Portfolio",
      images: [{ url: og, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [og] },
  };
}

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const id = pickFile((await searchParams).file);
  return <IDE initialFile={id ?? undefined} />;
}
