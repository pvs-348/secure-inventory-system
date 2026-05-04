let lastTask1Result = null;

function getRecordFromForm() {
  return {
    itemId: document.getElementById("itemId").value.trim(),
    itemQty: document.getElementById("itemQty").value.trim(),
    itemPrice: document.getElementById("itemPrice").value.trim(),
    location: document.getElementById("location").value.trim().toUpperCase()
  };
}

function getSelectedNode() {
  return document.getElementById("originNode").value;
}

function writeTask1Output(text) {
  document.getElementById("task1Output").textContent = text;
}

function writeTask2Output(text) {
  document.getElementById("task2Output").textContent = text;
}

function clearTask1Output() {
  writeTask1Output("Waiting for Task 1 workflow...");
}

function clearTask2Output() {
  writeTask2Output("Waiting for Task 2 workflow...");
}

function syncLocationWithNode() {
  document.getElementById("location").value = getSelectedNode();
}

function validateRecord(record, selectedNode) {
  if (!record.itemId) {
    return "ERROR: Item ID is missing. Enter a valid item ID.";
  }

  if (!record.itemQty) {
    return "ERROR: Item quantity is missing. Enter a valid quantity.";
  }

  if (Number(record.itemQty) <= 0) {
    return "ERROR: Invalid quantity. Quantity must be a positive number.";
  }

  if (!record.itemPrice) {
    return "ERROR: Item price is missing. Enter a valid price OR you want to sell stuff for free and cope a loss?";
  }

  if (Number(record.itemPrice) <= 0) {
    return "ERROR: Invalid price. Price must be a positive number, you can't pay people to take stuff off of you!";
  }

  if (!record.location) {
    return "ERROR: Location is missing. Enter the inventory location. Items can't be homeless, can they?";
  }

  if (record.location.toUpperCase() !== selectedNode) {
    return "ERROR: Incorrect sender location. You can't act smart and impersonate another inventory, breacher!";
  }

  return null;
}

function runTask1Workflow() {
  const selectedNode = getSelectedNode();
  const record = getRecordFromForm();

const validationError = validateRecord(record, selectedNode);

  if (validationError) {
    writeTask1Output(validationError);
    return;
  }

  try {
    const result = runTask1(selectedNode, record);

    lastTask1Result = {
      record,
      signature: result.signedData.signature,
      originNode: selectedNode
    };

    const signed = result.signedData;
    const verify = result.verification;
    const rsa = signed.rsa;

    let output = "";

    output += "TASK 1: DIGITAL SIGNATURE-BASED RECORD AUTHENTICATION\n";
    output += "======================================================\n\n";

    output += "1. NODE PERFORMING OPERATION\n";
    output += `Originating Node: Inventory ${selectedNode}\n\n`;

    output += "2. NEW INVENTORY RECORD\n";
    output += `Item ID       : ${record.itemId}\n`;
    output += `Item Quantity : ${record.itemQty}\n`;
    output += `Item Price    : ${record.itemPrice}\n`;
    output += `Location      : ${record.location}\n\n`;

    output += "3. RECORD MESSAGE FORMAT\n";
    output += `Message String: ${signed.message}\n\n`;

    output += "4. RSA PARAMETERS LOADED FROM LIST OF KEYS\n";
    output += `p = ${rsa.p}\n\n`;
    output += `q = ${rsa.q}\n\n`;
    output += `e = ${rsa.e}\n\n`;

    output += "5. DERIVED RSA VALUES\n";
    output += `n = p × q\n${rsa.n}\n\n`;
    output += `phi = (p - 1)(q - 1)\n${rsa.phi}\n\n`;
    output += `gcd(e, phi) = ${rsa.gcdValue}\n\n`;
    output += `d = e^(-1) mod phi\n${rsa.d}\n\n`;

    output += "6. MESSAGE-TO-INTEGER CONVERSION\n\n";
    const conversion = getMessageConversionSteps(signed.message);

    output += "Entered message in consistent format:\n";
    output += `${signed.message}\n\n`;

    output += "Message as characters:\n";
    output += `${conversion.characters.join("   ")}\n\n`;

    output += "ASCII decimal values:\n";
    output += `${conversion.asciiCodes.join("   ")}\n\n`;

    output += "Base-256 conversion steps:\n";
    conversion.steps.forEach(item => {
      output += `Step ${item.step}: ${item.previousValue} × 256 + ${item.asciiCode} = ${item.result}\n`;
    });

    output += "\nFinal message integer:\n";
    output += `${conversion.finalInteger}\n\n`;

    output += "7. DIGITAL SIGNATURE GENERATION\n";
    output += "Formula:\nsignature = Hash^d mod n\n";
    output += "Here, we have used: signature = MessageInteger^d mod n\n";
    output += `Signature = ${signed.signature}\n\n`;

    output += "8. SIGNATURE VERIFICATION\n";
    output += "Formula: recoveredHash = signature^e mod n\n";
    output += `Recovered Hash = ${verify.recoveredHash}\n`;
    output += `Original Hash  = ${verify.originalHash}\n\n`;

    output += "9. FINAL VERIFICATION RESULT\n";
    output += verify.isValid
      ? "VALID SIGNATURE: Record authenticity and integrity verified.\n"
      : "INVALID SIGNATURE: Record has failed verification.\n";

    output += "\nTask 1 completed. Now run Task 2 to broadcast this signed record for consensus.\n";

    writeTask1Output(output);

  } catch (error) {
    writeTask1Output("ERROR:\n" + error.message);
  }
}






