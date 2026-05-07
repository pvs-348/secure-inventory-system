function getSelectedNode() {
  return document.getElementById("originNode").value;
}

function getRecordFromForm() {
  return {
    itemId: document.getElementById("itemId").value.trim(),
    itemQty: document.getElementById("itemQty").value.trim(),
    itemPrice: document.getElementById("itemPrice").value.trim(),
    location: document.getElementById("location").value.trim().toUpperCase()
  };
}

function validateRecord(record, selectedNode) {
  if (!record.itemId) {
    return "ERROR: Item ID is missing. Enter a valid item ID.";
  }

  if (!record.itemQty) {
    return "ERROR: Item quantity is missing. Enter a valid quantity. ";
  }

  if (Number(record.itemQty) <= 0) {
    return "ERROR: Invalid quantity. Quantity must be a positive number. ";
  }

  if (!record.itemPrice) {
    return "ERROR: Item price is missing. Enter a valid price. (You can't give free items!)";
  }

  if (Number(record.itemPrice) <= 0) {
    return "ERROR: Invalid price. Price must be a positive number. (You can't give money with the items!)";
  }

  if (!record.location) {
    return "ERROR: Location is missing. Enter the inventory location.";
  }

  if (record.location.toUpperCase() !== selectedNode) {
    return "ERROR: Incorrect sender location. You can't act smart and impersonate another inventory, breacher!";
  }

  return null;
}

function formatStorageStatus(nodes) {
  let output = "";

  nodes.forEach(node => {
    output += `Inventory ${node.name} Local Records:\n`;

    const records = node.getRecords();

    if (records.length === 0) {
      output += "  EMPTY - no records stored yet.\n\n";
      return;
    }

    records.forEach((record, index) => {
      output += `  ${index + 1}. Item ID: ${record.itemId}, `;
      output += `Qty: ${record.itemQty}, `;
      output += `Price: ${record.itemPrice}, `;
      output += `Location: ${record.location}\n`;
    });

    output += "\n";
  });

  return output;
}

let detailedRecord = null;
let detailedOriginNode = null;
let detailedMessage = null;
let detailedHash = null;
let detailedRSA = null;
let detailedSignature = null;
let detailedVerification = null;
let detailedVotes = null;

function showInitialStorageStatus() {
  const output =
    "CURRENT INVENTORY STATE\n" +
    "\n" +
    formatStorageStatus(getTask2StorageStatus());

  document.getElementById("outInitialStorage").textContent = output;
}

function step1CreateRecord() {
  detailedOriginNode = getSelectedNode();
  detailedRecord = getRecordFromForm();

  const validationError = validateRecord(detailedRecord, detailedOriginNode);

  if (validationError) {
    document.getElementById("outCreateRecord").textContent = validationError;
    return;
  }

  document.getElementById("outCreateRecord").textContent =
    "RECORD CREATED SUCCESSFULLY\n" +
    "\n" +
    `Originating Node: Inventory ${detailedOriginNode}\n\n` +
    JSON.stringify(detailedRecord, null, 2);
}

function step2FormatMessage() {
  if (!detailedRecord) {
    document.getElementById("outFormatMessage").textContent =
      "ERROR: Create the record first.";
    return;
  }

  detailedMessage = recordToMessage(detailedRecord);

  document.getElementById("outFormatMessage").textContent =
    "FORMATTED MESSAGE\n" +
    "\n" +
    "Format used: itemId|itemQty|itemPrice|location\n\n" +
    `Message: ${detailedMessage}`;
}

function step3ConvertMessageInt() {
  if (!detailedMessage) {
    document.getElementById("outMessageInt").textContent =
      "ERROR: Format the message first.";
    return;
  }

  detailedHash = textToBigIntHash(detailedMessage);
  const conversion = getMessageConversionSteps(detailedMessage);

  let output = "";

  output += "MESSAGE INTEGER or HASH CONVERSION\n";
  output += "\n";

  output += "Characters:\n";
  output += `${conversion.characters.join("   ")}\n\n`;

  output += "ASCII decimal values:\n";
  output += `${conversion.asciiCodes.join("   ")}\n\n`;

  output += "Base-256 conversion steps:\n";
  conversion.steps.forEach(item => {
    output += `Step ${item.step}: ${item.previousValue} × 256 + ${item.asciiCode} = ${item.result}\n`;
  });

  output += "\nFinal Message Integer:\n";
  output += `${detailedHash}`;

  document.getElementById("outMessageInt").textContent = output;
}

