import tls, { type DetailedPeerCertificate } from "node:tls";
import { ToolError } from "./guard";

export type CertInfo = {
  subject: string;
  issuer: string;
  validFrom: string;
  validTo: string;
  serial: string;
  fingerprint: string;
  keyBits: number | null;
  selfSigned: boolean;
};

export type TlsResult = {
  host: string;
  address: string;
  port: number;
  ms: number;
  trusted: boolean;
  reason: string | null;
  protocol: string | null;
  cipher: string | null;
  alpn: string | null;
  daysLeft: number;
  hostMatches: boolean;
  sans: string[];
  chain: CertInfo[];
};

function nameOf(record: Record<string, string | string[]> | undefined) {
  if (!record) return "";
  const cn = record.CN;
  const o = record.O;
  const value = cn ?? o ?? Object.values(record)[0];
  return Array.isArray(value) ? value.join(", ") : String(value ?? "");
}

function describe(cert: DetailedPeerCertificate): CertInfo {
  const pub = cert.pubkey ? cert.bits ?? null : (cert.bits ?? null);
  return {
    subject: nameOf(cert.subject as Record<string, string | string[]>),
    issuer: nameOf(cert.issuer as Record<string, string | string[]>),
    validFrom: new Date(cert.valid_from).toISOString(),
    validTo: new Date(cert.valid_to).toISOString(),
    serial: cert.serialNumber,
    fingerprint: cert.fingerprint256,
    keyBits: pub,
    selfSigned: cert.fingerprint256 === cert.issuerCertificate?.fingerprint256,
  };
}

export function checkTls(host: string, address: string, port = 443, timeoutMs = 8000) {
  return new Promise<TlsResult>((resolve, reject) => {
    const start = performance.now();
    const socket = tls.connect({ host: address, port, servername: host, ALPNProtocols: ["h2", "http/1.1"], rejectUnauthorized: false });
    const fail = (message: string, status = 502) => {
      socket.destroy();
      reject(new ToolError(message, status));
    };
    socket.setTimeout(timeoutMs, () => fail(`${host}:${port} did not complete a TLS handshake within ${timeoutMs / 1000} seconds.`));
    socket.once("error", (error: NodeJS.ErrnoException) => {
      fail(error.code === "ECONNREFUSED" ? `${host} refused the connection on port ${port}.` : `TLS handshake failed: ${error.message}`);
    });
    socket.once("secureConnect", () => {
      const ms = Math.round(performance.now() - start);
      const leaf = socket.getPeerCertificate(true);
      if (!leaf || !leaf.valid_to) return fail(`${host} did not present a certificate.`);
      const chain: CertInfo[] = [];
      let current: DetailedPeerCertificate | undefined = leaf;
      const seen = new Set<string>();
      while (current && current.fingerprint256 && !seen.has(current.fingerprint256) && chain.length < 6) {
        seen.add(current.fingerprint256);
        chain.push(describe(current));
        current = current.issuerCertificate;
      }
      const sans = (leaf.subjectaltname ?? "")
        .split(",")
        .map((s) => s.trim().replace(/^(DNS|IP Address):/, ""))
        .filter(Boolean);
      let hostMatches = true;
      try {
        hostMatches = tls.checkServerIdentity(host, leaf) === undefined;
      } catch {
        hostMatches = false;
      }
      const daysLeft = Math.floor((new Date(leaf.valid_to).getTime() - Date.now()) / 86_400_000);
      const result: TlsResult = {
        host,
        address,
        port,
        ms,
        trusted: socket.authorized && hostMatches,
        reason: socket.authorized ? (hostMatches ? null : `The certificate is not issued for ${host}.`) : String(socket.authorizationError),
        protocol: socket.getProtocol(),
        cipher: socket.getCipher()?.name ?? null,
        alpn: typeof socket.alpnProtocol === "string" ? socket.alpnProtocol : null,
        daysLeft,
        hostMatches,
        sans,
        chain,
      };
      socket.destroy();
      resolve(result);
    });
  });
}
