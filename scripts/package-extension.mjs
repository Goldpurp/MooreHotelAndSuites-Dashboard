import { deflateRawSync } from "node:zlib";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const extensionRoot = path.resolve("extension");
const outputRoot = path.resolve("release");

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(buffer) {
  let value = 0xffffffff;
  for (const byte of buffer) {
    value = crcTable[(value ^ byte) & 0xff] ^ (value >>> 8);
  }
  return (value ^ 0xffffffff) >>> 0;
}

async function listFiles(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name === ".DS_Store") continue;
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...(await listFiles(path.join(directory, entry.name), relativePath)));
    } else if (entry.isFile()) {
      files.push(relativePath);
    }
  }
  return files;
}

function createLocalHeader(fileName, data, compressedData) {
  const name = Buffer.from(fileName);
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0, 6);
  header.writeUInt16LE(8, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(33, 12);
  header.writeUInt32LE(crc32(data), 14);
  header.writeUInt32LE(compressedData.length, 18);
  header.writeUInt32LE(data.length, 22);
  header.writeUInt16LE(name.length, 26);
  header.writeUInt16LE(0, 28);
  return Buffer.concat([header, name, compressedData]);
}

function createCentralHeader(fileName, data, compressedData, localOffset) {
  const name = Buffer.from(fileName);
  const header = Buffer.alloc(46);
  header.writeUInt32LE(0x02014b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(20, 6);
  header.writeUInt16LE(0, 8);
  header.writeUInt16LE(8, 10);
  header.writeUInt16LE(0, 12);
  header.writeUInt16LE(33, 14);
  header.writeUInt32LE(crc32(data), 16);
  header.writeUInt32LE(compressedData.length, 20);
  header.writeUInt32LE(data.length, 24);
  header.writeUInt16LE(name.length, 28);
  header.writeUInt16LE(0, 30);
  header.writeUInt16LE(0, 32);
  header.writeUInt16LE(0, 34);
  header.writeUInt16LE(0, 36);
  header.writeUInt32LE(0, 38);
  header.writeUInt32LE(localOffset, 42);
  return Buffer.concat([header, name]);
}

const manifest = JSON.parse(
  await readFile(path.join(extensionRoot, "manifest.json"), "utf8"),
);
const files = await listFiles(extensionRoot);
const localRecords = [];
const centralRecords = [];
let offset = 0;

for (const fileName of files) {
  const data = await readFile(path.join(extensionRoot, fileName));
  const compressedData = deflateRawSync(data, { level: 9 });
  const localRecord = createLocalHeader(fileName, data, compressedData);
  localRecords.push(localRecord);
  centralRecords.push(createCentralHeader(fileName, data, compressedData, offset));
  offset += localRecord.length;
}

const centralDirectory = Buffer.concat(centralRecords);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(0, 4);
end.writeUInt16LE(0, 6);
end.writeUInt16LE(files.length, 8);
end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(centralDirectory.length, 12);
end.writeUInt32LE(offset, 16);
end.writeUInt16LE(0, 20);

await mkdir(outputRoot, { recursive: true });
const outputPath = path.join(
  outputRoot,
  `Moore-Hotels-Chrome-Extension-v${manifest.version}.zip`,
);
await writeFile(outputPath, Buffer.concat([...localRecords, centralDirectory, end]));
console.log(`Created ${path.relative(process.cwd(), outputPath)} with ${files.length} files.`);
