// TASK 3: UI Step Functions for Harn Multi-Signature Query Workflow.
// This file drives the step-by-step UI for Task 3.
// State variables are declared at the top and built up step by step.
// Each step function reads from the previous step's state, so buttons must be clicked top to bottom in order.


//WORKFLOW STATE
// These are set progressively as each step runs

let t3QueryItemId   = null;   // the item ID the PO queried
let t3QueryResult   = null;   // the record found across inventory nodes
let t3QueryMessage  = null;   // formatted message string e.g. "001|32"
let t3MessageInt    = null;   // BigInt representation of the quantity (m)
let t3PKGKeys       = null;   // derived PKG RSA parameters
let t3POKeys        = null;   // derived PO RSA parameters
let t3SecretKeys    = null;   // { A: g_A, B: g_B, C: g_C, D: g_D }
let t3TValues       = null;   // { A: t_A, B: t_B, C: t_C, D: t_D }
let t3T             = null;   // aggregate t = product(t_i) mod n_pkg
let t3Hash          = null;   // H(t, m)
let t3PartialSigs   = null;   // { A: s_A, B: s_B, C: s_C, D: s_D }
let t3S             = null;   // aggregate s = product(s_i) mod n_pkg
let t3Verification  = null;   // multi-sig verification result
let t3Ciphertext    = null;   // RSA ciphertext c = m^e_po mod n_po
let t3Decrypted     = null;   // PO's decrypted result



// Show Current Inventory
// Fetches all records from the server and displays them.
// The PO uses this to decide what to query.
async function t3ShowInventory() {
  const out = document.getElementById("outT3Inventory");
  out.textContent = "Fetching inventory from server...";

  try {
    const res = await fetch("/storage");
    const data = await res.json();

    let text = "CURRENT INVENTORY STATE\n\n";

    for (const [node, records] of Object.entries(data)) {
      text += `Inventory ${node} Local Records:\n`;

      if (!records || records.length === 0) {
        text += "  EMPTY - no records stored yet.\n\n";
      } else {
        records.forEach((r, i) => {
          text += `  ${i + 1}. Item ID: ${r.itemId}, `;
          text += `Qty: ${r.itemQty}, `;
          text += `Price: ${r.itemPrice}, `;
          text += `Location: ${r.location}\n`;
        });
        text += "\n";
      }
    }

    out.textContent = text;

  } catch (err) {
    out.textContent =
      "ERROR: Could not fetch inventory from server.\n" +
      "Make sure the Node.js server is running (node src/server.js).\n\n" +
      err.message;
  }
}
// STEP 1: Submit Query
// The Procurement Officer enters an Item ID to query.
//  The system looks up that item across all inventory nodes and checks consistency.
async function t3SubmitQuery() {
  const out = document.getElementById("outT3Query");
  const itemId = document.getElementById("queryItemId").value.trim();

  if (!itemId) {
    out.textContent = "ERROR: Please enter an Item ID to query.";
    return;
  }

  out.textContent = "Forwarding query to all inventory nodes";

  try {
    const res = await fetch("/storage");
    const data = await res.json();

    // check each node for this item
    const nodeResults = {};
    let firstFound = null;

    for (const [node, records] of Object.entries(data)) {
      const match = records.find(r => r.itemId === itemId);
      nodeResults[node] = match || null;
      if (match && !firstFound) firstFound = match;
    }

    // if no node has the item, stop here
    if (!firstFound) {
      out.textContent =
        `ERROR: Item ID "${itemId}" was not found in any inventory node.\n\n` +
        "Please use Task 1+2 to add records first then query here.";
      return;
    }

    // check that all nodes that have the item agree on the quantity
    const foundRecords = Object.values(nodeResults).filter(r => r !== null);
    const quantities = foundRecords.map(r => r.itemQty);
    const allSame = quantities.every(q => q === quantities[0]);

    // save state for later steps
    t3QueryItemId = itemId;
    t3QueryResult = firstFound;
    const queryResult = `${firstFound.itemId}|${firstFound.itemQty}`;
    t3QueryMessage = queryResult;
    t3MessageInt   = textToBigIntHash(queryResult);

    let text = "";

    for (const [node, record] of Object.entries(nodeResults)) {
      text += `Inventory ${node}: `;
      if (record) {
        text += `FOUND Item ID: ${record.itemId}, Qty: ${record.itemQty}, `;
        text += `Price: ${record.itemPrice}, Location: ${record.location}\n`;
      } else {
        text += `NOT FOUND\n`;
      }
    }

    text += `\nConsistency Check (all nodes agree on quantity): `;
    text += allSame ? `PASS\n` : `FAIL — inconsistent data detected across nodes\n`;
    text += `\nMessage to be signed and encrypted:\n`;
    text += `  m = "${queryResult}"  (itemId|quantity)\n`;
    text += `  Message Integer: ${t3MessageInt}`;

    out.textContent = text;

  } catch (err) {
    out.textContent = "ERROR: " + err.message;
  }
}

