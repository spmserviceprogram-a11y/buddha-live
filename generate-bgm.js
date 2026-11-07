// =====================================================================
// Original 432Hz Zen Buddhist Meditation Soundscape Generator
// 100% Original, Royalty-Free, Mathematically Synthesized in Node.js
// Replaces commercial copyrighted chanting tracks to defeat TikTok Audio Content ID
// =====================================================================
const fs = require('fs');
const path = require('path');

function generateZenOriginalSoundscape(durationSeconds = 120) {
  const sampleRate = 44100;
  const numChannels = 2;
  const bitsPerSample = 16;
  const totalSamples = sampleRate * durationSeconds;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = totalSamples * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);

  // 1. Write Standard 44-byte RIFF/WAVE Header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size
  buffer.writeUInt16LE(1, 20);  // AudioFormat: PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // 2. Pre-configure Tibetan Singing Bowl Events (strikes every 20 seconds)
  const bowlStrikes = [
    { startSec: 4,   freq: 432, pan: -0.4 },
    { startSec: 24,  freq: 528, pan: 0.4 },
    { startSec: 44,  freq: 384, pan: -0.3 },
    { startSec: 64,  freq: 432, pan: 0.3 },
    { startSec: 84,  freq: 528, pan: -0.4 },
    { startSec: 104, freq: 432, pan: 0.4 }
  ].map(b => ({
    startSample: Math.round(b.startSec * sampleRate),
    endSample: Math.round((b.startSec + 14) * sampleRate),
    freq: b.freq,
    panL: 0.5 - b.pan * 0.5,
    panR: 0.5 + b.pan * 0.5
  }));

  // 3. Pre-configure Buddhist Wooden Fish (Mõ Chùa) gentle knocks (every 5-6s)
  const knockSecs = [7, 13, 18.5, 27, 33, 38.5, 47, 53, 58.5, 67, 73, 78.5, 87, 93, 98.5, 107, 113];
  const woodKnocks = knockSecs.map((sec, idx) => ({
    startSample: Math.round(sec * sampleRate),
    endSample: Math.round((sec + 0.085) * sampleRate),
    panL: (idx % 2 === 0) ? 0.65 : 0.35,
    panR: (idx % 2 === 0) ? 0.35 : 0.65
  }));

  // 4. Phase accumulators for 432Hz Zen Pentatonic Drone
  let p0 = 0, inc0 = (2 * Math.PI * 108.0) / sampleRate;
  let p1 = 0, inc1 = (2 * Math.PI * 216.0) / sampleRate;
  let p2 = 0, inc2 = (2 * Math.PI * 324.0) / sampleRate;
  let p3 = 0, inc3 = (2 * Math.PI * 432.0) / sampleRate;
  let p4 = 0, inc4 = (2 * Math.PI * 648.0) / sampleRate;
  let pBreath = 0, incBreath = (2 * Math.PI) / (12.0 * sampleRate);

  const TWO_PI = Math.PI * 2;
  const crossfadeSamples = Math.round(3.0 * sampleRate); // 3-second seamless loop blend

  // Temporary float array for crossfade blending
  const leftChannel = new Float32Array(totalSamples);
  const rightChannel = new Float32Array(totalSamples);

  // 5. Synthesis Loop
  for (let i = 0; i < totalSamples; i++) {
    // 5.1 Sacred 432Hz Drone with gentle 12s respiratory wave
    const breath = 0.82 + 0.18 * Math.sin(pBreath);
    const dCenter = (0.24 * Math.sin(p0) + 0.22 * Math.sin(p1) + 0.15 * Math.sin(p3)) * breath;
    const dLeftExtra = (0.12 * Math.sin(p2) + 0.06 * Math.sin(p4)) * breath;
    const dRightExtra = (0.12 * Math.sin(p2 + 0.35) + 0.06 * Math.sin(p4 - 0.25)) * breath;

    let sampleL = (dCenter + dLeftExtra) * 0.48;
    let sampleR = (dCenter + dRightExtra) * 0.48;

    p0 += inc0; if (p0 > TWO_PI) p0 -= TWO_PI;
    p1 += inc1; if (p1 > TWO_PI) p1 -= TWO_PI;
    p2 += inc2; if (p2 > TWO_PI) p2 -= TWO_PI;
    p3 += inc3; if (p3 > TWO_PI) p3 -= TWO_PI;
    p4 += inc4; if (p4 > TWO_PI) p4 -= TWO_PI;
    pBreath += incBreath; if (pBreath > TWO_PI) pBreath -= TWO_PI;

    // 5.2 Tibetan Singing Bowl Overtones (strikes every 20s)
    for (let b = 0; b < bowlStrikes.length; b++) {
      const bowl = bowlStrikes[b];
      if (i >= bowl.startSample && i < bowl.endSample) {
        const deltaSec = (i - bowl.startSample) / sampleRate;
        const bf = bowl.freq;
        const decay1 = Math.exp(-deltaSec / 6.5);
        const decay2 = Math.exp(-deltaSec / 4.8);
        const decay3 = Math.exp(-deltaSec / 3.6);
        const decay4 = Math.exp(-deltaSec / 2.2);

        const bowlSound = (
          0.38 * Math.sin(TWO_PI * bf * deltaSec) * decay1 +
          0.22 * Math.sin(TWO_PI * (1.503 * bf) * deltaSec) * decay2 +
          0.14 * Math.sin(TWO_PI * (2.002 * bf) * deltaSec) * decay3 +
          0.06 * Math.sin(TWO_PI * (2.760 * bf) * deltaSec) * decay4
        ) * 0.65;

        sampleL += bowlSound * bowl.panL;
        sampleR += bowlSound * bowl.panR;
      }
    }

    // 5.3 Buddhist Wooden Fish (Mõ Chùa) Knocks
    for (let k = 0; k < woodKnocks.length; k++) {
      const knock = woodKnocks[k];
      if (i >= knock.startSample && i < knock.endSample) {
        const deltaSec = (i - knock.startSample) / sampleRate;
        const pFrac = deltaSec / 0.085;
        const curFreq = 540 - 350 * pFrac;
        const env = Math.exp(-deltaSec / 0.022) * (1.0 - pFrac);
        const knockSound = Math.sin(TWO_PI * curFreq * deltaSec) * env * 0.26;

        sampleL += knockSound * knock.panL;
        sampleR += knockSound * knock.panR;
      }
    }

    // 5.4 Velvety Mountain Temple Breeze
    const breeze = (Math.random() * 2 - 1) * 0.014 * (0.8 + 0.2 * Math.sin(pBreath * 1.5));
    sampleL += breeze;
    sampleR += breeze;

    leftChannel[i] = sampleL;
    rightChannel[i] = sampleR;
  }

  // 6. Seamless Loop Raised-Cosine Crossfade (matches start & end seamlessly)
  for (let j = 0; j < crossfadeSamples; j++) {
    const p = j / crossfadeSamples;
    const fadeOut = 0.5 * (1 + Math.cos(p * Math.PI)); // 1.0 -> 0.0
    const fadeIn = 1.0 - fadeOut;                       // 0.0 -> 1.0

    const endIdx = totalSamples - crossfadeSamples + j;
    // Blend start with end
    const blendedL = leftChannel[j] * fadeIn + leftChannel[endIdx] * fadeOut;
    const blendedR = rightChannel[j] * fadeIn + rightChannel[endIdx] * fadeOut;

    leftChannel[j] = blendedL;
    rightChannel[j] = blendedR;
    leftChannel[endIdx] = blendedL;
    rightChannel[endIdx] = blendedR;
  }

  // 7. Write 16-bit PCM Audio to Output Buffer (with smooth soft limiting)
  let offset = 44;
  for (let i = 0; i < totalSamples; i++) {
    // Soft tanh limiter to guarantee zero clipping
    const finalL = Math.tanh(leftChannel[i] * 1.15) * 0.72;
    const finalR = Math.tanh(rightChannel[i] * 1.15) * 0.72;

    const intL = Math.max(-32768, Math.min(32767, Math.round(finalL * 32767)));
    const intR = Math.max(-32768, Math.min(32767, Math.round(finalR * 32767)));

    buffer.writeInt16LE(intL, offset);
    buffer.writeInt16LE(intR, offset + 2);
    offset += 4;
  }

  return buffer;
}

