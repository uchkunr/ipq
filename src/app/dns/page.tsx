import { ToolPage } from "@/components/tool-page";
import { DnsTool } from "@/components/tools/dns-tool";
import { toolMetadata } from "@/lib/seo";
import { toolBySlug } from "@/lib/site";

export const metadata = toolMetadata("dns", "DNS lookup and propagation checker");

export default function DnsPage() {
  return (
    <ToolPage
      tool={toolBySlug("dns")!}
      about={
        <>
          <p>DNS turns a name into the records behind it. Each query here goes to three independent public resolvers over DNS over HTTPS, so you see both the answer and whether every resolver already has the new value after a change.</p>
          <h3>Record types</h3>
          <ul>
            <li>A and AAAA: the IPv4 and IPv6 addresses of a name.</li>
            <li>CNAME: an alias that points one name at another.</li>
            <li>MX: the servers that receive mail for a domain, lowest priority first.</li>
            <li>NS: the nameservers that are authoritative for the zone.</li>
            <li>TXT: free text, used for SPF, DMARC, site verification and more.</li>
            <li>SOA: zone metadata, including the serial number that changes with every edit.</li>
            <li>CAA: which certificate authorities may issue certificates for the name.</li>
            <li>SRV: host and port for a service such as SIP or XMPP.</li>
            <li>PTR: the reverse lookup. Enter an IP address and the tool builds the in-addr.arpa name for you.</li>
          </ul>
          <h3>Propagation</h3>
          <p>Resolvers keep an answer for as long as its TTL allows, so after a change the old value can linger for that many seconds. When the three resolvers here disagree, the change is still spreading. When they agree, almost everyone sees the new record.</p>
        </>
      }
    >
      <DnsTool />
    </ToolPage>
  );
}
