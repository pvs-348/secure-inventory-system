// TASK 3: Harn Identity-Based Multi-Signature + RSA Secure Delivery
//
// This file implements the complete cryptographic logic for Task 3.
// All computations are built from scratch using only BigInt arithmetic.
// No external crypto libraries are used (only modExp, modInverse, gcd, and textToBigIntHash) from utils.js.
//
// Workflow:
//   1. PKG and PO key derivation
//   2. PKG generates secret keys for each inventory node: g_i = ID_i^d_pkg mod n_pkg
//   3. Each node computes t_i = r_i^e_pkg mod n_pkg, aggregate t = product(t_i) mod n_pkg
//   4. Hash H(t, m) computed over aggregate t and query result m
//   5. Each node computes partial sig: s_i = g_i * r_i^H(t,m) mod n_pkg
//   6. Aggregate s = product(s_i) mod n_pkg  => Multi-Sig = {t, s}
//   7. PKG verifies: s^e_pkg mod n_pkg == (ID_A * ID_B * ID_C * ID_D) * t^H mod n_pkg
//   8. PKG encrypts result for PO: c = m^e_po mod n_po
//   9. PO decrypts: m = c^d_po mod n_po, then independently verifies multi-sig

// HARDCODED KEYS FROM LIST OF KEYS - PART 2
// All values explicitly defined as required by the assignment spec
// PKG (Private Key Generator) RSA parameters
const PKG_PARAMS = {
  p: 1004162036461488639338597000466705179253226703n,
  q: 950133741151267522116252385927940618264103623n,
  e: 973028207197278907211n
};

// Procurement Officer RSA parameters
// PO's public key is used by PKG to encrypt the result
// PO's private key is used by PO to decrypt the ciphertext
const PO_PARAMS = {
  p: 1080954735722463992988394149602856332100628417n,
  q: 1158106283320086444890911863299879973542293243n,
  e: 106506253943651610547613n
};

// Identity (public key) for each inventory node - acts as the signer's public key in Harn scheme
const INVENTORY_IDS = {
  A: 126n,
  B: 127n,
  C: 128n,
  D: 129n
};

// Random number chosen by each inventory node for the signing commitment step
// These are hardcoded as per List of Keys document
const INVENTORY_RANDOMS = {
  A: 621n,
  B: 721n,
  C: 821n,
  D: 921n
};

// KEY DERIVATION
// Derives all RSA parameters for the PKG from its hardcoded p, q, e values
// Returns: { p, q, e, n, phi, d, gcdValue }
function derivePKGKeys() {
  const { p, q, e } = PKG_PARAMS;

  // n = p * q 
  const n = p * q;

  // phi(n) = (p-1)(q-1) 
  const phi = (p - 1n) * (q - 1n);

  // verify e and phi are coprime - required for RSA to work
  const gcdValue = gcd(e, phi);

  // private key d = e^(-1) mod phi 
  const d = modInverse(e, phi);

  return { p, q, e, n, phi, d, gcdValue };
}

// Derives all RSA parameters for the Procurement Officer from its hardcoded p, q, e values
// Returns: { p, q, e, n, phi, d, gcdValue }
function derivePOKeys() {
  const { p, q, e } = PO_PARAMS;

  const n = p * q;
  const phi = (p - 1n) * (q - 1n);
  const gcdValue = gcd(e, phi);
  const d = modInverse(e, phi);

  return { p, q, e, n, phi, d, gcdValue };
}

// HARN MULTI-SIGNATURE — STEP 1: SECRET KEY GENERATION
// The PKG generates a secret key for each inventory node by signing their identity
// with the PKG's private key d.
// Formula: g_i = ID_i ^ d_pkg mod n_pkg
//
// The identity (ID) acts as the signer's public key in this scheme.
// Only the PKG can generate these secret keys since it requires d_pkg.
//
// Returns: { A: g_A, B: g_B, C: g_C, D: g_D }
function generateSecretKeys(pkgKeys) {
  const secretKeys = {};

  for (const [node, id] of Object.entries(INVENTORY_IDS)) {
    // sign the identity using PKG private key
    secretKeys[node] = modExp(id, pkgKeys.d, pkgKeys.n);
  }

  return secretKeys;
}
// HARN MULTI-SIGNATURE — STEP 2: T VALUE COMPUTATION
// Each inventory node selects its random number r_i (from List of Keys)
// and computes its commitment value t_i using the PKG PUBLIC key e.
//
// Formula: t_i = r_i ^ e_pkg mod n_pkg
//
// The nodes then exchange their t_i values so each node can compute
// the aggregate t = t_A * t_B * t_C * t_D mod n_pkg
//
// Returns: { tValues: { A, B, C, D }, t: aggregate_t }
function computeTValues(pkgKeys) {
  const tValues = {};

  for (const [node, r] of Object.entries(INVENTORY_RANDOMS)) {
    // each node raises its random number to the PKG public exponent e
    tValues[node] = modExp(r, pkgKeys.e, pkgKeys.n);
  }

  // aggregate t is the product of all individual t_i values mod n
  let t = 1n;
  for (const ti of Object.values(tValues)) {
    t = (t * ti) % pkgKeys.n;
  }

  return { tValues, t };
}

