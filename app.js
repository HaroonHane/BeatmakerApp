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
      this.bindPadPopoverEvents()
      this.bindPresetEvents()
      this.bindModalEvents()
      this.bindKeyboardShortcuts()
      this.renderSoundAssetsModal()
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
    // 3. Multi-Layer Creation & Management
    // ------------------------------------------------------------------------
    bindLayerCreationButtons() {
      // 1. "Add Layer to [Track]" beneath each track group
      document.querySelectorAll('.add-layer-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const track = btn.dataset.track || 'kick'
          this.addLayer(track)
        })
      })

      // 2. "Add Layer" under each 4-pad beat chunk
      document.querySelectorAll('.chunk-add-layer-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const track = btn.dataset.track || 'kick'
          const beatChunk = btn.dataset.beat || '1'
          this.addLayer(track, { focusedBeat: parseInt(beatChunk, 10) })
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

      // Initialize 8 steps (Beat 1: steps 0-3, Beat 2: steps 4-7)
      for (let s = 0; s < 8; s++) {
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

        <!-- 8-Step Sequencer Pad Grid Chunked in 4+4 -->
        <div class="pads-grid">
          <div class="beat-chunk beat-chunk-1">
            ${[0, 1, 2, 3].map(s => this.renderStepCellHTML(layer, s)).join('')}
          </div>
          <div class="beat-chunk beat-chunk-2">
            ${[4, 5, 6, 7].map(s => this.renderStepCellHTML(layer, s)).join('')}
          </div>
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

      // 8. Bind all 8 step cells using the unified bindStepCellEvents method
      for (let s = 0; s < 8; s++) {
        const cellEl = layerEl.querySelector(`.beat-step-cell[data-step="${s}"]`)
        if (cellEl) {
          this.bindStepCellEvents(cellEl, layer, s)
        }
      }
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
    // 4. Multiple Pads at the Same Beat Position (Pad Stacking & Removal)
    // ------------------------------------------------------------------------
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
      const currentStep = this.index % 8
      this.index++

      // 1. Update Playhead Rulers and Step Dots
      document.querySelectorAll('.step-dot').forEach(dot => {
        dot.classList.remove('active')
      })
      const activeStepDots = document.querySelectorAll(`.step-dot[data-step="${currentStep}"]`)
      activeStepDots.forEach(dot => dot.classList.add('active'))

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
        for (let s = 0; s < 8; s++) {
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
          return
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
            break
        }
      })
    }
  }

  // Initialize Studio Kit
  const kit = new DrumKit()

  // Load a default energetic Trap 808 preset pattern on launch
  kit.loadPreset('trap')

  // Expose kit on window for programmatic testing & inspection
  window.__drumKit = kit
})
