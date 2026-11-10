const fs = require('fs');
const path = require('path');

function readWav(filePath) {
  const buf = fs.readFileSync(filePath);
  let pos = 12, fmt = null, dataOffset = 0, dataSize = 0;
  while (pos < buf.length - 8) {
    const id = buf.toString('ascii', pos, pos + 4);
    const size = buf.readUInt32LE(pos + 4);
    if (id === 'fmt ') {
      const formatTag = buf.readUInt16LE(pos + 8);
      let subFormatTag = formatTag;
      if (formatTag === 0xFFFE && size >= 40) {
        subFormatTag = buf.readUInt16LE(pos + 32);
      }
      fmt = {
        formatTag: subFormatTag,
        originalFormatTag: formatTag,
        channels: buf.readUInt16LE(pos + 10),
        sampleRate: buf.readUInt32LE(pos + 12),
        bitsPerSample: buf.readUInt16LE(pos + 22)
      };
    } else if (id === 'data') {
      dataOffset = pos + 8;
      dataSize = size;
      break;
    }
    pos += 8 + size + (size % 2);
  }
  const bytesPerSample = fmt.bitsPerSample / 8;
  const frameSize = fmt.channels * bytesPerSample;
  const numSamples = Math.floor(Math.min(dataSize, buf.length - dataOffset) / frameSize);
  const samples = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    let sum = 0;
    for (let ch = 0; ch < fmt.channels; ch++) {
      const offset = dataOffset + i * frameSize + ch * bytesPerSample;
      let val = 0;
      if (fmt.formatTag === 3 && fmt.bitsPerSample === 32) {
        val = buf.readFloatLE(offset);
      } else if (fmt.bitsPerSample === 16) {
        val = buf.readInt16LE(offset) / 32768;
      } else if (fmt.bitsPerSample === 24) {
        const b0 = buf[offset], b1 = buf[offset + 1], b2 = buf[offset + 2];
        val = (((b0 | (b1 << 8) | (b2 << 16)) << 8) >> 8) / 8388608;
      } else if (fmt.bitsPerSample === 32) {
        val = buf.readInt32LE(offset) / 2147483648;
      }
      sum += val;
    }
    samples[i] = sum / fmt.channels;
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
  },
  clap: {
    low: { label: 'Low', cutoff: 2400, attackMs: 3.5, decayFactor: 0.68, gain: 0.46 },
    'med-low': { label: 'Medium-Low', cutoff: 5200, attackMs: 1.5, decayFactor: 0.86, gain: 0.68 },
    med: { label: 'Medium', cutoff: 12500, attackMs: 0, decayFactor: 1.0, gain: 0.88 },
    'med-high': { label: 'Medium-High', cutoff: 18000, attackMs: 0, decayFactor: 1.0, gain: 0.96 },
    high: { label: 'High', cutoff: 20000, attackMs: 0, decayFactor: 1.0, gain: 1.06, saturate: 1.3, normPeak: 0.98 }
  },
  perc: {
    low: { label: 'Low', cutoff: 2800, attackMs: 3, decayFactor: 0.70, gain: 0.48 },
    'med-low': { label: 'Medium-Low', cutoff: 6500, attackMs: 1.5, decayFactor: 0.88, gain: 0.70 },
    med: { label: 'Medium', cutoff: 14000, attackMs: 0, decayFactor: 1.0, gain: 0.88 },
    'med-high': { label: 'Medium-High', cutoff: 19000, attackMs: 0, decayFactor: 1.0, gain: 0.96 },
    high: { label: 'High', cutoff: 20000, attackMs: 0, decayFactor: 1.0, gain: 1.06, saturate: 1.3, normPeak: 0.98 }
  },
  tom: {
    low: { label: 'Low', cutoff: 1500, attackMs: 4, decayFactor: 0.72, gain: 0.50 },
    'med-low': { label: 'Medium-Low', cutoff: 3200, attackMs: 2, decayFactor: 0.88, gain: 0.70 },
    med: { label: 'Medium', cutoff: 9000, attackMs: 0, decayFactor: 1.0, gain: 0.88 },
    'med-high': { label: 'Medium-High', cutoff: 16500, attackMs: 0, decayFactor: 1.0, gain: 0.96 },
    high: { label: 'High', cutoff: 20000, attackMs: 0, decayFactor: 1.0, gain: 1.06, saturate: 1.3, normPeak: 0.98 }
  },
  cymbal: {
    low: { label: 'Low', cutoff: 6500, attackMs: 3, decayFactor: 0.65, gain: 0.42 },
    'med-low': { label: 'Medium-Low', cutoff: 10000, attackMs: 1, decayFactor: 0.85, gain: 0.68 },
    med: { label: 'Medium', cutoff: 18000, attackMs: 0, decayFactor: 1.0, gain: 0.86 },
    'med-high': { label: 'Medium-High', cutoff: 20000, attackMs: 0, decayFactor: 1.0, gain: 0.96 },
    high: { label: 'High', cutoff: 20000, attackMs: 0, decayFactor: 1.0, gain: 1.05, saturate: 1.25, normPeak: 0.98 }
  }
};