// STEP 2: PKG and PO Key Derivation
// Derives RSA parameters (n, phi, d) for both the PKG and the Procurement Officer.
function t3DeriveKeys() {
  const out = document.getElementById("outT3PKGKeys");

  if (!t3MessageInt) {
    out.textContent = "ERROR: Submit a query first (Step 1).";
    return;
  }

  t3PKGKeys = derivePKGKeys();
  t3POKeys  = derivePOKeys();

  let text = "PKG AND PROCUREMENT OFFICER KEY DERIVATION\n\n";

  text += "PKG (Private Key Generator)\n";
  text += "The PKG manages identities and secret keys for all inventory nodes.\n\n";
  text += `p = ${t3PKGKeys.p}\n\n`;
  text += `q = ${t3PKGKeys.q}\n\n`;
  text += `e = ${t3PKGKeys.e}\n\n`;
  text += `n = p × q\n${t3PKGKeys.n}\n\n`;
  text += `phi(n) = (p-1)(q-1)\n${t3PKGKeys.phi}\n\n`;
  text += `gcd(e, phi) = ${t3PKGKeys.gcdValue} \n\n`;
  text += `d = e^(-1) mod phi(n)\n${t3PKGKeys.d}\n\n`;
  text += `PKG Public Key  = (e, n) = (${t3PKGKeys.e}, ${(t3PKGKeys.n)})\n`;
  text += `PKG Private Key = (d) = (${(t3PKGKeys.d)})\n\n`;

  text += "Procurement Officer(PO)\n";
  text += `p = ${t3POKeys.p}\n\n`;
  text += `q = ${t3POKeys.q}\n\n`;
  text += `e = ${t3POKeys.e}\n\n`;
  text += `n = p × q\n${t3POKeys.n}\n\n`;
  text += `phi(n) = (p-1)(q-1)\n${t3POKeys.phi}\n\n`;
  text += `gcd(e, phi) = ${t3POKeys.gcdValue}\n\n`;
  text += `d = e^(-1) mod phi(n)\n${t3POKeys.d}\n\n`;
  text += `PO Public Key  = (e, n) = (${t3POKeys.e}, ${(t3POKeys.n)})\n`;
  text += `PO Private Key = (d) = (${(t3POKeys.d)})`;

  out.textContent = text;
}

// STEP 3: Secret Key Generation
// The PKG signs each inventory node's identity to produce their secret key.
// Formula: g_i = ID_i ^ d_pkg mod n_pkg
function t3GenerateSecretKeys() {
  const out = document.getElementById("outT3SecretKeys");

  if (!t3PKGKeys) {
    out.textContent = "ERROR: Derive keys first (Step 2).";
    return;
  }

  t3SecretKeys = generateSecretKeys(t3PKGKeys);

  let text = "SECRET KEY GENERATION BY PKG\n\n";

  text += "Inventory Node Identities (from List of Keys):\n";
  for (const [node, id] of Object.entries(INVENTORY_IDS)) {
    text += `  Inventory ${node}: ID = ${id}\n`;
  }
  text += "\n";

  for (const [node, id] of Object.entries(INVENTORY_IDS)) {
    text += `Secret Key of Inventory ${node}:\n`;
    text += `g_${node} = ID_${node}^d_pkg mod n_pkg\n`;
    text += `g_${node} = ${id}^d_pkg mod n_pkg\n`;
    text += `g_${node} = ${(t3SecretKeys[node])}\n\n`;
  }

  text += "The PKG sends each secret key privately to the corresponding inventory node.\n";

  out.textContent = text;
}