// HARN MULTI-SIGNATURE — STEP 3: HASH COMPUTATION
// Computes H(t, m) used in the Harn signing step.
//
// We concatenate the aggregate t and message m as strings,
// then apply the same base-256 integer encoding used throughout this system
// (the textToBigIntHash function from utils.js).
//
// Returns: BigInt hash value
function computeHarnHash(t, m) {
  // concatenate t and m as strings 
  const inputString = t.toString() + m.toString();
  return textToBigIntHash(inputString);
}

// HARN MULTI-SIGNATURE — STEP 4: PARTIAL SIGNATURE COMPUTATION
// Each inventory node computes its partial signature using its secret key g_i
// and its random number r_i.
//
// Formula: s_i = g_i * r_i ^ H(t, m) mod n_pkg
//
// The nodes exchange their s_i values so the aggregate s can be computed:
// s = s_A * s_B * s_C * s_D mod n_pkg
//
// The final multi-signature is the pair: {t, s}
//
// Returns: { partialSigs: { A, B, C, D }, s: aggregate_s }
function computePartialSignatures(pkgKeys, secretKeys, hash) {
  const partialSigs = {};

  for (const node of ["A", "B", "C", "D"]) {
    const g = secretKeys[node];              // secret key for this node
    const r = INVENTORY_RANDOMS[node];       // random number for this node

    // compute r_i ^ H(t, m) mod n
    const rPowH = modExp(r, hash, pkgKeys.n);

    // compute s_i = g_i * r_i^H mod n
    partialSigs[node] = (g * rPowH) % pkgKeys.n;
  }

  // aggregate s = product of all s_i mod n
  let s = 1n;
  for (const si of Object.values(partialSigs)) {
    s = (s * si) % pkgKeys.n;
  }

  return { partialSigs, s };
}
// HARN MULTI-SIGNATURE — STEP 5: VERIFICATION
// Verifies the Harn multi-signature {t, s} using the PKG public key.
//
// LHS: s ^ e_pkg mod n_pkg
// RHS: (ID_A * ID_B * ID_C * ID_D) * t ^ H(t, m) mod n_pkg
//
// Mathematical proof that LHS == RHS when all signatures are valid:
//   s^e = (product of s_i)^e
//       = (product of g_i * r_i^H)^e
//       = (product of ID_i^d * r_i^H)^e
//       = product(ID_i^(d*e)) * product(r_i^(H*e))
//       = product(ID_i) * product((r_i^e)^H)    [since d*e ≡ 1 mod phi]
//       = product(ID_i) * product(t_i)^H
//       = product(ID_i) * t^H mod n
//
// Returns: { lhs, rhs, idProduct, tPowH, isValid }
function verifyHarnMultiSig(pkgKeys, t, s, hash) {
  // LHS = s^e_pkg mod n_pkg
  const lhs = modExp(s, pkgKeys.e, pkgKeys.n);

  // compute the product of all inventory node identities mod n
  let idProduct = 1n;
  for (const id of Object.values(INVENTORY_IDS)) {
    idProduct = (idProduct * id) % pkgKeys.n;
  }

  // compute t^H(t,m) mod n
  const tPowH = modExp(t, hash, pkgKeys.n);

  // RHS = (ID_A * ID_B * ID_C * ID_D) * t^H mod n
  const rhs = (idProduct * tPowH) % pkgKeys.n;

  return {
    lhs,
    rhs,
    idProduct,
    tPowH,
    isValid: lhs === rhs
  };
}
// RSA ENCRYPTION - PKG ENCRYPTS RESULT FOR PROCUREMENT OFFICER
// The PKG encrypts the approved query result using the Procurement Officer's PUBLIC key.
// Only the PO (holder of the private key) can decrypt the ciphertext.
//
// Formula: c = m ^ e_po mod n_po
//
// Note: m must be a BigInt and m < n_po for RSA to work correctly.
// For any realistic inventory quantity m will be far smaller than n_po.
//
// Returns: BigInt ciphertext
function encryptForPO(mInt, poKeys) {
  return modExp(mInt, poKeys.e, poKeys.n);
}
// RSA DECRYPTION - PROCUREMENT OFFICER DECRYPTS THE RESPONSE
// The Procurement Officer uses their PRIVATE key to decrypt the ciphertext
// and recover the original query result.
//
// Formula: m = c ^ d_po mod n_po
//
// Returns: BigInt decrypted message
function decryptByPO(ciphertext, poKeys) {
  return modExp(ciphertext, poKeys.d, poKeys.n);
}
