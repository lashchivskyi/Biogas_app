import type { Metadata } from "next";
import "@fontsource-variable/manrope";
import "@fontsource-variable/unbounded";
import "../globals.css";

export const metadata: Metadata = { title: "Methalytics CRM", robots: { index: false, follow: false } };

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
