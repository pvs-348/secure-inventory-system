// modExp calculates: base to the power of exponent, then mod modulus
// basically its like doing base^exponent % modulus but for REALLY big numbers
// if we just did base**exponent directly the number would be like millions of digits long
// and js would just crash or give wrong answers
// so instead we do a trick where we break the exponent into smaller pieces
// i looked this up and its called "square and multiply" or "fast exponentiation"
function modExp(base, exponent, modulus) {

  // convert everything to BigInt just in case someone passes in a normal number
  base = BigInt(base);
  exponent = BigInt(exponent);
  modulus = BigInt(modulus);

  // if modulus is 1 then everything mod 1 = 0, so just return 0 straight away
  // (anything divided by 1 has remainder 0)
  if (modulus === 1n) return 0n;

  // result starts at 1 because we are doing multiplication
  // (same reason you start at 1 not 0 when multiplying stuff together)
  let result = 1n;

  // do base mod modulus first so the number stays small from the beginning
  base = base % modulus;

  // now loop through every bit of the exponent one at a time
  while (exponent > 0n) {

    // check if the exponent is odd right now
    // if yes, multiply result by base and mod it
    // exponent % 2 tells us if its odd (1) or even (0)
    if (exponent % 2n === 1n) {
      result = result * base;       // multiply
      result = result % modulus;    // then mod, keep it in range
    }

    // cut the exponent in half (drop the remainder, just integer divide)
    exponent = exponent / 2n;

    // square the base and mod it to keep it small
    base = base * base;
    base = base % modulus;
  }

  return result;
}


// gcd means Greatest Common Divisor
// so gcd(12, 8) = 4 because 4 is the biggest number that divides both 12 and 8
// we need this to check that e and phi dont share any common factors
// if gcd(e, phi) = 1 that means they are coprime which is required for RSA to work
// the method used here is called the Euclidean algorithm
// basically: keep doing a mod b, then swap, repeat until b hits zero
function gcd(a, b) {
  a = BigInt(a);
  b = BigInt(b);

  // keep looping until b becomes zero
  while (b !== 0n) {

    // save b in a temp variable before we overwrite it
    const temp = b;

    // new b = remainder of a divided by b
    b = a % b;

    // new a = what b used to be
    a = temp;
  }

  // whatever is left in a at this point is the GCD
  return a;
}


// extendedGCD is the extended version of the euclidean algorithm
// normal gcd just gives you the gcd number
// but extended gcd also gives you two extra numbers x and y such that:
//   a*x + b*y = gcd(a,b)
// we need x specifically because that turns into our private key d later on
// this version is recursive meaning it calls itself with smaller numbers each time
function extendedGCD(a, b) {
  a = BigInt(a);
  b = BigInt(b);

  // base case: when b is 0, we are done
  // at that point gcd = a, and the equation becomes a*1 + 0*0 = a
  // so x = 1 and y = 0
  if (b === 0n) {
    return {
      gcd: a,
      x: 1n,
      y: 0n
    };
  }

  // call itself again but with smaller numbers (b, and a mod b)
  // this is the same step as regular euclidean gcd
  const result = extendedGCD(b, a % b);

  // now use the result from the smaller problem to work out x and y for this level
  // x comes from the previous y
  // y is calculated using the previous x and y and the floor of a divided by b
  return {
    gcd: result.gcd,
    x: result.y,
    y: result.x - (a / b) * result.y
  };
}


// modInverse finds a number d such that (a * d) mod modulus = 1
// in RSA we use this to find the private key d
// the formula is: e * d ≡ 1 (mod phi)
// so we are basically solving for d given e and phi
// this only works if gcd(a, modulus) = 1, otherwise no solution exists
function modInverse(a, modulus) {
  a = BigInt(a);
  modulus = BigInt(modulus);

  // use extendedGCD to find x where a*x + modulus*y = gcd
  const result = extendedGCD(a, modulus);

  // if gcd is not 1 then there is no modular inverse, the numbers are not coprime
  if (result.gcd !== 1n) {
    throw new Error("Modular inverse does not exist because values are not coprime.");
  }

  // result.x might come out negative depending on the numbers
  // for example we might get x = -3 but we want the equivalent positive version
  // adding modulus then doing mod again fixes that
  // e.g. -3 mod 11 --> (-3 + 11) mod 11 = 8 mod 11 = 8
  let inverse = result.x % modulus;
  inverse = inverse + modulus;
  inverse = inverse % modulus;

  return inverse;
}


// this just takes the record object and smushes all the fields into one string
// we separate each field with a | character so nothing gets mixed up
// e.g. { itemId: "X1", itemQty: 5, itemPrice: 9.99, location: "A3" }
// becomes the string "X1|5|9.99|A3"
// we need a string because the hash function below only takes text
function recordToMessage(record) {
  return `${record.itemId}|${record.itemQty}|${record.itemPrice}|${record.location}`;
}


// this converts a normal text string into one big number (BigInt)
// the way it works is we go through each character one by one
// for each character we multiply the current number by 256
// then add the ASCII code of that character
// its like treating the whole string as a number written in base 256
// e.g. "AB" --> (65 * 256) + 66 = 16706
// we need a number because RSA math only works on numbers not strings
function textToBigIntHash(text) {

  // start the hash at zero
  let hash = 0n;

  for (let i = 0; i < text.length; i++) {

    // charCodeAt gives the ASCII number for the character at position i
    // e.g. "A" = 65, "B" = 66, space = 32 etc
    const ascii = BigInt(text.charCodeAt(i));

    // shift the current hash left in base 256, then add this character's ascii value
    hash = hash * 256n;
    hash = hash + ascii;
  }

  return hash;
}


// this does the same thing as textToBigIntHash above
// but instead of just returning the final number it saves every single step
// so we can show the working in the UI like a step by step table
// its basically the same loop but with extra bookkeeping
function getMessageConversionSteps(text) {

  // start at zero same as before
  let currentValue = 0n;

  // this array will hold one entry for each character in the text
  const steps = [];

  for (let i = 0; i < text.length; i++) {

    const character = text[i];

    // get the ascii code for this character
    const asciiCode = BigInt(text.charCodeAt(i));

    // save the value before we update it, so we can show before and after
    const previousValue = currentValue;

    // same formula as textToBigIntHash: times 256 then add ascii
    currentValue = currentValue * 256n;
    currentValue = currentValue + asciiCode;

    // save this step with all the details
    steps.push({
      step: i + 1,
      character,
      asciiCode,
      previousValue,
      result: currentValue
    });
  }

  // return the full breakdown including every step
  return {
    characters: text.split(""),
    asciiCodes: text.split("").map(char => char.charCodeAt(0)),
    finalInteger: currentValue,
    steps
  };
}

// converts a BigInt back to a readable string
function big_integer_to_sentence(bigInt) {
  const hex = bigInt.toString(16);
  const paddedHex = hex.padStart(Math.ceil(hex.length / 2) * 2, '0');
  let result = '';
  for (let i = 0; i < paddedHex.length; i += 2) {
    const code = parseInt(paddedHex.slice(i, i + 2), 16);
    result += String.fromCharCode(code);
  }
  return result;
}