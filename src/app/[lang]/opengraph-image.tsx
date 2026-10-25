import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { SITE } from "@/config/site";
import { getDictionary, isLocale } from "@/i18n";

export const alt = `${SITE.name} — biogas & biomethane feasibility`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const font = (pkg: string, file: string) => readFile(join(process.cwd(), "node_modules", "@fontsource", pkg, "files", file));
const SUBSETS = ["latin", "latin-ext", "cyrillic", "cyrillic-ext", "greek", "vietnamese"];

export default async function Image({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  // No bundled Thai webfont for the OG renderer — Thai pages share the English card.
  const d = await getDictionary(isLocale(lang) && lang !== "th" ? lang : "en");
  const [display, ...body] = await Promise.all([
    font("unbounded", "unbounded-latin-600-normal.woff"),
    ...SUBSETS.map((s) => font("manrope", `manrope-${s}-700-normal.woff`)),
    ...SUBSETS.map((s) => font("manrope", `manrope-${s}-500-normal.woff`)),
  ]);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "linear-gradient(135deg, #050d0a 0%, #0b1d16 60%, #10291f 100%)", color: "#eef6f1", fontFamily: "Manrope" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <svg width="76" height="76" viewBox="0 0 32 32">
            <rect width="32" height="32" rx="9" fill="#0b1d16" />
            <path d="M13.2 20.6 L20.6 25.4 M13.2 20.6 L8.6 26" stroke="#3ddc97" strokeOpacity=".35" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="20.6" cy="25.4" r="1.7" fill="#e8a521" />
            <circle cx="8.6" cy="26" r="1.5" fill="#ffffff" fillOpacity=".45" />
            <path d="M7.2 14.6 L13.2 20.6 L24.6 8.2" stroke="#3ddc97" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <circle cx="7.2" cy="14.6" r="2.3" fill="#ffffff" />
            <circle cx="24.6" cy="8.2" r="2.6" fill="#ffffff" />
            <circle cx="13.2" cy="20.6" r="3.3" fill="#3ddc97" stroke="#0b1d16" strokeWidth="1.2" />
          </svg>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontFamily: "Unbounded", fontSize: 42 }}>
              <span>metha</span>
              <span style={{ color: "#3ddc97" }}>lytics</span>
            </div>
            <div style={{ fontSize: 20, letterSpacing: 3, textTransform: "uppercase", color: "#7f978c" }}>{d.brand.descriptor}</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontWeight: 700, fontSize: 70, lineHeight: 1.08, maxWidth: 1040 }}>{d.meta.ogTitle}</div>
          <div style={{ marginTop: 28, fontSize: 30, color: "#a3b8ae", maxWidth: 1040 }}>{d.meta.ogDescription}</div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Unbounded", data: display, weight: 600, style: "normal" },
        ...body.map((data, i) => ({ name: "Manrope", data, weight: (i < SUBSETS.length ? 700 : 500) as 700 | 500, style: "normal" as const })),
      ],
    },
  );
}
