const sharp = require('sharp');
const fs = require('fs');

async function convert() {
  console.log('Converting to AVIF and WebP...');
  const input = 'public/images/careercompass-hero.png';
  
  await sharp(input)
    .avif({ quality: 80, effort: 4 })
    .toFile('public/images/careercompass-hero.avif');
    
  await sharp(input)
    .webp({ quality: 80 })
    .toFile('public/images/careercompass-hero.webp');
    
  console.log('Done.');
}
convert();
