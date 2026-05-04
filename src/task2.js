// Persistent inventory nodes
const task2Nodes = [
    new InventoryNode("A"),
    new InventoryNode("B"),
    new InventoryNode("C"),
    new InventoryNode("D")
];

// Persistent network
const task2Network = new InventoryNetwork(task2Nodes);

function runTask2(record, signature, originNode) {
    const votes = task2Network.broadcastAndCollectVotes(
        record,
        signature,
        originNode
    );

    const consensus = task2Network.reachConsensus(votes);

    if (consensus.decision === "ACCEPT") {
        task2Network.syncStorage(record);
    }

    return {
        votes,
        decision: consensus.decision,
        acceptCount: consensus.acceptCount,
        rejectCount: consensus.rejectCount,
        totalNodes: consensus.totalNodes,
        nodes: task2Nodes
    };
}

function getTask2StorageStatus() {
    return task2Nodes;
}