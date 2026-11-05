import { ToolPage } from "@/components/tool-page";
import { PortsTool } from "@/components/tools/ports-tool";
import { toolMetadata } from "@/lib/seo";
import { toolBySlug } from "@/lib/site";

export const metadata = toolMetadata("ports", "Open port checker");

export default function PortsPage() {
  return (
    <ToolPage
      tool={toolBySlug("ports")!}
      about={
        <>
          <p>A port check opens a TCP connection to a host and port from the outside and reports what happens. It answers the question behind most firewall tickets: is the service reachable from the internet at all?</p>
          <h3>The three outcomes</h3>
          <ul>
            <li>Open: the host accepted the connection. Something is listening and the firewall lets traffic through.</li>
            <li>Closed: the host answered immediately that nothing listens there. The host is reachable, the service is not running or bound to another address.</li>
            <li>Filtered: no answer within three seconds. A firewall is dropping packets, or the host is down.</li>
          </ul>
          <h3>Limits</h3>
          <p>Checks come from the server that hosts this page, so a port that is open only from your office still shows as filtered. Private addresses are refused, and each check covers at most 20 ports. For a full scan of your own hosts use nmap.</p>
        </>
      }
    >
      <PortsTool />
    </ToolPage>
  );
}
