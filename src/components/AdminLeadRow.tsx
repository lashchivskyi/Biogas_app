"use client";

import { useState } from "react";
import type { Lead, LeadStatus } from "@/server/leads";

const STATUSES: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  study_sold: "Study sold",
  lost: "Lost",
};

export function AdminLeadRow({ lead }: { lead: Lead }) {
  const [status, setStatus] = useState<LeadStatus>(lead.status);
  const [notes, setNotes] = useState(lead.notes);
  const [saved, setSaved] = useState("");

  async function save(patch: { status?: LeadStatus; notes?: string }) {
    setSaved("…");
    const res = await fetch(`/api/admin/leads/${lead.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) });
    setSaved(res.ok ? "saved" : "error");
    setTimeout(() => setSaved(""), 1500);
  }

  return (
    <tr className="border-t border-line align-top text-sm">
      <td className="p-3 whitespace-nowrap text-muted">{new Date(lead.createdAt).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}</td>
      <td className="p-3">
        <div className="font-semibold">{lead.name}</div>
        <div>{lead.company}</div>
        <div className="num text-muted">{lead.phone}</div>
        <div className="text-muted">{lead.email}</div>
        {lead.message && <div className="mt-1 max-w-xs text-xs text-ink2">«{lead.message}»</div>}
      </td>
      <td className="p-3 num">
        <div>{lead.input.businessType} · {lead.input.countryCode}/{lead.input.regionId}</div>
        <div>{Math.round(lead.summary.tonnesYear).toLocaleString("en-GB")} t/yr · ≈ {Math.round(lead.summary.kwEl)} kW</div>
        <div>CAPEX ≈ €{Math.round(lead.summary.capexEur / 1000)}k · payback {lead.summary.paybackYears === null ? "—" : lead.summary.paybackYears.toFixed(1)} yr</div>
      </td>
      <td className="p-3">
        <div className="font-semibold">{lead.verdict}</div>
        <div className="text-xs text-muted">confidence {lead.confidence} · {lead.route}</div>
      </td>
      <td className="p-3">
        <select className="field !py-1.5" value={status} onChange={(e) => { const s = e.target.value as LeadStatus; setStatus(s); void save({ status: s }); }} aria-label="Status">
          {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <textarea className="field mt-2 !py-1.5 text-xs" rows={2} placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => notes !== lead.notes && void save({ notes })} />
        <div className="h-4 text-xs text-muted">{saved}</div>
      </td>
    </tr>
  );
}
