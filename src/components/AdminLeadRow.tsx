"use client";

import { useState } from "react";
import type { Lead, LeadStatus } from "@/server/leads";
import { countryName, type Dict, type Locale, INTL_TAG } from "@/i18n";
import type { AdminCopy } from "@/i18n/admin";
import { makeFormat } from "@/lib/format";

export function AdminLeadRow({ lead, locale, d, t }: { lead: Lead; locale: Locale; d: Pick<Dict, "labels" | "result">; t: AdminCopy }) {
  const F = makeFormat(locale, d.labels.units);
  const [status, setStatus] = useState<LeadStatus>(lead.status);
  const [notes, setNotes] = useState(lead.notes);
  const [saved, setSaved] = useState("");

  async function save(patch: { status?: LeadStatus; notes?: string }) {
    setSaved("…");
    try {
      const res = await fetch(`/api/admin/leads/${lead.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) });
      setSaved(res.ok ? t.saved : t.orderStatus.failed);
    } catch { setSaved(t.orderStatus.failed); }
    setTimeout(() => setSaved(""), 1500);
  }

  return (
    <tr className="border-t border-line align-top text-sm">
      <td className="p-3 whitespace-nowrap text-muted">{new Date(lead.createdAt).toLocaleString(INTL_TAG[locale], { dateStyle: "short", timeStyle: "short" })}</td>
      <td className="p-3">
        <div className="font-semibold">{lead.name}</div>
        <div>{lead.company}</div>
        <div className="num text-muted">{lead.phone}</div>
        <div className="text-muted">{lead.email}</div>
        {lead.message && <div className="mt-1 max-w-xs text-xs text-ink2">«{lead.message}»</div>}
      </td>
      <td className="p-3 num">
        <div>{d.labels.business[lead.input.businessType].label} · {countryName(lead.input.countryCode, locale)} / {lead.input.regionId}</div>
        <div>{F.n0(lead.summary.tonnesYear)} {d.labels.units.tYear} · ≈ {F.n0(lead.summary.kwEl)} {d.labels.units.kw}</div>
        <div>CAPEX ≈ {F.eur(lead.summary.capexEur)} · {d.result.payback}: {F.years(lead.summary.paybackYears)}</div>
      </td>
      <td className="p-3">
        <div className="font-semibold">{d.labels.verdict[lead.verdict]}</div>
        <div className="text-xs text-muted">{d.labels.confidence[lead.confidence]} · {Object.entries(d.labels.route).find(([id]) => id === lead.route)?.[1] ?? lead.route}</div>
      </td>
      <td className="p-3">
        <select className="field !py-1.5" value={status} onChange={(e) => { const s = e.target.value as LeadStatus; setStatus(s); void save({ status: s }); }} aria-label={d.result.colStatus}>
          {Object.entries(t.leadStatus).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <textarea className="field mt-2 !py-1.5 text-xs" rows={2} aria-label={t.notes} placeholder={t.notes} value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => notes !== lead.notes && void save({ notes })} />
        <div className="h-4 text-xs text-muted">{saved}</div>
      </td>
    </tr>
  );
}
