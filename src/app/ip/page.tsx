import { Suspense } from "react";
import { ToolPage } from "@/components/tool-page";
import { IpCard, IpCardFallback } from "@/components/tools/ip-card";
import { IpLookupTool } from "@/components/tools/ip-lookup-tool";
import { toolMetadata } from "@/lib/seo";
import { toolBySlug } from "@/lib/site";

export const metadata = toolMetadata("ip", "What is my IP address, and IP lookup");

export default function IpPage() {
  return (
    <ToolPage
      tool={toolBySlug("ip")!}
      about={
        <>
          <p>Your public IP address is the one the rest of the internet sees. It belongs to your internet provider or mobile carrier, not to your computer, and it usually changes when your router reconnects. Devices inside your home share it through your router.</p>
          <h3>What the fields mean</h3>
          <ul>
            <li>Location is an estimate from the address block, accurate to the city at best. It can be off by hundreds of kilometres on mobile networks and VPNs.</li>
            <li>Network is the autonomous system that announces the address block, usually your provider, with the number of prefixes it announces.</li>
            <li>Owner and abuse contact come from the regional registry record of the block. The abuse address is where to report attacks or spam from that address.</li>
            <li>Reverse DNS is the name attached to the address, if any. Mail servers check it.</li>
          </ul>
          <h3>Flags</h3>
          <p>Tor exit comes from the Tor Project exit list, refreshed hourly. Hosting, mobile and satellite are judged from the network name, so treat them as a hint. VPN, proxy and residential proxy detection need commercial datasets and are marked unavailable rather than guessed.</p>
          <h3>From scripts</h3>
          <p>A plain request to /ip returns only your address. Add <code>?full</code> for the other fields as text, or send Accept: application/json. For any address use <code>/api/lookup?ip=1.1.1.1</code>. A page for each address lives at <code>/ip/1.1.1.1</code>.</p>
        </>
      }
    >
      <Suspense fallback={<IpCardFallback />}>
        <IpCard />
      </Suspense>
      <IpLookupTool />
    </ToolPage>
  );
}
