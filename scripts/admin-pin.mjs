import { randomBytes, scryptSync } from 'node:crypto';
import { createInterface } from 'node:readline';
import { Writable } from 'node:stream';

// Run locally in a terminal. Never pass the PIN as a CLI argument or save it in Git.
if (!process.stdin.isTTY) throw Error('Bitte in einem lokalen Terminal ausführen.');
let hidden = false;
const output = new Writable({ write(chunk, encoding, callback) { if (!hidden) process.stdout.write(chunk, encoding); callback(); } });
const rl = createInterface({ input: process.stdin, output, terminal: true });
const ask = prompt => new Promise(resolve => { process.stdout.write(prompt); hidden = true; rl.question('', value => { hidden = false; process.stdout.write('\n'); resolve(value); }); });
const pin = await ask('Neue sechsstellige Admin-PIN (Eingabe verborgen): ');
const repeat = await ask('PIN wiederholen: ');
rl.close();
if (!/^\d{6}$/.test(pin) || pin !== repeat) throw Error('PINs müssen identisch sein und sechs Ziffern enthalten.');
const salt = randomBytes(16).toString('hex');
console.log('\nVercel → jk-inventory → Settings → Environment Variables → Production');
console.log('Name: STAFF_ADMIN_PIN_HASH');
console.log('Wert: scrypt:' + salt + ':' + scryptSync(pin, salt, 32).toString('hex'));
console.log('Als Sensitive speichern und das letzte Deployment erneut bereitstellen.');
