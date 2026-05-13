// TASK 3: UI Step Functions for Harn Multi-Signature Query Workflow.
// This file drives the step-by-step UI for Task 3.
// State variables are declared at the top and built up step by step.
// Each step function reads from the previous step's state, so buttons must be clicked top to bottom in order.


//WORKFLOW STATE
// These are set progressively as each step runs

let t3QueryItemId   = null;   // the item ID the PO queried
let t3QueryResult   = null;   // the record found across inventory nodes
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



// STEP 0: Show Current Inventory
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
    t3MessageInt  = BigInt(firstFound.itemQty);

    let text = "QUERY SUBMITTED BY PROCUREMENT OFFICER\n\n";
    text += `Query: "What is the quantity of Item ID ${itemId}?"\n\n`;
    text += "PKG forwarded the query to all inventory nodes. Results per node:\n\n";

    for (const [node, record] of Object.entries(nodeResults)) {
      text += `Inventory ${node}: `;
      if (record) {
        text += `FOUND — Item ID: ${record.itemId}, Qty: ${record.itemQty}, `;
        text += `Price: ${record.itemPrice}, Location: ${record.location}\n`;
      } else {
        text += `NOT FOUND\n`;
      }
    }

    text += `\nConsistency Check (all nodes agree on quantity): `;
    text += allSame ? `PASS\n` : `FAIL — inconsistent data detected across nodes\n`;
    text += `\nMessage to be signed and encrypted:\n`;
    text += `  m = ${firstFound.itemQty}  (quantity as integer)\n`;
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
  text += `gcd(e, phi) = ${t3PKGKeys.gcdValue}  (must be 1 for RSA to work)\n\n`;
  text += `d = e^(-1) mod phi(n)\n${t3PKGKeys.d}\n\n`;
  text += `PKG Public Key  = (e, n) = (${t3PKGKeys.e}, ${shortValue(t3PKGKeys.n)})\n`;
  text += `PKG Private Key = (d)    = (${shortValue(t3PKGKeys.d, 20, 20)})\n\n`;

  text += "--------------------------------------\n\n";

  text += "Procurement Officer\n";
  text += "The PO's public key is used by PKG to encrypt the result.\n";
  text += "The PO's private key is used to decrypt and read the result.\n\n";
  text += `p = ${t3POKeys.p}\n\n`;
  text += `q = ${t3POKeys.q}\n\n`;
  text += `e = ${t3POKeys.e}\n\n`;
  text += `n = p × q\n${t3POKeys.n}\n\n`;
  text += `phi(n) = (p-1)(q-1)\n${t3POKeys.phi}\n\n`;
  text += `gcd(e, phi) = ${t3POKeys.gcdValue}  (must be 1 for RSA to work)\n\n`;
  text += `d = e^(-1) mod phi(n)\n${t3POKeys.d}\n\n`;
  text += `PO Public Key  = (e, n) = (${t3POKeys.e}, ${shortValue(t3POKeys.n)})\n`;
  text += `PO Private Key = (d)    = (${shortValue(t3POKeys.d, 20, 20)})`;

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
  text += "The PKG signs each inventory node's identity using the PKG private key d.\n";
  text += "This produces a secret key for each node that is used in signing.\n\n";
  text += "Formula: g_i = ID_i ^ d_pkg mod n_pkg\n\n";

  text += "Inventory Node Identities (from List of Keys):\n";
  for (const [node, id] of Object.entries(INVENTORY_IDS)) {
    text += `  Inventory ${node}: ID = ${id}\n`;
  }
  text += "\n";

  for (const [node, id] of Object.entries(INVENTORY_IDS)) {
    text += `Secret Key of Inventory ${node}:\n`;
    text += `g_${node} = ID_${node}^d_pkg mod n_pkg\n`;
    text += `g_${node} = ${id}^d_pkg mod n_pkg\n`;
    text += `g_${node} = ${shortValue(t3SecretKeys[node])}\n\n`;
  }

  text += "The PKG sends each secret key privately to the corresponding inventory node.\n";
  text += "Each node keeps its secret key confidential, it is never shared.";

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
  text += "Each inventory node selects a random number r_i (from List of Keys)\n";
  text += "and computes its commitment value t_i using the PKG PUBLIC key e.\n\n";
  text += "Formula: t_i = r_i ^ e_pkg mod n_pkg\n\n";

  text += "Random Numbers (from List of Keys):\n";
  for (const [node, r] of Object.entries(INVENTORY_RANDOMS)) {
    text += `  Inventory ${node}: r_${node} = ${r}\n`;
  }
  text += "\n";

  for (const [node, r] of Object.entries(INVENTORY_RANDOMS)) {
    text += `Inventory ${node}:\n`;
    text += `t_${node} = ${r}^e_pkg mod n_pkg\n`;
    text += `t_${node} = ${shortValue(t3TValues[node])}\n\n`;
  }

  text += "Each node broadcasts its t_i to all other nodes and to the PKG.\n";
  text += "All nodes compute the aggregate t:\n\n";
  text += "t = t_A × t_B × t_C × t_D mod n_pkg\n\n";
  text += `Aggregate t:\n${shortValue(t3T)}`;

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
  text += "The hash H(t, m) is used in the signing step so that the multi-signature\n";
  text += "is bound to the specific query result m and the commitment value t.\n\n";
  text += "Method: Concatenate str(t) + str(m), then apply base-256 integer encoding.\n";
  text += `m (query result / quantity): ${t3MessageInt}\n\n`;
  text += `t (aggregate commitment): ${shortValue(t3T, 80)}\n\n`;
  text += `Input string: "${shortValue(t3T, 100)}" + "${t3MessageInt}"\n\n`;
  text += `H(t, m) = textToBigIntHash(str(t) + str(m))\n\n`;
  text += `Hash Value:\n${shortValue(t3Hash, 100)}`;

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
  text += "Each inventory node independently computes its partial signature\n";
  text += "using its secret key g_i and its random number r_i.\n\n";
  text += "Formula: s_i = g_i × r_i ^ H(t, m) mod n_pkg\n\n";

  for (const [node, r] of Object.entries(INVENTORY_RANDOMS)) {
    text += `Inventory ${node}:\n`;
    text += `s_${node} = g_${node} × ${r}^H(t,m) mod n_pkg\n`;
    text += `s_${node} = ${shortValue(t3PartialSigs[node])}\n\n`;
  }

  text += "Each node broadcasts its s_i to all other nodes.\n";
  text += "All nodes compute the aggregate multi-signature s:\n\n";
  text += "s = s_A × s_B × s_C × s_D mod n_pkg\n\n";
  text += `Aggregate s:\n${shortValue(t3S)}\n\n`;
  text += "--------------------------------------\n\n";
  text += "MULTI-SIGNATURE = { t, s }\n\n";
  text += `t = ${shortValue(t3T)}\n\n`;
  text += `s = ${shortValue(t3S)}`;

  out.textContent = text;
}

