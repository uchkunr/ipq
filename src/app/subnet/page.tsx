import { ToolPage } from "@/components/tool-page";
import { SubnetTool } from "@/components/tools/subnet-tool";
import { toolMetadata } from "@/lib/seo";
import { toolBySlug } from "@/lib/site";

export const metadata = toolMetadata("subnet", "Subnet and CIDR calculator");

export default function SubnetPage() {
  return (
    <ToolPage
      tool={toolBySlug("subnet")!}
      about={
        <>
          <p>CIDR notation writes a network as an address and a prefix length, such as 10.0.0.0/22. The prefix says how many leading bits are the network part. The remaining bits number the hosts, so a /22 has 10 host bits and 1,024 addresses.</p>
          <h3>Terms</h3>
          <ul>
            <li>Network address: the first address, all host bits zero. It names the subnet and is not assigned to a device.</li>
            <li>Broadcast address: the last address, all host bits one. Packets sent to it reach every host.</li>
            <li>Usable hosts: everything in between. A /31 and /32 are special: point-to-point links use both addresses of a /31.</li>
            <li>Wildcard mask: the inverse of the subnet mask, used in access lists on Cisco equipment.</li>
          </ul>
          <h3>Common sizes</h3>
          <p>A /24 has 254 usable hosts and is the default home and office network. A /16 has 65,534. Cloud providers hand out a /16 per VPC and recommend /20 or smaller per subnet.</p>
        </>
      }
    >
      <SubnetTool />
    </ToolPage>
  );
}
