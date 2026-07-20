import { readFile, writeFile } from "node:fs/promises";
import { webcrypto, randomBytes } from "node:crypto";
import { basename } from "node:path";
import { stdin, stdout, stderr, argv, exit } from "node:process";
import { createInterface } from "node:readline/promises";
import vm from "node:vm";

const [, , inputPath, outputPath = "data/encrypted-updates.js"] = argv;

if (!inputPath) {
  stderr.write("Usage: node tools/encrypt-update.mjs <update-json-file> [output-js-file]\n");
  exit(1);
}

const subtle = webcrypto.subtle;
const encoder = new TextEncoder();

function b64(bytes) {
  return Buffer.from(bytes).toString("base64");
}

async function askPassword() {
  const rl = createInterface({ input: stdin, output: stdout });
  const password = await rl.question("Access password: ");
  rl.close();
  return password;
}

async function encrypt(payload, password) {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const keyMaterial = await subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveKey"]);
  const key = await subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 200000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );
  const encrypted = new Uint8Array(await subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(payload)));
  const tagLength = 16;
  return {
    version: 1,
    kdf: "PBKDF2-SHA256",
    iterations: 200000,
    salt: b64(salt),
    iv: b64(iv),
    tag: b64(encrypted.slice(encrypted.length - tagLength)),
    data: b64(encrypted.slice(0, encrypted.length - tagLength)),
    source: basename(inputPath)
  };
}

const source = await readFile(inputPath, "utf8");
let updatePayload;
try {
  updatePayload = JSON.parse(source);
} catch {
  const sandbox = { window: {} };
  vm.runInNewContext(source, sandbox, { filename: inputPath });
  updatePayload = sandbox.window.medicalRecordUpdates;
}
if (!updatePayload || typeof updatePayload !== "object") {
  stderr.write("Input must be JSON or a JS file that assigns window.medicalRecordUpdates.\n");
  exit(1);
}
const plaintext = JSON.stringify(updatePayload);
const password = await askPassword();
const encrypted = await encrypt(plaintext, password);
await writeFile(outputPath, `window.encryptedMedicalRecordUpdates = [${JSON.stringify(encrypted)}];\n`);
stdout.write(`Wrote ${outputPath}\n`);
