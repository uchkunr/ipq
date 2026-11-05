export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ipq.vercel.app";
export const SITE_NAME = "ipq";
export const SITE_TAGLINE = "Network tools that answer in one request";
export const REPO_URL = "https://github.com/uchkunr/ipq";

/** True on Vercel, where system ping and traceroute do not exist. */
export const HOSTED = process.env.VERCEL === "1";

export type Tool = {
  slug: string;
  name: string;
  /** One line for cards and meta descriptions. */
  short: string;
  /** Two or three sentences for the page intro and search snippets. */
  long: string;
  /** Terminal example shown on the card and the page. */
  curl: string;
  api: string | null;
  keywords: string[];
  localOnly?: boolean;
};

export const TOOLS: Tool[] = [
  {
    slug: "ip",
    name: "What is my IP",
    short: "Your public IP, and a lookup for any address: location, network, owner, abuse contact.",
    long: "Shows the public IP address your connection uses right now, with the country, city, network owner and reverse DNS name. Look up any other address to see its location, autonomous system, owner, abuse contact and whether it is a Tor exit. Works from the terminal too: curl the address and you get the IP back as plain text.",
    curl: `curl ${SITE_URL}/ip\ncurl "${SITE_URL}/api/lookup?ip=1.1.1.1"`,
    api: "/api/ip",
    keywords: ["what is my ip", "my ip address", "public ip", "ip lookup", "ip address lookup", "ip geolocation", "abuse contact", "curl ip"],
  },
  {
    slug: "dns",
    name: "DNS lookup",
    short: "A, AAAA, MX, TXT, NS and more from three resolvers at once.",
    long: "Looks up any DNS record type at Cloudflare, Google and Quad9 in parallel, so you see the answer and whether it has propagated. Supports A, AAAA, CNAME, MX, NS, TXT, SOA, CAA, SRV and PTR records.",
    curl: `curl "${SITE_URL}/api/dns?name=example.com&type=A"`,
    api: "/api/dns",
    keywords: ["dns lookup", "dns checker", "dns propagation", "mx lookup", "txt record", "dig online"],
  },
  {
    slug: "whois",
    name: "WHOIS lookup",
    short: "Registrar, dates, nameservers and owner of a domain or IP.",
    long: "Fetches registration data for a domain, IP address or AS number over RDAP, the structured successor to WHOIS. Shows the registrar, creation and expiry dates, nameservers, status flags and the network that owns an address.",
    curl: `curl "${SITE_URL}/api/whois?q=example.com"`,
    api: "/api/whois",
    keywords: ["whois lookup", "domain whois", "ip whois", "rdap", "domain owner", "domain expiry"],
  },
  {
    slug: "http",
    name: "HTTP check",
    short: "Status code, redirect chain, response time and headers of any URL.",
    long: "Requests a URL and shows the status code, every redirect on the way, the time each hop took and the final response headers. Flags missing security headers such as HSTS and Content-Security-Policy.",
    curl: `curl "${SITE_URL}/api/http?url=https://example.com"`,
    api: "/api/http",
    keywords: ["http status checker", "redirect checker", "response headers", "security headers", "curl -I online"],
  },
  {
    slug: "ssl",
    name: "SSL check",
    short: "Certificate issuer, expiry, SANs and the chain of any host.",
    long: "Connects to a host over TLS and shows the certificate issuer, validity dates, days until expiry, subject alternative names, protocol, cipher and the full chain. Tells you whether the certificate is trusted and why not.",
    curl: `curl "${SITE_URL}/api/ssl?host=example.com"`,
    api: "/api/ssl",
    keywords: ["ssl checker", "ssl certificate check", "tls check", "certificate expiry", "ssl chain"],
  },
  {
    slug: "ports",
    name: "Port check",
    short: "Which common ports on a host accept connections.",
    long: "Tries to open a TCP connection to the ports you choose on any public host and reports which ones answer. Useful to confirm a firewall rule, a new service or that a server is reachable before you SSH in.",
    curl: `curl "${SITE_URL}/api/ports?host=example.com&ports=22,80,443"`,
    api: "/api/ports",
    keywords: ["port checker", "open port check", "port scan", "is port open", "tcp port test"],
  },
  {
    slug: "email",
    name: "Email DNS check",
    short: "MX, SPF, DMARC and DKIM records of a domain, with verdicts.",
    long: "Checks everything a domain needs to send and receive mail: MX records, the SPF policy, the DMARC policy and an optional DKIM selector. Each record gets a plain-language verdict so you know what to fix.",
    curl: `curl "${SITE_URL}/api/email?domain=example.com"`,
    api: "/api/email",
    keywords: ["spf checker", "dmarc checker", "dkim checker", "mx lookup", "email dns check"],
  },
  {
    slug: "headers",
    name: "Request headers",
    short: "Every header your browser or client sends, echoed back.",
    long: "Echoes the HTTP headers of your request exactly as the server received them. Handy to see what a proxy adds, which User-Agent a script sends or whether a header made it through a CDN.",
    curl: `curl ${SITE_URL}/headers`,
    api: "/api/headers",
    keywords: ["request headers", "http headers echo", "what headers am i sending", "user agent check"],
  },
  {
    slug: "subnet",
    name: "Subnet calculator",
    short: "Network, broadcast, host range and mask for any CIDR.",
    long: "Enter an address with a prefix like 10.0.0.0/22 and get the network address, broadcast address, first and last usable host, subnet mask, wildcard mask and host count. Runs entirely in your browser.",
    curl: "",
    api: null,
    keywords: ["subnet calculator", "cidr calculator", "ip calculator", "subnet mask", "network address"],
  },
  {
    slug: "check",
    name: "Connection check",
    short: "Traces the route to a site and shows which network loses packets.",
    long: "Runs traceroute and continuous pings from your own computer, folds the routers into one stop per network and tells you where packet loss begins: your home network, your provider, a transit network or the site itself. Runs locally, because only your computer can measure your connection.",
    curl: `git clone ${REPO_URL} && cd ipq && bun install && bun run dev`,
    api: null,
    keywords: ["packet loss test", "traceroute", "connection checker", "where is packet loss", "mtr"],
    localOnly: true,
  },
];

export function toolBySlug(slug: string) {
  return TOOLS.find((tool) => tool.slug === slug);
}