// STEP 4: T Value Computation
// Each node computes t_i = r_i^e_pkg mod n_pkg using its assigned random number.
// Then all nodes compute the aggregate t = product(t_i) mod n_pkg.
function t3ComputeTValues() {
  const out = document.getElementById("outT3TValues");

  if (!t3SecretKeys) {
    out.textContent = "ERROR: Generate secret keys first (Step 3).";
    return;
  }

  const result = computeTValues(t3PKGKeys);
  t3TValues = result.tValues;
  t3T       = result.t;

  let text = "T VALUE COMPUTATION\n\n";
  text += "Random Numbers (from List of Keys):\n";
  for (const [node, r] of Object.entries(INVENTORY_RANDOMS)) {
    text += `  Inventory ${node}: r_${node} = ${r}\n`;
  }
  text += "\n";

  for (const [node, r] of Object.entries(INVENTORY_RANDOMS)) {
    text += `Inventory ${node}:\n`;
    text += `t_${node} = ${r}^e_pkg mod n_pkg\n`;
    text += `t_${node} = ${(t3TValues[node])}\n\n`;
  }

  text += "t = t_A × t_B × t_C × t_D mod n_pkg\n\n";
  text += `Aggregate t:\n${(t3T)}`;

  out.textContent = text;
}

// STEP 5: Hash Computation  H(t, m)
// The hash is computed by concatenating aggregate t with message m
// and applying the base-256 encoding.
function t3ComputeHash() {
  const out = document.getElementById("outT3Hash");

  if (!t3T) {
    out.textContent = "ERROR: Compute t values first (Step 4).";
    return;
  }

  t3Hash = computeHarnHash(t3T, t3MessageInt);

  let text = "HASH COMPUTATION: H(t, m)\n\n";
  text += `m: ${t3MessageInt}\n`;
  text += `t (aggregated): ${(t3T)}\n`;
  text += `H(t, m) = textToBigIntHash(str(t) + str(m))\n`;
  text += `        = "${(t3T)}" + "${t3MessageInt}"`;
  text += `        =${(t3Hash)}`;

  out.textContent = text;
}

// STEP 6: Partial Signature Computation
// Each node computes s_i = g_i * r_i^H(t,m) mod n_pkg
// Aggregate s = product(s_i) mod n_pkg
// Multi-signature = {t, s}
function t3ComputePartialSigs() {
  const out = document.getElementById("outT3PartialSigs");

  if (!t3Hash) {
    out.textContent = "ERROR: Compute the hash first (Step 5).";
    return;
  }

  const result = computePartialSignatures(t3PKGKeys, t3SecretKeys, t3Hash);
  t3PartialSigs = result.partialSigs;
  t3S           = result.s;

  let text = "PARTIAL SIGNATURE COMPUTATION\n\n";

  for (const [node, r] of Object.entries(INVENTORY_RANDOMS)) {
    text += `Inventory ${node}:\n`;
    text += `s_${node} = g_${node} × ${r}^H(t,m) mod n_pkg\n`;
    text += `s_${node} = ${(t3PartialSigs[node])}\n\n`;
  }

  text += "Each node broadcasts its s_i to all other nodes.\n";
  text += "All nodes compute the aggregate multi-signature s:\n\n";
  text += "s = s_A × s_B × s_C × s_D mod n_pkg\n\n";
  text += `Aggregate s:\n${(t3S)}\n\n`;
  text += "MULTI-SIGNATURE = { t, s }\n\n";
  text += `t = ${(t3T)}\n\n`;
  text += `s = ${(t3S)}`;

  out.textContent = text;
}

