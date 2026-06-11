import { createVobizOutboundTrunk } from "./providers/calling-provider.js";

const trunkId = await createVobizOutboundTrunk();
console.log(`OUTBOUND_TRUNK_ID=${trunkId}`);
console.log("Add this value to your .env, then run with CALLING_PROVIDER=vobiz_sip and MOCK_CALL_MODE=false.");

