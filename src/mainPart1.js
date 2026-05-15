// these are just helper functions to grab values from the HTML form on the page
// getSelectedNode reads which inventory node (A, B, C, D) the user picked from the dropdown
function getSelectedNode() {
  return document.getElementById("originNode").value;
}

// getRecordFromForm reads all 4 input fields and puts them into one object
// trim() just removes any accidental spaces the user might have typed
function getRecordFromForm() {
  const itemId = document.getElementById("itemId").value.trim();
  const itemQty = document.getElementById("itemQty").value.trim();
  const itemPrice = document.getElementById("itemPrice").value.trim();
  const location = document.getElementById("location").value.trim().toUpperCase();

  return {
    itemId: itemId,
    itemQty: itemQty,
    itemPrice: itemPrice,
    location: location
  };
}


// this checks if the record the user filled in is actually valid before we do anything with it
// we check each field one by one and return an error message if something is wrong
// if everything is fine we return null (meaning no error)
function validateRecord(record, selectedNode) {

  // item ID must not be empty
  if (!record.itemId) {
    return "ERROR: Item ID is missing. Enter a valid item ID.";
  }

  // quantity must exist
  if (!record.itemQty) {
    return "ERROR: Item quantity is missing. Enter a valid quantity. ";
  }

  // quantity must be a positive number (cant have 0 or negative stock)
  if (Number(record.itemQty) <= 0) {
    return "ERROR: Invalid quantity. Quantity must be a positive number. ";
  }

<<<<<<< HEAD
=======
  // quantity must be a positive whole number, not in decimals (cant have 2.5 of an item, it has to be a whole number)
  if (!Number.isInteger(Number(record.itemQty)) || Number(record.itemQty) <= 0) {
    return "ERROR: Invalid quantity. Quantity must be a positive whole number.";
  }

>>>>>>> a7cac65fb1c7bcae010c40a5501f34b85aa86ac9
  // price must exist
  if (!record.itemPrice) {
    return "ERROR: Item price is missing. Enter a valid price. (You can't give free items!)";
  }

  // price must also be positive (cant sell something for 0 or negative dollars)
  if (Number(record.itemPrice) <= 0) {
    return "ERROR: Invalid price. Price must be a positive number. (You can't give money with the items!)";
  }

  // location field must not be empty
  if (!record.location) {
    return "ERROR: Location is missing. Enter the inventory location.";
  }

  // the location in the record must match whichever node the user selected
  // e.g. if you picked node A, the location should be A
  // if they dont match, someone is trying to fake which node submitted the record
  if (record.location.toUpperCase() !== selectedNode) {
    return "ERROR: Incorrect sender location. You can't act smart and impersonate another inventory, breacher!";
  }

  // if we made it here without returning an error, the record is valid
  return null;
}


