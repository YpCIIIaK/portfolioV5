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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const DESC =
  "Портфолио Владимира в виде VSCode: фронтенд, выросший в фуллстек. React, TypeScript, Next.js, Go, Node.js, AI.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Vladimir — Fullstack Developer",
  description: DESC,
  openGraph: {
    title: "Vladimir — Fullstack Developer",
    description: DESC,
    type: "website",
    url: "/",
    siteName: "Vladimir · Portfolio",
    images: [{ url: "/api/og", width: 1200, height: 630, alt: "Vladimir — Fullstack Developer" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vladimir — Fullstack Developer",
    description: DESC,
    images: ["/api/og"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('portfolio-theme');if(t)document.documentElement.dataset.theme=t;}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
