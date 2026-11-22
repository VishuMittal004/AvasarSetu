const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const iconsDir = path.join(__dirname, '..', 'public', 'icons')
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true })

// CRC32 implementation for PNG chunks
const crcTable = new Uint32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
  }
  crcTable[n] = c >>> 0
}

function crc32(buf) {
  let c = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) {
    c = (crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8)) >>> 0
  }
  return (c ^ 0xFFFFFFFF) >>> 0
}

function createChunk(type, data) {
  const len = data.length
  const buf = Buffer.alloc(8 + len + 4)
  buf.writeUInt32BE(len, 0)
  buf.write(type, 4, 4, 'ascii')
  data.copy(buf, 8)
  const crc = crc32(buf.subarray(4, 8 + len))
  buf.writeUInt32BE(crc, 8 + len)
  return buf
}

function generateCompassPng(size) {
  const width = size
  const height = size
  const bytesPerPixel = 4
  const scanlineLength = 1 + width * bytesPerPixel
  const rawData = Buffer.alloc(scanlineLength * height)

  const cx = width / 2
  const cy = height / 2
  const outerR = size * 0.38
  const innerR = size * 0.32
  const needleLen = size * 0.28
  const needleWidth = size * 0.07

  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLength
    rawData[rowOffset] = 0 // Filter type: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * bytesPerPixel

      // Default background: #0F172A (navy)
      let r = 15
      let g = 23
      let b = 42
      let a = 255

      const dx = x - cx
      const dy = y - cy
      const dist = Math.sqrt(dx * dx + dy * dy)

      // Outer ring
      if (dist <= outerR && dist >= innerR) {
        // Emerald green ring (#2D7A4F)
        r = 45
        g = 122
        b = 79
      } else if (dist < innerR) {
        // Darker circle background (#1E293B)
        r = 30
        g = 41
        b = 59

        // Compass needle North (points up: dy < 0)
        // Triangle from (-needleWidth, 0) to (needleWidth, 0) to (0, -needleLen)
        if (dy <= 0 && dy >= -needleLen) {
          const maxW = needleWidth * (1 - Math.abs(dy) / needleLen)
          if (Math.abs(dx) <= maxW) {
            // Emerald needle pointing north (#34D399 / #10B981)
            r = 52
            g = 211
            b = 153
          }
        }
        // Compass needle South (points down: dy > 0)
        // Triangle from (-needleWidth, 0) to (needleWidth, 0) to (0, needleLen)
        if (dy > 0 && dy <= needleLen) {
          const maxW = needleWidth * (1 - Math.abs(dy) / needleLen)
          if (Math.abs(dx) <= maxW) {
            // White needle pointing south (#FFFFFF)
            r = 255
            g = 255
            b = 255
          }
        }

        // Center compass pivot dot (radius = size * 0.04)
        if (dist <= size * 0.045) {
          r = 255
          g = 255
          b = 255
        }
      }

      rawData[pxOffset] = r
      rawData[pxOffset + 1] = g
      rawData[pxOffset + 2] = b
      rawData[pxOffset + 3] = a
    }
  }

  // PNG Header
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])

  // IHDR Chunk
  const ihdrData = Buffer.alloc(13)
  ihdrData.writeUInt32BE(width, 0)
  ihdrData.writeUInt32BE(height, 4)
  ihdrData[8] = 8 // bit depth
  ihdrData[9] = 6 // color type RGBA
  ihdrData[10] = 0 // compression method
  ihdrData[11] = 0 // filter method
  ihdrData[12] = 0 // interlace method
  const ihdrChunk = createChunk('IHDR', ihdrData)

  // IDAT Chunk
  const compressedData = zlib.deflateSync(rawData)
  const idatChunk = createChunk('IDAT', compressedData)

  // IEND Chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0))

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk])
}

async function generateIcons() {
  const sizes = [
    { name: 'icon-192.png', size: 192 },
    { name: 'icon-512.png', size: 512 },
    { name: 'apple-touch-icon.png', size: 180 },
  ]

  let sharp = null
  try {
    sharp = require('sharp')
  } catch (e) {
    // sharp not available, use built-in generator
  }

  const srcImage = path.join(__dirname, '..', 'public', 'images', 'careercompass-hero.png')

  for (const { name, size } of sizes) {
    const outputPath = path.join(iconsDir, name)
    if (sharp && fs.existsSync(srcImage)) {
      try {
        await sharp(srcImage)
          .resize(size, size, { fit: 'cover', position: 'center' })
          .png()
          .toFile(outputPath)
        console.log(`Generated with sharp: ${name} (${size}x${size})`)
        continue
      } catch (err) {
        console.warn(`Sharp failed for ${name}: ${err.message}`)
      }
    }

    // Pure Node.js fallback creating navy compass icon
    const pngBuffer = generateCompassPng(size)
    fs.writeFileSync(outputPath, pngBuffer)
    console.log(`Generated pure Node icon: ${name} (${size}x${size})`)
  }

  console.log('All icons generated successfully!')
}

generateIcons().catch(console.error)
