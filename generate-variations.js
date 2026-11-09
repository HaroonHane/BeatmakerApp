const fs = require('fs');
const path = require('path');

function readWav(filePath) {
  const buf = fs.readFileSync(filePath);
  let pos = 12, fmt = null, dataOffset = 0, dataSize = 0;
  while (pos < buf.length - 8) {
    const id = buf.toString('ascii', pos, pos + 4);
    const size = buf.readUInt32LE(pos + 4);
    if (id === 'fmt ') {
      fmt = {
        channels: buf.readUInt16LE(pos + 10),
        sampleRate: buf.readUInt32LE(pos + 12),
        bitsPerSample: buf.readUInt16LE(pos + 22)
      };
    } else if (id === 'data') {
      dataOffset = pos + 8;
      dataSize = size;
      break;
    }
    pos += 8 + size;
  }
  const bytesPerSample = fmt.bitsPerSample / 8;
  const numSamples = Math.floor(dataSize / (fmt.channels * bytesPerSample));
  const samples = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    const offset = dataOffset + i * bytesPerSample * fmt.channels;
    if (fmt.bitsPerSample === 16) {
      samples[i] = buf.readInt16LE(offset) / 32768;
    } else if (fmt.bitsPerSample === 24) {
      const b0 = buf[offset], b1 = buf[offset + 1], b2 = buf[offset + 2];
      samples[i] = (((b0 | (b1 << 8) | (b2 << 16)) << 8) >> 8) / 8388608;
    }
  }
  return { fmt, samples };
}

function writeWav(filePath, samples, sampleRate = 44100, bitsPerSample = 16) {
  const numChannels = 1;
  const bytesPerSample = bitsPerSample / 8;
  const dataSize = samples.length * numChannels * bytesPerSample;
  const fileSize = 36 + dataSize;
  const buf = Buffer.alloc(44 + dataSize);
  
  buf.write('RIFF', 0);
  buf.writeUInt32LE(fileSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(numChannels, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * numChannels * bytesPerSample, 28);
  buf.writeUInt16LE(numChannels * bytesPerSample, 32);
  buf.writeUInt16LE(bitsPerSample, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);
  
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const intVal = Math.round(s < 0 ? s * 32768 : s * 32767);
    buf.writeInt16LE(intVal, offset);
    offset += 2;
  }
  fs.writeFileSync(filePath, buf);
}

function createLPF(cutoff, sampleRate = 44100, Q = 0.707) {
  const w0 = 2 * Math.PI * Math.min(cutoff, sampleRate * 0.45) / sampleRate;
  const alpha = Math.sin(w0) / (2 * Q);
  const cosw0 = Math.cos(w0);
  const b0 = (1 - cosw0) / 2;
  const b1 = 1 - cosw0;
  const b2 = (1 - cosw0) / 2;
  const a0 = 1 + alpha;
  const a1 = -2 * cosw0;
  const a2 = 1 - alpha;
  return { b0: b0/a0, b1: b1/a0, b2: b2/a0, a1: a1/a0, a2: a2/a0 };
}

function applyBiquad(samples, c) {
  const out = new Float32Array(samples.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < samples.length; i++) {
    const x0 = samples[i];
    const y0 = c.b0 * x0 + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
    x2 = x1; x1 = x0; y2 = y1; y1 = y0;
    out[i] = y0;
  }
  return out;
}

function shapeAttack(samples, softenMs = 4, sampleRate = 44100) {
  const count = Math.floor((softenMs / 1000) * sampleRate);
  const out = new Float32Array(samples);
  for (let i = 0; i < Math.min(count, out.length); i++) {
    out[i] *= Math.sin((i / count) * Math.PI * 0.5);
  }
  return out;
}

function shapeDecay(samples, decayFactor = 0.8) {
  const out = new Float32Array(samples);
  for (let i = 0; i < out.length; i++) {
    const t = i / out.length;
    out[i] *= Math.pow(1 - t * (1 - decayFactor), 1.5);
  }
  return out;
}

function softSaturate(x, drive = 1.3) {
  return Math.tanh(x * drive) / Math.tanh(drive);
}

