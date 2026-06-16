# Secure Inventory Comms

A distributed inventory system that simulates how multiple warehouses can securely log and verify stock records without trusting each other blindly. Built entirely from raw `BigInt` math in JavaScript and hence no crypto libraries used. Every signature, hash and key derivation is implemented by hand.

The system is split into three parts that build on each other:

## Task 1 Digital Signatures (RSA)

Each of the four inventory nodes (A, B, C, D) has its own RSA keypair derived from hardcoded primes. When a node creates a stock record, it signs it with its private key and any other node can verify that signature using the signer's public key.

- Key derivation: `n = p * q`, `phi = (p-1)(q-1)`, `d = e^-1 mod phi`
- Signing: `signature = hash(message)^d mod n`
- Verifying: `recoveredHash = signature^e mod n`

RSA itself isn't reimplemented from a library `modExp` (fast exponentiation), `gcd`/`extendedGCD` (Euclidean algorithm) and `modInverse` are all written from scratch, since plain JS numbers can't handle integers this large without losing precision.

## Task 2 Consensus (simplified PBFT)

Before a record is accepted into the system, it needs agreement from the network and not just the node that created it. This is modeled on Practical Byzantine Fault Tolerance: with 4 nodes and a tolerance of 1 faulty node (f=1), at least 3 out of 4 nodes (2f+1) must vote ACCEPT for a record to be committed.

Each node independently checks:
1. **Signature validity** - does the signature actually verify against the claimed origin node?
2. **Data validity** - are the fields present, are quantity/price positive, does the location match the signer?

Only if both checks pass does a node vote ACCEPT. If consensus is reached, the record is written to every node's local storage, keeping all four in sync.

## Task 3 Harn Multi-Signature + Secure Delivery

The most involved part: implementing the Harn identity-based multi-signature scheme so that all four nodes can jointly sign a single aggregated response to a query, rather than sending four separate signatures.

1. A Private Key Generator (PKG) issues each node a secret key from its identity: `g_i = ID_i^d_pkg mod n_pkg`
2. Each node commits with a random value: `t_i = r_i^e_pkg mod n_pkg`, aggregated into `t`
3. A combined hash `H(t, m)` is computed over the aggregate commitment and the query result
4. Each node computes a partial signature `s_i = g_i * r_i^H(t,m) mod n_pkg`, aggregated into `s`
5. The PKG verifies the combined signature `{t, s}` against the product of all node identities
6. Once verified, the PKG encrypts the result for the Procurement Officer using RSA (`c = m^e_po mod n_po`), who decrypts it with their own private key and independently re-verifies the multi-signature

This means the Procurement Officer gets a single signature that mathematically proves all four nodes agreed on the result, without needing four separate verification steps.

## Tech Stack

- **Backend:** Node.js, Express
- **Frontend:** Vanilla HTML/CSS/JS
- **Cryptography:** Hand-built RSA and Harn multi-signature scheme using native `BigInt`

## Running it locally

npm install
node src/server.js


Then open `http://localhost:3000` in your browser.

## Why this project

This was built to understand digital signatures, distributed consensus and multi-signature schemes at the level of the actual math rather than just calling a library function. Implementing modular exponentiation and the extended Euclidean algorithm by hand made the security guarantees (and their limits) a lot more concrete than reading about them in a textbook.