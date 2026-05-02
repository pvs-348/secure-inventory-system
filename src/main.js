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