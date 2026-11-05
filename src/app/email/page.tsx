import { ToolPage } from "@/components/tool-page";
import { EmailTool } from "@/components/tools/email-tool";
import { toolMetadata } from "@/lib/seo";
import { toolBySlug } from "@/lib/site";

export const metadata = toolMetadata("email", "SPF, DKIM and DMARC checker");

export default function EmailPage() {
  return (
    <ToolPage
      tool={toolBySlug("email")!}
      about={
        <>
          <p>Mail providers decide whether to deliver, spam-folder or reject a message largely from four DNS records. Gmail and Yahoo require SPF or DKIM plus DMARC from anyone who sends in volume, so a missing record now means lost mail rather than a warning.</p>
          <h3>The four records</h3>
          <ul>
            <li>MX names the servers that accept mail for the domain. Without it nobody can write to you.</li>
            <li>SPF is a TXT record at the domain that lists the servers allowed to send as it. It should end in -all or ~all.</li>
            <li>DKIM is a public key at selector._domainkey.domain. Sending servers sign each message with the matching private key. The selector is chosen by whoever sends your mail, so you need to know it to check.</li>
            <li>DMARC is a TXT record at _dmarc.domain that tells receivers what to do when SPF and DKIM fail: nothing (p=none), spam folder (p=quarantine) or reject.</li>
          </ul>
          <h3>A sensible path</h3>
          <p>Publish SPF and DKIM first, start DMARC at p=none with a reporting address, read the reports for a few weeks, then move to quarantine and finally reject.</p>
        </>
      }
    >
      <EmailTool />
    </ToolPage>
  );
}
