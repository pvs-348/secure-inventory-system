// This file basically has all the important things related to RSA task 1 including HARDCODED keys and the calculations and functions.


// These are the RSA keys given to us in the assignment key list
// Each inventory node (A, B, C, D) has its own p, q and e values
// p and q are big prime numbers, e is the public exponent
// I had to use BigInt (the 'n' at the end of numbers) because normal JS numbers can't handle numbers this big without losing precision 
const INVENTORY_KEYS = {
  A: {
    p: 1210613765735147311106936311866593978079938707n,
    q: 1247842850282035753615951347964437248190231863n,
    e: 815459040813953176289801n
  },

  B: {
    p: 787435686772982288169641922308628444877260947n,
    q: 1325305233886096053310340418467385397239375379n,
    e: 692450682143089563609787n
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


// This function sets up all the RSA key values we need
// Given a node ID like "A" or "B", it calculates n, phi and the private key d
function deriveRSAKeys(nodeId) {
  // First grab the raw key values for this node
  const key = INVENTORY_KEYS[nodeId];

  // If someone passes in a wrong node name, it stop here, although we mostly will not fail as there are only 4 node options.
  if (!key) {
    throw new Error("Invalid inventory node selected.");
  }

  // Pull out p, q, e from the key object
  const p = key.p;
  const q = key.q;
  const e = key.e;

  // Step 1: Calculate n = p * q
  // n is the RSA modulus and is part of both the public and private key
  const n = p * q;  // just multiply the two primes together

  // Step 2: Calculate phi(n) = (p-1) * (q-1)
  // This is Euler's totient function - it counts how many numbers less than n
  // are coprime with n. We need this to find the private key d.
  const phi = (p - 1n) * (q - 1n);

  // Step 3: Check that gcd(e, phi) = 1
  // e and phi need to be coprime for RSA to work properly
  // (otherwise we can't find a valid d)
  const gcdValue = gcd(e, phi);

  if (gcdValue !== 1n) {
    throw new Error("Invalid RSA parameters: e and phi are not coprime.");
  }

  // Step 4: Find d = e^(-1) mod phi
  // d is the private key exponent - it's the modular inverse of e
  // This means: (e * d) mod phi = 1
  const d = modInverse(e, phi);

  // Return everything so other functions can use it
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


// This function signs an inventory record using the private key of the given node
// Signing = encrypt the hash of the message using the PRIVATE key
function signRecord(nodeId, record) {
  // Get all the RSA key components for this node
  const rsa = deriveRSAKeys(nodeId);

  // Convert the record object into a plain string so we can hash it
  const message = recordToMessage(record);

  // Hash the message to get a number we can sign
  // (we can't sign the whole message directly, just the hash)
  const hash = textToBigIntHash(message);

  // RSA Signature formula: signature = hash^d mod n
  // We raise the hash to the power of d, then take mod n
  // This uses the PRIVATE key (d, n) to sign
  const signature = modExp(hash, rsa.d, rsa.n);

  // Return everything bundled together for later use/verification
  return {
    nodeId,
    record,
    message,
    hash,
    signature,
    rsa
  };
}


// This function checks whether a signature is valid
// To verify: raise signature to power e mod n, should get back the original hash
function verifySignature(nodeId, message, originalHash, signature) {
  // Get the RSA keys for the node that supposedly signed this
  const rsa = deriveRSAKeys(nodeId);

  // RSA Verification formula: recoveredHash = signature^e mod n
  // We use the PUBLIC key (e, n) this time to decrypt/verify
  // If the signature was made with the matching private key, this gives us back the hash
  const recoveredHash = modExp(signature, rsa.e, rsa.n);

  // Compare: if recovered hash == original hash, the signature checks out
  const isValid = recoveredHash === originalHash;

  return {
    recoveredHash,
    originalHash,
    isValid,
    rsa
  };
}


// This just runs the full Task 1 flow:
// 1. Sign the record
// 2. Verify the signature
// Both steps together show the full sign-then-verify cycle
function runTask1(nodeId, record) {
  // Sign the record first
  const signedData = signRecord(nodeId, record);

  // Now verify that the signature we just made is actually valid
  // Pass in the same message hash and signature we got from signing
  const verification = verifySignature(
    nodeId,
    signedData.message,
    signedData.hash,
    signedData.signature
  );

  // Hand back both the signed data and the verification result
  return {
    signedData,
    verification
  };
}