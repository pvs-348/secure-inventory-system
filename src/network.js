class InventoryNetwork {
    constructor(nodes) {
        this.nodes = nodes;
    }

    broadcastAndCollectVotes(record, signature, originNode) {
        const votes = [];

        for (let node of this.nodes) {
            const vote = node.vote(record, signature, originNode);
            votes.push({ node: node.name, vote });
        }

        return votes;
    }

    reachConsensus(votes) {
        const acceptCount = votes.filter(v => v.vote === "ACCEPT").length;
        const rejectCount = votes.length - acceptCount;

        return {
            decision: acceptCount >= 3 ? "ACCEPT" : "REJECT",
            acceptCount,
            rejectCount,
            totalNodes: votes.length
        };
    }

    syncStorage(record) {
        for (let node of this.nodes) {
            node.storeRecord(record);
        }
    }
}