import { absoluteUrl, SITE } from "@/config/site";
import { isLocale } from "@/i18n/config";
import { deliveryCopy } from "@/i18n/delivery";
import { emailConfigured, escapeHtml, sendMail } from "./email";
import { reportError } from "./monitoring";
import { orders, type Order } from "./orders";

/** Operational message to the owner (OWNER_EMAIL). Never throws: a failed alert must not fail the request. */
export async function notifyOwner(subject: string, lines: string[]): Promise<void> {
  const to = process.env.OWNER_EMAIL;
  if (!to || !emailConfigured()) return;
  try {
    await sendMail({ to, subject: `[${SITE.name}] ${subject}`, text: lines.join("\n") });
  } catch (error) {
    await reportError(error, { where: "notifyOwner", subject });
  }
}

const money = (o: Order) => `${(o.amountMinor / 100).toFixed(2)} ${o.currency}`;

/**
 * Emails the private report link once per paid order (webhook, poll, cron or admin may all call
 * this). The claim is released when sending fails, so the next status check retries.
 */
export async function deliverPaidReport(order: Order): Promise<void> {
  if (order.status !== "paid" || order.customerNotifiedAt || !emailConfigured()) return;
  if (!(await orders.claimCustomerNotice(order.id))) return;
  const lang = isLocale(order.lang) ? order.lang : "en";
  const [subject, paid, open, keep, help] = deliveryCopy[lang];
  const url = absoluteUrl(`/${lang}/report/${order.reportToken}`);
  const title = subject.replace("{site}", SITE.name);
  try {
    await sendMail({
      to: order.customer.email,
      replyTo: SITE.supportEmail,
      idempotencyKey: `report-link/${order.id}`,
      subject: title,
      text: `${paid}\n\n${open}: ${url}\n\n${keep}\n${help}\n\n${SITE.name} · ${SITE.url}`,
      html: `<p>${escapeHtml(paid)}</p><p><a href="${escapeHtml(url)}">${escapeHtml(open)}</a></p><p>${escapeHtml(keep)}<br>${escapeHtml(help)}</p><p style="color:#666">${escapeHtml(SITE.name)} · ${escapeHtml(SITE.url)}</p>`,
    });
  } catch (error) {
    await orders.update(order.id, { customerNotifiedAt: undefined }, "email");
    await reportError(error, { where: "deliverPaidReport", orderId: order.id });
    return;
  }
  await notifyOwner(`Paid: ${order.plan} · ${money(order)}`, [
    `Order ${order.id} · ${order.plan} · ${money(order)} · project ${order.input.countryCode} · billing ${order.billingCountry ?? "—"}`,
    `Customer: ${order.customer.company ?? order.customer.name ?? "—"} <${order.customer.email}>`,
    `Admin: ${absoluteUrl("/admin")}`,
  ]);
}
