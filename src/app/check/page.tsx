import { ToolPage } from "@/components/tool-page";
import { TraceView } from "@/components/trace-view";
import { toolMetadata } from "@/lib/seo";
import { HOSTED, toolBySlug } from "@/lib/site";

export const metadata = toolMetadata("check", "Connection check: find where packet loss starts");

export default function CheckPage() {
  return (
    <ToolPage
      tool={toolBySlug("check")!}
      about={
        <>
          <p>Packet loss is the usual cause of a game that stutters, a call that breaks up or a page that loads on the third try while a speed test still looks fine. Where it happens decides who can fix it, and this check answers that question.</p>
          <h3>How it works</h3>
          <ul>
            <li>traceroute finds every router between you and the site.</li>
            <li>Every router is pinged once a second, for as long as you let the check run.</li>
            <li>Routers are folded into one stop per network using public RIPE data, so you read a path instead of a table.</li>
            <li>After 15 tests the check names the first stop whose loss continues all the way to the site.</li>
          </ul>
          <h3>Why it runs on your computer</h3>
          <p>Only your own machine can measure your connection. A server somewhere else would trace its own route, which says nothing about your Wi-Fi, your router or your provider. The hosted tools on this site answer questions about the internet, this one answers questions about you.</p>
          <h3>Reading the result</h3>
          <p>Loss that starts at your router points at Wi-Fi or cabling. Loss that starts inside the provider network is theirs to fix, and the report button gives you the text to send them. Loss that appears only at the site itself is usually the site rate-limiting test replies, not a problem.</p>
        </>
      }
    >
      <TraceView hosted={HOSTED} />
    </ToolPage>
  );
}
