// ===============================
// TASK 1: Digital Signature-Based Record Authentication
// ===============================

// RSA parameters from the Assignment 2 List of Keys
const INVENTORY_KEYS = {
  A: {
    p: 1210613765735147311106936311866593978079938707n,
    q: 1247842850282035753615951347964437248190231863n,
    e: 815459040813953176289801n
  },

  B: {
    p: 787435686772982288169641922308628444877260947n,
    q: 1325305233886096053310340418467385397239375379n,
    e: 692450682143089563609787
  },

  C: {
    p: 1014247300991039444864201518275018240361205111n,
    q: 904030450302158058469475048755214591704639633n,
    e: 1158749422015035388438057n
  },

  D: {
    p: 1287737200891425621338551020762858710281638317n,
    q: 1330909125725073469794953234151525201084537607n,
    e: 33981230465225879849295979n
  }
};

// Derive RSA public/private key components
function deriveRSAKeys(nodeId) {
  const key = INVENTORY_KEYS[nodeId];

  if (!key) {
    throw new Error("Invalid inventory node selected.");
  }

  const p = key.p;
  const q = key.q;
  const e = key.e;

  const n = p * q;
  const phi = (p - 1n) * (q - 1n);

  const gcdValue = gcd(e, phi);

  if (gcdValue !== 1n) {
    throw new Error("Invalid RSA parameters: e and phi are not coprime.");
  }

  const d = modInverse(e, phi);

  return {
    p,
    q,
    e,
    n,
    phi,
    d,
    gcdValue
  };
}

// Sign inventory record
function signRecord(nodeId, record) {
  const rsa = deriveRSAKeys(nodeId);

  const message = recordToMessage(record);
  const hash = textToBigIntHash(message);

  // RSA signature: s = hash^d mod n
  const signature = modExp(hash, rsa.d, rsa.n);

  return {
    nodeId,
    record,
    message,
    hash,
    signature,
    rsa
  };
}

// Verify signature using public key
function verifySignature(nodeId, message, originalHash, signature) {
  const rsa = deriveRSAKeys(nodeId);

  // RSA verification: recoveredHash = signature^e mod n
  const recoveredHash = modExp(signature, rsa.e, rsa.n);

  const isValid = recoveredHash === originalHash;

  return {
    recoveredHash,
    originalHash,
    isValid,
    rsa
  };
}

// Full Task 1 workflow
function runTask1(nodeId, record) {
  const signedData = signRecord(nodeId, record);

  const verification = verifySignature(
    nodeId,
    signedData.message,
    signedData.hash,
    signedData.signature
  );

  return {
    signedData,
    verification
  };
}