// this builds a text summary of what records each node currently has stored
// it loops through every node and prints their records line by line
// this is used to display the storage status in the UI
function formatStorageStatus(nodes) {
  let output = "";

  nodes.forEach(node => {
    output += `Inventory ${node.name} Local Records:\n`;

    const records = node.getRecords();

    // if this node has no records yet, just say it's empty
    if (records.length === 0) {
      output += "  EMPTY - no records stored yet.\n\n";
      return;
    }

    // otherwise print each record with a number
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


// these variables store all the info from each step so the next step can use them
// we declared them all up here so they are accessible from every function below
// (if we declared them inside a function they would disappear after that function finishes)
let detailedRecord = null;
let detailedOriginNode = null;
let detailedMessage = null;
let detailedHash = null;
let detailedRSA = null;
let detailedSignature = null;
let detailedVerification = null;
let detailedVotes = null;


// this runs when the page first loads (or when the user opens the system)
// it just shows the current storage state of all 4 nodes at the start
function showInitialStorageStatus() {
  const output =
    "CURRENT INVENTORY STATE\n" +
    "\n" +
    formatStorageStatus(getTask2StorageStatus());

  document.getElementById("outInitialStorage").textContent = output;
}


// STEP 1 - user fills in the form and clicks create record
// this reads the form, validates the input, and saves the record if it looks good
function step1CreateRecord() {

  // read what node was selected and what the user typed into the form
  detailedOriginNode = getSelectedNode();
  detailedRecord = getRecordFromForm();

  // run the validation checks on the record
  const validationError = validateRecord(detailedRecord, detailedOriginNode);

  // if there was an error, show it and stop here
  if (validationError) {
    document.getElementById("outCreateRecord").textContent = validationError;
    return;
  }

  // if no error, show a success message with the record details
  document.getElementById("outCreateRecord").textContent =
    "RECORD CREATED SUCCESSFULLY\n" +
    "\n" +
    `Originating Node: Inventory ${detailedOriginNode}\n\n` +
    JSON.stringify(detailedRecord, null, 2);
}


// STEP 2 - format the record into a plain message string
// we need to convert the record object into one string before we can hash it
// the format is: itemId|itemQty|itemPrice|location  (pipe separated)
function step2FormatMessage() {

  // cant do this step if step 1 wasnt done yet
  if (!detailedRecord) {
    document.getElementById("outFormatMessage").textContent =
      "ERROR: Create the record first.";
    return;
  }

  // call recordToMessage which joins all the fields together with | in between
  detailedMessage = recordToMessage(detailedRecord);

  document.getElementById("outFormatMessage").textContent =
    "FORMATTED MESSAGE\n" +
    "\n" +
    "Format used: itemId|itemQty|itemPrice|location\n\n" +
    `Message: ${detailedMessage}`;
}


// STEP 3 - convert the message string into a big integer (the hash)
// RSA only works on numbers not text, so we convert the message to a number
// the method is base-256 encoding: go character by character, multiply by 256, add ascii code
function step3ConvertMessageInt() {

  // need the message from step 2 first
  if (!detailedMessage) {
    document.getElementById("outMessageInt").textContent =
      "ERROR: Format the message first.";
    return;
  }

  // convert the message to a BigInt number
  detailedHash = textToBigIntHash(detailedMessage);

  // also get the step by step breakdown so we can show the working in the UI
  const conversion = getMessageConversionSteps(detailedMessage);

  let output = "";

  output += "MESSAGE INTEGER or HASH CONVERSION\n";
  output += "\n";

  // show the characters in the message
  output += "Characters:\n";
  output += `${conversion.characters.join("   ")}\n\n`;

  // show the ASCII number for each character
  output += "ASCII decimal values:\n";
  output += `${conversion.asciiCodes.join("   ")}\n\n`;

  // show each step of the base-256 calculation
  output += "Base-256 conversion steps:\n";
  conversion.steps.forEach(item => {
    output += `Step ${item.step}: ${item.previousValue} × 256 + ${item.asciiCode} = ${item.result}\n`;
  });

  // show the final number we got at the end
  output += "\nFinal Message Integer:\n";
  output += `${detailedHash}`;

  document.getElementById("outMessageInt").textContent = output;
}


// STEP 4 - derive all the RSA key values for the selected node
// this calculates n, phi, gcd, and d using the p, q, e values from the key list
function step4DeriveKeys() {

  // need to know which node we are using
  if (!detailedOriginNode) {
    document.getElementById("outRSA").textContent =
      "ERROR: Please complete the previous step first.";
    return;
  }

  // call deriveRSAKeys which does all the maths and returns p, q, e, n, phi, gcd, d
  detailedRSA = deriveRSAKeys(detailedOriginNode);

  let output = "";

  output += "RSA VALUES\n";
  output += "\n";

  // print out each key value one by one so the working is visible
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


// STEP 5 - sign the record using the private key
// formula: signature = messageInteger ^ d mod n
// this uses the PRIVATE key (d) to create the signature
// only the node that has d can produce a valid signature
function step5SignRecord() {

  // need the record and the node before signing
  if (!detailedRecord || !detailedOriginNode) {
    document.getElementById("outSign").textContent =
      "ERROR: Generate RSA keys first.";
    return;
  }

  // call signRecord which does: hash = convert message, signature = hash^d mod n
  const signed = signRecord(detailedOriginNode, detailedRecord);

  // save all the values from the signing result
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


// STEP 6 - verify the signature we just made
// formula: recoveredHash = signature ^ e mod n
// this uses the PUBLIC key (e) to check the signature
// if the recovered hash matches the original hash, the signature is valid
function step6VerifySignature() {

  // need the signature from step 5 first
  if (!detailedSignature) {
    document.getElementById("outVerify").textContent =
      "ERROR: Sign the record first.";
    return;
  }

  // run the verification - it decrypts the signature using the public key
  // and checks if we get back the same hash
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

  // show pass or fail based on whether the hashes matched
  output += detailedVerification.isValid
    ? "VALID SIGNATURE: record authenticity and integrity verified."
    : "INVALID SIGNATURE: record verification failed.";

  document.getElementById("outVerify").textContent = output;
}


// STEP 7 - broadcast the signed record to all 4 nodes and collect their votes
// this is the PBFT prepare phase where everyone independently checks the record
// each node checks two things: is the signature valid, and does the data make sense
function step7BroadcastVotes() {

  // cant broadcast if the signature didnt pass verification
  if (!detailedVerification || !detailedVerification.isValid) {
    document.getElementById("outVotes").textContent =
      "ERROR: Verify the signature successfully before broadcasting.";
    return;
  }

  // send the record + signature to all nodes and get back their votes
  detailedVotes = task2Network.broadcastAndCollectVotes(
    detailedRecord,
    detailedSignature,
    detailedOriginNode
  );

  let output = "";

  output += "PBFT-STYLE BROADCAST AND NODE VOTING\n";
  output += "\n";

  // show what exactly got broadcasted to all the nodes
  output += "1. WHAT IS BROADCASTED?\n";
  output += "The originating inventory node broadcasts this signed record package:\n\n";
  output += `Origin Node      : Inventory ${detailedOriginNode}\n`;
  output += `Record           : ${JSON.stringify(detailedRecord)}\n`;
  output += `Formatted Message: ${detailedMessage}\n`;
  output += `Message Integer  : ${detailedHash}\n`;
  output += `RSA Signature    : ${detailedSignature}\n\n`;

  // explain what each node checks before voting
  output += "2. WHAT DOES EACH NODE CHECK BEFORE VOTING?\n";
  output += "Each inventory node independently verifies the same package using these rules:\n";
  output += "- Signature must be valid using the origin node's public key.\n";
  output += "- Item ID, quantity, price and location must exist.\n";
  output += "- Quantity must be positive.\n";
  output += "- Price must be positive.\n";
  output += "- Location must match the originating node identity.\n\n";

  // explain why this qualifies as a simplified PBFT approach
  output += "3. WHY THIS IS PBFT-STYLE?\n";
  output += "This is a simplified PBFT-style process because all nodes are known participants, ";
  output += "the signed request is broadcast to every node, each node independently validates it, ";
  output += "and agreement is based on a 3-out-of-4 acceptance threshold.\n\n";

  // show each node's vote with the individual check results
  output += "4. NODE VERIFICATION AND VOTING RESULTS\n\n";

  detailedVotes.forEach(v => {
    output += `Inventory ${v.node}\n`;
    output += `  Signature check : ${v.signatureValid ? "PASS" : "FAIL"}\n`;
    output += `  Data check      : ${v.dataValid ? "PASS" : "FAIL"}\n`;
    output += `  Vote decision   : ${v.vote}\n\n`;
  });

  document.getElementById("outVotes").textContent = output;
}


// STEP 8 - count the votes, decide accept or reject, and save if accepted
// this is the PBFT commit phase - once 3+ nodes agree, the record is committed
// 3 out of 4 is the threshold because with 4 nodes we can tolerate 1 faulty node
function step8ConsensusStorage() {

  // need the votes from step 7 first
  if (!detailedVotes) {
    document.getElementById("outConsensus").textContent =
      "ERROR: Broadcast and collect votes first.";
    return;
  }

  // tally up the votes and get the final decision (ACCEPT or REJECT)
  const consensus = task2Network.reachConsensus(detailedVotes);

  // if consensus passed, save the record to all nodes and send it to the server too
  if (consensus.decision === "ACCEPT") {
    // save to in-memory storage of each node
    task2Network.syncStorage(detailedRecord);

    // also send to the backend server so it persists between sessions
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

  // show what each node voted
  output += "1. VOTES RECEIVED FROM INVENTORY NODES\n";
  detailedVotes.forEach(v => {
    output += `Inventory ${v.node}: ${v.vote}\n`;
  });

  // explain the rule we used
  output += "\n2. CONSENSUS RULE USED\n";
  output += "This prototype uses a simplified PBFT-style rule:\n";
  output += "A record is accepted only if at least 3 out of 4 inventory nodes vote ACCEPT.\n\n";
  output += "Reason:\n";
  output += "With 4 known inventory nodes, the system can tolerate 1 faulty or malicious node.\n";
  output += "So even if one node rejects or behaves incorrectly, 3 matching ACCEPT votes are enough for agreement.\n\n";

  // show the actual numbers
  output += "3. VOTE COUNT\n";
  output += `Accept Votes: ${consensus.acceptCount}/${consensus.totalNodes}\n`;
  output += `Reject Votes: ${consensus.rejectCount}/${consensus.totalNodes}\n\n`;

  // show the final decision
  output += "4. FINAL CONSENSUS DECISION\n";
  output += `Decision: ${consensus.decision}\n\n`;

  // explain what happened to storage
  output += "5. STORAGE ACTION\n";

  if (consensus.decision === "ACCEPT") {
    output += "Consensus reached.\n";
    output += "The record is committed and copied into every inventory node's local storage.\n\n";
  } else {
    output += "Consensus threshold not reached.\n";
    output += "The record is rejected and no inventory node storage is updated.\n\n";
  }

  // show the final storage state of all nodes
  output += "6. CURRENT LOCAL STORAGE AFTER CONSENSUS\n";
  output += formatStorageStatus(getTask2StorageStatus());

  document.getElementById("outConsensus").textContent = output;

  // reset all the step variables back to null so the next record starts fresh
  detailedRecord = null;
  detailedOriginNode = null;
  detailedMessage = null;
  detailedHash = null;
  detailedRSA = null;
  detailedSignature = null;
  detailedVerification = null;
  detailedVotes = null;
}


// this resets everything - clears the server storage, the in-memory storage,
// all the step variables, and all the output boxes on the page
// basically a full restart without refreshing the browser
async function resetDetailedWorkflow() {

  // tell the server to clear its stored records too
  await fetch("/clear-storage", { method: "POST" });

  // reset all the step-by-step variables
  detailedRecord = null;
  detailedOriginNode = null;
  detailedMessage = null;
  detailedHash = null;
  detailedRSA = null;
  detailedSignature = null;
  detailedVerification = null;
  detailedVotes = null;

  // clear all node records from memory
  clearTask2Storage();

  // reset all the output text boxes back to their default waiting messages
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