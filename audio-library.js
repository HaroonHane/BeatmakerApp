/**
 * AudioLibraryManager
 * IndexedDB (Dexie.js + native fallback) persistence for:
 * 1. Built-in and Custom Sound Tracks
 * 2. Base Audio Assets (Blobs)
 * 3. 5-Tier Intensity Variations (Low, Med-Low, Med, Med-High, High)
 * 4. Client-side Web Audio DSP audio processor & WAV encoder
 */
(function(window) {
  'use strict';

  // --- 0. Curated Studio Color Palette & Theme Derivation ---
  const CUSTOM_TRACK_COLOR_PALETTE = [
    '#8b5cf6', // Electric Violet
    '#0ea5e9', // Ocean Sky
    '#ec4899', // Hot Rose
    '#10b981', // Emerald Mint
    '#6366f1', // Indigo Cobalt
    '#f59e0b', // Amber Gold
    '#f43f5e', // Crimson Coral
    '#06b6d4', // Cyan Turquoise
    '#d946ef', // Fuchsia Plum
    '#3b82f6', // Royal Blue
    '#14b8a6', // Teal Jade
    '#ef4444'  // Scarlet Red
  ];

  function normalizeHexColor(hex) {
    if (typeof hex !== 'string') return '#8b5cf6';
    const cleaned = hex.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(cleaned)) return cleaned.toLowerCase();
    if (/^#[0-9a-fA-F]{3}$/.test(cleaned)) {
      const r = cleaned[1], g = cleaned[2], b = cleaned[3];
      return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
    }
    return '#8b5cf6';
  }

  function hexToRgb(hex) {
    const norm = normalizeHexColor(hex);
    return {
      r: parseInt(norm.slice(1, 3), 16),
      g: parseInt(norm.slice(3, 5), 16),
      b: parseInt(norm.slice(5, 7), 16)
    };
  }

  function mixHexColors(hexA, hexB, weightB) {
    const a = hexToRgb(hexA);
    const b = hexToRgb(hexB);
    const w = Math.max(0, Math.min(1, weightB));
    const r = Math.round(a.r * (1 - w) + b.r * w);
    const g = Math.round(a.g * (1 - w) + b.g * w);
    const bl = Math.round(a.b * (1 - w) + b.b * w);
    return `#${[r, g, bl].map(v => v.toString(16).padStart(2, '0')).join('')}`;
  }

  function hslToHex(h, s, l) {
    const sat = s / 100;
    const lig = l / 100;
    const k = n => (n + h / 30) % 12;
    const a = sat * Math.min(lig, 1 - lig);
    const f = n => Math.round(255 * (lig - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))));
    return `#${[f(0), f(8), f(4)].map(v => v.toString(16).padStart(2, '0')).join('')}`;
  }

  /** Pick a random vibrant color, avoiding already used track colors when available. */
  function pickRandomTrackColor(usedColors = []) {
    const usedSet = new Set(usedColors.filter(Boolean).map(normalizeHexColor));
    const available = CUSTOM_TRACK_COLOR_PALETTE.filter(c => !usedSet.has(normalizeHexColor(c)));
    if (available.length > 0) {
      return available[Math.floor(Math.random() * available.length)];
    }
    const hue = Math.floor(Math.random() * 360);
    const sat = 76 + Math.floor(Math.random() * 14);
    const lig = 46 + Math.floor(Math.random() * 9);
    return hslToHex(hue, sat, lig);
  }

  /** Build CSS tokens from a single hex accent so tracks, pads, and timeline share a cohesive theme. */
  function buildTrackColorTheme(hex) {
    const color = normalizeHexColor(hex);
    const { r, g, b } = hexToRgb(color);
    const light = mixHexColors(color, '#ffffff', 0.14);
    const dark = mixHexColors(color, '#000000', 0.16);
    return {
      color,
      light,
      dark,
      gradient: `linear-gradient(135deg, ${light} 0%, ${dark} 100%)`,
      borderStrong: mixHexColors(color, '#ffffff', 0.25),
      text: mixHexColors(color, '#000000', 0.22),
      soft: `rgba(${r}, ${g}, ${b}, 0.1)`,
      border: `rgba(${r}, ${g}, ${b}, 0.35)`,
      glow: `rgba(${r}, ${g}, ${b}, 0.45)`,
      glowSoft: `rgba(${r}, ${g}, ${b}, 0.28)`,
      timelineText: mixHexColors(color, '#ffffff', 0.28)
    };
  }

  // --- 1. Audio DSP Helper Functions ---
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
    return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
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

  function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  function encodeWavBlob(samples, sampleRate = 44100) {
    const numChannels = 1;
    const bitsPerSample = 16;
    const bytesPerSample = bitsPerSample / 8;
    const dataSize = samples.length * numChannels * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
    view.setUint16(32, numChannels * bytesPerSample, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      const intVal = Math.round(s < 0 ? s * 32768 : s * 32767);
      view.setInt16(offset, intVal, true);
      offset += 2;
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }

  // --- 2. Adaptive Intensity Profiles ---
  function getProfilesForTrack(categoryOrName) {
    const key = (categoryOrName || '').toLowerCase();
    if (key.includes('kick') || key.includes('sub') || key.includes('808') || key.includes('bass')) {
      return {
        low: { label: 'Low', cutoff: 1200, attackMs: 5, decayFactor: 0.75, gain: 0.50 },
        'med-low': { label: 'Medium-Low', cutoff: 2600, attackMs: 2, decayFactor: 0.90, gain: 0.70 },
        med: { label: 'Medium', cutoff: 8000, attackMs: 0, decayFactor: 1.0, gain: 0.88 },
        'med-high': { label: 'Medium-High', cutoff: 16000, attackMs: 0, decayFactor: 1.0, gain: 0.96 },
        high: { label: 'High', cutoff: 20000, attackMs: 0, decayFactor: 1.0, gain: 1.08, saturate: 1.35, normPeak: 0.98 }
      };
    }
    if (key.includes('snare') || key.includes('clap') || key.includes('rim') || key.includes('snap')) {
      return {
        low: { label: 'Low', cutoff: 2400, attackMs: 4, decayFactor: 0.70, gain: 0.46 },
        'med-low': { label: 'Medium-Low', cutoff: 5000, attackMs: 1.5, decayFactor: 0.88, gain: 0.68 },
        med: { label: 'Medium', cutoff: 12000, attackMs: 0, decayFactor: 1.0, gain: 0.88 },
        'med-high': { label: 'Medium-High', cutoff: 18000, attackMs: 0, decayFactor: 1.0, gain: 0.96 },
        high: { label: 'High', cutoff: 20000, attackMs: 0, decayFactor: 1.0, gain: 1.06, saturate: 1.3, normPeak: 0.98 }
      };
    }
    if (key.includes('hat') || key.includes('cymbal') || key.includes('shaker') || key.includes('ride') || key.includes('crash')) {
      return {
        low: { label: 'Low', cutoff: 6500, attackMs: 3, decayFactor: 0.65, gain: 0.42 },
        'med-low': { label: 'Medium-Low', cutoff: 10000, attackMs: 1, decayFactor: 0.85, gain: 0.68 },
        med: { label: 'Medium', cutoff: 18000, attackMs: 0, decayFactor: 1.0, gain: 0.86 },
        'med-high': { label: 'Medium-High', cutoff: 20000, attackMs: 0, decayFactor: 1.0, gain: 0.96 },
        high: { label: 'High', cutoff: 20000, attackMs: 0, decayFactor: 1.0, gain: 1.05, saturate: 1.25, normPeak: 0.98 }
      };
    }
    // Default universal profile for percussion, vocals, synths, FX
    return {
      low: { label: 'Low', cutoff: 2800, attackMs: 3, decayFactor: 0.70, gain: 0.48 },
      'med-low': { label: 'Medium-Low', cutoff: 6500, attackMs: 1.5, decayFactor: 0.88, gain: 0.70 },
      med: { label: 'Medium', cutoff: 14000, attackMs: 0, decayFactor: 1.0, gain: 0.88 },
      'med-high': { label: 'Medium-High', cutoff: 19000, attackMs: 0, decayFactor: 1.0, gain: 0.96 },
      high: { label: 'High', cutoff: 20000, attackMs: 0, decayFactor: 1.0, gain: 1.06, saturate: 1.3, normPeak: 0.98 }
    };
  }

  // --- 3. Dexie / Native IndexedDB Storage Layer ---
  class DexieNativeAdapter {
    constructor(dbName = 'BeatmakerAudioDB') {
      this.dbName = dbName;
      this.db = null;
    }

    async open() {
      if (this.db) return this.db;
      return new Promise((resolve, reject) => {
        const req = indexedDB.open(this.dbName, 1);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (db.objectStoreNames && !db.objectStoreNames.contains('tracks')) {
            const tracksStore = db.createObjectStore('tracks', { keyPath: 'id' });
            tracksStore.createIndex('type', 'type', { unique: false });
          }
          if (db.objectStoreNames && !db.objectStoreNames.contains('audioAssets')) {
            const assetsStore = db.createObjectStore('audioAssets', { keyPath: 'id' });
            assetsStore.createIndex('trackId', 'trackId', { unique: false });
            assetsStore.createIndex('parentAssetId', 'parentAssetId', { unique: false });
            assetsStore.createIndex('type', 'type', { unique: false });
          }
        };
        req.onsuccess = () => {
          this.db = req.result;
          resolve(this.db);
        };
        req.onerror = () => reject(req.error);
      });
    }

    table(tableName) {
      const self = this;
      return {
        async toArray() {
          await self.open();
          return new Promise((resolve, reject) => {
            const tx = self.db.transaction(tableName, 'readonly');
            const store = tx.objectStore(tableName);
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => reject(req.error);
          });
        },
        async get(id) {
          await self.open();
          return new Promise((resolve, reject) => {
            const tx = self.db.transaction(tableName, 'readonly');
            const store = tx.objectStore(tableName);
            const req = store.get(id);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => reject(req.error);
          });
        },
        async put(item) {
          await self.open();
          return new Promise((resolve, reject) => {
            const tx = self.db.transaction(tableName, 'readwrite');
            const store = tx.objectStore(tableName);
            const req = store.put(item);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
          });
        },
        async delete(id) {
          await self.open();
          return new Promise((resolve, reject) => {
            const tx = self.db.transaction(tableName, 'readwrite');
            const store = tx.objectStore(tableName);
            const req = store.delete(id);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
          });
        },
        where(indexName) {
          return {
            equals: (val) => ({
              async toArray() {
                await self.open();
                return new Promise((resolve, reject) => {
                  const tx = self.db.transaction(tableName, 'readonly');
                  const store = tx.objectStore(tableName);
                  const index = store.index(indexName);
                  const req = index.getAll(val);
                  req.onsuccess = () => resolve(req.result || []);
                  req.onerror = () => reject(req.error);
                });
              }
            })
          };
        }
      };
    }
  }

  // --- 4. Main AudioLibraryManager Class ---
  class AudioLibraryManager {
    constructor() {
      this.db = null;
      this.isInitialized = false;
      this.objectUrls = new Map(); // assetId -> blob URL
      this.activeImports = new Set(); // track running imports to prevent duplicate submissions
    }

    async init() {
      if (this.isInitialized) return;

      // Initialize Dexie if available, otherwise use DexieNativeAdapter
      if (typeof window.Dexie === 'function') {
        try {
          const dexieDb = new window.Dexie('BeatmakerAudioDB');
          dexieDb.version(1).stores({
            tracks: 'id, name, type, createdAt, updatedAt',
            audioAssets: 'id, trackId, parentAssetId, name, type, intensity, createdAt'
          });
          await dexieDb.open();
          this.db = dexieDb;
        } catch (e) {
          console.warn('Dexie open error, using native fallback:', e);
          this.db = new DexieNativeAdapter('BeatmakerAudioDB');
          await this.db.open();
        }
      } else {
        this.db = new DexieNativeAdapter('BeatmakerAudioDB');
        await this.db.open();
      }

      // Ensure standard built-in tracks are represented in tracks table
      await this.ensureBuiltinTracks();
      this.isInitialized = true;
    }

    async ensureBuiltinTracks() {
      const existing = await this.db.table('tracks').toArray();
      const defaultTracks = [
        { id: 'kick', name: 'Kick Drums', type: 'builtin', trackNumber: 1, baseTrackSound: 'kick-classic' },
        { id: 'snare', name: 'Snare Drums', type: 'builtin', trackNumber: 2, baseTrackSound: 'snare-acoustic' },
        { id: 'hihat', name: 'Hi-Hats', type: 'builtin', trackNumber: 3, baseTrackSound: 'hihat-808' }
      ];

      for (const dt of defaultTracks) {
        const found = existing.find(t => t.id === dt.id);
        if (!found) {
          await this.db.table('tracks').put({
            ...dt,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      }
    }

    pickRandomTrackColor(usedColors = []) {
      return pickRandomTrackColor(usedColors);
    }

    buildTrackColorTheme(hex) {
      return buildTrackColorTheme(hex);
    }

    async ensureCustomTrackColors(tracks) {
      const usedColors = tracks
        .filter(t => t.type === 'custom' && t.color)
        .map(t => t.color);

      for (const track of tracks) {
        if (track.type === 'custom' && !track.color) {
          track.color = pickRandomTrackColor(usedColors);
          usedColors.push(track.color);
          await this.db.table('tracks').put(track);
        }
      }
      return tracks;
    }

    // --- Track Management ---
    async getAllTracks() {
      await this.init();
      const tracks = await this.db.table('tracks').toArray();
      tracks.sort((a, b) => (a.trackNumber || 99) - (b.trackNumber || 99));
      return await this.ensureCustomTrackColors(tracks);
    }

    async getTrack(trackId) {
      await this.init();
      return await this.db.table('tracks').get(trackId);
    }

    async addCustomTrack(trackName, options = {}) {
      await this.init();
      const trimmed = (trackName || '').trim();
      if (!trimmed) throw new Error('Track name cannot be empty');

      const existingTracks = await this.getAllTracks();
      const customTracks = existingTracks.filter(t => t.type === 'custom');
      const usedColors = customTracks.map(t => t.color).filter(Boolean);
      const trackNumber = 4 + customTracks.length;
      const trackId = `custom-track-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const newTrack = {
        id: trackId,
        name: trimmed,
        type: 'custom',
        trackNumber: trackNumber,
        color: pickRandomTrackColor(usedColors),
        previewOnImport: options.previewOnImport !== undefined ? !!options.previewOnImport : true,
        baseTrackSound: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await this.db.table('tracks').put(newTrack);
      return newTrack;
    }

    async setTrackPreviewOnImport(trackId, enabled) {
      await this.init();
      const track = await this.getTrack(trackId);
      if (!track) return null;
      track.previewOnImport = !!enabled;
      track.updatedAt = new Date().toISOString();
      await this.db.table('tracks').put(track);
      return track;
    }

    async renameTrack(trackId, newName) {
      await this.init();
      const trimmed = (newName || '').trim();
      if (!trimmed) throw new Error('Track name cannot be empty');

      const track = await this.getTrack(trackId);
      if (!track) throw new Error(`Track ${trackId} not found`);

      track.name = trimmed;
      track.updatedAt = new Date().toISOString();
      await this.db.table('tracks').put(track);
      return track;
    }

    async deleteTrack(trackId) {
      await this.init();
      const track = await this.getTrack(trackId);
      if (!track) return false;
      if (track.type === 'builtin') {
        throw new Error('Built-in tracks cannot be deleted');
      }

      // Delete all audio assets (base and variations) for this track
      const assets = await this.db.table('audioAssets').where('trackId').equals(trackId).toArray();
      for (const asset of assets) {
        if (this.objectUrls.has(asset.id)) {
          URL.revokeObjectURL(this.objectUrls.get(asset.id));
          this.objectUrls.delete(asset.id);
        }
        await this.db.table('audioAssets').delete(asset.id);
      }

      // Delete track record
      await this.db.table('tracks').delete(trackId);
      return true;
    }

    // --- Audio Decoding & DSP Processing ---
    async decodeAudioFile(fileOrBlob) {
      const arrayBuffer = await fileOrBlob.arrayBuffer();
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      try {
        const decodedBuffer = await ctx.decodeAudioData(arrayBuffer);
        const sampleRate = decodedBuffer.sampleRate;
        const duration = decodedBuffer.duration;
        const length = decodedBuffer.length;
        const monoSamples = new Float32Array(length);

        if (decodedBuffer.numberOfChannels === 1) {
          monoSamples.set(decodedBuffer.getChannelData(0));
        } else {
          const left = decodedBuffer.getChannelData(0);
          const right = decodedBuffer.getChannelData(1);
          for (let i = 0; i < length; i++) {
            monoSamples[i] = (left[i] + right[i]) * 0.5;
          }
        }

        return { samples: monoSamples, sampleRate, duration };
      } finally {
        if (ctx.state !== 'closed' && typeof ctx.close === 'function') {
          ctx.close().catch(() => {});
        }
      }
    }

    generateVariations(samples, sampleRate, trackCategoryOrName, onStepProgress = null) {
      const profiles = getProfilesForTrack(trackCategoryOrName);
      const variations = {};

      const levels = ['low', 'med-low', 'med', 'med-high', 'high'];
      levels.forEach((level, idx) => {
        const p = profiles[level];
        if (onStepProgress) onStepProgress(level, idx + 1, levels.length);

        let processed = new Float32Array(samples);

        // 1. Filtering
        if (p.cutoff < 19500) {
          const lpf = createLPF(p.cutoff, sampleRate);
          processed = applyBiquad(processed, lpf);
        }

        // 2. Attack Shaping
        if (p.attackMs > 0) {
          processed = shapeAttack(processed, p.attackMs, sampleRate);
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

        // 6. Normalization & Safety Limiting
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

        const wavBlob = encodeWavBlob(processed, sampleRate);
        variations[level] = {
          intensity: level,
          label: p.label,
          blob: wavBlob,
          filterCutoffHz: p.cutoff,
          gainScale: p.gain,
          peak: peak.toFixed(3)
        };
      });

      return variations;
    }

    // --- Unified Import Pipeline ---
    async importBaseSound(trackId, file, onProgress = null) {
      await this.init();

      const track = await this.getTrack(trackId);
      if (!track) throw new Error(`Destination track "${trackId}" does not exist.`);

      const importLockKey = `${trackId}:${file.name}:${file.size}`;
      if (this.activeImports.has(importLockKey)) {
        throw new Error('This sound file is currently being processed. Please wait.');
      }
      this.activeImports.add(importLockKey);

      try {
        if (onProgress) onProgress({ step: 'validating', percent: 10, message: `Reading "${file.name}"...` });

        // 1. Decode original audio file
        const { samples, sampleRate, duration } = await this.decodeAudioFile(file);

        if (onProgress) onProgress({ step: 'base-save', percent: 25, message: 'Persisting base sound...' });

        // Generate clean friendly name from file
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').trim() || 'Custom Sound';
        const baseAssetId = `asset-base-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        // Convert base to standard 16-bit WAV Blob for consistency
        const baseWavBlob = encodeWavBlob(samples, sampleRate);

        const baseAsset = {
          id: baseAssetId,
          trackId: trackId,
          parentAssetId: null,
          name: cleanName,
          type: 'base',
          intensity: null,
          format: 'audio/wav',
          duration: duration,
          size: baseWavBlob.size,
          blob: baseWavBlob,
          metadata: {
            originalFileName: file.name,
            originalType: file.type,
            sampleRate: sampleRate,
            type: `${track.name} Base Sound`,
            freq: 'Full Acoustic Spectrum',
            desc: `User imported base sample (${duration.toFixed(2)}s).`
          },
          createdAt: new Date().toISOString()
        };

        await this.db.table('audioAssets').put(baseAsset);

        // Update track's baseTrackSound if it has none
        if (!track.baseTrackSound) {
          track.baseTrackSound = baseAssetId;
          await this.db.table('tracks').put(track);
        }

        // 2. Generate 5 Intensity Variations
        if (onProgress) onProgress({ step: 'generating', percent: 40, message: 'Synthesizing 5 intensity variations...' });

        const variationsMap = this.generateVariations(samples, sampleRate, track.name, (level, current, total) => {
          if (onProgress) {
            const p = 40 + Math.round((current / total) * 45);
            onProgress({ step: 'generating', level, current, total, percent: p, message: `Generating ${level} variation (${current}/${total})...` });
          }
        });

        // 3. Persist Variations to IndexedDB
        if (onProgress) onProgress({ step: 'persisting', percent: 90, message: 'Saving variations to IndexedDB...' });

        const variationsEntries = {};
        for (const [level, vData] of Object.entries(variationsMap)) {
          const varAssetId = `asset-var-${baseAssetId}-${level}`;
          const varAsset = {
            id: varAssetId,
            trackId: trackId,
            parentAssetId: baseAssetId,
            name: `${cleanName} (${vData.label})`,
            type: 'variation',
            intensity: level,
            format: 'audio/wav',
            duration: duration,
            size: vData.blob.size,
            blob: vData.blob,
            metadata: {
              filterCutoffHz: vData.filterCutoffHz,
              gainScale: vData.gainScale,
              peak: vData.peak,
              label: vData.label
            },
            createdAt: new Date().toISOString()
          };

          await this.db.table('audioAssets').put(varAsset);

          const varUrl = URL.createObjectURL(vData.blob);
          this.objectUrls.set(varAssetId, varUrl);

          variationsEntries[level] = {
            file: varUrl,
            intensity: level,
            label: vData.label,
            peak: vData.peak,
            filterCutoffHz: vData.filterCutoffHz,
            gainScale: vData.gainScale,
            assetId: varAssetId
          };
        }

        const baseUrl = URL.createObjectURL(baseWavBlob);
        this.objectUrls.set(baseAssetId, baseUrl);

        if (onProgress) onProgress({ step: 'done', percent: 100, message: 'Import complete!' });

        return {
          id: baseAssetId,
          name: cleanName,
          category: trackId,
          type: baseAsset.metadata.type,
          frequencyRange: baseAsset.metadata.freq,
          description: baseAsset.metadata.desc,
          isCustom: true,
          baseFile: baseUrl,
          duration: duration,
          variations: variationsEntries
        };
      } finally {
        this.activeImports.delete(importLockKey);
      }
    }

    async deleteBaseSound(trackId, baseAssetId) {
      await this.init();

      // Find all variations for this base
      const variations = await this.db.table('audioAssets').where('parentAssetId').equals(baseAssetId).toArray();
      for (const v of variations) {
        if (this.objectUrls.has(v.id)) {
          URL.revokeObjectURL(this.objectUrls.get(v.id));
          this.objectUrls.delete(v.id);
        }
        await this.db.table('audioAssets').delete(v.id);
      }

      // Revoke base URL and delete base record
      if (this.objectUrls.has(baseAssetId)) {
        URL.revokeObjectURL(this.objectUrls.get(baseAssetId));
        this.objectUrls.delete(baseAssetId);
      }
      await this.db.table('audioAssets').delete(baseAssetId);

      // Check if track needs a new default baseTrackSound
      const track = await this.getTrack(trackId);
      if (track && track.baseTrackSound === baseAssetId) {
        const remainingBases = await this.db.table('audioAssets')
          .where('trackId').equals(trackId)
          .toArray();
        const nextBase = remainingBases.find(a => a.type === 'base');
        track.baseTrackSound = nextBase ? nextBase.id : null;
        await this.db.table('tracks').put(track);
      }

      return true;
    }

    // --- Synchronize in-memory window.SOUND_MANIFEST with IndexedDB ---
    async syncManifestWithDB(manifest) {
      if (!manifest || !manifest.categories) return;
      await this.init();

      const allTracks = await this.getAllTracks();
      const allAssets = await this.db.table('audioAssets').toArray();

      // 1. Ensure all custom tracks exist in manifest
      allTracks.forEach(track => {
        const previewFlag = track.previewOnImport !== undefined ? !!track.previewOnImport : true;
        if (!manifest.categories[track.id]) {
          manifest.categories[track.id] = {
            id: track.id,
            name: track.name,
            trackNumber: track.trackNumber,
            type: track.type,
            color: track.color || null,
            previewOnImport: previewFlag,
            baseTrackSound: track.baseTrackSound || null,
            defaultVariation: 'med',
            sounds: {}
          };
        } else {
          // Update track metadata if it was renamed or assigned a color/preview pref
          manifest.categories[track.id].name = track.name;
          manifest.categories[track.id].type = track.type;
          if (track.color) {
            manifest.categories[track.id].color = track.color;
          }
          if (track.previewOnImport !== undefined) {
            manifest.categories[track.id].previewOnImport = previewFlag;
          }
        }
      });

      // 2. Index variations by parentAssetId
      const variationsByParent = new Map();
      allAssets.filter(a => a.type === 'variation').forEach(v => {
        if (!variationsByParent.has(v.parentAssetId)) {
          variationsByParent.set(v.parentAssetId, []);
        }
        variationsByParent.get(v.parentAssetId).push(v);
      });

      // 3. Register all base sounds and their variations into manifest
      const baseAssets = allAssets.filter(a => a.type === 'base');
      baseAssets.forEach(base => {
        if (!manifest.categories[base.trackId]) return;

        let baseUrl = this.objectUrls.get(base.id);
        if (!baseUrl) {
          baseUrl = URL.createObjectURL(base.blob);
          this.objectUrls.set(base.id, baseUrl);
        }

        const variations = {};
        const varList = variationsByParent.get(base.id) || [];
        varList.forEach(v => {
          let vUrl = this.objectUrls.get(v.id);
          if (!vUrl) {
            vUrl = URL.createObjectURL(v.blob);
            this.objectUrls.set(v.id, vUrl);
          }
          variations[v.intensity] = {
            file: vUrl,
            intensity: v.intensity,
            label: v.metadata?.label || v.intensity,
            peak: v.metadata?.peak || '0.900',
            filterCutoffHz: v.metadata?.filterCutoffHz || 20000,
            gainScale: v.metadata?.gainScale || 1.0,
            assetId: v.id
          };
        });

        manifest.categories[base.trackId].sounds[base.id] = {
          id: base.id,
          name: base.name,
          category: base.trackId,
          type: base.metadata?.type || 'Imported User Sound',
          frequencyRange: base.metadata?.freq || 'Full Range',
          description: base.metadata?.desc || `Imported user audio sample (${(base.duration || 0).toFixed(2)}s)`,
          isCustom: true,
          baseFile: baseUrl,
          duration: base.duration,
          variations: variations
        };
      });
    }
  }

  // Export singleton to window
  window.AudioLibrary = new AudioLibraryManager();

})(window);
