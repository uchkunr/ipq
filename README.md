# ipq

Network tools that answer in one request. In the browser at [ipq.vercel.app](https://ipq.vercel.app), or from the terminal:

```sh
curl ipq.vercel.app/ip
curl ipq.vercel.app/headers
curl "ipq.vercel.app/api/dns?name=example.com&type=MX"
curl "ipq.vercel.app/api/ssl?host=example.com" | jq .daysLeft
```

No account, no key. Every tool is a GET request that returns JSON, and `/ip` and `/headers` return plain text when curl asks.

## Tools

| Tool | Page | API |
| --- | --- | --- |
| What is my IP: address, location, network, reverse DNS | `/ip` | `/ip`, `/api/ip` |
| IP lookup for any address: location, ASN, owner, abuse contact, Tor exit | `/ip/1.1.1.1` | `/api/lookup?ip=` |
| DNS lookup across Cloudflare, Google and Quad9, with propagation status | `/dns` | `/api/dns?name=&type=` |
| WHOIS for domains, IPs and AS numbers, over RDAP | `/whois` | `/api/whois?q=` |
| HTTP check: status, redirect chain, timing, security headers | `/http` | `/api/http?url=` |
| SSL check: trust, expiry, SANs, chain, protocol | `/ssl` | `/api/ssl?host=&port=` |
| Port check: open, closed or filtered | `/ports` | `/api/ports?host=&ports=` |
| Email DNS check: MX, SPF, DMARC, DKIM with verdicts | `/email` | `/api/email?domain=&selector=` |
| Request headers echo | `/headers` | `/headers`, `/api/headers` |
| Subnet calculator | `/subnet` | runs in the browser |
| Connection check: where packet loss starts | `/check` | local only, see below |

The full reference with parameters and limits is at `/api`.

## Connection check

The connection check traces the route from your computer to a site, pings every router on the way and names the network where packet loss begins. It has to run on your own machine, because a server can only measure its own connection.

```sh
git clone https://github.com/uchkunr/ipq
cd ipq
bun install
bun run dev
```

Open http://127.0.0.1:3400/check. Requires [Bun](https://bun.sh) and the system `ping` and `traceroute` (`tracert` on Windows) tools. Works with localised Windows output. The local server answers the check only on localhost unless `IPQ_ALLOW_REMOTE=1` is set.

## Deploy your own

The site is a Next.js app and deploys to Vercel without configuration. Set `NEXT_PUBLIC_SITE_URL` to your domain so canonical links, the sitemap and the curl examples use it.

## Safety

Checks refuse private, loopback, link-local and cloud metadata addresses, follow redirects hop by hop with the same rule, and are rate limited per address. Checks run from the server that hosts the site, so results describe reachability from there.

## Stack

Next.js, React, Tailwind CSS, shadcn/ui, Bun. Owner data comes from RIPE Stat and RDAP.
