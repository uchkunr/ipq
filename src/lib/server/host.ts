const HOSTNAME =
  /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const IPV4 = /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;

export function isIpv4(value: string) {
  return IPV4.test(value);
}

/**
 * Turns whatever someone typed ("https://Google.com/maps?x=1") into a bare host.
 * The result is passed to system tools as an argument, so anything that is not
 * a plain hostname or IPv4 address is rejected here.
 */
export function normalizeHost(input: string): string | null {
  let value = input.trim().toLowerCase();
  if (!value || value.length > 300) return null;
  value = value.replace(/^[a-z][a-z0-9+.-]*:\/\//, "");
  value = value.replace(/^[^/@]*@/, "");
  value = value.split(/[/?#]/)[0];
  value = value.replace(/:\d+$/, "").replace(/\.$/, "");
  if (isIpv4(value) || HOSTNAME.test(value)) return value;
  return null;
}
