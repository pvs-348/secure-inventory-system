import { InventoryNode } from './node.js';

export class InventoryNetwork {
    constructor(nodes) {
        this.nodes = nodes;
    }

    broadcastAndCollectVotes(record, signature, utils) {
        let votes = [];

        for (let node of this.nodes) {
            const vote = node.vote(record, signature, utils);
            votes.push({ node: node.name, vote });
        }

        return votes;
    }

    reachConsensus(votes) {
        const acceptCount = votes.filter(v => v.vote === "ACCEPT").length;

        return (acceptCount >= 3) ? "ACCEPT" : "REJECT";
    }

    syncStorage(record) {
        for (let node of this.nodes) {
            node.storeRecord(record);
        }
    }
}