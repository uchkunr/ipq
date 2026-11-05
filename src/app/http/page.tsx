import { ToolPage } from "@/components/tool-page";
import { HttpTool } from "@/components/tools/http-tool";
import { toolMetadata } from "@/lib/seo";
import { toolBySlug } from "@/lib/site";

export const metadata = toolMetadata("http", "HTTP status, redirect and headers checker");

export default function HttpPage() {
  return (
    <ToolPage
      tool={toolBySlug("http")!}
      about={
        <>
          <p>This is curl -I with a readable result. The request follows every redirect by hand, records the status and time of each hop and then lists the headers of the final response. The request comes from the server that hosts this page, not from your browser, which is useful when a site behaves differently for you than for everyone else.</p>
          <h3>Reading the redirect chain</h3>
          <p>One hop with a 200 is ideal. A chain such as http to https to www to the final page costs a round trip per hop, and search engines follow only a limited number of them. A 301 is permanent and cached by browsers, a 302 or 307 is temporary.</p>
          <h3>Security headers</h3>
          <p>Six headers cover most of what a browser can enforce for you. HSTS forces HTTPS, Content-Security-Policy limits where scripts load from, X-Content-Type-Options stops type sniffing, X-Frame-Options blocks clickjacking, Referrer-Policy limits what leaks in links and Permissions-Policy switches off browser features the page does not use.</p>
        </>
      }
    >
      <HttpTool />
    </ToolPage>
  );
}