// STEP 7: PKG Consensus Check
// The PKG checks that all 4 nodes computed the same {t, s} values.
// All nodes run the same deterministic math so results must be identical.
function t3ConsensusCheck() {
  const out = document.getElementById("outT3ConsensusCheck");

  // Step 7 should only run after the partial signatures and aggregate signature are made.
  if (!t3S || !t3T || !t3PartialSigs) {
    out.textContent = "ERROR: Compute partial signatures first (Step 6).";
    return;
  }

  // This is the aggregate signature calculated in Step 6.
  // All nodes should agree on these same values.
  const finalT = t3T;
  const finalS = t3S;

  const nodes = ["A", "B", "C", "D"];
  const reports = [];

  // Each node checks the same broadcasted multi-signature values.
  for (const node of nodes) {
    // Recalculate aggregate t from all t_i values.
    let nodeT = 1n;
    for (const ti of Object.values(t3TValues)) {
      nodeT = (nodeT * ti) % t3PKGKeys.n;
    }

    // Recalculate aggregate s from all partial signatures s_i.
    let nodeS = 1n;
    for (const si of Object.values(t3PartialSigs)) {
      nodeS = (nodeS * si) % t3PKGKeys.n;
    }

    // Hash the aggregate t with the message integer.
    const h = computeHarnHash(nodeT, t3MessageInt);

    // Verify the final Harn multi-signature.
    const check = verifyHarnMultiSig(t3PKGKeys, nodeT, nodeS, h);

    // A node accepts only if the signature is valid
    // and its recalculated values match the final broadcast values.
    const accepted =
      check.isValid &&
      nodeT === finalT &&
      nodeS === finalS;

    reports.push({
      node: node,
      t: nodeT,
      s: nodeS,
      accepted: accepted
    });
  }

  // PBFT-style threshold: 3 out of 4 nodes must accept.
  let approvals = 0;
  for (const report of reports) {
    if (report.accepted) {
      approvals++;
    }
  }

  const threshold = 3;
  const consensusPassed = approvals >= threshold;

  let text = "CONSENSUS CHECK ON AGGREGATED MULTI-SIGNATURE\n\n";

  text += "Each inventory node recalculates the aggregate t and aggregate s values.\n";
  text += "Then each node verifies the Harn multi-signature and votes ACCEPT or REJECT.\n\n";

  for (const report of reports) {
    text += `Inventory ${report.node}:\n`;
    text += `  recalculated t = ${report.t}\n`;
    text += `  recalculated s = ${report.s}\n`;
    text += `  vote = ${report.accepted ? "ACCEPT" : "REJECT"}\n\n`;
  }

  text += `Approvals: ${approvals}/4\n`;
  text += `Required threshold: ${threshold}/4\n\n`;

  if (consensusPassed) {
    text += "CONSENSUS RESULT: PASS\n";
    text += "The approved query result can now be encrypted and sent to the Procurement Officer.";
  } else {
    text += "CONSENSUS RESULT: FAIL\n";
    text += "The query result is rejected because not enough nodes agreed.";
  }

  out.textContent = text;
}

// STEP 8: PKG Multi-Signature Verification
// Cryptographically verifies the aggregate multi-signature {t, s} using the PKG public key.
// Verification formula:
//   LHS: s^e_pkg mod n_pkg
//   RHS: (ID_A × ID_B × ID_C × ID_D) × t^H(t,m) mod n_pkg
function t3PKGVerify() {
  const out = document.getElementById("outT3Verify");

  if (!document.getElementById("outT3ConsensusCheck").textContent.includes("CONSENSUS RESULT: PASS")) {
    out.textContent = "ERROR: Run the consensus check first (Step 7) and ensure it passes.";
    return;
  }

  t3Verification = verifyHarnMultiSig(t3PKGKeys, t3T, t3S, t3Hash);

  let text = "PKG MULTI-SIGNATURE CRYPTOGRAPHIC VERIFICATION\n\n";
  text += "Computing LHS:\n";
  text += `  s^e_pkg mod n_pkg\n`;
  text += `  = ${(t3Verification.lhs)}\n\n`;

  text += "Computing RHS:\n";
  text += `  Identity product = ${[...Object.entries(INVENTORY_IDS)].map(([n,id]) => `ID_${n}(${id})`).join(' × ')}\n`;
  text += `                   = ${t3Verification.idProduct}\n\n`;
  text += `  t^H(t,m) mod n_pkg\n`;
  text += `  = ${(t3Verification.tPowH)}\n\n`;
  text += `  RHS = ${t3Verification.idProduct} × t^H mod n_pkg\n`;
  text += `      = ${(t3Verification.rhs)}\n\n`;

  text += `LHS = ${(t3Verification.lhs)}\n`;
  text += `RHS = ${(t3Verification.rhs)}\n`;
  text += `LHS == RHS: ${t3Verification.isValid}\n\n`;

  if (t3Verification.isValid) {
    text += "MULTI-SIGNATURE VALID.\n";
    text += "All 4 inventory nodes have correctly and jointly signed the query result.\n";
    text += "The PKG will now encrypt the result for the Procurement Officer.";
  } else {
    text += "MULTI-SIGNATURE INVALID.\n";
    text += "Verification failed. The PKG will not send the response to the Procurement Officer.";
  }

  out.textContent = text;
}

