import { normalizeHost } from "@/lib/host";
import { quickRecords } from "./doh";
import { ToolError } from "./guard";

export type Verdict = { tone: "good" | "warn" | "bad"; text: string };

export type EmailResult = {
  domain: string;
  mx: { records: { priority: number; host: string }[]; verdict: Verdict };
  spf: { record: string | null; verdict: Verdict };
  dmarc: { record: string | null; policy: string | null; verdict: Verdict };
  dkim: { selector: string; record: string | null; verdict: Verdict } | null;
};

export async function checkEmail(rawDomain: string, selector: string | null): Promise<EmailResult> {
  const domain = normalizeHost(rawDomain);
  if (!domain || !domain.includes(".")) throw new ToolError("Enter a domain like example.com.");
  const cleanSelector = selector?.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "") || null;

  const [mxData, rootTxt, dmarcTxt, dkimTxt] = await Promise.all([
    quickRecords(domain, "MX"),
    quickRecords(domain, "TXT"),
    quickRecords(`_dmarc.${domain}`, "TXT"),
    cleanSelector ? quickRecords(`${cleanSelector}._domainkey.${domain}`, "TXT") : Promise.resolve([] as string[]),
  ]);

  const mx = mxData
    .map((d) => {
      const [priority, host] = d.split(/\s+/);
      return { priority: Number(priority), host: (host ?? "").replace(/\.$/, "") };
    })
    .filter((r) => r.host)
    .sort((a, b) => a.priority - b.priority);
  const nullMx = mx.length === 1 && mx[0].host === "" && mx[0].priority === 0;

  const spfRecords = rootTxt.filter((t) => /^v=spf1(\s|$)/i.test(t));
  const spf = spfRecords[0] ?? null;
  let spfVerdict: Verdict;
  if (spfRecords.length > 1) spfVerdict = { tone: "bad", text: `${spfRecords.length} SPF records found. Only one is allowed, so receivers will treat SPF as failed.` };
  else if (!spf) spfVerdict = { tone: "bad", text: "No SPF record. Anyone can send mail that claims to come from this domain." };
  else if (/[-~]all\s*$/i.test(spf)) spfVerdict = { tone: "good", text: /-all\s*$/i.test(spf) ? "SPF present with a hard fail, the strictest setting." : "SPF present with a soft fail. Fine with DMARC in place." };
  else if (/\+all/i.test(spf)) spfVerdict = { tone: "bad", text: "SPF ends with +all, which allows every sender. Change it to -all or ~all." };
  else spfVerdict = { tone: "warn", text: "SPF present but it does not end with -all or ~all, so it does not reject anything." };

  const dmarc = dmarcTxt.find((t) => /^v=DMARC1(\s|;|$)/i.test(t)) ?? null;
  const policy = dmarc?.match(/\bp=(none|quarantine|reject)/i)?.[1]?.toLowerCase() ?? null;
  let dmarcVerdict: Verdict;
  if (!dmarc) dmarcVerdict = { tone: "bad", text: "No DMARC record. Receivers cannot tell whether failed SPF or DKIM checks should matter." };
  else if (policy === "reject") dmarcVerdict = { tone: "good", text: "DMARC enforces reject, the strongest policy." };
  else if (policy === "quarantine") dmarcVerdict = { tone: "good", text: "DMARC enforces quarantine. Failing mail goes to spam." };
  else if (policy === "none") dmarcVerdict = { tone: "warn", text: "DMARC is in monitoring mode (p=none). Nothing is blocked yet." };
  else dmarcVerdict = { tone: "warn", text: "DMARC record found but it has no valid policy tag." };

  const dkimRecord = dkimTxt.find((t) => /v=DKIM1|\bp=/i.test(t)) ?? null;

  return {
    domain,
    mx: {
      records: mx,
      verdict: nullMx
        ? { tone: "warn", text: "A null MX record. This domain declares that it does not receive mail." }
        : mx.length
          ? { tone: "good", text: `${mx.length} mail server${mx.length > 1 ? "s" : ""} configured.` }
          : { tone: "bad", text: "No MX records. Mail to this domain cannot be delivered." },
    },
    spf: { record: spf, verdict: spfVerdict },
    dmarc: { record: dmarc, policy, verdict: dmarcVerdict },
    dkim: cleanSelector
      ? {
          selector: cleanSelector,
          record: dkimRecord,
          verdict: dkimRecord
            ? /\bp=\s*(;|$)/.test(dkimRecord)
              ? { tone: "bad", text: "The DKIM key is empty, which revokes the selector." }
              : { tone: "good", text: "DKIM public key found for this selector." }
            : { tone: "bad", text: `No DKIM record at ${cleanSelector}._domainkey.${domain}.` },
        }
      : null,
  };
}