function runTask2Workflow() {
  if (!lastTask1Result) {
    writeTask2Output("ERROR: Run Task 1 first. Task 2 uses the signed and verified record generated by Task 1.");
    return;
  }

  try {
    const { record, signature, originNode } = lastTask1Result;

    const result = runTask2(record, signature, originNode);

    let output = "";

    output += "TASK 2: PBFT-STYLE CONSENSUS AND LOCAL STORAGE\n";
    output += "======================================================\n\n";

    output += "1. SIGNED RECORD RECEIVED FROM TASK 1\n";
    output += `Originating Node: Inventory ${originNode}\n`;
    output += `Record: ${JSON.stringify(record)}\n`;
    output += `Signature: ${signature}\n\n`;

    output += "2. BROADCASTING RECORD TO ALL INVENTORY NODES\n";
    output += "The signed record is broadcast to Inventory A, B, C, and D.\n\n";

    output += "3. NODE VERIFICATION AND VOTING RESULTS\n";  
    result.votes.forEach(v => {
      output += `Inventory ${v.node}\n`;
      output += `  Signature Valid : ${v.signatureValid ? "YES" : "NO"}\n`;
      output += `  Data Valid      : ${v.dataValid ? "YES" : "NO"}\n`;
      output += `  Final Vote      : ${v.vote}\n\n`;
    });

    output += "\n4. CONSENSUS RULE\n";
    output += "Simplified PBFT-style rule: accept if at least 3 out of 4 nodes vote ACCEPT.\n";
    output += `Accept Votes: ${result.acceptCount}/${result.totalNodes}\n`;
    output += `Reject Votes: ${result.rejectCount}/${result.totalNodes}\n\n`;

    output += "5. FINAL CONSENSUS DECISION\n";
    output += `Decision: ${result.decision}\n\n`;

    if (result.decision === "ACCEPT") {
      output += "6. STORAGE RESULT\n";
      output += "Consensus successful. Record stored in every inventory node's local storage.\n\n";

      output += formatStorageStatus(result.nodes);
    } else {
      output += "6. STORAGE RESULT\n";
      output += "Consensus failed. Record was not stored.\n";
    }

    writeTask2Output(output);

    lastTask1Result = null;

  } catch (error) {
    writeTask2Output("ERROR (Task 2):\n" + error.message);
  }
}

function showTask2StorageStatus() {
  try {
    const nodes = getTask2StorageStatus();

    let output = "";

    output += "CURRENT LOCAL STORAGE OF ALL INVENTORY NODES\n";
    output += "======================================================\n\n";
    output += formatStorageStatus(nodes);

    writeTask2Output(output);

  } catch (error) {
    writeTask2Output("ERROR (Storage Status):\n" + error.message);
  }
}

function formatStorageStatus(nodes) {
  let output = "";

  nodes.forEach(node => {
    output += `Inventory ${node.name} Local Records:\n`;

    const records = node.getRecords();

    if (records.length === 0) {
      output += "  No records stored yet.\n\n";
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