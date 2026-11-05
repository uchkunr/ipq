import { ToolPage } from "@/components/tool-page";
import { SslTool } from "@/components/tools/ssl-tool";
import { toolMetadata } from "@/lib/seo";
import { toolBySlug } from "@/lib/site";

export const metadata = toolMetadata("ssl", "SSL certificate checker");

export default function SslPage() {
  return (
    <ToolPage
      tool={toolBySlug("ssl")!}
      about={
        <>
          <p>A TLS certificate proves that the server you reached really is the host you asked for. Browsers reject it when it has expired, when it was issued for a different name, or when the chain does not lead to a root they trust. This tool performs the same handshake and explains the outcome.</p>
          <h3>What to check before expiry</h3>
          <ul>
            <li>Days left. Most certificates now last 90 days and renew automatically, so a value under 14 usually means renewal is broken.</li>
            <li>Covered names. A certificate for example.com does not cover www.example.com unless it is listed or a wildcard matches.</li>
            <li>The chain. If the server sends only its own certificate and no intermediate, some clients fail while browsers that cache intermediates still work.</li>
          </ul>
          <h3>Other ports</h3>
          <p>Mail and database servers use TLS too. Enter port 465, 993 or 5432 to check them. Servers that need STARTTLS first are not supported.</p>
        </>
      }
    >
      <SslTool />
    </ToolPage>
  );
}