// Intensity generator rules
const intensityProfiles = {
  kick: {
    low: { label: 'Low', cutoff: 1200, attackMs: 5, decayFactor: 0.75, gain: 0.50 },
    'med-low': { label: 'Medium-Low', cutoff: 2600, attackMs: 2, decayFactor: 0.90, gain: 0.70 },
    med: { label: 'Medium', cutoff: 8000, attackMs: 0, decayFactor: 1.0, gain: 0.88 },
    'med-high': { label: 'Medium-High', cutoff: 16000, attackMs: 0, decayFactor: 1.0, gain: 0.96 },
    high: { label: 'High', cutoff: 20000, attackMs: 0, decayFactor: 1.0, gain: 1.08, saturate: 1.35, normPeak: 0.98 }
  },
  snare: {
    low: { label: 'Low', cutoff: 2400, attackMs: 4, decayFactor: 0.70, gain: 0.46 },
    'med-low': { label: 'Medium-Low', cutoff: 5000, attackMs: 1.5, decayFactor: 0.88, gain: 0.68 },
    med: { label: 'Medium', cutoff: 12000, attackMs: 0, decayFactor: 1.0, gain: 0.88 },
    'med-high': { label: 'Medium-High', cutoff: 18000, attackMs: 0, decayFactor: 1.0, gain: 0.96 },
    high: { label: 'High', cutoff: 20000, attackMs: 0, decayFactor: 1.0, gain: 1.06, saturate: 1.3, normPeak: 0.98 }
  },
  hihat: {
    low: { label: 'Low', cutoff: 6500, attackMs: 3, decayFactor: 0.65, gain: 0.42 },
    'med-low': { label: 'Medium-Low', cutoff: 10000, attackMs: 1, decayFactor: 0.85, gain: 0.68 },
    med: { label: 'Medium', cutoff: 18000, attackMs: 0, decayFactor: 1.0, gain: 0.86 },
    'med-high': { label: 'Medium-High', cutoff: 20000, attackMs: 0, decayFactor: 1.0, gain: 0.96 },
    high: { label: 'High', cutoff: 20000, attackMs: 0, decayFactor: 1.0, gain: 1.05, saturate: 1.25, normPeak: 0.98 }
  }
};

const soundDefinitions = [
  { category: 'kick', baseFile: 'kick-classic.wav', id: 'kick-classic', name: 'Kick Classic', type: 'Punchy Acoustic/Electronic Hybrid', freq: '45Hz - 3.5kHz', desc: 'Versatile punchy kick drum with tight attack and warm sub body.' },
  { category: 'kick', baseFile: 'kick-808.wav', id: 'kick-808', name: 'Kick 808', type: 'Sub-bass Sine Boom', freq: '30Hz - 900Hz', desc: 'Extended low-end TR-808 bass drum with prolonged pitch sweep.' },
  { category: 'kick', baseFile: 'kick-heavy.wav', id: 'kick-heavy', name: 'Kick Heavy', type: 'High-Energy Compressed Club Kick', freq: '40Hz - 4.5kHz', desc: 'Dense, aggressive transient kick designed for heavy mixes.' },
  { category: 'kick', baseFile: 'kick-softy.wav', id: 'kick-softy', name: 'Kick Softy', type: 'Mellow Low-Pass Kick', freq: '50Hz - 1.2kHz', desc: 'Gentle, warm, rounded kick drum perfect for lo-fi beats.' },

  { category: 'snare', baseFile: 'snare-acoustic01.wav', id: 'snare-acoustic', name: 'Snare Acoustic', type: 'Wooden Acoustic Drum with Room Ambience', freq: '180Hz - 8kHz', desc: 'Real wooden snare hit with resonant body and natural snare wire tail.' },
  { category: 'snare', baseFile: 'snare-808.wav', id: 'snare-808', name: 'Snare 808', type: 'Analog TR-808 Electronic Snare', freq: '220Hz - 10kHz', desc: 'Classic punchy 808 snare with tonal core and snappy noise decay.' },
  { category: 'snare', baseFile: 'snare-vinyl02.wav', id: 'snare-vinyl', name: 'Snare Vinyl', type: 'Sampled Lo-Fi Vinyl Snare', freq: '200Hz - 6.5kHz', desc: 'Gritty, compressed boom-bap snare with vintage crackle character.' },

  { category: 'hihat', baseFile: 'hihat-808.wav', id: 'hihat-808', name: 'Hi-Hat 808', type: 'Analog Closed Hat', freq: '5kHz - 18kHz', desc: 'Ultra-tight, crisp transistor closed cymbal for rapid trap/hip-hop sequencing.' },
  { category: 'hihat', baseFile: 'hihat-acoustic01.wav', id: 'hihat-acoustic', name: 'Hi-Hat Acoustic', type: 'Natural Brass Cymbal Strike', freq: '3kHz - 16kHz', desc: 'Organic cymbal hit with shimmering natural acoustic decay.' }
];

