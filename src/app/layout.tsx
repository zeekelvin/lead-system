import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZagaPrime Local Growth OS",
  description:
    "A Vercel-ready U.S. lead acquisition system with a CRM, stage tracker, lead workboard, and demo site generator.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