const soundDefinitions = [
  // Kick Drums
  { category: 'kick', baseFile: 'kick-classic.wav', id: 'kick-classic', name: 'Kick Classic', type: 'Punchy Acoustic/Electronic Hybrid', freq: '45Hz - 3.5kHz', desc: 'Versatile punchy kick drum with tight attack and warm sub body.' },
  { category: 'kick', baseFile: 'kick-808.wav', id: 'kick-808', name: 'Kick 808', type: 'Sub-bass Sine Boom', freq: '30Hz - 900Hz', desc: 'Extended low-end TR-808 bass drum with prolonged pitch sweep.' },
  { category: 'kick', baseFile: 'kick-heavy.wav', id: 'kick-heavy', name: 'Kick Heavy', type: 'High-Energy Compressed Club Kick', freq: '40Hz - 4.5kHz', desc: 'Dense, aggressive transient kick designed for heavy mixes.' },
  { category: 'kick', baseFile: 'kick-softy.wav', id: 'kick-softy', name: 'Kick Softy', type: 'Mellow Low-Pass Kick', freq: '50Hz - 1.2kHz', desc: 'Gentle, warm, rounded kick drum perfect for lo-fi beats.' },
  { category: 'kick', baseFile: 'kick-punchy.wav', id: 'kick-punchy', name: 'Kick Electronic Punch', type: 'Modern Club Electronic Kick', freq: '38Hz - 5kHz', desc: 'Tight modern studio kick with crisp click attack and controlled low end (CC0 Stargate Pack).' },
  { category: 'kick', baseFile: 'kick-sub.wav', id: 'kick-sub', name: 'Kick Sub Bass', type: 'Deep Resonant Sub Kick', freq: '28Hz - 600Hz', desc: 'Heavy sustained sub-bass tail ideal for Trap, Drill, and half-time drops (CC0 Fugue State Audio).' },
  { category: 'kick', baseFile: 'kick-analog909.wav', id: 'kick-analog909', name: 'Kick Analog 909', type: 'Hardware Analog Club Kick', freq: '42Hz - 4.2kHz', desc: 'Punchy 909-inspired analog kick built for House, Techno, and Four-on-the-Floor grooves (CC0 Fugue State Audio).' },

  // Snare Drums
  { category: 'snare', baseFile: 'snare-acoustic01.wav', id: 'snare-acoustic', name: 'Snare Acoustic', type: 'Wooden Acoustic Drum with Room Ambience', freq: '180Hz - 8kHz', desc: 'Real wooden snare hit with resonant body and natural snare wire tail.' },
  { category: 'snare', baseFile: 'snare-808.wav', id: 'snare-808', name: 'Snare 808', type: 'Analog TR-808 Electronic Snare', freq: '220Hz - 10kHz', desc: 'Classic punchy 808 snare with tonal core and snappy noise decay.' },
  { category: 'snare', baseFile: 'snare-vinyl02.wav', id: 'snare-vinyl', name: 'Snare Vinyl', type: 'Sampled Lo-Fi Vinyl Snare', freq: '200Hz - 6.5kHz', desc: 'Gritty, compressed boom-bap snare with vintage crackle character.' },
  { category: 'snare', baseFile: 'snare-tight.wav', id: 'snare-tight', name: 'Snare Analog 909', type: 'Processed Electronic Snare', freq: '210Hz - 11kHz', desc: 'Focused, punchy analog hardware snare for Techno, DnB, and Breakbeats (CC0 Fugue State Audio).' },
  { category: 'snare', baseFile: 'snare-tape.wav', id: 'snare-tape', name: 'Snare Analog Tape', type: 'Warm Tape-Saturated Snare', freq: '190Hz - 7.5kHz', desc: 'Crisp tape-saturated hip-hop snare ideal for Boom Bap and Lo-Fi (CC0 Stargate Freesound).' },
  { category: 'snare', baseFile: 'snare-wood.wav', id: 'snare-wood', name: 'Snare Studio Wood', type: 'Crisp Acoustic Wood Shell Snare', freq: '170Hz - 9kHz', desc: 'Live-recorded acoustic wood snare with articulate crack and natural ring (CC0 Stargate Freesound).' },

  // Hi-Hats
  { category: 'hihat', baseFile: 'hihat-808.wav', id: 'hihat-808', name: 'Hi-Hat 808', type: 'Analog Closed Hat', freq: '5kHz - 18kHz', desc: 'Ultra-tight, crisp transistor closed cymbal for rapid trap/hip-hop sequencing.' },
  { category: 'hihat', baseFile: 'hihat-acoustic01.wav', id: 'hihat-acoustic', name: 'Hi-Hat Acoustic', type: 'Natural Brass Cymbal Strike', freq: '3kHz - 16kHz', desc: 'Organic cymbal hit with shimmering natural acoustic decay.' },
  { category: 'hihat', baseFile: 'hihat-open.wav', id: 'hihat-open', name: 'Hi-Hat Open 909', type: 'Analog Open Hi-Hat', freq: '4kHz - 18kHz', desc: 'Classic sizzling 909-style open hat for House off-beats and Trap accents (CC0 Fugue State Audio).' },
  { category: 'hihat', baseFile: 'hihat-tight.wav', id: 'hihat-tight', name: 'Hi-Hat Studio Tight', type: 'Minimal Crisp Closed Hat', freq: '6kHz - 18kHz', desc: 'Short, laser-tight studio closed hat for fast rolls and DnB shuffles (CC0 Stargate).' },
  { category: 'hihat', baseFile: 'hihat-electro.wav', id: 'hihat-electro', name: 'Hi-Hat Synth', type: 'Clean Electronic Closed Hat', freq: '4.5kHz - 17kHz', desc: 'Modern electronic synth hi-hat with airy metallic sheen (CC0 Fugue State Audio).' },

  // Track 04: Claps & Snaps
  { category: 'clap', baseFile: 'clap-808.wav', id: 'clap-808', name: 'Clap Analog 808', type: 'Wide Hardware Handclap', freq: '400Hz - 12kHz', desc: 'Classic multi-burst 808/909 electronic clap for House, Trap, and Synthwave (CC0 Fugue State Audio).' },
  { category: 'clap', baseFile: 'clap-trap.wav', id: 'clap-trap', name: 'Clap Hip-Hop', type: 'Dry Snappy Trap Clap', freq: '550Hz - 14kHz', desc: 'Tight, punchy hip-hop/trap backbeat clap built to slice through heavy 808s (CC0 Stargate Freesound).' },
  { category: 'clap', baseFile: 'clap-acoustic.wav', id: 'clap-acoustic', name: 'Clap Studio Hand', type: 'Natural Acoustic Handclap', freq: '350Hz - 11kHz', desc: 'Organic recorded handclap with warm room snap for Afrobeats and Pop grooves (CC0 Stargate Freesound).' },
  { category: 'clap', baseFile: 'clap-synth.wav', id: 'clap-synth', name: 'Clap Synth Gate', type: 'Bright Electronic Synth Clap', freq: '500Hz - 15kHz', desc: 'Bright synthwave-ready gated handclap with crisp stereo spread (CC0 Fugue State Audio).' },

  // Track 05: Percussion & Rim
  { category: 'perc', baseFile: 'perc-rimshot.wav', id: 'perc-rimshot', name: '808 Rimshot', type: 'Analog Wood/Rim Click', freq: '600Hz - 9kHz', desc: 'Sharp 808 rimshot click essential for Reggaeton Dembow, Drill, and Afrobeats (CC0 Stargate Freesound).' },
  { category: 'perc', baseFile: 'perc-cowbell.wav', id: 'perc-cowbell', name: '808 Cowbell', type: 'Vintage Analog Metallic Bell', freq: '540Hz - 6kHz', desc: 'Classic metallic drum-machine cowbell for Memphis Trap, Phonk, and Funk grooves (CC0 Fugue State Audio).' },
  { category: 'perc', baseFile: 'perc-bongo.wav', id: 'perc-bongo', name: 'Acoustic Bongo', type: 'Melodic Hand Drum Strike', freq: '250Hz - 5kHz', desc: 'Warm acoustic hand-struck bongo tone for Afrobeats and Tropical syncopation (CC0 Stargate Freesound).' },
  { category: 'perc', baseFile: 'perc-maraca.wav', id: 'perc-maraca', name: 'Analog Maracas', type: 'High-Frequency Shaker Pulse', freq: '4kHz - 17kHz', desc: 'Crisp short shaker/maraca tick for rolling 16th-note House and Latin momentum (CC0 Fugue State Audio).' },
  { category: 'perc', baseFile: 'perc-claves.wav', id: 'perc-claves', name: 'Analog Claves', type: 'Pitched Wood Clave Strike', freq: '1.2kHz - 7kHz', desc: 'Resonant clave wood-block hit for Latin, House, and cross-rhythm accents (CC0 Fugue State Audio).' },

  // Track 06: Toms & Fills
  { category: 'tom', baseFile: 'tom-low.wav', id: 'tom-low', name: 'Analog Low Tom', type: 'Deep Floor Tom', freq: '75Hz - 1.8kHz', desc: 'Warm, resonant analog floor tom for 80s synthwave builds and club fills (CC0 Fugue State Audio).' },
  { category: 'tom', baseFile: 'tom-mid.wav', id: 'tom-mid', name: 'Analog Mid Tom', type: 'Punchy Rack Tom', freq: '110Hz - 2.4kHz', desc: 'Balanced mid-pitched drum machine tom for melodic tom rolls (CC0 Fugue State Audio).' },
  { category: 'tom', baseFile: 'tom-high.wav', id: 'tom-high', name: 'Analog High Tom', type: 'Tight High Fill Tom', freq: '160Hz - 3.2kHz', desc: 'Crisp high rack tom ideal for rapid transitional drum fills (CC0 Fugue State Audio).' },

  // Track 07: Cymbals & Crash
  { category: 'cymbal', baseFile: 'cymbal-crash.wav', id: 'cymbal-crash', name: 'Analog Crash', type: 'Hardware Crash Cymbal', freq: '2.5kHz - 18kHz', desc: 'Bold downbeat crash cymbal to punctuate loop turnarounds and drops (CC0 Fugue State Audio).' },
  { category: 'cymbal', baseFile: 'cymbal-ride.wav', id: 'cymbal-ride', name: 'Analog Ride', type: 'Shimmering Ride Cymbal', freq: '3kHz - 18kHz', desc: 'Defined analog ride cymbal for Techno driving tops and Jazz breakbeats (CC0 Fugue State Audio).' },
  { category: 'cymbal', baseFile: 'cymbal-bright-crash.wav', id: 'cymbal-bright-crash', name: 'Studio Acoustic Crash', type: 'Wide Stereo Brass Crash', freq: '2kHz - 18kHz', desc: 'Expansive studio brass crash cymbal with long lush decay tail (CC0 Stargate Freesound).' }
];