const manifest = {
  version: '2.0.0',
  description: 'Categorized Sound Assets and 5-tier Intensity Variations for Beatmaker Studio',
  intensityLevels: [
    { key: 'low', label: 'Low', description: 'Soft, subtle beat with lower intensity' },
    { key: 'med-low', label: 'Medium-Low', description: 'Slightly stronger sound with warm character' },
    { key: 'med', label: 'Medium', description: 'Balanced default intensity and natural timbre' },
    { key: 'med-high', label: 'Medium-High', description: 'Stronger and more prominent beat with crisp bite' },
    { key: 'high', label: 'High', description: 'Maximum intended intensity with fuller, saturated punch' }
  ],
  categories: {
    kick: {
      name: 'Kick Drums',
      trackNumber: 1,
      baseTrackSound: 'kick-classic',
      defaultVariation: 'med',
      sounds: {}
    },
    snare: {
      name: 'Snare Drums',
      trackNumber: 2,
      baseTrackSound: 'snare-acoustic',
      defaultVariation: 'med',
      sounds: {}
    },
    hihat: {
      name: 'Hi-Hats',
      trackNumber: 3,
      baseTrackSound: 'hihat-808',
      defaultVariation: 'med',
      sounds: {}
    }
  }
};

soundDefinitions.forEach(item => {
  const srcPath = path.join('sounds', item.category, 'base', item.baseFile);
  const { fmt, samples } = readWav(srcPath);
  const profiles = intensityProfiles[item.category];
  
  const soundEntry = {
    id: item.id,
    name: item.name,
    category: item.category,
    type: item.type,
    frequencyRange: item.freq,
    description: item.desc,
    baseFile: `./sounds/${item.category}/base/${item.baseFile}`,
    variations: {}
  };
  
  for (const [level, p] of Object.entries(profiles)) {
    let processed = new Float32Array(samples);
    
    // 1. Filtering
    if (p.cutoff < 19000) {
      const lpf = createLPF(p.cutoff, fmt.sampleRate);
      processed = applyBiquad(processed, lpf);
    }
    
    // 2. Attack Shaping
    if (p.attackMs > 0) {
      processed = shapeAttack(processed, p.attackMs, fmt.sampleRate);
    }
    
    // 3. Decay Shaping
    if (p.decayFactor < 1.0) {
      processed = shapeDecay(processed, p.decayFactor);
    }
    
    // 4. Gain / Velocity Scaling
    for (let i = 0; i < processed.length; i++) {
      processed[i] *= p.gain;
    }
    
    // 5. Saturation for High Intensity
    if (p.saturate) {
      for (let i = 0; i < processed.length; i++) {
        processed[i] = softSaturate(processed[i], p.saturate);
      }
    }
    
    // 6. Normalization / Safety Limiting
    let peak = 0;
    for (let i = 0; i < processed.length; i++) {
      const a = Math.abs(processed[i]);
      if (a > peak) peak = a;
    }
    if (p.normPeak && peak > 0) {
      const scale = p.normPeak / peak;
      for (let i = 0; i < processed.length; i++) {
        processed[i] *= scale;
      }
      peak = p.normPeak;
    } else if (peak > 0.99) {
      const scale = 0.98 / peak;
      for (let i = 0; i < processed.length; i++) {
        processed[i] *= scale;
      }
      peak = 0.98;
    }
    
    const outFileName = `${item.id}-${level}.wav`;
    const outPath = path.join('sounds', item.category, 'variations', outFileName);
    writeWav(outPath, processed, fmt.sampleRate, 16);
    
    soundEntry.variations[level] = {
      file: `./sounds/${item.category}/variations/${outFileName}`,
      intensity: level,
      label: p.label,
      peak: peak.toFixed(3),
      filterCutoffHz: p.cutoff,
      gainScale: p.gain
    };
  }
  
  manifest.categories[item.category].sounds[item.id] = soundEntry;
  console.log(`Generated 5 variations for [${item.category}]: ${item.id}`);
});

fs.writeFileSync('sounds/sound-manifest.json', JSON.stringify(manifest, null, 2));
console.log('Saved sounds/sound-manifest.json successfully!');