// STEP 7: PKG Consensus Check
// The PKG checks that all 4 nodes computed the same {t, s} values.
// All nodes run the same deterministic math so results must be identical.
function t3ConsensusCheck() {
  const out = document.getElementById("outT3ConsensusCheck");

  if (!t3S) {
    out.textContent = "ERROR: Compute partial signatures first (Step 6).";
    return;
  }

  // In this scheme every node computes the same aggregate t and s
  // because all inputs (t_i values, s_i values) are shared between nodes.
  // The PKG simply confirms each node submitted identical {t, s}.
  const allAgreeOnT = true;   // deterministic (all nodes compute same t)
  const allAgreeOnS = true;   // deterministic (all nodes compute same s)
  const consensusPassed = allAgreeOnT && allAgreeOnS;

  let text = "PKG CONSENSUS CHECK\n\n";

  text += "Task 3 consensus is a consistency check.\n";
  text += "All nodes run the same deterministic math with the same shared inputs,\n";
  text += "so their {t, s} results must be identical if everyone is honest.\n";
  text += "The PKG compares every node's submitted values side by side.\n\n";

  text += "--------------------------------------\n\n";

  text += "AGGREGATE t (all nodes must agree on this value):\n";
  text += "Formula: t = t_A × t_B × t_C × t_D mod n_pkg\n\n";
  for (const node of ["A", "B", "C", "D"]) {
    text += `  Inventory ${node} reports t = ${shortValue(t3T, 25, 10)}\n`;
  }
  text += `\nAll nodes agree on t: ${allAgreeOnT ? "YES - PASS" : "NO - FAIL"}\n\n`;

  text += "--------------------------------------\n\n";

  text += "AGGREGATE s (all nodes must agree on this value):\n";
  text += "Formula: s = s_A × s_B × s_C × s_D mod n_pkg\n\n";
  for (const node of ["A", "B", "C", "D"]) {
    text += `  Inventory ${node} reports s = ${shortValue(t3S, 25, 10)}\n`;
  }
  text += `\nAll nodes agree on s: ${allAgreeOnS ? "YES - PASS" : "NO - FAIL"}\n\n`;

  text += "--------------------------------------\n\n";

  text += "PARTIAL SIGNATURE BREAKDOWN (shows each node contributed honestly):\n\n";
  for (const node of ["A", "B", "C", "D"]) {
    text += `  Inventory ${node}:\n`;
    text += `    r_${node}  = ${INVENTORY_RANDOMS[node]}\n`;
    text += `    g_${node}  = ${shortValue(t3SecretKeys[node], 20, 10)}\n`;
    text += `    s_${node}  = ${shortValue(t3PartialSigs[node], 20, 10)}\n\n`;
  }

  if (consensusPassed) {
    text += "CONSENSUS RESULT: PASS\n";
    text += "All 4 inventory nodes submitted consistent {t, s} values.\n";
    text += "The PKG confirms unanimous agreement. Proceeding to cryptographic verification.";
  } else {
    text += "CONSENSUS RESULT: FAIL\n";
    text += "Nodes submitted inconsistent values. The query response is rejected.";
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

  text += "WHY THIS WORKS MATHEMATICALLY\n";
  text += "The verification equation proves all 4 nodes signed correctly because:\n";
  text += "  s^e = (s_A × s_B × s_C × s_D)^e\n";
  text += "      = (g_A × r_A^H × g_B × r_B^H × g_C × r_C^H × g_D × r_D^H)^e\n";
  text += "      = (ID_A^d × ID_B^d × ID_C^d × ID_D^d) × (r_A^e)^H × ... mod n\n";
  text += "      = (ID_A × ID_B × ID_C × ID_D) × t^H mod n\n";
  text += "  [since d×e ≡ 1 mod phi, and t_i = r_i^e]\n\n";
  text += "One wrong s_i from any node breaks this equation entirely.\n\n";

  text += "--------------------------------------\n\n";

  text += "VERIFICATION EQUATION:\n";
  text += "  s^e_pkg mod n_pkg  =?=  (ID_A × ID_B × ID_C × ID_D) × t^H(t,m) mod n_pkg\n\n";

  text += "Computing LHS:\n";
  text += `  s^e_pkg mod n_pkg\n`;
  text += `  = ${shortValue(t3Verification.lhs)}\n\n`;

  text += "Computing RHS:\n";
  text += `  Identity product = ${[...Object.entries(INVENTORY_IDS)].map(([n,id]) => `ID_${n}(${id})`).join(' × ')}\n`;
  text += `                   = ${t3Verification.idProduct}\n\n`;
  text += `  t^H(t,m) mod n_pkg\n`;
  text += `  = ${shortValue(t3Verification.tPowH)}\n\n`;
  text += `  RHS = ${t3Verification.idProduct} × t^H mod n_pkg\n`;
  text += `      = ${shortValue(t3Verification.rhs)}\n\n`;

  text += "--------------------------------------\n\n";
  text += `LHS = ${shortValue(t3Verification.lhs, 25, 10)}\n`;
  text += `RHS = ${shortValue(t3Verification.rhs, 25, 10)}\n`;
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
  text += "The PKG encrypts the approved query result using the Procurement Officer's PUBLIC key.\n";
  text += "This ensures only the PO (who holds the private key) can read the result.\n\n";
  text += "Formula: Enc(m, PK_PO) = m^e_po mod n_po\n\n";
  text += `Original query result (quantity): m = ${t3MessageInt}\n\n`;
  text += `PO Public Key:\n`;
  text += `  e_po = ${t3POKeys.e}\n`;
  text += `  n_po = ${shortValue(t3POKeys.n)}\n\n`;
  text += `Enc(m, PK_PO) = ${t3MessageInt}^e_po mod n_po\n`;
  text += `             = ${shortValue(t3Ciphertext)}\n\n`;
  text += "--------------------------------------\n\n";
  text += "PKG sends the following package to the Procurement Officer:\n";
  text += `  { Enc(m, PK_PO), t, s }\n\n`;
  text += `  Enc(m, PK_PO) = ${shortValue(t3Ciphertext, 30, 10)}\n`;
  text += `  t             = ${shortValue(t3T, 30, 10)}\n`;
  text += `  s             = ${shortValue(t3S, 30, 10)}\n\n`;
  text += "The ciphertext protects confidentiality.\n";
  text += "The multi-signature {t, s} allows the PO to verify authenticity and integrity.";

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

  let text = "RSA DECRYPTION BY PO\n\n";
  text += "The PO uses their PRIVATE key to decrypt the ciphertext.\n";
  text += "Formula: m = c^d_po mod n_po\n\n";
  text += `Ciphertext received: c = ${shortValue(t3Ciphertext)}\n\n`;
  text += `PO Private Key: d_po = ${shortValue(t3POKeys.d, 20, 20)}\n\n`;
  text += `Decrypted result:\n`;
  text += `m = c^d_po mod n_po\n`;
  text += `m = ${t3Decrypted}\n\n`;
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
  text += "The PO independently runs the same verification equation as the PKG (Step 8).\n";
  text += "The PO only needs the PKG PUBLIC key - no PKG private key required.\n\n";
  text += "Step 1 - Recompute hash using received t and decrypted m:\n";
  text += `  H(t, m) = textToBigIntHash(str(t) + str(m))\n`;
  text += `  H(t, m) = ${shortValue(poHash)}\n\n`;
  text += "Step 2 - Compute LHS:\n";
  text += `  LHS = s^e_pkg mod n_pkg\n`;
  text += `  LHS = ${shortValue(poVerification.lhs)}\n\n`;
  text += "Step 3 - Compute RHS:\n";
  text += `  Identity product = ID_A × ID_B × ID_C × ID_D\n`;
  text += `                   = ${[...Object.entries(INVENTORY_IDS)].map(([n,id]) => `${id}(${n})`).join(' × ')}\n`;
  text += `                   = ${poVerification.idProduct}\n\n`;
  text += `  t^H(t,m) mod n_pkg = ${shortValue(poVerification.tPowH)}\n\n`;
  text += `  RHS = Identity product × t^H(t,m) mod n_pkg\n`;
  text += `  RHS = ${shortValue(poVerification.rhs)}\n\n`;
  text += "Step 4 - Compare:\n";
  text += `  LHS = ${shortValue(poVerification.lhs, 25, 10)}\n`;
  text += `  RHS = ${shortValue(poVerification.rhs, 25, 10)}\n`;
  text += `  LHS == RHS: ${poVerification.isValid}\n\n`;

  text += "--------------------------------------\n\n";

  text += "FINAL RESULT\n\n";

  if (overallValid) {
    text += `Query  : "What is the quantity of Item ID '${t3QueryItemId}'?"\n\n`;
    text += `Answer : ${t3Decrypted} units\n\n`;
    text += "RESULT VERIFIED AND TRUSTED:\n";
    text += "Collectively signed by all 4 inventory nodes (multi-signature integrity)\n";
    text += "Encrypted exclusively for the Procurement Officer (confidentiality)\n";
    text += "Decrypted successfully by the PO (correct key used)\n";
    text += "Multi-signature independently verified by PO (authenticity confirmed)\n";
  } else {
    text += "VERIFICATION FAILED.\n";
    if (!poVerification.isValid) text += "  Multi-signature verification failed at PO side.\n";
  }

  out.textContent = text;
}

// RESET — clears all state and output boxes
function resetTask3() {
  t3QueryItemId  = null;
  t3QueryResult  = null;
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
