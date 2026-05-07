// ===============================
// TASK 2: Consensus Protocol - Simplified PBFT Style
// ===============================

// We chose a simplified version of PBFT (Practical Byzantine Fault Tolerance)
// because the assignment involves 4 inventory nodes that need to agree on whether
// a new record is valid before storing it
//
// In real PBFT, a system with f faulty nodes needs at least 3f+1 total nodes to work
// We have 4 nodes, so f=1, meaning 1 node can be faulty/malicious and the system still works
// That means we need at least 3 out of 4 nodes to ACCEPT for consensus to pass
// This is the main idea we are implementing below
//
// Our simplified flow is:
//   Step 1 - the originating node signs and broadcasts the record (done in Task 1)
//   Step 2 - each other node checks the signature and validates the data (PREPARE phase)
//   Step 3 - each node casts a vote: ACCEPT or REJECT
//   Step 4 - if 3 or more nodes vote ACCEPT, consensus is reached
//   Step 5 - the accepted record gets saved to every node's local storage



// InventoryNode represents one single inventory node in our distributed system
// Each node has its own name (A, B, C, D), its own RSA keys, and its own local list of records
class InventoryNode {
  constructor(name) {
    this.name = name;

    // derive this node's RSA keys based on its name
    // (p, q, e, n, d etc. all calculated here using the values from the assignment key list)
    this.rsa = deriveRSAKeys(name);

    // each node keeps its own local copy of accepted records
    // this is what gets updated after consensus passes
    this.records = [];
  }


  // this checks if the digital signature on the record is actually valid
  // we take the record, rebuild the message string and hash from it,
  // then use the origin node's PUBLIC key to verify
  // if the signature was made with the correct private key, it will check out
  verifyRecordSignature(record, signature, originNode) {

    // rebuild the message string from the record fields
    const message = recordToMessage(record);

    // hash that message into a BigInt number (same way it was hashed before signing)
    const hash = textToBigIntHash(message);

    // run RSA verification: recoveredHash = signature^e mod n
    // if recoveredHash matches hash, the signature is legit
    const result = verifySignature(originNode, message, hash, signature);

    return result.isValid;
  }


  // this checks whether the record data itself makes logical sense
  // even if the signature is valid, we still want to check the actual values
  // this is like a sanity check / basic data validation
  validateRecord(record, originNode) {

    // all four fields must exist and not be empty
    if (!record.itemId || !record.itemQty || !record.itemPrice || !record.location) {
      return false;
    }

    // quantity and price must be positive numbers (you cant have 0 or negative stock)
    if (Number(record.itemQty) <= 0 || Number(record.itemPrice) <= 0) {
      return false;
    }

    // the location field in the record should match the node that signed it
    // e.g. if node A signed this, the record location should be "A"
    // if they dont match something fishy is going on
    if (record.location.toUpperCase() !== originNode) {
      return false;
    }

    return true;
  }


  // this is the main voting function for this node
  // it combines the signature check and data check into one vote: ACCEPT or REJECT
  // this represents the PREPARE/COMMIT phase in PBFT where each node independently
  // checks the message and decides whether to approve it
  vote(record, signature, originNode) {

    // check the signature first
    const sigValid = this.verifyRecordSignature(record, signature, originNode);

    // also check the actual data values
    const dataValid = this.validateRecord(record, originNode);

    // only ACCEPT if BOTH checks pass
    // if either one fails, vote REJECT
    const vote = sigValid && dataValid ? "ACCEPT" : "REJECT";

    // return the full breakdown so we can show it in the UI
    return {
      node: this.name,
      signatureValid: sigValid,
      dataValid: dataValid,
      vote: vote
    };
  }


  // saves a record to this node's local list
  // this only gets called AFTER consensus has been reached
  storeRecord(record) {
    this.records.push({ ...record });  // spread to make a copy, not a reference
  }