function step4DeriveKeys() {
  if (!detailedOriginNode) {
    document.getElementById("outRSA").textContent =
      "ERROR: Please complete the previous step first.";
    return;
  }

  detailedRSA = deriveRSAKeys(detailedOriginNode);

  let output = "";

  output += "RSA VALUES\n";
  output += "\n";

  output += `Inventory Node: ${detailedOriginNode}\n\n`;
  output += `p = ${detailedRSA.p}\n\n`;
  output += `q = ${detailedRSA.q}\n\n`;
  output += `e = ${detailedRSA.e}\n\n`;
  output += `n = p × q\n${detailedRSA.n}\n\n`;
  output += `phi = (p - 1)(q - 1)\n${detailedRSA.phi}\n\n`;
  output += `gcd(e, phi) = ${detailedRSA.gcdValue}\n\n`;
  output += `d = e^(-1) mod phi\n${detailedRSA.d}`;

  document.getElementById("outRSA").textContent = output;
}

function step5SignRecord() {
  if (!detailedRecord || !detailedOriginNode) {
    document.getElementById("outSign").textContent =
      "ERROR: Generate RSA keys first.";
    return;
  }

  const signed = signRecord(detailedOriginNode, detailedRecord);

  detailedMessage = signed.message;
  detailedHash = signed.hash;
  detailedRSA = signed.rsa;
  detailedSignature = signed.signature;

  let output = "";

  output += "DIGITAL SIGNATURE GENERATION\n";
  output += "\n";
  output += `Message: ${detailedMessage}\n\n`;
  output += `Message Integer: ${detailedHash}\n\n`;
  output += "Formula: signature = MessageInteger^d mod n\n\n";
  output += `Signature:\n${detailedSignature}`;

  document.getElementById("outSign").textContent = output;
}

function step6VerifySignature() {
  if (!detailedSignature) {
    document.getElementById("outVerify").textContent =
      "ERROR: Sign the record first.";
    return;
  }

  detailedVerification = verifySignature(
    detailedOriginNode,
    detailedMessage,
    detailedHash,
    detailedSignature
  );

  let output = "";

  output += "SIGNATURE VERIFICATION\n";
  output += "\n";
  output += "Formula: recoveredHash = signature^e mod n\n\n";
  output += `Recovered Hash:\n${detailedVerification.recoveredHash}\n\n`;
  output += `Original Hash:\n${detailedVerification.originalHash}\n\n`;
  output += detailedVerification.isValid
    ? "VALID SIGNATURE: record authenticity and integrity verified."
    : "INVALID SIGNATURE: record verification failed.";

  document.getElementById("outVerify").textContent = output;
}

function step7BroadcastVotes() {
  if (!detailedVerification || !detailedVerification.isValid) {
    document.getElementById("outVotes").textContent =
      "ERROR: Verify the signature successfully before broadcasting.";
    return;
  }

  detailedVotes = task2Network.broadcastAndCollectVotes(
    detailedRecord,
    detailedSignature,
    detailedOriginNode
  );

  let output = "";

  output += "PBFT-STYLE BROADCAST AND NODE VOTING\n";
  output += "\n";

  output += "1. WHAT IS BROADCASTED?\n";
  output += "The originating inventory node broadcasts this signed record package:\n\n";
  output += `Origin Node      : Inventory ${detailedOriginNode}\n`;
  output += `Record           : ${JSON.stringify(detailedRecord)}\n`;
  output += `Formatted Message: ${detailedMessage}\n`;
  output += `Message Integer  : ${detailedHash}\n`;
  output += `RSA Signature    : ${detailedSignature}\n\n`;

  output += "2. WHAT DOES EACH NODE CHECK BEFORE VOTING?\n";
  output += "Each inventory node independently verifies the same package using these rules:\n";
  output += "- Signature must be valid using the origin node's public key.\n";
  output += "- Item ID, quantity, price and location must exist.\n";
  output += "- Quantity must be positive.\n";
  output += "- Price must be positive.\n";
  output += "- Location must match the originating node identity.\n\n";

  output += "3. WHY THIS IS PBFT-STYLE?\n";
  output += "This is a simplified PBFT-style process because all nodes are known participants, ";
  output += "the signed request is broadcast to every node, each node independently validates it, ";
  output += "and agreement is based on a 3-out-of-4 acceptance threshold.\n\n";

  output += "4. NODE VERIFICATION AND VOTING RESULTS\n\n";

  detailedVotes.forEach(v => {
    output += `Inventory ${v.node}\n`;
    output += `  Signature check : ${v.signatureValid ? "PASS" : "FAIL"}\n`;
    output += `  Data check      : ${v.dataValid ? "PASS" : "FAIL"}\n`;
    output += `  Vote decision   : ${v.vote}\n\n`;
  });

  document.getElementById("outVotes").textContent = output;
}

