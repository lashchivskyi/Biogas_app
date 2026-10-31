"use client";

import type { Assessment } from "@/core";
import { reportSheets } from "@/lib/report-export";
import { writeXlsx } from "@/lib/xlsx";

/** Downloads the report as an editable Excel workbook, built in the browser from the saved assessment. */
export function ExportButton({ a, currency, access, label }: { a: Assessment; currency: string; access: "standard" | "full"; label: string }) {
  const download = () => {
    const bytes = writeXlsx(reportSheets(a, { currency, access }));
    const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `methalytics-${a.countryCode.toLowerCase()}-${a.bestRoute}-${a.dataAudit?.asOfDate ?? "report"}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <button type="button" className="btn btn-ghost" onClick={download}>
      {label}
    </button>
  );
}
