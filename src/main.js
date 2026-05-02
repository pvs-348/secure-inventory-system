let lastTask1Result = null;

function getRecordFromForm() {
  return {
    itemId: document.getElementById("itemId").value.trim(),
    itemQty: document.getElementById("itemQty").value.trim(),
    itemPrice: document.getElementById("itemPrice").value.trim(),
    location: document.getElementById("location").value.trim()
  };
}

function getSelectedNode() {
  return document.getElementById("originNode").value;
}

function writeOutput(text) {
  document.getElementById("output").textContent = text;
}

function clearOutput() {
  writeOutput("Waiting for Task 1 workflow...");
}

function validateRecord(record) {
  if (!record.itemId || !record.itemQty || !record.itemPrice || !record.location) {
    return false;
  }

  if (Number(record.itemQty) <= 0 || Number(record.itemPrice) <= 0) {
    return false;
  }

  return true;
}

function runTask1Workflow() {
  const selectedNode = getSelectedNode();
  const record = getRecordFromForm();

  if (!validateRecord(record)) {
    writeOutput("ERROR: Invalid record. Fill all fields and use positive quantity/price.");
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
    output += "Formula: \nsignature = Hash^d mod n\n";
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

    writeOutput(output);
  } catch (error) {
    writeOutput("ERROR:\n" + error.message);
  }
}




// Task 2 workflow


function runTask2Workflow() {
  if (!lastTask1Result) {
    writeOutput("ERROR: Run Task 1 first before Task 2.");
    return;
  }

  try {
    const { record, signature, originNode } = lastTask1Result;

    const result = runTask2(record, signature, originNode);

    let output = "";

    output += "\n\nTASK 2: CONSENSUS PROTOCOL (PBFT-STYLE)\n";
    output += "======================================================\n\n";

    output += "1. BROADCASTING RECORD TO ALL INVENTORY NODES\n";
    output += `Record: ${JSON.stringify(record)}\n\n`;

    output += "2. NODE VOTING RESULTS\n";

    result.votes.forEach(v => {
      output += `Inventory ${v.node}: ${v.vote}\n`;
    });

    output += "\n3. CONSENSUS DECISION\n";
    output += `Final Decision: ${result.decision}\n\n`;

    if (result.decision === "ACCEPT") {
      output += "4. RECORD STORED IN ALL NODES\n\n";

      result.nodes.forEach(node => {
        output += `Inventory ${node.name} Records:\n`;
        node.getRecords().forEach((r, i) => {
          output += `  ${i + 1}. ${JSON.stringify(r)}\n`;
        });
        output += "\n";
      });

    } else {
      output += "4. RECORD REJECTED — NOT STORED\n";
    }

    writeOutput(output);

  } catch (error) {
    writeOutput("ERROR (Task 2):\n" + error.message);
  }
}



function runTask2FullWorkflow() {
  const selectedNode = getSelectedNode();
  const record = getRecordFromForm();

  if (!validateRecord(record)) {
    writeOutput("ERROR: Invalid record. Fill all fields and use positive quantity/price.");
    return;
  }

  try {
    const task1Result = runTask1(selectedNode, record);

    const signed = task1Result.signedData;

    const task2Result = runTask2(
      record,
      signed.signature,
      selectedNode
    );

    let output = "";

    output += "TASK 2: PBFT-STYLE CONSENSUS PROTOCOL INTEGRATION\n";
    output += "======================================================\n\n";

    output += "1. RECORD CREATED AND SIGNED\n";
    output += `Originating Node: Inventory ${selectedNode}\n`;
    output += `Record: ${JSON.stringify(record)}\n`;
    output += `Message: ${signed.message}\n`;
    output += `Message Integer: ${signed.hash}\n`;
    output += `Signature: ${signed.signature}\n\n`;

    output += "2. BROADCAST TO INVENTORY NODES\n";
    output += "Signed record broadcast to Inventory A, B, C, and D.\n\n";

    output += "3. NODE VOTING RESULTS\n";
    task2Result.votes.forEach(v => {
      output += `Inventory ${v.node}: ${v.vote}\n`;
    });

    output += "\n4. CONSENSUS RULE\n";
    output += "PBFT-style simplified rule: accept if at least 3 out of 4 nodes vote ACCEPT.\n";
    output += `Accept Votes: ${task2Result.acceptCount}/${task2Result.totalNodes}\n`;
    output += `Reject Votes: ${task2Result.rejectCount}/${task2Result.totalNodes}\n\n`;

    output += "5. FINAL CONSENSUS DECISION\n";
    output += `Decision: ${task2Result.decision}\n\n`;

    if (task2Result.decision === "ACCEPT") {
      output += "6. LOCAL STORAGE AFTER CONSENSUS\n";

      task2Result.nodes.forEach(node => {
        output += `\nInventory ${node.name} Local Records:\n`;

        node.getRecords().forEach((r, index) => {
          output += `  ${index + 1}. ${JSON.stringify(r)}\n`;
        });
      });
    } else {
      output += "6. STORAGE RESULT\n";
      output += "Record rejected. No node storage was updated.\n";
    }

    writeOutput(output);

  } catch (error) {
    writeOutput("ERROR (Task 2):\n" + error.message);
  }
}