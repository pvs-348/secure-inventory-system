import { InventoryNode } from './node.js';
import { InventoryNetwork } from './network.js';
import * as utils from './utils.js';

export function runTask2(record, signature, keySet) {

    // create 4 nodes using given keys
    const nodes = [
        new InventoryNode("A", keySet.A),
        new InventoryNode("B", keySet.B),
        new InventoryNode("C", keySet.C),
        new InventoryNode("D", keySet.D)
    ];

    const network = new InventoryNetwork(nodes);

    // step 1: collect votes
    const votes = network.broadcastAndCollectVotes(record, signature, utils);

    // step 2: consensus decision
    const decision = network.reachConsensus(votes);

    // step 3: store if accepted
    if (decision === "ACCEPT") {
        network.syncStorage(record);
    }

    return {
        votes,
        decision,
        nodes // so UI can show storage
    };
}