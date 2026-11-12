import { deflateSync } from "node:zlib";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Generates the extension icons at build time.
 *
 * Icons are a Manifest V3 requirement for Chrome Web Store submission, but
 * generating them here keeps binaries out of the repository and avoids
 * introducing an image-processing dependency. The output is a plain RGBA PNG
 * (a red rounded square with a white play triangle).
 */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let crc = n;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 1) === 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
    table[n] = crc >>> 0;
  }
  return table;
})();

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeAndData = Buffer.concat([Buffer.from(type, "latin1"), data]);

  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(typeAndData), 0);

  return Buffer.concat([length, typeAndData, checksum]);
}

function insideRoundedSquare(x: number, y: number, size: number): boolean {
  const radius = size * 0.22;
  const max = size - 1;

  const inHorizontalBand = x >= radius && x <= max - radius;
  const inVerticalBand = y >= radius && y <= max - radius;
  if (inHorizontalBand || inVerticalBand) return true;

  const corners = [
    [radius, radius],
    [max - radius, radius],
    [radius, max - radius],
    [max - radius, max - radius]
  ];

  return corners.some(
    ([cx, cy]) => (x - cx) ** 2 + (y - cy) ** 2 <= radius * radius
  );
}

function insidePlayTriangle(x: number, y: number, size: number): boolean {
  const points: Array<[number, number]> = [
    [0.36 * size, 0.28 * size],
    [0.36 * size, 0.72 * size],
    [0.76 * size, 0.5 * size]
  ];

  const sign = (
    [x1, y1]: [number, number],
    [x2, y2]: [number, number],
    [x3, y3]: [number, number]
  ): number => (x1 - x3) * (y2 - y3) - (x2 - x3) * (y1 - y3);

  const d1 = sign([x, y], points[0], points[1]);
  const d2 = sign([x, y], points[1], points[2]);
  const d3 = sign([x, y], points[2], points[0]);

  const hasNegative = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPositive = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNegative && hasPositive);
}

function renderIcon(size: number): Buffer {
  // One filter byte (0) followed by RGBA for every pixel, per scanline.
  const raw = Buffer.alloc(size * (1 + size * 4));

  for (let y = 0; y < size; y += 1) {
    const rowStart = y * (1 + size * 4);
    raw[rowStart] = 0;

    for (let x = 0; x < size; x += 1) {
      const offset = rowStart + 1 + x * 4;
      const insideSquare = insideRoundedSquare(x, y, size);

      if (!insideSquare) {
        raw.writeUInt32BE(0x00000000, offset);
      } else if (insidePlayTriangle(x, y, size)) {
        raw.writeUInt32BE(0xffffffff, offset);
      } else {
        // YouTube red.
        raw.writeUInt32BE(0xff0000ff, offset);
      }
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // colour type: RGBA
  header[10] = 0; // compression
  header[11] = 0; // filter method
  header[12] = 0; // interlace

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0))
  ]);
}

/** Writes `icon16.png`, `icon48.png` and `icon128.png` into `directory`. */
export async function writeIcons(directory: string): Promise<void> {
  await mkdir(directory, { recursive: true });

  await Promise.all(
    [16, 48, 128].map(size =>
      writeFile(join(directory, `icon${size}.png`), renderIcon(size))
    )
  );
}
