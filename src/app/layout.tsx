import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ypciiiak.online";
const DESC =
  "Владимир — Frontend / Full-Stack Developer. React, TypeScript, Next.js, Node.js, WordPress, боты и AI-инструменты. Казахстан, удалённая работа.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Vladimir — Frontend / Full-Stack Developer",
  description: DESC,
  openGraph: {
    title: "Vladimir — Frontend / Full-Stack Developer",
    description: DESC,
    type: "website",
    url: "/",
    siteName: "Vladimir · Portfolio",
    images: [{ url: "/api/og", width: 1200, height: 630, alt: "Vladimir — Frontend / Full-Stack Developer" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vladimir — Frontend / Full-Stack Developer",
    description: DESC,
    images: ["/api/og"],
  },
};

const PERSON_JSONLD = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Vladimir",
  url: SITE_URL,
  jobTitle: "Frontend / Full-Stack Developer",
  sameAs: ["https://github.com/YpCIIIaK"],
  email: "mailto:bigboyvova01@gmail.com",
  address: { "@type": "PostalAddress", addressCountry: "KZ" },
  knowsAbout: ["TypeScript", "React", "Next.js", "Node.js", "WordPress", "AI engineering"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('portfolio-theme');if(t)document.documentElement.dataset.theme=t;}catch(e){}`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(PERSON_JSONLD) }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