  // just returns this node's current list of stored records
  getRecords() {
    return this.records;
  }
}



// InventoryNetwork represents the whole network of all 4 nodes together
// it handles broadcasting the record to all nodes and collecting their votes
// then it decides the final outcome based on vote counts
class InventoryNetwork {
  constructor(nodes) {
    // store the list of all nodes in the network
    this.nodes = nodes;
  }


  // this simulates broadcasting the record to every node and collecting a vote from each
  // in a real distributed system this would involve actual network messages
  // here we just loop through each node and ask it to vote
  // this represents the PREPARE phase of PBFT where the leader sends the message
  // to all replicas and waits for responses
  broadcastAndCollectVotes(record, signature, originNode) {
    const votes = [];

    for (let node of this.nodes) {
      // each node independently checks and votes
      const vote = node.vote(record, signature, originNode);
      votes.push(vote);
    }

    return votes;
  }


  // this counts up the votes and decides if consensus was reached
  // the PBFT rule for 4 nodes (f=1 faulty node tolerated) requires at least 3 accepts
  // so we check: did at least 3 out of 4 nodes say ACCEPT?
  // if yes -> consensus reached, record gets accepted
  // if no  -> consensus failed, record gets rejected
  reachConsensus(votes) {
    // count how many nodes voted ACCEPT
    const acceptCount = votes.filter(v => v.vote === "ACCEPT").length;

    // the rest voted REJECT
    const rejectCount = votes.length - acceptCount;

    // the threshold is 3 out of 4
    // this comes from the PBFT formula: need 2f+1 agreements where f=1
    // 2(1)+1 = 3, so we need at least 3 nodes agreeing
    const threshold = 3;
    const decision = acceptCount >= threshold ? "ACCEPT" : "REJECT";

    return {
      decision,
      acceptCount,
      rejectCount,
      totalNodes: votes.length
    };
  }


  // once consensus passes, we save the record to every node's local storage
  // this ensures all nodes stay in sync and have identical data
  // in PBFT this is the COMMIT phase - once agreement is reached, all nodes apply the change
  syncStorage(record) {
    for (let node of this.nodes) {
      node.storeRecord(record);
    }
  }
}



// create the 4 inventory nodes for our network
// these stay alive as long as the page is open (in-memory state)
const task2Nodes = [
  new InventoryNode("A"),
  new InventoryNode("B"),
  new InventoryNode("C"),
  new InventoryNode("D")
];

// create the network that links all 4 nodes together
const task2Network = new InventoryNetwork(task2Nodes);



// runTask2 is the main function that ties everything together for Task 2
// it takes the record + its signature (from Task 1) and runs the full consensus process
// the steps are:
//   1. broadcast record to all nodes, collect votes
//   2. count votes and decide ACCEPT or REJECT
//   3. if ACCEPT, save to all nodes
//   4. return everything for the UI to display
function runTask2(record, signature, originNode) {

  // Step 1: send the record to all nodes and collect their individual votes
  const votes = task2Network.broadcastAndCollectVotes(record, signature, originNode);

  // Step 2: tally the votes and get the final consensus decision
  const consensus = task2Network.reachConsensus(votes);

  // Step 3: only store the record if consensus passed (3+ nodes accepted)
  if (consensus.decision === "ACCEPT") {
    task2Network.syncStorage(record);
  }

  // Step 4: return everything so the UI can show the full breakdown
  return {
    votes,
    decision: consensus.decision,
    acceptCount: consensus.acceptCount,
    rejectCount: consensus.rejectCount,
    totalNodes: consensus.totalNodes,
    nodes: task2Nodes
  };
}


// helper to check what records each node has stored right now
// useful for showing the storage status in the UI after consensus
function getTask2StorageStatus() {
  return task2Nodes;
}


// clears all stored records from every node
// handy for resetting the demo without refreshing the page
function clearTask2Storage() {
  task2Nodes.forEach(node => {
    node.records = [];
  });
}