// STEP 9: RSA Encryption by PKG
// The PKG encrypts the approved query result using the PO's PUBLIC key.
// Formula: Enc(m, PK_PO) = m^e_po mod n_po
function t3EncryptResult() {
  const out = document.getElementById("outT3Encrypt");

  if (!t3Verification) {
    out.textContent = "ERROR: Run multi-signature verification first (Step 8).";
    return;
  }

  if (!t3Verification.isValid) {
    out.textContent = "ERROR: Multi-signature verification failed. Cannot encrypt an invalid result.";
    return;
  }

  t3Ciphertext = encryptForPO(t3MessageInt, t3POKeys);

  let text = "RSA ENCRYPTION BY PKG\n\n";
  text += `m = ${t3MessageInt}\n\n`;
  text += `PO Public Key:\n`;
  text += `  e_po = ${t3POKeys.e}\n`;
  text += `  n_po = ${(t3POKeys.n)}\n\n`;
  text += "Enc(c) = m^e_po mod n_po\n\n";
  text += `       = ${t3MessageInt}^e_po mod n_po\n`;
  text += `       = ${(t3Ciphertext)}\n\n`;
  text += "PKG sends the following package to the Procurement Officer:\n";
  text += `  Enc(c) = ${(t3Ciphertext)}\n`;
  text += `  t = ${(t3T)}\n`;
  text += `  s = ${(t3S)}\n\n`;
  out.textContent = text;
}

// STEP 10: PO Decrypts the ciphertext using their private key
// Formula: m = c^d_po mod n_po
function t3DecryptResult() {
  const out = document.getElementById("outT3Decrypt");

  if (!t3Ciphertext) {
    out.textContent = "ERROR: Encrypt the result first (Step 9).";
    return;
  }

  t3Decrypted = decryptByPO(t3Ciphertext, t3POKeys);
  const decryptCorrect = t3Decrypted === t3MessageInt;
  const decryptedString = big_integer_to_sentence(t3Decrypted);

  let text = "RSA DECRYPTION BY PO\n\n";
  text += `Ciphertext received: c = ${(t3Ciphertext)}\n\n`;
  text += `PO Private Key: d_po = ${(t3POKeys.d)}\n\n`;
  text += `Decrypted result:\n`;
  text += `m = c^d_po mod n_po\n`;
  text += `m = ${t3Decrypted}\n\n`;
  text += `m (original message) = "${decryptedString}"\n\n`;
  text += `Decryption correct: ${decryptCorrect}`;

  out.textContent = text;
}

// STEP 11: PO independently verifies the multi-signature using PKG public key
// Same equation as Step 8, run again on the PO side
function t3POVerify() {
  const out = document.getElementById("outT3POVerify");

  if (!t3Decrypted) {
    out.textContent = "ERROR: Decrypt the result first (Step 10).";
    return;
  }

  const poHash         = computeHarnHash(t3T, t3Decrypted);
  const poVerification = verifyHarnMultiSig(t3PKGKeys, t3T, t3S, poHash);
  const overallValid   = t3Decrypted === t3MessageInt && poVerification.isValid;

  let text = "MULTI-SIGNATURE VERIFICATION BY PO\n\n";
  text += "Step 1 - Recompute hash using received t and decrypted m:\n";
  text += `  H(t, m) = textToBigIntHash(str(t) + str(m))\n`;
  text += `  H(t, m) = ${(poHash)}\n\n`;
  text += "Step 2 - Compute LHS:\n";
  text += `  LHS = s^e_pkg mod n_pkg\n`;
  text += `  LHS = ${(poVerification.lhs)}\n\n`;
  text += "Step 3 - Compute RHS:\n";
  text += `  Identity product = ID_A × ID_B × ID_C × ID_D\n`;
  text += `                   = ${[...Object.entries(INVENTORY_IDS)].map(([n,id]) => `${id}(${n})`).join(' × ')}\n`;
  text += `                   = ${poVerification.idProduct}\n\n`;
  text += `  t^H(t,m) mod n_pkg = ${(poVerification.tPowH)}\n\n`;
  text += `  RHS = Identity product × t^H(t,m) mod n_pkg\n`;
  text += `  RHS = ${(poVerification.rhs)}\n\n`;
  text += "Step 4 - Compare:\n";
  text += `  LHS = ${(poVerification.lhs)}\n`;
  text += `  RHS = ${(poVerification.rhs)}\n`;
  text += `  LHS == RHS: ${poVerification.isValid}\n\n`;
  out.textContent = text;
}

