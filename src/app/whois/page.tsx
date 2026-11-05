import { ToolPage } from "@/components/tool-page";
import { WhoisTool } from "@/components/tools/whois-tool";
import { toolMetadata } from "@/lib/seo";
import { toolBySlug } from "@/lib/site";

export const metadata = toolMetadata("whois", "WHOIS lookup for domains, IPs and AS numbers");

export default function WhoisPage() {
  return (
    <ToolPage
      tool={toolBySlug("whois")!}
      about={
        <>
          <p>WHOIS is the public record of who registered a domain or holds an address block. This tool uses RDAP, the structured replacement that registries now serve, so dates and status flags come back in one consistent format instead of free text that differs per registry.</p>
          <h3>What you can look up</h3>
          <ul>
            <li>A domain such as example.com: registrar, registration and expiry dates, nameservers, DNSSEC and status flags such as clientTransferProhibited.</li>
            <li>An IP address: the block it belongs to, the organisation that holds it and the country of registration.</li>
            <li>An AS number such as AS13335: the network that announces routes under it.</li>
          </ul>
          <h3>Why contact details are often missing</h3>
          <p>Since 2018 most registrars redact personal data from public records. Company names and abuse contacts usually remain, and the registrar can still forward a message to the owner.</p>
        </>
      }
    >
      <WhoisTool />
    </ToolPage>
  );
}