// Ensure Original Zen Soundtrack is generated and deployed
function deployOriginalZenSoundtrack() {
  const publicDir = path.join(__dirname, 'public');
  const targetBgmPath = path.join(publicDir, 'bgm.mp3');
  const backupBgmPath = path.join(publicDir, 'bgm_backup_commercial.mp3');
  const targetWavPath = path.join(publicDir, 'bgm_zen_original.wav');

  try {
    // 1. Create a safe backup of the old commercial recording if not already backed up
    if (fs.existsSync(targetBgmPath) && !fs.existsSync(backupBgmPath)) {
      const stats = fs.statSync(targetBgmPath);
      // Only backup if the file exists and is not empty
      if (stats.size > 1000) {
        fs.copyFileSync(targetBgmPath, backupBgmPath);
        console.log('[Zen Audio] Backed up old commercial chanting MP3 to bgm_backup_commercial.mp3');
      }
    }

    console.log('[Zen Audio] Generating 100% Original 432Hz Zen Buddhist Meditation Soundscape (120s)...');
    const startTime = Date.now();
    const zenBuffer = generateZenOriginalSoundscape(120);
    const durationMs = Date.now() - startTime;
    console.log(`[Zen Audio] Synthesis complete in ${durationMs}ms! Buffer size: ${(zenBuffer.length / 1024 / 1024).toFixed(2)} MB`);

    // 2. Deploy to public/bgm.mp3 and public/bgm_zen_original.wav
    fs.writeFileSync(targetBgmPath, zenBuffer);
    fs.writeFileSync(targetWavPath, zenBuffer);
    console.log('[Zen Audio] Successfully deployed 100% Original, Zero-Copyright Zen Soundtrack to public/bgm.mp3 & bgm_zen_original.wav!');
    return true;
  } catch (err) {
    console.error('[Zen Audio Error] Failed to generate/deploy Zen Soundtrack:', err);
    return false;
  }
}

// Auto-run if executed directly or on require
if (require.main === module) {
  deployOriginalZenSoundtrack();
}

module.exports = {
  generateZenOriginalSoundscape,
  deployOriginalZenSoundtrack
};
