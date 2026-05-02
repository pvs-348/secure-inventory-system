function modExp(base, exponent, modulus) {
  base = BigInt(base);
  exponent = BigInt(exponent);
  modulus = BigInt(modulus);

  if (modulus === 1n) return 0n;

  let result = 1n;
  base = base % modulus;

  while (exponent > 0n) {
    if (exponent % 2n === 1n) {
      result = (result * base) % modulus;
    }

    exponent = exponent / 2n;
    base = (base * base) % modulus;
  }

  return result;
}

function gcd(a, b) {
  a = BigInt(a);
  b = BigInt(b);

  while (b !== 0n) {
    const temp = b;
    b = a % b;
    a = temp;
  }

  return a;
}

function extendedGCD(a, b) {
  a = BigInt(a);
  b = BigInt(b);

  if (b === 0n) {
    return {
      gcd: a,
      x: 1n,
      y: 0n
    };
  }

  const result = extendedGCD(b, a % b);

  return {
    gcd: result.gcd,
    x: result.y,
    y: result.x - (a / b) * result.y
  };
}

function modInverse(a, modulus) {
  a = BigInt(a);
  modulus = BigInt(modulus);

  const result = extendedGCD(a, modulus);

  if (result.gcd !== 1n) {
    throw new Error("Modular inverse does not exist because values are not coprime.");
  }

  return ((result.x % modulus) + modulus) % modulus;
}

function recordToMessage(record) {
  return `${record.itemId}|${record.itemQty}|${record.itemPrice}|${record.location}`;
}

function textToBigIntHash(text) {
  let hash = 0n;

  for (let i = 0; i < text.length; i++) {
    hash = hash * 256n + BigInt(text.charCodeAt(i));
  }

  return hash;
}

function shortValue(value, start = 45, end = 45) {
  const text = value.toString();

  if (text.length <= start + end + 10) {
    return text;
  }

  return `${text.slice(0, start)} ... ${text.slice(-end)}`;
}