// Loads demo records into all 4 nodes then displays them
async function t3ShowDemoInventory() {
  const out = document.getElementById("outT3Inventory");
  out.textContent = "Loading demo inventory...";

  t3QueryItemId  = null;
  t3QueryResult  = null;
  t3QueryMessage  = null;
  t3MessageInt   = null;
  t3PKGKeys      = null;
  t3POKeys       = null;
  t3SecretKeys   = null;
  t3TValues      = null;
  t3T            = null;
  t3Hash         = null;
  t3PartialSigs  = null;
  t3S            = null;
  t3Verification = null;
  t3Ciphertext   = null;
  t3Decrypted    = null ;

  document.getElementById("outT3Query").textContent          = "Waiting for query submission.";
  document.getElementById("outT3PKGKeys").textContent        = "Waiting for key derivation.";
  document.getElementById("outT3SecretKeys").textContent     = "Waiting for secret key generation.";
  document.getElementById("outT3TValues").textContent        = "Waiting for t value computation.";
  document.getElementById("outT3Hash").textContent           = "Waiting for hash computation.";
  document.getElementById("outT3PartialSigs").textContent    = "Waiting for partial signature computation.";
  document.getElementById("outT3ConsensusCheck").textContent = "Waiting for consensus check.";
  document.getElementById("outT3Verify").textContent         = "Waiting for verification.";
  document.getElementById("outT3Encrypt").textContent        = "Waiting for encryption.";
  document.getElementById("outT3Decrypt").textContent        = "Waiting for decryption.";
  document.getElementById("outT3POVerify").textContent       = "Waiting for verification.";

  try {
    await fetch("/load-demo", { method: "POST" });

    const res  = await fetch("/storage");
    const data = await res.json();

    let text = "DEMO INVENTORY LOADED\n\n";
    text += "Demo records have been written to all 4 inventory nodes.\n";
    text += "You can now query any of these Item IDs directly.\n\n";

    for (const [node, records] of Object.entries(data)) {
      text += `Inventory ${node} Local Records:\n`;
      records.forEach((r, i) => {
        text += `  ${i + 1}. Item ID: ${r.itemId}, Qty: ${r.itemQty}, Price: ${r.itemPrice}, Location: ${r.location}\n`;
      });
      text += "\n";
    }

    out.textContent = text;

  } catch (err) {
    out.textContent = "ERROR: Could not load demo inventory.\n\n" + err.message;
  }
}


// Permanently deletes all records from all 4 nodes on the server
async function t3DeleteInventory() {
  const out = document.getElementById("outT3Inventory");

  try {
    await fetch("/clear-storage", { method: "POST" });
    out.textContent = "All inventory records have been deleted.\nNo records stored in any node.";

  } catch (err) {
    out.textContent = "ERROR: Could not delete records.\n\n" + err.message;
  }
}

// RESET — clears all state and output boxes
function resetTask3() {
  t3QueryItemId  = null;
  t3QueryResult  = null;
  t3QueryMessage  = null;  
  t3MessageInt   = null;
  t3PKGKeys      = null;
  t3POKeys       = null;
  t3SecretKeys   = null;
  t3TValues      = null;
  t3T            = null;
  t3Hash         = null;
  t3PartialSigs  = null;
  t3S            = null;
  t3Verification = null;
  t3Ciphertext   = null;
  t3Decrypted    = null;

  document.getElementById("outT3Inventory").textContent      = "Waiting for inventory check.";
  document.getElementById("outT3Query").textContent          = "Waiting for query submission.";
  document.getElementById("outT3PKGKeys").textContent        = "Waiting for key derivation.";
  document.getElementById("outT3SecretKeys").textContent     = "Waiting for secret key generation.";
  document.getElementById("outT3TValues").textContent        = "Waiting for t value computation.";
  document.getElementById("outT3Hash").textContent           = "Waiting for hash computation.";
  document.getElementById("outT3PartialSigs").textContent    = "Waiting for partial signature computation.";
  document.getElementById("outT3ConsensusCheck").textContent = "Waiting for consensus check.";
  document.getElementById("outT3Verify").textContent         = "Waiting for verification.";
  document.getElementById("outT3Encrypt").textContent        = "Waiting for encryption.";
  document.getElementById("outT3Decrypt").textContent        = "Waiting for decryption.";
  document.getElementById("outT3POVerify").textContent       = "Waiting for verification.";
}