function step8ConsensusStorage() {
  if (!detailedVotes) {
    document.getElementById("outConsensus").textContent =
      "ERROR: Broadcast and collect votes first.";
    return;
  }

  const consensus = task2Network.reachConsensus(detailedVotes);

  if (consensus.decision === "ACCEPT") {
  task2Network.syncStorage(detailedRecord);

  fetch("/store-record", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      record: detailedRecord
    })
  });
}

  let output = "";

  output += "PBFT-STYLE CONSENSUS AND STORAGE\n";
  output += "\n";

  output += "1. VOTES RECEIVED FROM INVENTORY NODES\n";
  detailedVotes.forEach(v => {
    output += `Inventory ${v.node}: ${v.vote}\n`;
  });

  output += "\n2. CONSENSUS RULE USED\n";
  output += "This prototype uses a simplified PBFT-style rule:\n";
  output += "A record is accepted only if at least 3 out of 4 inventory nodes vote ACCEPT.\n\n";

  output += "Reason:\n";
  output += "With 4 known inventory nodes, the system can tolerate 1 faulty or malicious node.\n";
  output += "So even if one node rejects or behaves incorrectly, 3 matching ACCEPT votes are enough for agreement.\n\n";

  output += "3. VOTE COUNT\n";
  output += `Accept Votes: ${consensus.acceptCount}/${consensus.totalNodes}\n`;
  output += `Reject Votes: ${consensus.rejectCount}/${consensus.totalNodes}\n\n`;

  output += "4. FINAL CONSENSUS DECISION\n";
  output += `Decision: ${consensus.decision}\n\n`;

  output += "5. STORAGE ACTION\n";

  if (consensus.decision === "ACCEPT") {
    output += "Consensus reached.\n";
    output += "The record is committed and copied into every inventory node's local storage.\n\n";
  } else {
    output += "Consensus threshold not reached.\n";
    output += "The record is rejected and no inventory node storage is updated.\n\n";
  }

  output += "6. CURRENT LOCAL STORAGE AFTER CONSENSUS\n";
  output += formatStorageStatus(getTask2StorageStatus());

  document.getElementById("outConsensus").textContent = output;

  detailedRecord = null;
  detailedOriginNode = null;
  detailedMessage = null;
  detailedHash = null;
  detailedRSA = null;
  detailedSignature = null;
  detailedVerification = null;
  detailedVotes = null;

  fetch("/store-record", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ record: detailedRecord })
});
}

async function resetDetailedWorkflow() {
  await fetch("/clear-storage", { method: "POST" });

  detailedRecord = null;
  detailedOriginNode = null;
  detailedMessage = null;
  detailedHash = null;
  detailedRSA = null;
  detailedSignature = null;
  detailedVerification = null;
  detailedVotes = null;

  clearTask2Storage();

  document.getElementById("outInitialStorage").textContent = "Storage cleared. No records stored yet.";
  document.getElementById("outCreateRecord").textContent = "Waiting for record creation.";
  document.getElementById("outFormatMessage").textContent = "Waiting for formatted message.";
  document.getElementById("outMessageInt").textContent = "Waiting for message integer calculation.";
  document.getElementById("outRSA").textContent = "Waiting for RSA derivation.";
  document.getElementById("outSign").textContent = "Waiting for signature.";
  document.getElementById("outVerify").textContent = "Waiting for verification.";
  document.getElementById("outVotes").textContent = "Waiting for node votes.";
  document.getElementById("outConsensus").textContent = "Waiting for consensus result.";
}