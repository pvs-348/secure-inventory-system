function runTask2(record, signature, originNode) {
    const nodes = [
        new InventoryNode("A"),
        new InventoryNode("B"),
        new InventoryNode("C"),
        new InventoryNode("D")
    ];

    const network = new InventoryNetwork(nodes);

    const votes = network.broadcastAndCollectVotes(
        record,
        signature,
        originNode
    );

    const consensus = network.reachConsensus(votes);

    if (consensus.decision === "ACCEPT") {
        network.syncStorage(record);
    }

    return {
        votes,
        decision: consensus.decision,
        acceptCount: consensus.acceptCount,
        rejectCount: consensus.rejectCount,
        totalNodes: consensus.totalNodes,
        nodes
    };
}