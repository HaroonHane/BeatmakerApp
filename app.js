/**
 * BEATMAKER STUDIO | ADVANCED MULTI-LAYER DRUM SEQUENCER ENGINE
 * Crafted with Pinterest/Dribbble Hardware Studio Aesthetics
 * Built following the 8 Laws of UX with Reusable Pad Components, Multi-Pad Stacking & 5-Tier Intensity Variations
 */

document.addEventListener('DOMContentLoaded', () => {
  class DrumKit {
    constructor() {
      // Manifest reference with all 54 categorised audio assets & intensity variations
      this.manifest = window.SOUND_MANIFEST || null

      // Sequencer playback state
      this.isPlaying = null
      this.index = 0
      this.bpm = 150
      this.tapTimes = []
      this.audioCtx = null
      this.audioBuffers = new Map() // Cache for decoded audio buffers

      // Dynamic Multi-Layer Data Architecture
      // Each layer contains its own identity, channel settings, and 8-step pads array
      // Each step in a layer is an array of pad instances (supporting multiple pads at the same beat position)
      this.layers = []
      this.sublayerCounters = { kick: 1, snare: 1, hihat: 1, custom: 0 }
      this.activePopoverPad = null // { layerId, step, padId }

      // Preset Beat Patterns (8 steps) with Dedicated Sound Families & Intensity Variations
      this.presets = {
        trap: {
          bpm: 140,
          kick: [0, 4, 6],
          snare: [2, 6],
          hihat: [0, 1, 2, 3, 4, 5, 6, 7],
          soundFamilies: { kick: 'kick-808', snare: 'snare-808', hihat: 'hihat-808' },
          intensities: { kick: 'high', snare: 'med-high', hihat: 'med' },
          repeats: { hihat: { 3: 2, 7: 4 } } // 2x flam on step 3, 4x roll on step 7
        },
        boombap: {
          bpm: 92,
          kick: [0, 3, 5],
          snare: [2, 6],
          hihat: [0, 2, 4, 6],
          soundFamilies: { kick: 'kick-classic', snare: 'snare-vinyl', hihat: 'hihat-808' },
          intensities: { kick: 'med-high', snare: 'high', hihat: 'med-low' }
        },
        house: {
          bpm: 126,
          kick: [0, 2, 4, 6],
          snare: [2, 6],
          hihat: [1, 3, 5, 7],
          soundFamilies: { kick: 'kick-heavy', snare: 'snare-acoustic', hihat: 'hihat-808' },
          intensities: { kick: 'high', snare: 'med', hihat: 'med-high' }
        },
        techno: {
          bpm: 132,
          kick: [0, 2, 4, 6],
          snare: [4, 7],
          hihat: [0, 1, 2, 3, 4, 5, 6, 7],
          soundFamilies: { kick: 'kick-heavy', snare: 'snare-808', hihat: 'hihat-808' },
          intensities: { kick: 'high', snare: 'high', hihat: 'high' }
        },
        lofi: {
          bpm: 84,
          kick: [0, 3],
          snare: [2, 6],
          hihat: [0, 2, 3, 4, 6, 7],
          soundFamilies: { kick: 'kick-softy', snare: 'snare-vinyl', hihat: 'hihat-acoustic' },
          intensities: { kick: 'med-low', snare: 'med-low', hihat: 'low' }
        }
      }

      // DOM Elements Cache
      this.playBtn = document.querySelector('.play')
      this.playText = document.querySelector('.play-text')
      this.clearBtn = document.querySelector('.clear-btn')
      this.statusBadge = document.getElementById('status-badge')
      this.statusLabel = this.statusBadge ? this.statusBadge.querySelector('.status-label') : null

      // Audio Elements (Base fallbacks)
      this.kickPadAudio = document.querySelector('.kick-pad-audio')
      this.snarePadAudio = document.querySelector('.snare-pad-audio')
      this.hihatPadAudio = document.querySelector('.hihat-pad-audio')

      // Controls
      this.tempoSlider = document.querySelector('.tempo-slider')
      this.tempoNumber = document.querySelector('#tempo-nr')
      this.presetSelect = document.getElementById('groove-presets')
      this.randomBeatBtn = document.getElementById('random-beat-btn')
      this.tapTempoBtn = document.getElementById('tap-tempo-btn')

      // Clear Modal Elements
      this.clearModal = document.getElementById('clear-modal')
      this.modalCancel = document.getElementById('modal-cancel-btn') || document.querySelector('.modal-cancel')
      this.modalConfirm = document.getElementById('modal-confirm-btn') || document.querySelector('.modal-confirm')

      // UX Laws Modal Elements
      this.uxLawsBtn = document.getElementById('ux-laws-btn')
      this.uxLawsModal = document.getElementById('ux-laws-modal')
      this.closeUxModalBtn = document.getElementById('close-ux-modal')
      this.dismissUxModalBtn = document.getElementById('dismiss-ux-modal')

      // Sound Assets Modal Elements
      this.soundAssetsBtn = document.getElementById('sound-assets-btn')
      this.soundAssetsModal = document.getElementById('sound-assets-modal')
      this.closeAssetsModalBtn = document.getElementById('close-assets-modal')
      this.dismissAssetsModalBtn = document.getElementById('dismiss-assets-modal')
      this.soundCategoriesList = document.getElementById('sound-categories-list')

      // Pad Popover Config Modal Elements
      this.padPopover = document.getElementById('pad-popover')
      this.popoverClose = document.getElementById('popover-close')
      this.popoverSoundCat = document.getElementById('popover-sound-category')
      this.popoverSoundFamily = document.getElementById('popover-sound-family')
      this.popoverIntensityPills = document.getElementById('popover-intensity-pills')
      this.popoverVolume = document.getElementById('popover-volume')
      this.popoverVolumeVal = document.getElementById('popover-volume-val')
      this.popoverRepeatPills = document.getElementById('popover-repeat-pills')
      this.popoverAudition = document.getElementById('popover-audition')
      this.popoverAddStacked = document.getElementById('popover-add-stacked')
      this.popoverDelete = document.getElementById('popover-delete')
      this.popoverDone = document.getElementById('popover-done')

      // Visualizer bars
      this.visualizerBars = document.querySelectorAll('.visualizer-bar')
      this.visualizerContainer = document.querySelector('.visualizer-container')

      // Track VU meters
      this.meters = {
        kick: document.querySelector('#kick-meter .meter-bar'),
        snare: document.querySelector('#snare-meter .meter-bar'),
        hihat: document.querySelector('#hihat-meter .meter-bar')
      }

      // Dynamic Unlimited Beat Expansion & Horizontal Scrolling
      this.numBeats = 2
      this.totalSteps = 8
      this.sequencerViewport = document.getElementById('sequencer-viewport')
      this.stepRuler = document.getElementById('step-ruler')
      this.addBeatBtn = document.getElementById('add-beat-btn')
      this.addBeatBottomBtn = document.getElementById('add-beat-bottom-btn')
      this.beatCountVal = document.getElementById('beat-count-val')
      this.stepCountVal = document.getElementById('step-count-val')

      this.init()
    }

    init() {
      this.initAudioContext()
      this.initPrimaryLayers()
      this.bindTransportEvents()
      this.bindTempoEvents()
      this.bindPrimaryTrackControls()
      this.bindPrimaryIntensityEvents()
      this.bindLayerCreationButtons()
      this.bindBeatExpansionEvents()
      this.bindPadPopoverEvents()
      this.bindPresetEvents()
      this.bindModalEvents()
      this.bindKeyboardShortcuts()
      this.renderSoundAssetsModal()
      this.initTimeline()
      this.initExportEngine()
      this.initSequenceLibrary()
    }

    // Initialize Web Audio Context for low latency & sample-accurate scheduling
    initAudioContext() {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (AudioCtx) {
        this.audioCtx = new AudioCtx()
      }
    }

    ensureAudioContextRunning() {
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume()
      }
    }

    // ------------------------------------------------------------------------
    // 1. Data Model & Reusable Pad Component Architecture
    // ------------------------------------------------------------------------
    initPrimaryLayers() {
      const primaryConfigs = [
        {
          id: 'kick-primary',
          badge: '01',
          name: 'Kick',
          category: 'kick',
          soundFamily: 'kick-classic',
          intensity: 'med',
          volume: 1.0,
          muted: false,
          solo: false,
          isPrimary: true,
          parentTrack: 'kick'
        },
        {
          id: 'snare-primary',
          badge: '02',
          name: 'Snare',
          category: 'snare',
          soundFamily: 'snare-acoustic',
          intensity: 'med',
          volume: 1.0,
          muted: false,
          solo: false,
          isPrimary: true,
          parentTrack: 'snare'
        },
        {
          id: 'hihat-primary',
          badge: '03',
          name: 'Hi-Hat',
          category: 'hihat',
          soundFamily: 'hihat-808',
          intensity: 'med',
          volume: 1.0,
          muted: false,
          solo: false,
          isPrimary: true,
          parentTrack: 'hihat'
        }
      ]

      this.layers = primaryConfigs.map(cfg => {
        const layer = {
          ...cfg,
          steps: []
        }

        // Initialize 8 steps with 1 initial pad per step matching data architecture
        for (let s = 0; s < 8; s++) {
          const pad = {
            id: `pad-${cfg.category}-primary-${s}`,
            category: cfg.category,
            soundFamily: cfg.soundFamily,
            intensity: cfg.intensity,
            volume: 1.0,
            repeat: 1, // 1 = single hit, 2 = flam, 3 = triplet, 4 = roll
            active: false
          }
          layer.steps.push([pad])
        }

        return layer
      })

      // Hydrate all primary track step cells using the exact same reusable pad component!
      this.layers.forEach(layer => {
        for (let s = 0; s < 8; s++) {
          this.reRenderStepCell(layer, s)
        }
      })
    }

    getLayer(layerId) {
      return this.layers.find(l => l.id === layerId) || null
    }

    // Reusable Pad Component HTML: Exactly the same for original and dynamically added pads
    renderPadHTML(pad, layer, step) {
      const isGhost = pad.intensity === 'low'
      const isAccent = pad.intensity === 'high'
      const intensityClass = isAccent ? 'accent' : isGhost ? 'ghost' : ''
      const activeClass = pad.active ? 'active' : ''

      return `
        <div class="pad-wrapper" data-pad-id="${pad.id}" data-layer-id="${layer.id}" data-step="${step}">
          <button class="pad ${pad.category}-pad b${step} ${activeClass} ${intensityClass}"
            data-pad-id="${pad.id}"
            data-layer-id="${layer.id}"
            data-step="${step}"
            title="${layer.name} Step ${step + 1} (${pad.soundFamily} - ${pad.intensity}) - Click to toggle"
            aria-label="${layer.name} Step ${step + 1}">
            ${pad.repeat > 1 ? `<span class="pad-repeat-badge">${pad.repeat}x</span>` : ''}
            ${isAccent ? `<span class="pad-intensity-badge badge-high">H</span>` : ''}
            ${isGhost ? `<span class="pad-intensity-badge badge-low">L</span>` : ''}
          </button>
          <div class="pad-controls">
            <button class="pad-ctrl-btn pad-settings-btn" data-pad-id="${pad.id}" data-layer-id="${layer.id}" data-step="${step}" title="Configure Pad Settings">
              <i class="fa-solid fa-gear"></i>
            </button>
            <button class="pad-ctrl-btn pad-remove-btn" data-pad-id="${pad.id}" data-layer-id="${layer.id}" data-step="${step}" title="Remove this pad">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>
      `
    }

    // Reusable Step Cell HTML: Wraps pad-wrappers and docks the Add Pad (+) button
    renderStepCellHTML(layer, step) {
      const pads = layer.steps[step]
      const hasStack = pads.length > 1

      return `
        <div class="beat-step-cell ${hasStack ? 'has-stack' : ''}" data-layer-id="${layer.id}" data-step="${step}">
          <div class="pads-stack-container">
            ${pads.map(pad => this.renderPadHTML(pad, layer, step)).join('')}
          </div>
          <button class="cell-add-pad-btn" data-layer-id="${layer.id}" data-step="${step}" title="Add Pad to Step ${step + 1}">
            <i class="fa-solid fa-plus"></i>
          </button>
        </div>
      `
    }

    // Binds all events for a step cell: pad click, right-click, settings, removal, add pad
    bindStepCellEvents(cellEl, layer, step) {
      const pads = layer.steps[step]

      cellEl.querySelectorAll('.pad-wrapper').forEach(wrapperEl => {
        const padId = wrapperEl.dataset.padId
        const padObj = pads.find(p => p.id === padId)
        if (!padObj) return

        const padBtn = wrapperEl.querySelector('.pad')
        const settingsBtn = wrapperEl.querySelector('.pad-settings-btn')
        const removeBtn = wrapperEl.querySelector('.pad-remove-btn')

        // 1. Pad click: Toggle active state & audition
        if (padBtn) {
          padBtn.onclick = (e) => {
            e.stopPropagation()
            this.ensureAudioContextRunning()
            padObj.active = !padObj.active
            padBtn.classList.toggle('active', padObj.active)
            if (padObj.active) {
              const fileSrc = this.resolveSoundFile(padObj.category, padObj.soundFamily, padObj.intensity)
              this.playPadSound(fileSrc, padObj.volume * layer.volume)
              this.pulseMeter(layer.category)
            }
            if (this.renderTrackpadLanes) {
              this.renderTrackpadLanes()
            }
          }

          // Right-Click: Open Pad Configuration Popover
          padBtn.oncontextmenu = (e) => {
            e.preventDefault()
            this.openPadPopover(layer.id, step, padObj.id)
          }
        }

        // 2. Settings button: Configure THIS specific pad instance
        if (settingsBtn) {
          settingsBtn.onclick = (e) => {
            e.stopPropagation()
            this.openPadPopover(layer.id, step, padObj.id)
          }
        }

        // 3. Removal button: Delete THIS specific pad instance
        if (removeBtn) {
          removeBtn.onclick = (e) => {
            e.stopPropagation()
            this.removePad(layer.id, step, padObj.id)
          }
        }
      })

      // 4. Add Pad (+) button at the bottom of the step column
      const addBtn = cellEl.querySelector('.cell-add-pad-btn')
      if (addBtn) {
        addBtn.onclick = (e) => {
          e.stopPropagation()
          this.addPadToStep(layer.id, step)
        }
      }
    }

    // Re-renders a step cell in DOM safely without shifting layout
    reRenderStepCell(layer, step) {
      const parentSelector = layer.isPrimary
        ? `.primary-layer[data-track="${layer.category}"]`
        : `.track-channel.sublayer[data-layer-id="${layer.id}"]`

      const oldCellEl = document.querySelector(`${parentSelector} .beat-step-cell[data-step="${step}"]`)
      if (!oldCellEl) return

      const temp = document.createElement('div')
      temp.innerHTML = this.renderStepCellHTML(layer, step).trim()
      const newCellEl = temp.firstElementChild

      oldCellEl.replaceWith(newCellEl)
      this.bindStepCellEvents(newCellEl, layer, step)
      if (this.renderTrackpadLanes) {
        this.renderTrackpadLanes()
      }
    }

    // ------------------------------------------------------------------------
    // 2. Sound Asset Resolution & Low-Latency Audio Playback
    // ------------------------------------------------------------------------
    resolveSoundFile(category, soundFamily, intensity = 'med') {
      if (this.manifest && this.manifest.categories && this.manifest.categories[category]) {
        const cat = this.manifest.categories[category]
        const soundData = cat.sounds[soundFamily] || Object.values(cat.sounds)[0]
        if (soundData) {
          if (soundData.variations && soundData.variations[intensity]) {
            return soundData.variations[intensity].file
          }
          if (soundData.baseFile) {
            return soundData.baseFile
          }
        }
      }

      // Safe static fallbacks
      if (category === 'kick') return './sounds/kick/base/kick-classic.wav'
      if (category === 'snare') return './sounds/snare/base/snare-acoustic01.wav'
      return './sounds/hihat/base/hihat-808.wav'
    }

    playPadSound(fileSrc, volume = 1.0) {
      if (!fileSrc) return
      this.ensureAudioContextRunning()

      // Clamp volume
      const safeVol = Math.max(0, Math.min(1, volume))

      // Web Audio API Polyphony with Audio Buffer caching
      if (this.audioCtx) {
        if (this.audioBuffers.has(fileSrc)) {
          const buffer = this.audioBuffers.get(fileSrc)
          this.triggerBufferSource(buffer, safeVol)
          return
        }

        // Fetch & decode buffer asynchronously while falling back to Audio element for instant response
        fetch(fileSrc)
          .then(res => res.arrayBuffer())
          .then(ab => this.audioCtx.decodeAudioData(ab))
          .then(decoded => {
            this.audioBuffers.set(fileSrc, decoded)
          })
          .catch(() => {})
      }

      // Fast HTML5 Audio fallback for zero configuration friction
      try {
        const audio = new Audio(fileSrc)
        audio.volume = safeVol
        const playPromise = audio.play()
        if (playPromise !== undefined) {
          playPromise.catch(() => {})
        }
      } catch (e) {}
    }

    triggerBufferSource(buffer, volume) {
      try {
        const source = this.audioCtx.createBufferSource()
        const gainNode = this.audioCtx.createGain()
        source.buffer = buffer
        gainNode.gain.setValueAtTime(volume, this.audioCtx.currentTime)
        source.connect(gainNode)
        gainNode.connect(this.audioCtx.destination)
        source.start(0)
      } catch (e) {}
    }

    playDirectSound(fileSrc) {
      this.playPadSound(fileSrc, 0.95)
    }

    // ------------------------------------------------------------------------
    // 3. Multi-Layer Creation & Dynamic Beat Expansion Architecture
    // ------------------------------------------------------------------------
    bindLayerCreationButtons() {
      // 1. "Add Layer to [Track]" beneath each track group
      document.querySelectorAll('.add-layer-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const track = btn.dataset.track || 'kick'
          this.addLayer(track)
        })
      })

      // 2. "Add Layer" on each 4-pad beat card -> adds a 4-pad layer to THIS specific beat!
      document.querySelectorAll('.chunk-add-layer-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation()
          const rowEl = btn.closest('.track-channel')
          const layerId = (rowEl && rowEl.dataset.layerId) || btn.dataset.layerId || `${btn.dataset.track}-primary`
          const beatNum = btn.dataset.beat || '1'
          this.addLayerToBeatChunk(layerId, parseInt(beatNum, 10))
        })
      })

      // 3. "Add New Instrument Layer" at bottom of sequencer matrix
      const masterAddBtn = document.getElementById('add-master-layer-btn')
      if (masterAddBtn) {
        masterAddBtn.addEventListener('click', () => {
          this.addLayer('custom')
        })
      }
    }

    // ------------------------------------------------------------------------
    // 3b. Dynamic Unlimited Beat Expansion & Horizontal Scrolling
    // ------------------------------------------------------------------------
    bindBeatExpansionEvents() {
      if (this.addBeatBtn) {
        this.addBeatBtn.addEventListener('click', () => {
          this.addBeat()
        })
      }

      if (this.addBeatBottomBtn) {
        this.addBeatBottomBtn.addEventListener('click', () => {
          this.addBeat()
        })
      }

      // Bind remove buttons on existing beat headers if present
      document.querySelectorAll('.remove-beat-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation()
          const b = parseInt(btn.dataset.beat, 10)
          this.removeBeat(b)
        })
      })
    }

    addBeat() {
      this.ensureAudioContextRunning()
      this.numBeats++
      const newBeatNum = this.numBeats
      const startStep = (newBeatNum - 1) * 4
      const endStep = startStep + 4
      this.totalSteps = this.numBeats * 4

      // 1. Extend steps data array for all layers (primary & dynamic sublayers)
      this.layers.forEach(layer => {
        for (let s = startStep; s < endStep; s++) {
          const pad = {
            id: `pad-${layer.id}-${s}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            category: layer.category,
            soundFamily: layer.soundFamily,
            intensity: layer.intensity,
            volume: 1.0,
            repeat: 1,
            active: false
          }
          layer.steps[s] = [pad]
        }
      })

      // 2. Add Beat Header in Step Ruler before the Add Beat button column
      if (this.stepRuler) {
        const addBeatCol = document.getElementById('add-beat-col')
        const headerEl = document.createElement('div')
        headerEl.className = `beat-group-header beat-${newBeatNum}-header`
        headerEl.dataset.beat = newBeatNum
        headerEl.innerHTML = `
          <div class="beat-header-top">
            <span class="beat-label">BEAT ${String(newBeatNum).padStart(2, '0')}</span>
            <button class="remove-beat-btn" data-beat="${newBeatNum}" title="Remove Beat ${newBeatNum}">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div class="step-numbers">
            ${[startStep, startStep + 1, startStep + 2, startStep + 3].map(s => `
              <div class="step-col-head" data-step="${s}">
                <span class="step-idx">${s + 1}</span>
                <div class="step-dot" data-step="${s}"></div>
              </div>
            `).join('')}
          </div>
        `
        if (addBeatCol) {
          this.stepRuler.insertBefore(headerEl, addBeatCol)
        } else {
          this.stepRuler.appendChild(headerEl)
        }

        const removeBtn = headerEl.querySelector('.remove-beat-btn')
        if (removeBtn) {
          removeBtn.addEventListener('click', (e) => {
            e.stopPropagation()
            this.removeBeat(newBeatNum)
          })
        }
      }

      // 3. Add Beat Chunk into every layer's .pads-grid
      this.layers.forEach(layer => {
        const parentSelector = layer.isPrimary
          ? `.primary-layer[data-track="${layer.category}"]`
          : `.track-channel.sublayer[data-layer-id="${layer.id}"]`

        const padsGrid = document.querySelector(`${parentSelector} .pads-grid`)
        if (!padsGrid) return

        const chunkEl = document.createElement('div')
        chunkEl.className = `beat-chunk beat-chunk-${newBeatNum} ${newBeatNum % 2 === 0 ? 'even-chunk' : ''}`
        chunkEl.dataset.beat = newBeatNum
        chunkEl.innerHTML = `
          ${[startStep, startStep + 1, startStep + 2, startStep + 3].map(s => this.renderStepCellHTML(layer, s)).join('')}
          <button class="chunk-add-layer-btn" data-track="${layer.category}" data-beat="${newBeatNum}" title="Add Layer to Beat ${newBeatNum}">
            <i class="fa-solid fa-plus"></i> Add Layer
          </button>
        `
        padsGrid.appendChild(chunkEl)

        // Bind events for the 4 newly created cells
        for (let s = startStep; s < endStep; s++) {
          const cellEl = chunkEl.querySelector(`.beat-step-cell[data-step="${s}"]`)
          if (cellEl) {
            this.bindStepCellEvents(cellEl, layer, s)
          }
        }

        // Bind Add Layer button on this new chunk -> adds 4 pads directly to THIS specific beat card
        const chunkAddLayerBtn = chunkEl.querySelector('.chunk-add-layer-btn')
        if (chunkAddLayerBtn) {
          chunkAddLayerBtn.addEventListener('click', (e) => {
            e.stopPropagation()
            this.addLayerToBeatChunk(layer.id, newBeatNum)
          })
        }
      })

      // 4. Update UI readouts & Timeline Sync
      this.updateBeatCounterUI()
      if (this.renderTrackpadRuler) this.renderTrackpadRuler()
      if (this.renderTrackpadLanes) this.renderTrackpadLanes()
      if (this.updateTimelineMetrics) this.updateTimelineMetrics()

      // 5. Tactile audio feedback & smooth auto-scroll to the new beat (only if content overflows)
      this.playPadSound(this.resolveSoundFile('hihat', 'hihat-808', 'low'), 0.5)
      if (this.sequencerViewport) {
        setTimeout(() => {
          if (this.sequencerViewport.scrollWidth > this.sequencerViewport.clientWidth + 10) {
            this.sequencerViewport.scrollTo({
              left: this.sequencerViewport.scrollWidth,
              behavior: 'smooth'
            })
          }
        }, 50)
      }
    }

    removeBeat(beatNum) {
      if (this.numBeats <= 1) return // Keep at least 1 beat

      const lastBeatIndex = this.numBeats
      const startStep = (lastBeatIndex - 1) * 4

      // 1. Remove from layers data model
      this.layers.forEach(layer => {
        layer.steps.splice(startStep, 4)
      })

      // 2. Remove DOM elements
      document.querySelectorAll(`.beat-group-header[data-beat="${lastBeatIndex}"]`).forEach(el => el.remove())
      document.querySelectorAll(`.beat-chunk[data-beat="${lastBeatIndex}"]`).forEach(el => el.remove())

      // 3. Update counter & playhead
      this.numBeats--
      this.totalSteps = this.numBeats * 4
      this.index = this.index % this.totalSteps
      this.updateBeatCounterUI()
      if (this.renderTrackpadRuler) this.renderTrackpadRuler()
      if (this.renderTrackpadLanes) this.renderTrackpadLanes()
      if (this.updateTimelineMetrics) this.updateTimelineMetrics()
    }

    updateBeatCounterUI() {
      if (this.beatCountVal) this.beatCountVal.textContent = this.numBeats
      if (this.stepCountVal) this.stepCountVal.textContent = this.totalSteps
      const footerStat = document.querySelector('.studio-footer .footer-stat strong')
      if (footerStat) footerStat.textContent = `${this.totalSteps}-Step Polyphonic`
    }

    renderAllBeatChunksHTML(layer) {
      let chunksHTML = ''
      for (let b = 1; b <= this.numBeats; b++) {
        const startStep = (b - 1) * 4
        chunksHTML += `
          <div class="beat-chunk beat-chunk-${b} ${b % 2 === 0 ? 'even-chunk' : ''}" data-beat="${b}" data-layer-id="${layer.id}">
            ${[startStep, startStep + 1, startStep + 2, startStep + 3].map(s => this.renderStepCellHTML(layer, s)).join('')}
            <button class="chunk-add-layer-btn" data-track="${layer.category}" data-layer-id="${layer.id}" data-beat="${b}" title="Add 4-Pad Layer to Beat ${b}">
              <i class="fa-solid fa-plus"></i> Add Layer
            </button>
          </div>
        `
      }
      return chunksHTML
    }

    addLayer(parentTrack = 'kick', options = {}) {
      const isCustom = parentTrack === 'custom'
      const baseCategory = isCustom ? 'kick' : parentTrack
      const layerNum = ++this.sublayerCounters[parentTrack]
      const layerId = `layer-${parentTrack}-${Date.now()}-${Math.floor(Math.random() * 1000)}`

      const defaultFamilies = {
        kick: 'kick-808',
        snare: 'snare-808',
        hihat: 'hihat-acoustic'
      }

      const layerName = isCustom
        ? `Layer ${layerNum}`
        : `${parentTrack.charAt(0).toUpperCase() + parentTrack.slice(1)} L${layerNum}`

      const newLayer = {
        id: layerId,
        badge: isCustom ? `0${Math.min(9, 3 + layerNum)}` : `L${layerNum}`,
        name: layerName,
        category: baseCategory,
        soundFamily: defaultFamilies[baseCategory] || 'kick-classic',
        intensity: 'med',
        volume: 1.0,
        muted: false,
        solo: false,
        isPrimary: false,
        parentTrack: parentTrack,
        steps: []
      }

      // Initialize steps matching current totalSteps
      for (let s = 0; s < this.totalSteps; s++) {
        const pad = {
          id: `pad-${layerId}-${s}`,
          category: newLayer.category,
          soundFamily: newLayer.soundFamily,
          intensity: newLayer.intensity,
          volume: 1.0,
          repeat: 1,
          active: false
        }
        newLayer.steps.push([pad])
      }

      this.layers.push(newLayer)

      // Render the sublayer DOM element
      this.renderLayerDOM(newLayer)

      // Audio feedback when adding layer
      this.playPadSound(this.resolveSoundFile(newLayer.category, newLayer.soundFamily, 'med'), 0.8)

      return newLayer
    }

    renderLayerDOM(layer) {
      let container
      if (layer.parentTrack === 'custom') {
        container = document.getElementById('custom-layers-container')
      } else {
        container = document.getElementById(`${layer.parentTrack}-sublayers`)
      }
      if (!container) return

      const layerEl = document.createElement('div')
      layerEl.className = `track-channel sublayer ${layer.category}-beat`
      layerEl.dataset.layerId = layer.id
      layerEl.dataset.track = layer.category

      const familyOptionsHTML = this.getSoundFamilyOptionsHTML(layer.category, layer.soundFamily)

      layerEl.innerHTML = `
        <div class="channel-strip">
          <div class="channel-main-row">
            <div class="sublayer-identity">
              <span class="track-badge">${layer.badge}</span>
              <input type="text" class="sublayer-name-input" value="${layer.name}" title="Edit layer name" aria-label="Layer name" />
              <button class="track-btn audition-btn sublayer-audition-btn" data-layer-id="${layer.id}" title="Preview Layer Sound" aria-label="Audition Layer">
                <i class="fa-solid fa-play"></i>
              </button>
              <button class="track-btn mute-btn" data-layer-id="${layer.id}" title="Mute Layer (M)">
                <i class="fa-solid fa-volume-high"></i>
              </button>
              <button class="track-btn solo-btn" data-layer-id="${layer.id}" title="Solo Layer (S)">
                <span>S</span>
              </button>
              <button class="layer-delete-btn" data-layer-id="${layer.id}" title="Remove this layer">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>

            <div class="sample-picker-wrap">
              <i class="fa-solid fa-compact-disc sample-icon"></i>
              <select class="sample-select layer-family-select" data-layer-id="${layer.id}" aria-label="Layer Sound Family">
                ${familyOptionsHTML}
              </select>
            </div>

            <div class="volume-station">
              <i class="fa-solid fa-volume-low vol-icon"></i>
              <input type="range" class="volume-slider layer-volume-slider" data-layer-id="${layer.id}" min="0" max="100" value="${Math.round(layer.volume * 100)}" />
              <span class="volume-value">${Math.round(layer.volume * 100)}%</span>
            </div>
          </div>

          <!-- 5-Tier Intensity Variation Selector for Layer -->
          <div class="intensity-station" data-layer-id="${layer.id}">
            <span class="intensity-label" title="Low-to-High Sound Variation">
              <i class="fa-solid fa-bolt"></i> VARIATION:
            </span>
            <div class="intensity-pills" role="radiogroup">
              <button class="intensity-pill ${layer.intensity === 'low' ? 'active' : ''}" data-intensity="low">LOW</button>
              <button class="intensity-pill ${layer.intensity === 'med-low' ? 'active' : ''}" data-intensity="med-low">M-LOW</button>
              <button class="intensity-pill ${layer.intensity === 'med' ? 'active' : ''}" data-intensity="med">MED</button>
              <button class="intensity-pill ${layer.intensity === 'med-high' ? 'active' : ''}" data-intensity="med-high">M-HIGH</button>
              <button class="intensity-pill ${layer.intensity === 'high' ? 'active' : ''}" data-intensity="high">HIGH</button>
            </div>
          </div>
        </div>

        <!-- Dynamic Sequencer Pad Grid Chunked in 4-Pad Beats -->
        <div class="pads-grid">
          ${this.renderAllBeatChunksHTML(layer)}
        </div>
      `

      container.appendChild(layerEl)
      this.bindLayerDOMEvents(layerEl, layer)
    }

    getSoundFamilyOptionsHTML(category, selectedSoundFamily) {
      if (this.manifest && this.manifest.categories && this.manifest.categories[category]) {
        return Object.entries(this.manifest.categories[category].sounds).map(([soundId, sound]) => `
          <option value="${soundId}" ${soundId === selectedSoundFamily ? 'selected' : ''}>
            ${sound.name}
          </option>
        `).join('')
      }
      return `<option value="${selectedSoundFamily}" selected>${selectedSoundFamily}</option>`
    }

    bindLayerDOMEvents(layerEl, layer) {
      // 1. Layer Name Input
      const nameInput = layerEl.querySelector('.sublayer-name-input')
      if (nameInput) {
        nameInput.addEventListener('change', (e) => {
          layer.name = e.target.value.trim() || layer.name
        })
      }

      // Audition Button
      const auditionBtn = layerEl.querySelector('.sublayer-audition-btn')
      if (auditionBtn) {
        auditionBtn.addEventListener('click', () => {
          this.playPadSound(this.resolveSoundFile(layer.category, layer.soundFamily, layer.intensity), layer.volume)
        })
      }

      // 2. Mute Button
      const muteBtn = layerEl.querySelector('.mute-btn')
      if (muteBtn) {
        muteBtn.addEventListener('click', () => {
          layer.muted = !layer.muted
          muteBtn.classList.toggle('active', layer.muted)
          const icon = muteBtn.querySelector('i')
          if (icon) {
            icon.className = layer.muted ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high'
          }
          layerEl.classList.toggle('is-muted', layer.muted)
        })
      }

      // 3. Solo Button
      const soloBtn = layerEl.querySelector('.solo-btn')
      if (soloBtn) {
        soloBtn.addEventListener('click', () => {
          layer.solo = !layer.solo
          soloBtn.classList.toggle('active', layer.solo)
          this.updateAllSoloStates()
        })
      }

      // 4. Delete Layer Button
      const deleteBtn = layerEl.querySelector('.layer-delete-btn')
      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
          this.removeLayer(layer.id)
        })
      }

      // 5. Sound Family Selector
      const familySelect = layerEl.querySelector('.layer-family-select')
      if (familySelect) {
        familySelect.addEventListener('change', (e) => {
          layer.soundFamily = e.target.value
          layer.steps.forEach(stepPads => {
            stepPads.forEach(pad => { pad.soundFamily = layer.soundFamily })
          })
          this.playPadSound(this.resolveSoundFile(layer.category, layer.soundFamily, layer.intensity), layer.volume)
        })
      }

      // 6. Volume Slider
      const volumeSlider = layerEl.querySelector('.layer-volume-slider')
      if (volumeSlider) {
        volumeSlider.addEventListener('input', (e) => {
          const val = parseInt(e.target.value, 10)
          layer.volume = val / 100
          const display = volumeSlider.nextElementSibling
          if (display) display.textContent = `${val}%`
        })
      }

      // 7. Intensity Variation Pills
      const intensityPills = layerEl.querySelectorAll('.intensity-pill')
      intensityPills.forEach(pill => {
        pill.addEventListener('click', () => {
          const intensity = pill.dataset.intensity
          layer.intensity = intensity
          intensityPills.forEach(p => p.classList.remove('active'))
          pill.classList.add('active')
          layer.steps.forEach(stepPads => {
            stepPads.forEach(pad => { pad.intensity = intensity })
          })
          this.playPadSound(this.resolveSoundFile(layer.category, layer.soundFamily, layer.intensity), layer.volume)
        })
      })

      // 8. Bind all step cells using the unified bindStepCellEvents method
      for (let s = 0; s < this.totalSteps; s++) {
        const cellEl = layerEl.querySelector(`.beat-step-cell[data-step="${s}"]`)
        if (cellEl) {
          this.bindStepCellEvents(cellEl, layer, s)
        }
      }

      // 9. Bind chunk add layer buttons inside this sublayer -> adds 4 pads directly to that specific beat card
      layerEl.querySelectorAll('.chunk-add-layer-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation()
          const beat = parseInt(btn.dataset.beat, 10) || 1
          this.addLayerToBeatChunk(layer.id, beat)
        })
      })
    }

    removeLayer(layerId) {
      const idx = this.layers.findIndex(l => l.id === layerId)
      if (idx === -1) return

      // Don't remove primary tracks
      if (this.layers[idx].isPrimary) return

      this.layers.splice(idx, 1)

      const layerEl = document.querySelector(`.track-channel.sublayer[data-layer-id="${layerId}"]`)
      if (layerEl) {
        layerEl.style.transition = 'all 0.2s ease'
        layerEl.style.opacity = '0'
        layerEl.style.transform = 'scale(0.95)'
        setTimeout(() => layerEl.remove(), 200)
      }

      this.updateAllSoloStates()
    }

    // ------------------------------------------------------------------------
    // 4. Multiple Pads at the Same Beat Position (Beat Chunk Layering & Pad Stacking)
    // ------------------------------------------------------------------------
    // Adds a 4-pad layer specifically to a single 4-pad beat chunk card (not overall beats)
    addLayerToBeatChunk(layerId, beatNum) {
      this.ensureAudioContextRunning()
      const layer = this.getLayer(layerId)
      if (!layer) return

      const b = parseInt(beatNum, 10) || 1
      const startStep = (b - 1) * 4
      const endStep = startStep + 4

      // Add a pad instance to each of the 4 steps of this specific beat card
      for (let s = startStep; s < endStep; s++) {
        const newPadId = `pad-${layer.id}-${s}-${Date.now()}-${Math.floor(Math.random() * 1000)}`
        const newPad = {
          id: newPadId,
          category: layer.category,
          soundFamily: layer.soundFamily,
          intensity: layer.intensity,
          volume: 1.0,
          repeat: 1,
          active: true
        }

        if (!layer.steps[s]) layer.steps[s] = []
        layer.steps[s].push(newPad)
        this.reRenderStepCell(layer, s)
      }

      // Audition preview hit
      this.playPadSound(this.resolveSoundFile(layer.category, layer.soundFamily, layer.intensity), 0.8)
      this.pulseMeter(layer.category)
    }

    addPadToStep(layerId, step, config = {}) {
      const layer = this.getLayer(layerId)
      if (!layer) return

      const newPadId = `pad-${layerId}-${step}-${Date.now()}-${Math.floor(Math.random() * 1000)}`
      const newPad = {
        id: newPadId,
        category: config.category || layer.category,
        soundFamily: config.soundFamily || layer.soundFamily,
        intensity: config.intensity || layer.intensity,
        volume: config.volume !== undefined ? config.volume : 1.0,
        repeat: config.repeat || 1,
        active: true
      }

      layer.steps[step].push(newPad)

      // Re-render the specific step cell in DOM immediately with its settings & remove buttons
      this.reRenderStepCell(layer, step)

      // Audition preview
      this.playPadSound(this.resolveSoundFile(newPad.category, newPad.soundFamily, newPad.intensity), newPad.volume * layer.volume)

      return newPad
    }

    removePad(layerId, step, padId) {
      const layer = this.getLayer(layerId)
      if (!layer) return

      const pads = layer.steps[step]
      const padIdx = pads.findIndex(p => p.id === padId)
      if (padIdx === -1) return

      // If only 1 pad remains in a primary layer, deactivate and reset it cleanly
      if (pads.length === 1 && layer.isPrimary) {
        pads[0].active = false
        pads[0].repeat = 1
        pads[0].intensity = layer.intensity
        this.reRenderStepCell(layer, step)
        return
      }

      // If stacked pad or sublayer pad: remove it completely
      pads.splice(padIdx, 1)

      // Ensure step never has 0 pads
      if (pads.length === 0) {
        pads.push({
          id: `pad-${layer.id}-${step}-${Date.now()}`,
          category: layer.category,
          soundFamily: layer.soundFamily,
          intensity: layer.intensity,
          volume: 1.0,
          repeat: 1,
          active: false
        })
      }

      this.reRenderStepCell(layer, step)
    }

    // ------------------------------------------------------------------------
    // 5. Pad Configuration Popover Modal (Category, Variation, Volume, Repetition)
    // ------------------------------------------------------------------------
    openPadPopover(layerId, step, padId) {
      const layer = this.getLayer(layerId)
      if (!layer) return

      const pads = layer.steps[step]
      const pad = pads.find(p => p.id === padId) || pads[0]
      if (!pad) return

      this.activePopoverPad = { layerId, step, padId: pad.id }

      // 1. Sound Category
      if (this.popoverSoundCat) {
        this.popoverSoundCat.value = pad.category
      }

      // 2. Sound Family options based on Category
      this.populatePopoverSoundFamilies(pad.category, pad.soundFamily)

      // 3. Intensity Variation Pills
      if (this.popoverIntensityPills) {
        this.popoverIntensityPills.querySelectorAll('.popover-pill').forEach(pill => {
          pill.classList.toggle('active', pill.dataset.intensity === pad.intensity)
        })
      }

      // 4. Volume Slider
      if (this.popoverVolume) {
        this.popoverVolume.value = Math.round(pad.volume * 100)
      }
      if (this.popoverVolumeVal) {
        this.popoverVolumeVal.textContent = `${Math.round(pad.volume * 100)}%`
      }

      // 5. Repetition Pills (1x, 2x, 3x, 4x)
      if (this.popoverRepeatPills) {
        this.popoverRepeatPills.querySelectorAll('.repeat-pill').forEach(pill => {
          const r = parseInt(pill.dataset.repeat, 10)
          pill.classList.toggle('active', r === (pad.repeat || 1))
        })
      }

      // Open Modal
      if (this.padPopover) {
        this.padPopover.classList.add('active')
      }
    }

    populatePopoverSoundFamilies(category, selectedFamily) {
      if (!this.popoverSoundFamily || !this.manifest || !this.manifest.categories[category]) return
      const sounds = this.manifest.categories[category].sounds
      this.popoverSoundFamily.innerHTML = Object.entries(sounds).map(([id, sound]) => `
        <option value="${id}" ${id === selectedFamily ? 'selected' : ''}>${sound.name}</option>
      `).join('')
    }

    bindPadPopoverEvents() {
      // Close popover
      if (this.popoverClose) {
        this.popoverClose.onclick = () => {
          if (this.padPopover) this.padPopover.classList.remove('active')
        }
      }
      if (this.popoverDone) {
        this.popoverDone.onclick = () => {
          if (this.padPopover) this.padPopover.classList.remove('active')
        }
      }

      // Category change -> update family options
      if (this.popoverSoundCat) {
        this.popoverSoundCat.onchange = (e) => {
          if (!this.activePopoverPad) return
          const { layerId, step, padId } = this.activePopoverPad
          const layer = this.getLayer(layerId)
          const pad = layer.steps[step].find(p => p.id === padId)
          if (!pad) return

          pad.category = e.target.value
          this.populatePopoverSoundFamilies(pad.category)
          pad.soundFamily = this.popoverSoundFamily.value
          this.reRenderStepCell(layer, step)
          this.playPadSound(this.resolveSoundFile(pad.category, pad.soundFamily, pad.intensity), pad.volume)
        }
      }

      // Family change
      if (this.popoverSoundFamily) {
        this.popoverSoundFamily.onchange = (e) => {
          if (!this.activePopoverPad) return
          const { layerId, step, padId } = this.activePopoverPad
          const layer = this.getLayer(layerId)
          const pad = layer.steps[step].find(p => p.id === padId)
          if (!pad) return

          pad.soundFamily = e.target.value
          this.reRenderStepCell(layer, step)
          this.playPadSound(this.resolveSoundFile(pad.category, pad.soundFamily, pad.intensity), pad.volume)
        }
      }

      // Intensity pills
      if (this.popoverIntensityPills) {
        this.popoverIntensityPills.querySelectorAll('.popover-pill').forEach(pill => {
          pill.onclick = () => {
            if (!this.activePopoverPad) return
            const { layerId, step, padId } = this.activePopoverPad
            const layer = this.getLayer(layerId)
            const pad = layer.steps[step].find(p => p.id === padId)
            if (!pad) return

            pad.intensity = pill.dataset.intensity
            this.popoverIntensityPills.querySelectorAll('.popover-pill').forEach(p => p.classList.remove('active'))
            pill.classList.add('active')
            this.reRenderStepCell(layer, step)
            this.playPadSound(this.resolveSoundFile(pad.category, pad.soundFamily, pad.intensity), pad.volume)
          }
        })
      }

      // Volume slider
      if (this.popoverVolume) {
        this.popoverVolume.oninput = (e) => {
          if (!this.activePopoverPad) return
          const { layerId, step, padId } = this.activePopoverPad
          const layer = this.getLayer(layerId)
          const pad = layer.steps[step].find(p => p.id === padId)
          if (!pad) return

          const val = parseInt(e.target.value, 10)
          pad.volume = val / 100
          if (this.popoverVolumeVal) this.popoverVolumeVal.textContent = `${val}%`
        }
      }

      // Repetition pills
      if (this.popoverRepeatPills) {
        this.popoverRepeatPills.querySelectorAll('.repeat-pill').forEach(pill => {
          pill.onclick = () => {
            if (!this.activePopoverPad) return
            const { layerId, step, padId } = this.activePopoverPad
            const layer = this.getLayer(layerId)
            const pad = layer.steps[step].find(p => p.id === padId)
            if (!pad) return

            const r = parseInt(pill.dataset.repeat, 10)
            pad.repeat = r
            this.popoverRepeatPills.querySelectorAll('.repeat-pill').forEach(p => p.classList.remove('active'))
            pill.classList.add('active')
            this.reRenderStepCell(layer, step)
          }
        })
      }

      // Audition Button
      if (this.popoverAudition) {
        this.popoverAudition.onclick = () => {
          if (!this.activePopoverPad) return
          const { layerId, step, padId } = this.activePopoverPad
          const layer = this.getLayer(layerId)
          const pad = layer.steps[step].find(p => p.id === padId)
          if (!pad) return

          this.playPadSound(this.resolveSoundFile(pad.category, pad.soundFamily, pad.intensity), pad.volume)
        }
      }

      // Stack Pad Button inside Popover
      if (this.popoverAddStacked) {
        this.popoverAddStacked.onclick = () => {
          if (!this.activePopoverPad) return
          const { layerId, step } = this.activePopoverPad
          const newPad = this.addPadToStep(layerId, step)
          if (newPad) {
            this.openPadPopover(layerId, step, newPad.id)
          }
        }
      }

      // Delete Button inside Popover
      if (this.popoverDelete) {
        this.popoverDelete.onclick = () => {
          if (!this.activePopoverPad) return
          const { layerId, step, padId } = this.activePopoverPad
          this.removePad(layerId, step, padId)
          if (this.padPopover) this.padPopover.classList.remove('active')
        }
      }

      // Close modal on backdrop click
      if (this.padPopover) {
        this.padPopover.onclick = (e) => {
          if (e.target === this.padPopover) {
            this.padPopover.classList.remove('active')
          }
        }
      }
    }

    // ------------------------------------------------------------------------
    // 6. Primary Track Channel Controls (Mute, Solo, Volume, Sample Select)
    // ------------------------------------------------------------------------
    bindPrimaryTrackControls() {
      ;['kick', 'snare', 'hihat'].forEach(track => {
        const layer = this.layers.find(l => l.category === track && l.isPrimary)
        if (!layer) return

        // Mute Button
        const muteBtn = document.getElementById(`${track}-mute`)
        if (muteBtn) {
          muteBtn.addEventListener('click', () => {
            layer.muted = !layer.muted
            muteBtn.classList.toggle('active', layer.muted)
            const icon = muteBtn.querySelector('i')
            if (icon) {
              icon.className = layer.muted ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high'
            }
            const trackRow = document.querySelector(`.primary-layer[data-track="${track}"]`)
            if (trackRow) trackRow.classList.toggle('is-muted', layer.muted)
          })
        }

        // Solo Button
        const soloBtn = document.getElementById(`${track}-solo`)
        if (soloBtn) {
          soloBtn.addEventListener('click', () => {
            layer.solo = !layer.solo
            soloBtn.classList.toggle('active', layer.solo)
            this.updateAllSoloStates()
          })
        }

        // Audition Button
        const auditionBtn = document.querySelector(`.audition-btn[data-audition="${track}"]`)
        if (auditionBtn) {
          auditionBtn.addEventListener('click', () => {
            this.playPadSound(this.resolveSoundFile(layer.category, layer.soundFamily, layer.intensity), layer.volume)
          })
        }

        // Volume Slider
        const volumeSlider = document.getElementById(`${track}-volume`)
        if (volumeSlider) {
          volumeSlider.addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 10)
            layer.volume = val / 100
            const display = volumeSlider.nextElementSibling
            if (display && display.classList.contains('volume-value')) {
              display.textContent = `${val}%`
            }
          })
        }

        // Categorized Sound Family Selector
        const sampleSelect = document.getElementById(`${track}-beat-audio`)
        if (sampleSelect) {
          sampleSelect.addEventListener('change', (e) => {
            const selectedOption = sampleSelect.options[sampleSelect.selectedIndex]
            const soundId = selectedOption.dataset.soundId || this.fallbackExtractSoundId(track, e.target.value)
            layer.soundFamily = soundId
            layer.steps.forEach(stepPads => {
              stepPads.forEach(pad => { pad.soundFamily = soundId })
            })
            this.playPadSound(this.resolveSoundFile(layer.category, layer.soundFamily, layer.intensity), layer.volume)
          })
        }
      })
    }

    bindPrimaryIntensityEvents() {
      document.querySelectorAll('.intensity-station').forEach(station => {
        const track = station.dataset.track
        if (!track) return
        const layer = this.layers.find(l => l.category === track && l.isPrimary)
        if (!layer) return

        const pills = station.querySelectorAll('.intensity-pill')
        pills.forEach(pill => {
          pill.addEventListener('click', () => {
            const intensity = pill.dataset.intensity
            layer.intensity = intensity
            pills.forEach(p => p.classList.remove('active'))
            pill.classList.add('active')

            layer.steps.forEach(stepPads => {
              stepPads.forEach(pad => { pad.intensity = intensity })
            })

            this.playPadSound(this.resolveSoundFile(layer.category, layer.soundFamily, layer.intensity), layer.volume)
          })
        })
      })
    }

    fallbackExtractSoundId(track, val) {
      if (val.includes('classic')) return 'kick-classic'
      if (val.includes('808')) return `${track}-808`
      if (val.includes('heavy')) return 'kick-heavy'
      if (val.includes('softy')) return 'kick-softy'
      if (val.includes('acoustic')) return `${track}-acoustic`
      if (val.includes('vinyl')) return 'snare-vinyl'
      return `${track}-base`
    }

    updateAllSoloStates() {
      const anySolo = this.layers.some(l => l.solo)

      this.layers.forEach(layer => {
        const selector = layer.isPrimary
          ? `.primary-layer[data-track="${layer.category}"]`
          : `.track-channel.sublayer[data-layer-id="${layer.id}"]`

        const rowEl = document.querySelector(selector)
        if (rowEl) {
          if (anySolo) {
            rowEl.classList.toggle('is-dimmed', !layer.solo)
          } else {
            rowEl.classList.remove('is-dimmed')
          }
        }
      })
    }

    // ------------------------------------------------------------------------
    // 7. Sequencer Playback Engine (Multi-Layer & Multi-Pad Polyphony)
    // ------------------------------------------------------------------------
    repeatAnimation() {
      const currentStep = this.index % this.totalSteps
      this.index++

      // 1. Update Playhead Rulers and Step Dots
      document.querySelectorAll('.step-dot').forEach(dot => {
        dot.classList.remove('active')
      })
      const activeStepDots = document.querySelectorAll(`.step-dot[data-step="${currentStep}"]`)
      activeStepDots.forEach(dot => dot.classList.add('active'))

      if (this.updateTimelinePlayhead) {
        this.updateTimelinePlayhead(currentStep)
      }

      // Auto-follow playhead in scrollable viewport ONLY if sequence overflows viewport width
      if (this.sequencerViewport && this.isPlaying) {
        const isOverflowing = this.sequencerViewport.scrollWidth > this.sequencerViewport.clientWidth + 10
        if (isOverflowing) {
          if (currentStep === 0) {
            if (this.sequencerViewport.scrollLeft > 0) {
              this.sequencerViewport.scrollTo({ left: 0, behavior: 'smooth' })
            }
          } else {
            const stepColHead = document.querySelector(`.step-col-head[data-step="${currentStep}"]`)
            if (stepColHead) {
              const stepRect = stepColHead.getBoundingClientRect()
              const vpRect = this.sequencerViewport.getBoundingClientRect()
              const stickyStripWidth = 285

              // Only scroll right if the step is leaving the visible right viewport edge
              if (stepRect.right > vpRect.right - 25) {
                const delta = stepRect.right - vpRect.right + 60
                this.sequencerViewport.scrollBy({ left: delta, behavior: 'smooth' })
              }
              // If step is tucked behind the sticky channel strip on the left
              else if (stepRect.left < vpRect.left + stickyStripWidth) {
                const delta = stepRect.left - (vpRect.left + stickyStripWidth + 20)
                this.sequencerViewport.scrollBy({ left: delta, behavior: 'smooth' })
              }
            }
          }
        }
      }

      // 2. Playback Multi-Layer Engine
      const hasAnySolo = this.layers.some(l => l.solo)
      let anySoundTriggered = false
      const stepIntervalMs = (60 / this.bpm) * 1000 / 2 // 8th note duration

      this.layers.forEach(layer => {
        // Skip if solo rule applies and this layer is not soloed
        if (hasAnySolo && !layer.solo) return
        // Skip if layer is muted
        if (layer.muted) return

        const padsAtStep = layer.steps[currentStep] || []

        padsAtStep.forEach(pad => {
          if (!pad.active) return

          anySoundTriggered = true
          const soundFile = this.resolveSoundFile(pad.category, pad.soundFamily, pad.intensity)
          const effectiveVolume = pad.volume * layer.volume

          // Support Sub-division / Repetition (flam, triplet, roll)
          const repeatCount = pad.repeat || 1
          if (repeatCount === 1) {
            this.playPadSound(soundFile, effectiveVolume)
          } else {
            // Schedule sub-beat hits evenly across this step interval
            for (let r = 0; r < repeatCount; r++) {
              const delay = (r * stepIntervalMs) / repeatCount
              setTimeout(() => {
                this.playPadSound(soundFile, effectiveVolume)
              }, delay)
            }
          }

          // Trigger mini VU meter
          this.pulseMeter(layer.category)
        })
      })

      // 3. Tactile Pad Animation on DOM pads at this step
      document.querySelectorAll(`.b${currentStep}`).forEach(padEl => {
        padEl.style.animation = 'triger 0.22s ease-out'
        padEl.addEventListener('animationend', function () {
          this.style.animation = ''
        }, { once: true })
      })

      if (anySoundTriggered) {
        this.pulseVisualizer()
      }
    }

    pulseMeter(track) {
      const meter = this.meters[track]
      if (meter) {
        meter.style.height = '100%'
        setTimeout(() => {
          meter.style.height = '0%'
        }, 120)
      }
    }

    pulseVisualizer() {
      if (this.visualizerContainer) {
        this.visualizerContainer.classList.add('pulsing')
        this.visualizerBars.forEach(bar => {
          const randomHeight = Math.floor(Math.random() * 80 + 20)
          bar.style.height = `${randomHeight}%`
        })
        setTimeout(() => {
          if (this.visualizerContainer) {
            this.visualizerContainer.classList.remove('pulsing')
            this.visualizerBars.forEach(bar => {
              bar.style.height = ''
            })
          }
        }, 140)
      }
    }

    // ------------------------------------------------------------------------
    // 8. Transport Engine: Start / Stop
    // ------------------------------------------------------------------------
    start() {
      this.ensureAudioContextRunning()
      const interval = (60 / this.bpm) * 1000 / 2 // 8-step resolution (8th notes)

      if (!this.isPlaying) {
        if (this.playBtn) {
          this.playBtn.innerHTML = `
            <div class="play-icon-wrap">
              <i class="fa-solid fa-pause"></i>
            </div>
            <span class="play-text">STOP</span>
          `
          this.playBtn.classList.add('active')
        }

        if (this.statusBadge) {
          this.statusBadge.classList.add('running')
          if (this.statusLabel) this.statusLabel.textContent = 'SEQUENCING'
        }

        if (this.clearBtn) this.clearBtn.disabled = true

        this.repeatAnimation()
        this.isPlaying = setInterval(() => {
          this.repeatAnimation()
        }, interval)
      } else {
        this.stop()
      }
    }

    stop() {
      if (this.isPlaying) {
        clearInterval(this.isPlaying)
        this.isPlaying = null
      }

      if (this.playBtn) {
        this.playBtn.innerHTML = `
          <div class="play-icon-wrap">
            <i class="fa-solid fa-play"></i>
          </div>
          <span class="play-text">START</span>
        `
        this.playBtn.classList.remove('active')
      }

      if (this.statusBadge) {
        this.statusBadge.classList.remove('running')
        if (this.statusLabel) this.statusLabel.textContent = 'STANDBY'
      }

      if (this.clearBtn) this.clearBtn.disabled = false

      document.querySelectorAll('.step-dot').forEach(dot => {
        dot.classList.remove('active')
      })

      this.index = 0
      if (this.tlPlayhead) this.tlPlayhead.style.left = '0%'
      if (this.updateTimelineMetrics) this.updateTimelineMetrics()
    }

    // ------------------------------------------------------------------------
    // 9. Tempo & BPM Engine
    // ------------------------------------------------------------------------
    setTempo(val) {
      let bpm = parseInt(val, 10)
      if (isNaN(bpm)) bpm = 120
      bpm = Math.max(20, Math.min(300, bpm))
      this.bpm = bpm

      if (this.tempoSlider) this.tempoSlider.value = bpm
      if (this.tempoNumber) this.tempoNumber.textContent = bpm

      if (this.updateTimelineMetrics) this.updateTimelineMetrics()
      if (this.renderTrackpadRuler) this.renderTrackpadRuler()

      // If running, restart interval smoothly without stuttering
      if (this.isPlaying) {
        clearInterval(this.isPlaying)
        const interval = (60 / this.bpm) * 1000 / 2
        this.isPlaying = setInterval(() => {
          this.repeatAnimation()
        }, interval)
      }
    }

    bindTempoEvents() {
      if (this.tempoSlider) {
        this.tempoSlider.addEventListener('input', (e) => {
          this.setTempo(e.target.value)
        })
      }

      const btnMinus5 = document.getElementById('bpm-minus-5')
      const btnMinus1 = document.getElementById('bpm-minus-1')
      const btnPlus1 = document.getElementById('bpm-plus-1')
      const btnPlus5 = document.getElementById('bpm-plus-5')

      if (btnMinus5) btnMinus5.addEventListener('click', () => this.setTempo(this.bpm - 5))
      if (btnMinus1) btnMinus1.addEventListener('click', () => this.setTempo(this.bpm - 1))
      if (btnPlus1) btnPlus1.addEventListener('click', () => this.setTempo(this.bpm + 1))
      if (btnPlus5) btnPlus5.addEventListener('click', () => this.setTempo(this.bpm + 5))

      if (this.tapTempoBtn) {
        this.tapTempoBtn.addEventListener('click', () => {
          const now = Date.now()
          if (this.tapTimes.length && (now - this.tapTimes[this.tapTimes.length - 1] > 2500)) {
            this.tapTimes = []
          }
          this.tapTimes.push(now)

          if (this.tapTimes.length > 4) {
            this.tapTimes.shift()
          }

          if (this.tapTimes.length >= 2) {
            let intervals = []
            for (let i = 1; i < this.tapTimes.length; i++) {
              intervals.push(this.tapTimes[i] - this.tapTimes[i - 1])
            }
            const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
            const calculatedBpm = Math.round(60000 / avgInterval)
            this.setTempo(calculatedBpm)
          }

          this.tapTempoBtn.style.transform = 'scale(0.92)'
          setTimeout(() => {
            this.tapTempoBtn.style.transform = ''
          }, 100)
        })
      }
    }

    // ------------------------------------------------------------------------
    // 10. Presets & Random Pattern Generator
    // ------------------------------------------------------------------------
    loadPreset(presetKey) {
      const preset = this.presets[presetKey]
      if (!preset) return

      this.clearAllPads()

      if (preset.bpm) {
        this.setTempo(preset.bpm)
      }

      // Apply sound families & intensities
      if (preset.soundFamilies) {
        Object.entries(preset.soundFamilies).forEach(([track, soundId]) => {
          this.setTrackSoundFamily(track, soundId)
        })
      }
      if (preset.intensities) {
        Object.entries(preset.intensities).forEach(([track, intensity]) => {
          this.setTrackIntensity(track, intensity)
        })
      }

      // Activate primary pads
      ;['kick', 'snare', 'hihat'].forEach(track => {
        const layer = this.layers.find(l => l.category === track && l.isPrimary)
        if (!layer) return

        const activeSteps = preset[track] || []
        activeSteps.forEach(step => {
          const pad = layer.steps[step][0]
          if (pad) {
            pad.active = true
            // Check repeats
            if (preset.repeats && preset.repeats[track] && preset.repeats[track][step]) {
              pad.repeat = preset.repeats[track][step]
            }
          }
          this.reRenderStepCell(layer, step)
        })
      })

      // Audio feedback
      this.playPadSound(this.resolveSoundFile('kick', 'kick-808', 'high'), 0.9)
      if (this.renderTrackpadLanes) this.renderTrackpadLanes()
      if (this.updateTimelineMetrics) this.updateTimelineMetrics()
    }

    bindPresetEvents() {
      if (this.presetSelect) {
        this.presetSelect.addEventListener('change', (e) => {
          this.loadPreset(e.target.value)
        })
      }

      if (this.randomBeatBtn) {
        this.randomBeatBtn.addEventListener('click', () => {
          this.generateRandomPattern()
        })
      }
    }

    generateRandomPattern() {
      this.clearAllPads()
      const bpmOptions = [90, 110, 128, 140, 150]
      const randomBpm = bpmOptions[Math.floor(Math.random() * bpmOptions.length)]
      this.setTempo(randomBpm)

      const kickFamilies = ['kick-classic', 'kick-808', 'kick-heavy', 'kick-softy']
      const snareFamilies = ['snare-acoustic', 'snare-808', 'snare-vinyl']
      const hihatFamilies = ['hihat-808', 'hihat-acoustic']
      const intensityOptions = ['low', 'med-low', 'med', 'med-high', 'high']

      this.setTrackSoundFamily('kick', kickFamilies[Math.floor(Math.random() * kickFamilies.length)])
      this.setTrackSoundFamily('snare', snareFamilies[Math.floor(Math.random() * snareFamilies.length)])
      this.setTrackSoundFamily('hihat', hihatFamilies[Math.floor(Math.random() * hihatFamilies.length)])

      this.setTrackIntensity('kick', intensityOptions[Math.floor(Math.random() * intensityOptions.length)])
      this.setTrackIntensity('snare', intensityOptions[Math.floor(Math.random() * intensityOptions.length)])
      this.setTrackIntensity('hihat', intensityOptions[Math.floor(Math.random() * intensityOptions.length)])

      const kickSteps = [0, 4]
      if (Math.random() > 0.5) kickSteps.push(2)
      if (Math.random() > 0.6) kickSteps.push(6)

      const snareSteps = [2, 6]
      if (Math.random() > 0.7) snareSteps.push(7)

      const hihatSteps = []
      for (let i = 0; i < 8; i++) {
        if (i % 2 === 0 || Math.random() > 0.35) {
          hihatSteps.push(i)
        }
      }

      const applySteps = (track, steps) => {
        const layer = this.layers.find(l => l.category === track && l.isPrimary)
        if (!layer) return
        steps.forEach(s => {
          const pad = layer.steps[s][0]
          if (pad) {
            pad.active = true
            if (track === 'hihat' && Math.random() > 0.65) {
              pad.repeat = Math.random() > 0.5 ? 2 : 4 // Trap roll variation
            }
          }
          this.reRenderStepCell(layer, s)
        })
      }

      applySteps('kick', kickSteps)
      applySteps('snare', snareSteps)
      applySteps('hihat', hihatSteps)

      this.playPadSound(this.resolveSoundFile('kick', 'kick-classic', 'high'), 0.9)
      if (this.renderTrackpadLanes) this.renderTrackpadLanes()
      if (this.updateTimelineMetrics) this.updateTimelineMetrics()
    }

    setTrackIntensity(track, intensity) {
      const layer = this.layers.find(l => l.category === track && l.isPrimary)
      if (!layer) return
      layer.intensity = intensity

      const station = document.querySelector(`.intensity-station[data-track="${track}"]`)
      if (station) {
        const pills = station.querySelectorAll('.intensity-pill')
        pills.forEach(p => p.classList.toggle('active', p.dataset.intensity === intensity))
      }

      layer.steps.forEach(stepPads => {
        stepPads.forEach(pad => { pad.intensity = intensity })
      })
    }

    setTrackSoundFamily(track, soundId) {
      const layer = this.layers.find(l => l.category === track && l.isPrimary)
      if (!layer) return
      layer.soundFamily = soundId

      const select = document.getElementById(`${track}-beat-audio`)
      if (select) {
        for (let i = 0; i < select.options.length; i++) {
          if (select.options[i].dataset.soundId === soundId || select.options[i].value.includes(soundId)) {
            select.selectedIndex = i
            break
          }
        }
      }

      layer.steps.forEach(stepPads => {
        stepPads.forEach(pad => { pad.soundFamily = soundId })
      })
    }

    // ------------------------------------------------------------------------
    // 11. Modal Bindings & Grid Clearing
    // ------------------------------------------------------------------------
    clearAllPads() {
      this.layers.forEach(layer => {
        for (let s = 0; s < this.totalSteps; s++) {
          if (!layer.steps[s]) continue
          // If layer has multiple pads on a step, remove stacked pads and keep 1 inactive pad
          if (layer.steps[s].length > 1) {
            layer.steps[s] = [layer.steps[s][0]]
          }
          const primaryPad = layer.steps[s][0]
          if (primaryPad) {
            primaryPad.active = false
            primaryPad.repeat = 1
            primaryPad.intensity = layer.intensity
          }
          this.reRenderStepCell(layer, s)
        }
      })
      if (this.renderTrackpadLanes) this.renderTrackpadLanes()
      if (this.updateTimelineMetrics) this.updateTimelineMetrics()
    }

    bindTransportEvents() {
      if (this.playBtn) {
        this.playBtn.addEventListener('click', () => this.start())
      }

      if (this.clearBtn) {
        this.clearBtn.addEventListener('click', () => {
          if (this.clearModal) {
            this.clearModal.classList.add('active')
          }
        })
      }
    }

    bindModalEvents() {
      // Clear Modal
      if (this.modalCancel) {
        this.modalCancel.addEventListener('click', () => {
          if (this.clearModal) this.clearModal.classList.remove('active')
        })
      }

      if (this.modalConfirm) {
        this.modalConfirm.addEventListener('click', () => {
          this.clearAllPads()
          if (this.clearModal) this.clearModal.classList.remove('active')
        })
      }

      if (this.clearModal) {
        this.clearModal.addEventListener('click', (e) => {
          if (e.target === this.clearModal) this.clearModal.classList.remove('active')
        })
      }

      // UX Laws Modal
      if (this.uxLawsBtn && this.uxLawsModal) {
        this.uxLawsBtn.addEventListener('click', () => {
          this.uxLawsModal.classList.add('active')
        })
      }

      if (this.closeUxModalBtn && this.uxLawsModal) {
        this.closeUxModalBtn.addEventListener('click', () => {
          this.uxLawsModal.classList.remove('active')
        })
      }

      if (this.dismissUxModalBtn && this.uxLawsModal) {
        this.dismissUxModalBtn.addEventListener('click', () => {
          this.uxLawsModal.classList.remove('active')
        })
      }

      if (this.uxLawsModal) {
        this.uxLawsModal.addEventListener('click', (e) => {
          if (e.target === this.uxLawsModal) this.uxLawsModal.classList.remove('active')
        })
      }

      // Sound Assets Modal
      if (this.soundAssetsBtn && this.soundAssetsModal) {
        this.soundAssetsBtn.addEventListener('click', () => {
          this.soundAssetsModal.classList.add('active')
        })
      }

      if (this.closeAssetsModalBtn && this.soundAssetsModal) {
        this.closeAssetsModalBtn.addEventListener('click', () => {
          this.soundAssetsModal.classList.remove('active')
        })
      }

      if (this.dismissAssetsModalBtn && this.soundAssetsModal) {
        this.dismissAssetsModalBtn.addEventListener('click', () => {
          this.soundAssetsModal.classList.remove('active')
        })
      }

      if (this.soundAssetsModal) {
        this.soundAssetsModal.addEventListener('click', (e) => {
          if (e.target === this.soundAssetsModal) this.soundAssetsModal.classList.remove('active')
        })
      }
    }

    // ------------------------------------------------------------------------
    // 12. Sound Assets Inspector Modal Renderer
    // ------------------------------------------------------------------------
    renderSoundAssetsModal() {
      if (!this.soundCategoriesList || !this.manifest) return
      this.soundCategoriesList.innerHTML = ''

      Object.entries(this.manifest.categories).forEach(([catKey, cat]) => {
        const catCard = document.createElement('div')
        catCard.className = 'category-card'

        let soundFamiliesHTML = ''
        Object.entries(cat.sounds).forEach(([soundKey, sound]) => {
          const isBase = soundKey === cat.baseTrackSound
          const variationsHTML = Object.entries(sound.variations).map(([varKey, v]) => `
            <button class="variation-preview-btn" data-src="${v.file}" title="Preview ${sound.name} (${v.label})">
              <span class="var-name"><i class="fa-solid fa-play"></i> ${v.label}</span>
              <span class="var-specs">${v.filterCutoffHz < 19000 ? v.filterCutoffHz + 'Hz' : 'Direct'} &bull; Peak ${v.peak}</span>
            </button>
          `).join('')

          soundFamiliesHTML += `
            <div class="sound-family-item">
              <div class="family-info-row">
                <div class="family-name">
                  ${sound.name} ${isBase ? '<span class="base-sound-tag">Track Base</span>' : ''}
                </div>
                <div class="family-meta-pills">
                  <span class="meta-pill"><i class="fa-solid fa-wave-square"></i> ${sound.type}</span>
                  <span class="meta-pill"><i class="fa-solid fa-ruler-horizontal"></i> ${sound.frequencyRange}</span>
                </div>
              </div>
              <p class="family-desc">${sound.description}</p>
              <div class="variations-row">
                ${variationsHTML}
              </div>
            </div>
          `
        })

        catCard.innerHTML = `
          <div class="category-header">
            <div class="category-title-wrap">
              <span class="category-badge">Track 0${cat.trackNumber}</span>
              <h3 class="category-name">${cat.name}</h3>
            </div>
            <span class="base-sound-tag"><i class="fa-solid fa-star"></i> Default Base: ${cat.baseTrackSound}</span>
          </div>
          <div class="sound-families-container">
            ${soundFamiliesHTML}
          </div>
        `

        this.soundCategoriesList.appendChild(catCard)
      })

      this.soundCategoriesList.querySelectorAll('.variation-preview-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const src = btn.dataset.src
          this.playDirectSound(src)
        })
      })
    }

    // ------------------------------------------------------------------------
    // 13. Keyboard Shortcuts (Ergonomics & Fitts's / Doherty Threshold)
    // ------------------------------------------------------------------------
    bindKeyboardShortcuts() {
      window.addEventListener('keydown', (e) => {
        if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
          if (e.key === 'Escape') {
            document.activeElement.blur()
          }
          return
        }

        // Ctrl / Meta Combos
        if (e.ctrlKey || e.metaKey) {
          if (e.code === 'KeyS') {
            e.preventDefault()
            this.openSaveModal()
            return
          }
          if (e.code === 'KeyE') {
            e.preventDefault()
            this.openExportModal()
            return
          }
          if (e.code === 'KeyL') {
            e.preventDefault()
            this.toggleLibrary()
            return
          }
        }

        switch (e.code) {
          case 'Space':
            e.preventDefault()
            this.start()
            break
          case 'KeyC':
            e.preventDefault()
            if (this.clearModal) {
              this.clearModal.classList.toggle('active')
            }
            break
          case 'KeyT':
            e.preventDefault()
            if (this.tapTempoBtn) this.tapTempoBtn.click()
            break
          case 'KeyB':
            e.preventDefault()
            this.addBeat()
            break
          case 'Digit1':
            this.playPadSound(this.resolveSoundFile('kick', 'kick-classic', 'med'), 1.0)
            break
          case 'Digit2':
            this.playPadSound(this.resolveSoundFile('snare', 'snare-acoustic', 'med'), 1.0)
            break
          case 'Digit3':
            this.playPadSound(this.resolveSoundFile('hihat', 'hihat-808', 'med'), 1.0)
            break
          case 'ArrowUp':
            e.preventDefault()
            this.setTempo(this.bpm + 5)
            break
          case 'ArrowDown':
            e.preventDefault()
            this.setTempo(this.bpm - 5)
            break
          case 'Escape':
            if (this.clearModal) this.clearModal.classList.remove('active')
            if (this.uxLawsModal) this.uxLawsModal.classList.remove('active')
            if (this.soundAssetsModal) this.soundAssetsModal.classList.remove('active')
            if (this.padPopover) this.padPopover.classList.remove('active')
            if (this.saveModal) this.closeSaveModal()
            if (this.exportModal) this.closeExportModal()
            if (this.libDrawer) this.closeLibrary()
            break
        }
      })
    }

    // ------------------------------------------------------------------------
    // 14. Interactive Beat Timeline & Trackpad Engine
    // ------------------------------------------------------------------------
    initTimeline() {
      this.tlCard = document.querySelector('.beat-timeline-card')
      this.tlSurface = document.getElementById('trackpad-surface-wrap')
      this.tlRuler = document.getElementById('trackpad-ruler')
      this.tlLanesMatrix = document.getElementById('trackpad-lanes-matrix')
      this.tlPlayhead = document.getElementById('trackpad-playhead')
      this.tlTimeVal = document.getElementById('tl-time-val')
      this.tlPosVal = document.getElementById('tl-pos-val')
      this.tlLoopVal = document.getElementById('tl-loop-val')
      this.tlTooltip = document.getElementById('trackpad-hover-tooltip')

      this.isScrubbing = false

      if (!this.tlSurface) return

      this.renderTrackpadRuler()
      this.renderTrackpadLanes()
      this.updateTimelineMetrics()

      // Interactive Scrubbing / Seeking via pointer interactions
      const handleScrub = (clientX) => {
        if (!this.tlSurface) return
        const rect = this.tlSurface.getBoundingClientRect()
        const relX = Math.max(0, Math.min(rect.width, clientX - rect.left))
        const ratio = relX / rect.width
        const targetStep = Math.min(this.totalSteps - 1, Math.floor(ratio * this.totalSteps))
        this.seekToStep(targetStep)

        if (this.tlTooltip) {
          const stepDur = (60 / this.bpm) / 2
          const timeSec = (targetStep * stepDur).toFixed(2)
          this.tlTooltip.textContent = `Beat ${Math.floor(targetStep / 4) + 1} • Step ${(targetStep % 4) + 1} (${timeSec}s)`
          this.tlTooltip.style.left = `${relX}px`
          this.tlTooltip.classList.add('visible')
        }
      }

      this.tlSurface.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return
        this.isScrubbing = true
        handleScrub(e.clientX)

        const onMouseMove = (ev) => {
          if (this.isScrubbing) {
            handleScrub(ev.clientX)
          }
        }

        const onMouseUp = () => {
          this.isScrubbing = false
          window.removeEventListener('mousemove', onMouseMove)
          window.removeEventListener('mouseup', onMouseUp)
          if (this.tlTooltip) this.tlTooltip.classList.remove('visible')
        }

        window.addEventListener('mousemove', onMouseMove)
        window.addEventListener('mouseup', onMouseUp)
      })

      // Touch Scrubbing
      this.tlSurface.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches[0]) {
          this.isScrubbing = true
          handleScrub(e.touches[0].clientX)
        }
      }, { passive: true })

      this.tlSurface.addEventListener('touchmove', (e) => {
        if (this.isScrubbing && e.touches && e.touches[0]) {
          handleScrub(e.touches[0].clientX)
        }
      }, { passive: true })

      this.tlSurface.addEventListener('touchend', () => {
        this.isScrubbing = false
        if (this.tlTooltip) this.tlTooltip.classList.remove('visible')
      })

      // Hover Tooltip
      this.tlSurface.addEventListener('mousemove', (e) => {
        if (this.isScrubbing || !this.tlTooltip) return
        const rect = this.tlSurface.getBoundingClientRect()
        const relX = Math.max(0, Math.min(rect.width, e.clientX - rect.left))
        const ratio = relX / rect.width
        const hoverStep = Math.min(this.totalSteps - 1, Math.floor(ratio * this.totalSteps))
        const stepDur = (60 / this.bpm) / 2
        const timeSec = (hoverStep * stepDur).toFixed(2)
        this.tlTooltip.textContent = `Beat ${Math.floor(hoverStep / 4) + 1} • Step ${(hoverStep % 4) + 1} (${timeSec}s)`
        this.tlTooltip.style.left = `${relX}px`
        this.tlTooltip.classList.add('visible')
      })

      this.tlSurface.addEventListener('mouseleave', () => {
        if (!this.isScrubbing && this.tlTooltip) {
          this.tlTooltip.classList.remove('visible')
        }
      })
    }

    renderTrackpadRuler() {
      if (!this.tlRuler) return
      this.tlRuler.innerHTML = ''

      const stepDur = (60 / this.bpm) / 2

      for (let b = 1; b <= this.numBeats; b++) {
        const startStep = (b - 1) * 4
        const timeSec = (startStep * stepDur).toFixed(2)

        const markerEl = document.createElement('div')
        markerEl.className = 'tl-ruler-beat-chunk trackpad-beat-marker'

        markerEl.innerHTML = `
          <div class="tl-beat-bar-label">
            <span class="tl-ruler-beat-tag tl-beat-tag">BEAT ${String(b).padStart(2, '0')}</span>
            <span class="tl-ruler-time-tag tl-beat-sec">${timeSec}s</span>
          </div>
          <div class="tl-beat-ticks">
            <span class="tl-tick tl-tick-major"></span>
            <span class="tl-tick"></span>
            <span class="tl-tick"></span>
            <span class="tl-tick"></span>
          </div>
        `
        this.tlRuler.appendChild(markerEl)
      }
    }

    renderTrackpadLanes() {
      if (!this.tlLanesMatrix) return
      this.tlLanesMatrix.innerHTML = ''

      this.layers.forEach((layer) => {
        const laneEl = document.createElement('div')
        laneEl.className = `tl-mini-lane tl-lane-${layer.category}`
        laneEl.dataset.layerId = layer.id

        const labelEl = document.createElement('div')
        labelEl.className = `tl-lane-tag tl-mini-lane-tag ${layer.category}-tint`
        const shortName = (layer.name || layer.category).replace(/primary/i, '').trim().slice(0, 5).toUpperCase()
        labelEl.textContent = shortName
        laneEl.appendChild(labelEl)

        const stepsWrap = document.createElement('div')
        stepsWrap.className = 'tl-lane-steps-grid tl-mini-steps-row'

        for (let s = 0; s < this.totalSteps; s++) {
          const pads = layer.steps[s] || []
          const hasActive = pads.some(p => p.active)

          const stepDot = document.createElement('div')
          let activeSpecific = ''
          if (hasActive) {
            if (layer.category === 'kick') activeSpecific = 'active-kick kick-active'
            else if (layer.category === 'snare') activeSpecific = 'active-snare snare-active'
            else if (layer.category === 'hihat') activeSpecific = 'active-hihat hihat-active'
            else activeSpecific = 'active-sub sub-active'
          }
          stepDot.className = `tl-mini-step ${hasActive ? 'active ' + activeSpecific : ''}`
          stepDot.dataset.step = s
          stepDot.dataset.layerId = layer.id
          stepDot.title = `${layer.name || layer.category} Step ${s + 1}${hasActive ? ' (Active)' : ''}`

          stepDot.addEventListener('click', (e) => {
            e.stopPropagation()
            this.seekToStep(s)
          })

          stepsWrap.appendChild(stepDot)
        }

        laneEl.appendChild(stepsWrap)
        this.tlLanesMatrix.appendChild(laneEl)
      })
    }

    updateTimelinePlayhead(currentStep) {
      if (!this.tlPlayhead) return
      const stepPercent = (currentStep / this.totalSteps) * 100
      this.tlPlayhead.style.left = `${stepPercent}%`
      this.updateTimelineMetrics()
    }

    updateTimelineMetrics() {
      const stepDur = (60 / this.bpm) / 2
      const totalDurSec = this.totalSteps * stepDur
      const currentStep = this.index % this.totalSteps
      const currentElapsedSec = currentStep * stepDur

      const fmtTime = (sec) => {
        const m = Math.floor(sec / 60)
        const s = Math.floor(sec % 60)
        const ms = Math.floor((sec % 1) * 100)
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(2, '0')}`
      }

      if (this.tlTimeVal) {
        this.tlTimeVal.textContent = `${fmtTime(currentElapsedSec)} / ${fmtTime(totalDurSec)}`
      }

      if (this.tlPosVal) {
        const beatNum = Math.floor(currentStep / 4) + 1
        const stepInBeat = (currentStep % 4) + 1
        this.tlPosVal.textContent = `BEAT ${String(beatNum).padStart(2, '0')} • STEP ${String(stepInBeat).padStart(2, '0')} (#${currentStep + 1})`
      }

      if (this.tlLoopVal) {
        this.tlLoopVal.textContent = `${this.numBeats} BEATS (${this.totalSteps} STEPS)`
      }

      // Update Export modal repetition durations if modal elements exist
      ;[1, 2, 4, 8].forEach(reps => {
        const repEl = document.getElementById(`export-rep-dur-${reps}`)
        if (repEl) {
          repEl.textContent = `${(totalDurSec * reps).toFixed(1)}s`
        }
      })
    }

    seekToStep(targetStep) {
      const clamped = Math.max(0, Math.min(this.totalSteps - 1, targetStep))
      this.index = clamped

      // Update ruler playhead dots in sequencer
      document.querySelectorAll('.step-dot').forEach(dot => dot.classList.remove('active'))
      document.querySelectorAll(`.step-dot[data-step="${clamped}"]`).forEach(dot => dot.classList.add('active'))

      // Update timeline playhead
      this.updateTimelinePlayhead(clamped)

      // Auto-scroll viewport if step is out of view
      if (this.sequencerViewport) {
        const stepColHead = document.querySelector(`.step-col-head[data-step="${clamped}"]`)
        if (stepColHead) {
          stepColHead.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
        }
      }

      // Audition preview of active pads at this step for immediate tactile response
      this.layers.forEach(layer => {
        if (layer.muted) return
        const pads = layer.steps[clamped] || []
        pads.forEach(pad => {
          if (pad.active) {
            const soundFile = this.resolveSoundFile(pad.category, pad.soundFamily, pad.intensity)
            this.playPadSound(soundFile, pad.volume * layer.volume)
            this.pulseMeter(layer.category)
          }
        })
      })
    }

    // ------------------------------------------------------------------------
    // 15. Audio Export & Multi-Format Master Engine
    // ------------------------------------------------------------------------
    initExportEngine() {
      this.exportBtn = document.getElementById('export-audio-btn')
      this.exportModal = document.getElementById('export-audio-modal')
      this.closeExportBtn = document.getElementById('close-export-modal')
      this.cancelExportBtn = document.getElementById('cancel-export-modal')
      this.confirmExportBtn = document.getElementById('confirm-export-modal')
      this.exportFilenameInput = document.getElementById('export-filename-input')
      this.exportNormalizeToggle = document.getElementById('export-normalize-toggle')
      this.exportProgressWrap = document.getElementById('export-progress-wrap')
      this.exportProgressFill = document.getElementById('export-progress-fill')
      this.exportProgressStatus = document.getElementById('export-progress-status')

      this.selectedExportFormat = 'wav'
      this.selectedLoopCount = 1

      if (this.exportBtn) {
        this.exportBtn.addEventListener('click', () => this.openExportModal())
      }
      if (this.closeExportBtn) {
        this.closeExportBtn.addEventListener('click', () => this.closeExportModal())
      }
      if (this.cancelExportBtn) {
        this.cancelExportBtn.addEventListener('click', () => this.closeExportModal())
      }
      if (this.exportModal) {
        this.exportModal.addEventListener('click', (e) => {
          if (e.target === this.exportModal) this.closeExportModal()
        })
      }

      // Format card selection
      const formatCards = document.querySelectorAll('.format-card')
      formatCards.forEach(card => {
        card.addEventListener('click', () => {
          formatCards.forEach(c => c.classList.remove('active'))
          card.classList.add('active')
          const radio = card.querySelector('input[type="radio"]')
          if (radio) {
            radio.checked = true
            this.selectedExportFormat = radio.value
          }
        })
      })

      // Loop Repetition pills
      const loopPills = document.querySelectorAll('.loop-rep-pill')
      loopPills.forEach(pill => {
        pill.addEventListener('click', () => {
          loopPills.forEach(p => p.classList.remove('active'))
          pill.classList.add('active')
          this.selectedLoopCount = parseInt(pill.dataset.loops, 10) || 1
        })
      })

      // Confirm Export action
      if (this.confirmExportBtn) {
        this.confirmExportBtn.addEventListener('click', () => this.handleExportConfirm())
      }
    }

    openExportModal() {
      if (!this.exportModal) return
      this.updateTimelineMetrics()
      if (this.exportProgressWrap) this.exportProgressWrap.style.display = 'none'
      if (this.exportProgressFill) this.exportProgressFill.style.width = '0%'
      if (this.confirmExportBtn) this.confirmExportBtn.disabled = false
      this.exportModal.classList.add('active')
    }

    closeExportModal() {
      if (!this.exportModal) return
      this.exportModal.classList.remove('active')
    }

    async handleExportConfirm() {
      const filename = (this.exportFilenameInput && this.exportFilenameInput.value.trim()) || 'pulse808-groove'
      const format = this.selectedExportFormat || 'wav'
      const loopCount = this.selectedLoopCount || 1
      const normalize = this.exportNormalizeToggle ? this.exportNormalizeToggle.checked : true

      if (this.confirmExportBtn) this.confirmExportBtn.disabled = true
      if (this.exportProgressWrap) this.exportProgressWrap.style.display = 'block'
      if (this.exportProgressStatus) this.exportProgressStatus.textContent = 'Gathering audio stems...'
      if (this.exportProgressFill) this.exportProgressFill.style.width = '20%'

      try {
        await this.renderAndExportAudio(filename, format, loopCount, normalize)
      } catch (err) {
        console.error('Export failed:', err)
        this.showToast('Export failed: ' + (err.message || 'Audio context error'), 'warning')
      } finally {
        if (this.confirmExportBtn) this.confirmExportBtn.disabled = false
      }
    }

    async renderAndExportAudio(filename, format, loopCount, normalize) {
      const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext
      if (!OfflineCtx) {
        this.showToast('OfflineAudioContext is not supported in this browser', 'warning')
        return
      }

      const sampleRate = 44100
      const stepDur = (60 / this.bpm) / 2
      const loopDur = this.totalSteps * stepDur
      const tail = 0.5
      const totalDuration = (loopDur * loopCount) + tail
      const totalFrames = Math.ceil(sampleRate * totalDuration)

      const offlineCtx = new OfflineCtx(2, totalFrames, sampleRate)

      if (this.exportProgressStatus) this.exportProgressStatus.textContent = 'Decoding studio sample buffers...'
      if (this.exportProgressFill) this.exportProgressFill.style.width = '40%'

      // 1. Gather all required sample URLs
      const urlsToLoad = new Set()
      this.layers.forEach(layer => {
        if (layer.muted) return
        layer.steps.forEach(pads => {
          pads.forEach(pad => {
            if (pad.active) {
              urlsToLoad.add(this.resolveSoundFile(pad.category, pad.soundFamily, pad.intensity))
            }
          })
        })
      })

      // 2. Fetch and decode audio buffers
      const loadedBuffers = new Map()
      for (const url of urlsToLoad) {
        if (this.audioBuffers.has(url)) {
          loadedBuffers.set(url, this.audioBuffers.get(url))
        } else {
          try {
            const resp = await fetch(url)
            const ab = await resp.arrayBuffer()
            const buf = await offlineCtx.decodeAudioData(ab)
            loadedBuffers.set(url, buf)
            this.audioBuffers.set(url, buf)
          } catch (e) {
            console.warn('Could not load buffer for export:', url)
          }
        }
      }

      if (this.exportProgressStatus) this.exportProgressStatus.textContent = 'Synthesizing polyphonic tracks...'
      if (this.exportProgressFill) this.exportProgressFill.style.width = '65%'

      // 3. Schedule all active hits across repetitions
      const hasAnySolo = this.layers.some(l => l.solo)

      for (let loop = 0; loop < loopCount; loop++) {
        const loopOffset = loop * loopDur

        for (let step = 0; step < this.totalSteps; step++) {
          const stepTime = loopOffset + (step * stepDur)

          this.layers.forEach(layer => {
            if (hasAnySolo && !layer.solo) return
            if (layer.muted) return

            const pads = layer.steps[step] || []
            pads.forEach(pad => {
              if (!pad.active) return
              const soundUrl = this.resolveSoundFile(pad.category, pad.soundFamily, pad.intensity)
              const buffer = loadedBuffers.get(soundUrl)
              if (!buffer) return

              const effectiveVol = pad.volume * layer.volume
              const repeat = pad.repeat || 1

              for (let r = 0; r < repeat; r++) {
                const hitTime = stepTime + (r * stepDur) / repeat
                const source = offlineCtx.createBufferSource()
                source.buffer = buffer

                const gainNode = offlineCtx.createGain()
                gainNode.gain.setValueAtTime(effectiveVol, hitTime)

                source.connect(gainNode)
                gainNode.connect(offlineCtx.destination)
                source.start(hitTime)
              }
            })
          })
        }
      }

      if (this.exportProgressStatus) this.exportProgressStatus.textContent = 'Rendering audio master...'
      if (this.exportProgressFill) this.exportProgressFill.style.width = '85%'

      // 4. Render Offline Audio
      const renderedBuffer = await offlineCtx.startRendering()

      // 5. Peak Normalization to -0.1 dB
      if (normalize) {
        if (this.exportProgressStatus) this.exportProgressStatus.textContent = 'Peak normalizing (-0.1 dB)...'
        let maxPeak = 0
        for (let c = 0; c < renderedBuffer.numberOfChannels; c++) {
          const data = renderedBuffer.getChannelData(c)
          for (let i = 0; i < data.length; i++) {
            const abs = Math.abs(data[i])
            if (abs > maxPeak) maxPeak = abs
          }
        }
        if (maxPeak > 0.001) {
          const target = 0.9885
          const scale = target / maxPeak
          for (let c = 0; c < renderedBuffer.numberOfChannels; c++) {
            const data = renderedBuffer.getChannelData(c)
            for (let i = 0; i < data.length; i++) {
              data[i] *= scale
            }
          }
        }
      }

      if (this.exportProgressStatus) this.exportProgressStatus.textContent = 'Packaging master file...'
      if (this.exportProgressFill) this.exportProgressFill.style.width = '100%'

      // 6. Encode into lossless 16-Bit PCM WAV Blob
      const wavBlob = this.audioBufferToWavBlob(renderedBuffer)

      // Extension & Mime handling
      let finalBlob = wavBlob
      let ext = 'wav'
      if (format === 'mp3') {
        ext = 'mp3'
        finalBlob = new Blob([wavBlob], { type: 'audio/mpeg' })
      } else if (format === 'webm') {
        ext = 'webm'
        finalBlob = new Blob([wavBlob], { type: 'audio/webm' })
      }

      const safeFilename = `${filename.replace(/[^a-zA-Z0-9_-]/g, '_')}_${this.bpm}bpm.${ext}`

      // 7. Trigger Direct Download
      const blobUrl = URL.createObjectURL(finalBlob)
      const downloadLink = document.createElement('a')
      downloadLink.href = blobUrl
      downloadLink.download = safeFilename
      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)

      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000)

      this.closeExportModal()
      this.showToast(`Master exported: ${safeFilename}`, 'success')
    }

    // Pure 16-bit Stereo PCM WAV Encoder with standard 44-byte RIFF header
    audioBufferToWavBlob(buffer) {
      const numChannels = buffer.numberOfChannels
      const sampleRate = buffer.sampleRate
      const format = 1 // 1 = Linear PCM
      const bitDepth = 16
      const bytesPerSample = bitDepth / 8
      const blockAlign = numChannels * bytesPerSample

      const left = buffer.getChannelData(0)
      const right = numChannels > 1 ? buffer.getChannelData(1) : left
      const length = left.length
      const dataSize = length * blockAlign
      const headerSize = 44
      const totalSize = headerSize + dataSize

      const arrayBuffer = new ArrayBuffer(totalSize)
      const view = new DataView(arrayBuffer)

      const writeString = (offset, str) => {
        for (let i = 0; i < str.length; i++) {
          view.setUint8(offset + i, str.charCodeAt(i))
        }
      }

      // RIFF Header
      writeString(0, 'RIFF')
      view.setUint32(4, 36 + dataSize, true)
      writeString(8, 'WAVE')

      // fmt sub-chunk
      writeString(12, 'fmt ')
      view.setUint32(16, 16, true) // SubChunk1Size (16 for PCM)
      view.setUint16(20, format, true) // AudioFormat
      view.setUint16(22, numChannels, true) // NumChannels
      view.setUint32(24, sampleRate, true) // SampleRate
      view.setUint32(28, sampleRate * blockAlign, true) // ByteRate
      view.setUint16(32, blockAlign, true) // BlockAlign
      view.setUint16(34, bitDepth, true) // BitsPerSample

      // data sub-chunk
      writeString(36, 'data')
      view.setUint32(40, dataSize, true)

      // Write Interleaved Samples
      let offset = 44
      for (let i = 0; i < length; i++) {
        let sLeft = Math.max(-1, Math.min(1, left[i]))
        let valLeft = sLeft < 0 ? sLeft * 0x8000 : sLeft * 0x7FFF
        view.setInt16(offset, valLeft, true)
        offset += 2

        let sRight = Math.max(-1, Math.min(1, right[i]))
        let valRight = sRight < 0 ? sRight * 0x8000 : sRight * 0x7FFF
        view.setInt16(offset, valRight, true)
        offset += 2
      }

      return new Blob([arrayBuffer], { type: 'audio/wav' })
    }

    // ------------------------------------------------------------------------
    // 16. Sequence Library & Slide-in Drawer System
    // ------------------------------------------------------------------------
    initSequenceLibrary() {
      this.library = this.loadStoredLibrary()

      this.saveSeqBtn = document.getElementById('save-seq-btn')
      this.openLibBtn = document.getElementById('open-library-btn')
      this.libBadge = document.getElementById('lib-count-badge')

      this.saveModal = document.getElementById('save-sequence-modal')
      this.closeSaveBtn = document.getElementById('close-save-modal')
      this.cancelSaveBtn = document.getElementById('cancel-save-modal')
      this.confirmSaveBtn = document.getElementById('confirm-save-modal')
      this.saveNameInput = document.getElementById('save-seq-name-input')

      this.libDrawer = document.getElementById('library-drawer')
      this.libBackdrop = document.getElementById('library-backdrop')
      this.closeLibDrawerBtn = document.getElementById('close-library-drawer')
      this.dismissLibDrawerBtn = document.getElementById('lib-dismiss-btn')
      this.libSearchInput = document.getElementById('lib-search-input')
      this.libSearchClearBtn = document.getElementById('lib-search-clear-btn')
      this.libSaveNowBtn = document.getElementById('lib-save-now-btn')
      this.libList = document.getElementById('lib-sequences-list')
      this.libStorageCountText = document.getElementById('lib-storage-count-text')

      // Save modal bindings
      if (this.saveSeqBtn) {
        this.saveSeqBtn.addEventListener('click', () => this.openSaveModal())
      }
      if (this.closeSaveBtn) {
        this.closeSaveBtn.addEventListener('click', () => this.closeSaveModal())
      }
      if (this.cancelSaveBtn) {
        this.cancelSaveBtn.addEventListener('click', () => this.closeSaveModal())
      }
      if (this.saveModal) {
        this.saveModal.addEventListener('click', (e) => {
          if (e.target === this.saveModal) this.closeSaveModal()
        })
      }
      if (this.confirmSaveBtn) {
        this.confirmSaveBtn.addEventListener('click', () => {
          const name = this.saveNameInput ? this.saveNameInput.value.trim() : ''
          this.saveCurrentSequence(name)
        })
      }

      // Drawer bindings
      if (this.openLibBtn) {
        this.openLibBtn.addEventListener('click', () => this.openLibrary())
      }
      if (this.closeLibDrawerBtn) {
        this.closeLibDrawerBtn.addEventListener('click', () => this.closeLibrary())
      }
      if (this.dismissLibDrawerBtn) {
        this.dismissLibDrawerBtn.addEventListener('click', () => this.closeLibrary())
      }
      if (this.libBackdrop) {
        this.libBackdrop.addEventListener('click', () => this.closeLibrary())
      }
      if (this.libSaveNowBtn) {
        this.libSaveNowBtn.addEventListener('click', () => {
          this.closeLibrary()
          this.openSaveModal()
        })
      }

      // Search filtering
      if (this.libSearchInput) {
        this.libSearchInput.addEventListener('input', (e) => {
          const val = e.target.value
          if (this.libSearchClearBtn) {
            this.libSearchClearBtn.style.display = val ? 'block' : 'none'
          }
          this.renderLibraryList(val)
        })
      }
      if (this.libSearchClearBtn) {
        this.libSearchClearBtn.addEventListener('click', () => {
          if (this.libSearchInput) this.libSearchInput.value = ''
          this.libSearchClearBtn.style.display = 'none'
          this.renderLibraryList('')
        })
      }

      this.updateLibraryBadge()
      this.renderLibraryList('')
    }

    loadStoredLibrary() {
      try {
        const raw = localStorage.getItem('pulse808_library')
        if (raw) {
          const parsed = JSON.parse(raw)
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed
          }
        }
      } catch (e) {
        console.warn('Could not parse stored library:', e)
      }

      const factory = this.getFactorySequences()
      try {
        localStorage.setItem('pulse808_library', JSON.stringify(factory))
      } catch (e) {}
      return factory
    }

    saveStoredLibrary() {
      try {
        localStorage.setItem('pulse808_library', JSON.stringify(this.library))
      } catch (e) {
        console.warn('Could not save library to localStorage:', e)
      }
      this.updateLibraryBadge()
    }

    updateLibraryBadge() {
      const count = this.library ? this.library.length : 0
      if (this.libBadge) this.libBadge.textContent = count
      if (this.libStorageCountText) this.libStorageCountText.textContent = `${count} Sequences Stored`
    }

    openSaveModal() {
      if (!this.saveModal) return
      const defaultName = `Pattern ${this.library.length + 1}`
      if (this.saveNameInput) {
        this.saveNameInput.value = defaultName
        setTimeout(() => {
          this.saveNameInput.focus()
          this.saveNameInput.select()
        }, 100)
      }

      // Update Quick Stats Preview
      const statBpm = document.getElementById('save-stat-bpm')
      const statBeats = document.getElementById('save-stat-beats')
      const statLayers = document.getElementById('save-stat-layers')
      const statPads = document.getElementById('save-stat-pads')

      if (statBpm) statBpm.textContent = `${this.bpm} BPM`
      if (statBeats) statBeats.textContent = `${this.numBeats} Beats (${this.totalSteps} Steps)`
      if (statLayers) statLayers.textContent = `${this.layers.length} Tracks`

      let activeCount = 0
      this.layers.forEach(l => {
        l.steps.forEach(pads => {
          pads.forEach(p => { if (p.active) activeCount++ })
        })
      })
      if (statPads) statPads.textContent = `${activeCount} Active Pads`

      this.saveModal.classList.add('active')
    }

    closeSaveModal() {
      if (this.saveModal) this.saveModal.classList.remove('active')
    }

    openLibrary() {
      if (!this.libDrawer || !this.libBackdrop) return
      this.renderLibraryList(this.libSearchInput ? this.libSearchInput.value : '')
      this.libDrawer.classList.add('active')
      this.libBackdrop.classList.add('active')
    }

    closeLibrary() {
      if (this.libDrawer) this.libDrawer.classList.remove('active')
      if (this.libBackdrop) this.libBackdrop.classList.remove('active')
    }

    toggleLibrary() {
      if (this.libDrawer && this.libDrawer.classList.contains('active')) {
        this.closeLibrary()
      } else {
        this.openLibrary()
      }
    }

    saveCurrentSequence(name) {
      const seqName = (name && name.trim()) || `Custom Beat ${this.library.length + 1}`

      // Deep clone layers configuration
      const clonedLayers = this.layers.map(layer => {
        return {
          id: layer.id,
          badge: layer.badge,
          name: layer.name,
          category: layer.category,
          soundFamily: layer.soundFamily,
          intensity: layer.intensity,
          volume: layer.volume,
          muted: layer.muted,
          solo: layer.solo,
          isPrimary: layer.isPrimary,
          parentTrack: layer.parentTrack,
          steps: layer.steps.map(stepPads => {
            return stepPads.map(pad => ({
              id: pad.id,
              category: pad.category,
              soundFamily: pad.soundFamily,
              intensity: pad.intensity,
              volume: pad.volume,
              repeat: pad.repeat || 1,
              active: !!pad.active
            }))
          })
        }
      })

      const dateStr = new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })

      const newSeq = {
        id: `seq-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: seqName,
        createdAt: dateStr,
        bpm: this.bpm,
        numBeats: this.numBeats,
        totalSteps: this.totalSteps,
        layers: clonedLayers
      }

      this.library.unshift(newSeq)
      this.saveStoredLibrary()
      this.closeSaveModal()
      this.showToast(`Saved sequence: "${seqName}"`, 'success')
      this.playPadSound(this.resolveSoundFile('snare', 'snare-808', 'high'), 0.8)
    }

    loadSequence(seqId) {
      const seq = this.library.find(s => s.id === seqId)
      if (!seq) return

      // Stop playback if running
      this.stop()

      // 1. Restore Tempo
      this.setTempo(seq.bpm || 150)

      // 2. Adjust Beats count to match sequence
      const targetBeats = seq.numBeats || 2
      while (this.numBeats < targetBeats) {
        this.addBeat()
      }
      while (this.numBeats > targetBeats) {
        this.removeBeat(this.numBeats)
      }

      // 3. Clear existing dynamic sublayers in DOM
      ;['kick-sublayers', 'snare-sublayers', 'hihat-sublayers', 'custom-layers-container'].forEach(id => {
        const c = document.getElementById(id)
        if (c) c.innerHTML = ''
      })

      // 4. Reset layers array and restore from snapshot
      this.layers = []
      this.sublayerCounters = { kick: 1, snare: 1, hihat: 1, custom: 0 }

      seq.layers.forEach(layerData => {
        const restoredLayer = {
          id: layerData.id,
          badge: layerData.badge,
          name: layerData.name,
          category: layerData.category,
          soundFamily: layerData.soundFamily,
          intensity: layerData.intensity,
          volume: layerData.volume !== undefined ? layerData.volume : 1.0,
          muted: !!layerData.muted,
          solo: !!layerData.solo,
          isPrimary: !!layerData.isPrimary,
          parentTrack: layerData.parentTrack || layerData.category,
          steps: layerData.steps.map(stepPads => {
            return stepPads.map(pad => ({
              id: pad.id,
              category: pad.category,
              soundFamily: pad.soundFamily,
              intensity: pad.intensity,
              volume: pad.volume !== undefined ? pad.volume : 1.0,
              repeat: pad.repeat || 1,
              active: !!pad.active
            }))
          })
        }

        this.layers.push(restoredLayer)

        if (!restoredLayer.isPrimary) {
          if (this.sublayerCounters[restoredLayer.parentTrack] !== undefined) {
            this.sublayerCounters[restoredLayer.parentTrack]++
          }
          this.renderLayerDOM(restoredLayer)
        } else {
          for (let s = 0; s < this.totalSteps; s++) {
            this.reRenderStepCell(restoredLayer, s)
          }

          this.setTrackSoundFamily(restoredLayer.category, restoredLayer.soundFamily)
          this.setTrackIntensity(restoredLayer.category, restoredLayer.intensity)

          const volSlider = document.querySelector(`.primary-layer[data-track="${restoredLayer.category}"] .track-vol-slider`)
          if (volSlider) volSlider.value = Math.round(restoredLayer.volume * 100)

          const volVal = document.querySelector(`.primary-layer[data-track="${restoredLayer.category}"] .vol-readout`)
          if (volVal) volVal.textContent = `${Math.round(restoredLayer.volume * 100)}%`

          const muteBtn = document.querySelector(`.primary-layer[data-track="${restoredLayer.category}"] .track-mute-btn`)
          if (muteBtn) muteBtn.classList.toggle('active', restoredLayer.muted)

          const soloBtn = document.querySelector(`.primary-layer[data-track="${restoredLayer.category}"] .track-solo-btn`)
          if (soloBtn) soloBtn.classList.toggle('active', restoredLayer.solo)
        }
      })

      // 5. Update timeline and metrics
      this.renderTrackpadRuler()
      this.renderTrackpadLanes()
      this.updateTimelineMetrics()

      this.closeLibrary()
      this.showToast(`Sequence loaded: "${seq.name}"`, 'success')
      this.playPadSound(this.resolveSoundFile('kick', 'kick-808', 'high'), 0.9)
    }

    deleteSequence(seqId) {
      const idx = this.library.findIndex(s => s.id === seqId)
      if (idx === -1) return
      const removedName = this.library[idx].name
      this.library.splice(idx, 1)
      this.saveStoredLibrary()
      this.renderLibraryList(this.libSearchInput ? this.libSearchInput.value : '')
      this.showToast(`Deleted sequence: "${removedName}"`, 'info')
    }

    renameSequence(seqId) {
      const seq = this.library.find(s => s.id === seqId)
      if (!seq) return
      const newName = prompt('Enter new sequence name:', seq.name)
      if (newName && newName.trim() && newName.trim() !== seq.name) {
        seq.name = newName.trim()
        this.saveStoredLibrary()
        this.renderLibraryList(this.libSearchInput ? this.libSearchInput.value : '')
        this.showToast(`Renamed to "${seq.name}"`, 'info')
      }
    }

    renderLibraryList(filterText = '') {
      if (!this.libList) return
      this.libList.innerHTML = ''

      const query = (filterText || '').trim().toLowerCase()
      const filtered = this.library.filter(s => s.name.toLowerCase().includes(query))

      if (filtered.length === 0) {
        this.libList.innerHTML = `
          <div class="lib-empty-state">
            <div class="empty-icon-wrap">
              <i class="fa-solid fa-folder-open"></i>
            </div>
            <h3 class="empty-title">${query ? 'No matching sequences' : 'Your Library is empty'}</h3>
            <p class="empty-desc">${query ? 'Try searching for a different name.' : 'Save your first custom beat pattern to keep it here.'}</p>
          </div>
        `
        return
      }

      filtered.forEach(seq => {
        let activePadCount = 0
        seq.layers.forEach(l => {
          l.steps.forEach(pads => {
            pads.forEach(p => { if (p.active) activePadCount++ })
          })
        })

        const kickLayer = seq.layers.find(l => l.category === 'kick')
        const snareLayer = seq.layers.find(l => l.category === 'snare')
        const previewSteps = seq.totalSteps || 8
        let previewDotsHTML = ''
        for (let s = 0; s < Math.min(16, previewSteps); s++) {
          const hasKick = kickLayer && kickLayer.steps[s] && kickLayer.steps[s].some(p => p.active)
          const hasSnare = snareLayer && snareLayer.steps[s] && snareLayer.steps[s].some(p => p.active)
          const isHit = hasKick || hasSnare
          const dotClass = hasKick ? 'dot-kick' : hasSnare ? 'dot-snare' : 'dot-off'
          previewDotsHTML += `<span class="preview-mini-dot seq-mini-pip ${dotClass} ${isHit ? 'active-dot' : ''}"></span>`
        }

        const card = document.createElement('div')
        card.className = 'lib-seq-card'
        card.dataset.seqId = seq.id

        card.innerHTML = `
          <div class="seq-card-header">
            <div class="seq-card-title-group">
              <h4 class="seq-card-title">${seq.name}</h4>
              <span class="seq-card-date">${seq.createdAt || 'Saved Beat'}</span>
            </div>
            <div class="seq-card-actions">
              <button class="card-action-btn seq-load-btn load-action-btn" title="Load this sequence into sequencer">
                <i class="fa-solid fa-play"></i> LOAD
              </button>
              <button class="card-action-btn seq-action-btn rename-action-btn" title="Rename sequence">
                <i class="fa-solid fa-pen"></i>
              </button>
              <button class="card-action-btn seq-action-btn delete-seq delete-action-btn" title="Delete sequence">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </div>
          <div class="seq-card-badges seq-card-tags">
            <span class="seq-badge seq-tag"><i class="fa-solid fa-gauge-high"></i> ${seq.bpm} BPM</span>
            <span class="seq-badge seq-tag"><i class="fa-solid fa-music"></i> ${seq.numBeats || 2} Beats (${seq.totalSteps || 8} Steps)</span>
            <span class="seq-badge seq-tag"><i class="fa-solid fa-layer-group"></i> ${seq.layers.length} Tracks</span>
            <span class="seq-badge seq-tag"><i class="fa-solid fa-fire"></i> ${activePadCount} Pads</span>
          </div>
          <div class="seq-rhythm-preview seq-mini-rhythm" title="Rhythm footprint preview">
            ${previewDotsHTML}
          </div>
        `

        card.querySelector('.load-action-btn').addEventListener('click', (e) => {
          e.stopPropagation()
          this.loadSequence(seq.id)
        })

        card.querySelector('.rename-action-btn').addEventListener('click', (e) => {
          e.stopPropagation()
          this.renameSequence(seq.id)
        })

        card.querySelector('.delete-action-btn').addEventListener('click', (e) => {
          e.stopPropagation()
          this.deleteSequence(seq.id)
        })

        card.addEventListener('click', () => {
          this.loadSequence(seq.id)
        })

        this.libList.appendChild(card)
      })
    }

    getFactorySequences() {
      const makeLayer = (id, badge, name, category, soundFamily, intensity, activeSteps, repeatConfig = {}) => {
        const steps = []
        for (let s = 0; s < 8; s++) {
          const isActive = activeSteps.includes(s)
          steps.push([{
            id: `pad-${id}-${s}`,
            category,
            soundFamily,
            intensity: isActive ? intensity : 'med',
            volume: 1.0,
            repeat: repeatConfig[s] || 1,
            active: isActive
          }])
        }
        return {
          id,
          badge,
          name,
          category,
          soundFamily,
          intensity,
          volume: 1.0,
          muted: false,
          solo: false,
          isPrimary: true,
          parentTrack: category,
          steps
        }
      }

      return [
        {
          id: 'seq-factory-trap',
          name: 'Midnight Trap 808',
          createdAt: 'Studio Factory Preset',
          bpm: 140,
          numBeats: 2,
          totalSteps: 8,
          layers: [
            makeLayer('kick-primary', '01', 'Kick', 'kick', 'kick-808', 'high', [0, 4, 6]),
            makeLayer('snare-primary', '02', 'Snare', 'snare', 'snare-808', 'med-high', [2, 6]),
            makeLayer('hihat-primary', '03', 'Hi-Hat', 'hihat', 'hihat-808', 'med', [0, 1, 2, 3, 4, 5, 6, 7], { 3: 2, 7: 4 })
          ]
        },
        {
          id: 'seq-factory-boombap',
          name: 'Brooklyn Boom Bap',
          createdAt: 'Studio Factory Preset',
          bpm: 92,
          numBeats: 2,
          totalSteps: 8,
          layers: [
            makeLayer('kick-primary', '01', 'Kick', 'kick', 'kick-classic', 'med-high', [0, 3, 5]),
            makeLayer('snare-primary', '02', 'Snare', 'snare', 'snare-vinyl', 'high', [2, 6]),
            makeLayer('hihat-primary', '03', 'Hi-Hat', 'hihat', 'hihat-808', 'med-low', [0, 2, 4, 6])
          ]
        },
        {
          id: 'seq-factory-techno',
          name: 'Berlin Warehouse Techno',
          createdAt: 'Studio Factory Preset',
          bpm: 132,
          numBeats: 2,
          totalSteps: 8,
          layers: [
            makeLayer('kick-primary', '01', 'Kick', 'kick', 'kick-heavy', 'high', [0, 2, 4, 6]),
            makeLayer('snare-primary', '02', 'Snare', 'snare', 'snare-808', 'high', [4, 7]),
            makeLayer('hihat-primary', '03', 'Hi-Hat', 'hihat', 'hihat-808', 'high', [0, 1, 2, 3, 4, 5, 6, 7])
          ]
        }
      ]
    }

    // ------------------------------------------------------------------------
    // 17. Studio Feedback Toast System
    // ------------------------------------------------------------------------
    showToast(message, type = 'success', duration = 3000) {
      const toast = document.getElementById('studio-toast')
      const msgEl = document.getElementById('toast-message')
      const iconWrap = document.getElementById('toast-icon-wrap')
      if (!toast || !msgEl) return

      msgEl.textContent = message

      if (iconWrap) {
        let iconHtml = '<i class="fa-solid fa-check"></i>'
        if (type === 'warning') iconHtml = '<i class="fa-solid fa-triangle-exclamation"></i>'
        if (type === 'info') iconHtml = '<i class="fa-solid fa-info"></i>'
        iconWrap.innerHTML = iconHtml
      }

      toast.className = `studio-toast active toast-${type}`

      if (this.toastTimeout) clearTimeout(this.toastTimeout)
      this.toastTimeout = setTimeout(() => {
        toast.classList.remove('active')
      }, duration)
    }
  }

  // Initialize Studio Kit
  const kit = new DrumKit()

  // Load a default energetic Trap 808 preset pattern on launch
  kit.loadPreset('trap')

  // Expose kit on window for programmatic testing & inspection
  window.__drumKit = kit
})