const manifest = {
  version: '2.1.0',
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
      id: 'kick',
      name: 'Kick Drums',
      trackNumber: 1,
      type: 'builtin',
      baseTrackSound: 'kick-classic',
      defaultVariation: 'med',
      sounds: {}
    },
    snare: {
      id: 'snare',
      name: 'Snare Drums',
      trackNumber: 2,
      type: 'builtin',
      baseTrackSound: 'snare-acoustic',
      defaultVariation: 'med',
      sounds: {}
    },
    hihat: {
      id: 'hihat',
      name: 'Hi-Hats',
      trackNumber: 3,
      type: 'builtin',
      baseTrackSound: 'hihat-808',
      defaultVariation: 'med',
      sounds: {}
    },
    clap: {
      id: 'clap',
      name: 'Claps & Snaps',
      trackNumber: 4,
      type: 'builtin',
      color: '#8b5cf6',
      baseTrackSound: 'clap-808',
      defaultVariation: 'med',
      sounds: {}
    },
    perc: {
      id: 'perc',
      name: 'Percussion & Rim',
      trackNumber: 5,
      type: 'builtin',
      color: '#10b981',
      baseTrackSound: 'perc-rimshot',
      defaultVariation: 'med',
      sounds: {}
    },
    tom: {
      id: 'tom',
      name: 'Toms & Fills',
      trackNumber: 6,
      type: 'builtin',
      color: '#f59e0b',
      baseTrackSound: 'tom-low',
      defaultVariation: 'med',
      sounds: {}
    },
    cymbal: {
      id: 'cymbal',
      name: 'Cymbals & Crash',
      trackNumber: 7,
      type: 'builtin',
      color: '#0ea5e9',
      baseTrackSound: 'cymbal-crash',
      defaultVariation: 'med',
      sounds: {}
    }
  }
};

soundDefinitions.forEach(item => {
  const srcPath = path.join('sounds', item.category, 'base', item.baseFile);
  const { fmt, samples } = readWav(srcPath);
  if (fmt.originalFormatTag !== 1) {
    // Normalize IEEE float / extensible base files to standard 16-bit PCM WAV for universal browser <audio> support
    writeWav(srcPath, samples, fmt.sampleRate, 16);
  }
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

const manifestJson = JSON.stringify(manifest, null, 2);
fs.writeFileSync('sounds/sound-manifest.json', manifestJson);
fs.writeFileSync('sounds/sound-manifest.js', `window.SOUND_MANIFEST = ${manifestJson};\n`);
console.log('Saved sounds/sound-manifest.json and sounds/sound-manifest.js successfully!');
