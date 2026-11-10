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
      this.activeTrackPreviews = new Map() // layerId -> { token, btn, handle }
      this.activeAssetPreviewHandles = new Set() // { handle } from Sound Assets drawer previews
      this.activeAssetImportPreviewLayerIds = new Set() // layerIds previewed via import inside Sound Assets drawer
      this.previewTokenCounter = 0

      // Dynamic Multi-Layer Data Architecture
      // Each layer contains its own identity, channel settings, and 8-step pads array
      // Each step in a layer is an array of pad instances (supporting multiple pads at the same beat position)
      this.layers = []
      this.sublayerCounters = { kick: 1, snare: 1, hihat: 1, custom: 0 }
      this.customTrackColorCache = {}
      this.trackPreviewPrefs = this.loadTrackPreviewPrefs()
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

      // Pad Popover Config Drawer Elements
      this.padPopover = document.getElementById('pad-popover')
      this.popoverSubtitle = document.getElementById('popover-subtitle')
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

      // Dynamic Unlimited Beat Expansion & Per-Track Independent Scrolling
      this.numBeats = 2
      this.totalSteps = 8
      this.sequencerViewport = document.getElementById('sequencer-viewport')
      this.stepRulerViewport = document.getElementById('step-ruler-viewport')
      this.stepRuler = document.getElementById('step-ruler')
      this.activeTrackViewport = null
      this.scrollSyncRafId = null
      this.pendingRulerLeft = null
      this.lastProgrammaticRulerLeft = null
      this.suppressRulerScrollUntil = 0
      this.suppressTrackScrollUntil = 0
      this.userScrollOrigin = null
      this.rulerScrollOriginTimer = null
      this.addBeatBtn = document.getElementById('add-beat-btn')
      this.addBeatBottomBtn = document.getElementById('add-beat-bottom-btn')
      this.beatCountVal = document.getElementById('beat-count-val')
      this.stepCountVal = document.getElementById('step-count-val')

      // Audio Library & Custom Track Elements
      this.pendingImport = null
      this.confirmActionCallback = null
      this.activeRenameTrackId = null

      this.audioFileImporter = document.getElementById('audio-file-importer')
      this.addTrackModal = document.getElementById('add-track-modal')
      this.openAddTrackBtn = document.getElementById('open-add-track-modal-btn')
      this.closeAddTrackBtn = document.getElementById('close-add-track-modal')
      this.cancelAddTrackBtn = document.getElementById('cancel-add-track-modal')
      this.confirmAddTrackBtn = document.getElementById('confirm-add-track-modal')
      this.customTrackNameInput = document.getElementById('custom-track-name-input')
      this.newTrackPreviewCheckbox = document.getElementById('new-track-preview-checkbox')
      this.trackNameSuggestions = document.getElementById('track-name-suggestions')

      this.importProgressModal = document.getElementById('import-progress-modal')
      this.importFilenameText = document.getElementById('import-filename-text')
      this.importTargetTag = document.getElementById('import-target-tag')
      this.importProgressBarFill = document.getElementById('import-progress-bar-fill')
      this.importProgressPct = document.getElementById('import-progress-pct')
      this.importStatusText = document.getElementById('import-status-text')

      this.confirmActionModal = document.getElementById('confirm-action-modal')
      this.confirmActionTitle = document.getElementById('confirm-action-title')
      this.confirmActionSubtitle = document.getElementById('confirm-action-subtitle')
      this.confirmActionMsg = document.getElementById('confirm-action-msg')
      this.confirmActionBtn = document.getElementById('execute-confirm-action-btn')
      this.cancelConfirmActionBtn = document.getElementById('cancel-confirm-action-btn')
      this.closeConfirmActionBtn = document.getElementById('close-confirm-action-modal')

      this.renameTrackModal = document.getElementById('rename-track-modal')
      this.renameTrackInput = document.getElementById('rename-track-input')
      this.confirmRenameBtn = document.getElementById('confirm-rename-track-modal')
      this.cancelRenameBtn = document.getElementById('cancel-rename-track-modal')
      this.closeRenameBtn = document.getElementById('close-rename-track-modal')

      this.init()
    }

    async init() {
      this.initAudioContext()
      this.initPrimaryLayers()
      this.bindTransportEvents()
      this.bindTempoEvents()
      this.bindPrimaryTrackControls()
      this.bindPrimaryIntensityEvents()
      this.bindLayerCreationButtons()
      this.bindBeatExpansionEvents()
      this.initTrackScrollSync()
      this.bindPadPopoverEvents()
      this.bindPresetEvents()
      this.bindModalEvents()
      this.bindAudioLibraryEvents()
      this.bindKeyboardShortcuts()
      this.renderSoundAssetsModal()
      this.populatePopoverCategories()
      this.initTimeline()
      this.initExportEngine()
      this.initSequenceLibrary()
      this.initSideDrawerManager()

      // Hydrate local IndexedDB audio library & custom tracks
      await this.initAudioLibrary()

      // Restore session or load default preset
      const sessionRestored = this.restoreActiveSession()
      if (!sessionRestored) {
        await this.renderStoredCustomTracks()
        this.loadPreset('trap')
      } else {
        await this.renderStoredCustomTracks()
      }

      this.refreshTrackSoundSelectors('kick')
      this.refreshTrackSoundSelectors('snare')
      this.refreshTrackSoundSelectors('hihat')
      this.renderSoundAssetsModal()
      this.syncAllTrackPreviewCheckboxes()
      this.populatePopoverCategories()

      // Safety net: persist active session on window beforeunload
      window.addEventListener('beforeunload', () => {
        this.saveActiveSession()
      })
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
    // Custom Track Color Resolution Helpers
    // ------------------------------------------------------------------------
    isBuiltinTrack(category) {
      return ['kick', 'snare', 'hihat'].includes(category)
    }

    getTrackColor(category, fallbackColor = null) {
      if (this.isBuiltinTrack(category)) return null
      if (fallbackColor && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(fallbackColor)) {
        return fallbackColor
      }

      const manifestColor = this.manifest?.categories?.[category]?.color
      if (manifestColor) return manifestColor

      const existingLayer = this.layers.find(l => (l.category === category || l.parentTrack === category) && l.color)
      if (existingLayer) return existingLayer.color

      if (this.customTrackColorCache[category]) return this.customTrackColorCache[category]

      const usedColors = [
        ...Object.values(this.manifest?.categories || {}).map(c => c.color),
        ...this.layers.map(l => l.color),
        ...Object.values(this.customTrackColorCache)
      ].filter(Boolean)

      const picked = window.AudioLibrary?.pickRandomTrackColor
        ? window.AudioLibrary.pickRandomTrackColor(usedColors)
        : '#8b5cf6'

      this.customTrackColorCache[category] = picked
      if (this.manifest?.categories?.[category]) {
        this.manifest.categories[category].color = picked
      }
      return picked
    }

    getTrackColorTheme(category, fallbackColor = null) {
      const hex = this.getTrackColor(category, fallbackColor) || '#8b5cf6'
      if (window.AudioLibrary?.buildTrackColorTheme) {
        return window.AudioLibrary.buildTrackColorTheme(hex)
      }
      return {
        color: hex,
        light: hex,
        dark: hex,
        gradient: `linear-gradient(135deg, ${hex} 0%, ${hex} 100%)`,
        borderStrong: hex,
        text: hex,
        soft: 'rgba(139, 92, 246, 0.1)',
        border: 'rgba(139, 92, 246, 0.35)',
        glow: 'rgba(139, 92, 246, 0.45)',
        glowSoft: 'rgba(139, 92, 246, 0.28)',
        timelineText: hex
      }
    }

    getTrackColorCssVars(category, fallbackColor = null) {
      const t = this.getTrackColorTheme(category, fallbackColor)
      return [
        `--track-color:${t.color}`,
        `--track-color-light:${t.light}`,
        `--track-color-dark:${t.dark}`,
        `--track-color-gradient:${t.gradient}`,
        `--track-color-border-strong:${t.borderStrong}`,
        `--track-color-text:${t.text}`,
        `--track-color-soft:${t.soft}`,
        `--track-color-border:${t.border}`,
        `--track-color-glow:${t.glow}`,
        `--track-color-glow-soft:${t.glowSoft}`
      ].join(';')
    }

    applyTrackColorVars(el, category, fallbackColor = null) {
      if (!el || this.isBuiltinTrack(category)) return
      const t = this.getTrackColorTheme(category, fallbackColor)
      el.style.setProperty('--track-color', t.color)
      el.style.setProperty('--track-color-light', t.light)
      el.style.setProperty('--track-color-dark', t.dark)
      el.style.setProperty('--track-color-gradient', t.gradient)
      el.style.setProperty('--track-color-border-strong', t.borderStrong)
      el.style.setProperty('--track-color-text', t.text)
      el.style.setProperty('--track-color-soft', t.soft)
      el.style.setProperty('--track-color-border', t.border)
      el.style.setProperty('--track-color-glow', t.glow)
      el.style.setProperty('--track-color-glow-soft', t.glowSoft)
    }

    // ------------------------------------------------------------------------
    // Per-Track Preview-on-Import Checkmark Preferences
    // ------------------------------------------------------------------------
    loadTrackPreviewPrefs() {
      try {
        const raw = localStorage.getItem('beatmaker_track_preview_prefs')
        if (raw) {
          const parsed = JSON.parse(raw)
          if (parsed && typeof parsed === 'object') return parsed
        }
      } catch (e) {}
      return {}
    }

    saveTrackPreviewPrefs() {
      try {
        localStorage.setItem('beatmaker_track_preview_prefs', JSON.stringify(this.trackPreviewPrefs || {}))
      } catch (e) {}
    }

    isTrackPreviewEnabled(trackId) {
      if (this.trackPreviewPrefs && this.trackPreviewPrefs[trackId] !== undefined) {
        return !!this.trackPreviewPrefs[trackId]
      }
      const manifestCat = this.manifest?.categories?.[trackId]
      if (manifestCat && manifestCat.previewOnImport !== undefined) {
        return !!manifestCat.previewOnImport
      }
      return true
    }

    setTrackPreviewOnImport(trackId, enabled) {
      if (!trackId) return
      const flag = !!enabled
      if (!this.trackPreviewPrefs) this.trackPreviewPrefs = {}
      this.trackPreviewPrefs[trackId] = flag
      this.saveTrackPreviewPrefs()

      if (this.manifest?.categories?.[trackId]) {
        this.manifest.categories[trackId].previewOnImport = flag
      }
      if (window.AudioLibrary?.setTrackPreviewOnImport) {
        window.AudioLibrary.setTrackPreviewOnImport(trackId, flag).catch(() => {})
      }

      document.querySelectorAll(`.track-preview-checkbox[data-track="${trackId}"]`).forEach(cb => {
        cb.checked = flag
      })
    }

    renderTrackPreviewToggleHTML(trackId, trackName, labelText = 'Preview on Add') {
      const checkedAttr = this.isTrackPreviewEnabled(trackId) ? 'checked' : ''
      return `
        <label class="track-preview-toggle" data-track="${trackId}" title="Play sound automatically when a new base sound is added to ${trackName}">
          <input type="checkbox" class="track-preview-checkbox" data-track="${trackId}" ${checkedAttr} />
          <span class="preview-check-box"><i class="fa-solid fa-check"></i></span>
          <span class="preview-check-label">${labelText}</span>
        </label>
      `
    }

    syncAllTrackPreviewCheckboxes() {
      document.querySelectorAll('.track-preview-checkbox').forEach(cb => {
        const trackId = cb.dataset.track
        if (trackId) {
          cb.checked = this.isTrackPreviewEnabled(trackId)
        }
      })
    }

    // ------------------------------------------------------------------------
    // Session Persistence Engine (Local Storage + IndexedDB Sync)
    // ------------------------------------------------------------------------
    saveActiveSession() {
      if (this.isRestoringSession) return
      try {
        const sessionData = {
          version: 1,
          bpm: this.bpm,
          numBeats: this.numBeats,
          totalSteps: this.totalSteps,
          sublayerCounters: this.sublayerCounters || { kick: 1, snare: 1, hihat: 1, custom: 0 },
          layers: this.layers.map(layer => ({
            id: layer.id,
            badge: layer.badge,
            name: layer.name,
            category: layer.category,
            color: layer.color || this.getTrackColor(layer.category) || null,
            soundFamily: layer.soundFamily || '',
            intensity: layer.intensity || 'med',
            volume: layer.volume !== undefined ? layer.volume : 1.0,
            muted: !!layer.muted,
            solo: !!layer.solo,
            isPrimary: !!layer.isPrimary,
            parentTrack: layer.parentTrack || layer.category,
            steps: (layer.steps || []).map(stepPads => (stepPads || []).map(pad => ({
              id: pad.id,
              category: pad.category,
              soundFamily: pad.soundFamily || '',
              intensity: pad.intensity || 'med',
              volume: pad.volume !== undefined ? pad.volume : 1.0,
              repeat: pad.repeat || 1,
              active: !!pad.active
            })))
          }))
        }
        localStorage.setItem('beatmaker_active_session', JSON.stringify(sessionData))
      } catch (err) {
        console.warn('Could not save active session:', err)
      }
      if (this.syncOpenDrawerState) {
        this.syncOpenDrawerState()
      }
    }

    restoreActiveSession() {
      this.isRestoringSession = true
      try {
        const raw = localStorage.getItem('beatmaker_active_session')
        if (!raw) return false

        const session = JSON.parse(raw)
        if (!session || !Array.isArray(session.layers) || session.layers.length === 0) {
          return false
        }

        // 1. Restore Tempo
        if (session.bpm) {
          this.setTempo(session.bpm)
        }

        // 2. Synchronize Beats count
        const targetBeats = session.numBeats || 2
        while (this.numBeats < targetBeats) {
          this.addBeat(false)
        }
        while (this.numBeats > targetBeats) {
          this.removeBeat(this.numBeats)
        }

        // 3. Clear existing dynamic sublayers in DOM
        const sublayerContainers = ['kick-sublayers', 'snare-sublayers', 'hihat-sublayers', 'custom-layers-container']
        sublayerContainers.forEach(id => {
          const el = document.getElementById(id)
          if (el) el.innerHTML = ''
        })

        // 4. Restore sublayer counters
        if (session.sublayerCounters) {
          this.sublayerCounters = { ...session.sublayerCounters }
        }

        // 5. Separate primary layers and sublayers
        const primaryLayersData = session.layers.filter(l => l.isPrimary)
        const subLayersData = session.layers.filter(l => !l.isPrimary)

        // Reset this.layers
        this.layers = []

        // 6. Restore primary layers (Kick, Snare, Hi-Hat + Custom tracks)
        primaryLayersData.forEach(lData => {
          const layerColor = this.isBuiltinTrack(lData.category)
            ? null
            : (this.manifest?.categories?.[lData.category]?.color || this.getTrackColor(lData.category, lData.color))

          const restoredLayer = {
            id: lData.id,
            badge: lData.badge,
            name: lData.name,
            category: lData.category,
            color: layerColor,
            soundFamily: lData.soundFamily || '',
            intensity: lData.intensity || 'med',
            volume: lData.volume !== undefined ? lData.volume : 1.0,
            muted: !!lData.muted,
            solo: !!lData.solo,
            isPrimary: true,
            parentTrack: lData.parentTrack || lData.category,
            steps: (lData.steps || []).map(stepPads => (stepPads || []).map(p => ({
              id: p.id,
              category: p.category,
              soundFamily: p.soundFamily || '',
              intensity: p.intensity || 'med',
              volume: p.volume !== undefined ? p.volume : 1.0,
              repeat: p.repeat || 1,
              active: !!p.active
            })))
          }

          // Pad missing steps if needed
          while (restoredLayer.steps.length < this.totalSteps) {
            const s = restoredLayer.steps.length
            restoredLayer.steps.push([{
              id: `pad-${restoredLayer.id}-${s}`,
              category: restoredLayer.category,
              soundFamily: restoredLayer.soundFamily || '',
              intensity: restoredLayer.intensity,
              volume: 1.0,
              repeat: 1,
              active: false
            }])
          }

          this.layers.push(restoredLayer)

          const isBuiltIn = this.isBuiltinTrack(restoredLayer.category)
          if (isBuiltIn) {
            // Re-render DOM cells
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
          } else {
            // Custom primary track -> render its full track channel group DOM
            const trackObj = {
              id: restoredLayer.category,
              name: restoredLayer.name,
              trackNumber: parseInt(restoredLayer.badge, 10) || 4,
              color: restoredLayer.color,
              baseTrackSound: restoredLayer.soundFamily,
              type: 'custom'
            }
            this.createCustomTrackDOM(trackObj)
          }
        })

        // 7. Restore sublayers (both under built-ins and custom tracks)
        subLayersData.forEach(lData => {
          const subColor = this.isBuiltinTrack(lData.category)
            ? null
            : (this.manifest?.categories?.[lData.category]?.color || this.getTrackColor(lData.category, lData.color))

          const restoredSub = {
            id: lData.id,
            badge: lData.badge,
            name: lData.name,
            category: lData.category,
            color: subColor,
            soundFamily: lData.soundFamily || '',
            intensity: lData.intensity || 'med',
            volume: lData.volume !== undefined ? lData.volume : 1.0,
            muted: !!lData.muted,
            solo: !!lData.solo,
            isPrimary: false,
            parentTrack: lData.parentTrack || lData.category,
            steps: (lData.steps || []).map(stepPads => (stepPads || []).map(p => ({
              id: p.id,
              category: p.category,
              soundFamily: p.soundFamily || '',
              intensity: p.intensity || 'med',
              volume: p.volume !== undefined ? p.volume : 1.0,
              repeat: p.repeat || 1,
              active: !!p.active
            })))
          }

          while (restoredSub.steps.length < this.totalSteps) {
            const s = restoredSub.steps.length
            restoredSub.steps.push([{
              id: `pad-${restoredSub.id}-${s}`,
              category: restoredSub.category,
              soundFamily: restoredSub.soundFamily || '',
              intensity: restoredSub.intensity,
              volume: 1.0,
              repeat: 1,
              active: false
            }])
          }

          this.layers.push(restoredSub)
          this.renderLayerDOM(restoredSub)
        })

        // 8. Synchronize timeline & UI states
        if (this.renderTrackpadRuler) this.renderTrackpadRuler()
        if (this.renderTrackpadLanes) this.renderTrackpadLanes()
        if (this.updateTimelineMetrics) this.updateTimelineMetrics()
        this.updateAllSoloStates()
        this.populatePopoverCategories()

        this.isRestoringSession = false
        this.saveActiveSession()
        return true
      } catch (err) {
        console.warn('Could not restore active session:', err)
        return false
      } finally {
        this.isRestoringSession = false
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
      const soundLabel = pad.soundFamily || 'No Sound'
      const isBuiltin = this.isBuiltinTrack(pad.category)
      const customPadClass = isBuiltin ? '' : 'custom-pad'
      const padFallbackColor = pad.category === layer.category ? layer.color : null
      const customStyleAttr = isBuiltin ? '' : `style="${this.getTrackColorCssVars(pad.category, padFallbackColor)}"`

      return `
        <div class="pad-wrapper" data-pad-id="${pad.id}" data-layer-id="${layer.id}" data-step="${step}">
          <button class="pad ${pad.category}-pad ${customPadClass} b${step} ${activeClass} ${intensityClass}"
            ${customStyleAttr}
            data-pad-id="${pad.id}"
            data-layer-id="${layer.id}"
            data-step="${step}"
            title="${layer.name} Step ${step + 1} (${soundLabel} - ${pad.intensity}) - Click to toggle"
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
              if (!padObj.soundFamily) {
                this.showToast(`Please import a base sound for "${layer.name}" first`, 'info')
                this.triggerBaseSoundImport(layer.category, layer.id)
              } else {
                const fileSrc = this.resolveSoundFile(padObj.category, padObj.soundFamily, padObj.intensity)
                if (fileSrc) {
                  this.playPadSound(fileSrc, padObj.volume * layer.volume)
                  this.pulseMeter(layer.category)
                }
              }
            }
            if (this.renderTrackpadLanes) {
              this.renderTrackpadLanes()
            }
            this.saveActiveSession()
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
      if (!soundFamily) return null

      if (this.manifest && this.manifest.categories && this.manifest.categories[category]) {
        const cat = this.manifest.categories[category]
        if (!cat.sounds || Object.keys(cat.sounds).length === 0) {
          return null
        }
        const soundData = cat.sounds[soundFamily]
        if (soundData) {
          if (soundData.variations && soundData.variations[intensity]) {
            return soundData.variations[intensity].file
          }
          if (soundData.baseFile) {
            return soundData.baseFile
          }
        }
        return null
      }

      // Safe static fallbacks for built-in tracks only
      if (category === 'kick') return './sounds/kick/base/kick-classic.wav'
      if (category === 'snare') return './sounds/snare/base/snare-acoustic01.wav'
      if (category === 'hihat') return './sounds/hihat/base/hihat-808.wav'
      return null
    }

    playPadSound(fileSrc, volume = 1.0, options = {}) {
      if (!fileSrc) return null
      this.ensureAudioContextRunning()

      const safeVol = Math.max(0, Math.min(1, volume))
      const onEnded = typeof options.onEnded === 'function' ? options.onEnded : null

      // Web Audio API Polyphony with Audio Buffer caching
      if (this.audioCtx) {
        if (this.audioBuffers.has(fileSrc)) {
          const buffer = this.audioBuffers.get(fileSrc)
          return this.triggerBufferSource(buffer, safeVol, onEnded)
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
        let stopped = false
        const cleanup = () => {
          audio.onended = null
          audio.onerror = null
        }
        if (onEnded) {
          audio.onended = () => {
            cleanup()
            if (!stopped) onEnded()
          }
          audio.onerror = () => {
            cleanup()
            if (!stopped) onEnded()
          }
        }
        const playPromise = audio.play()
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            cleanup()
            if (!stopped && onEnded) onEnded()
          })
        }
        return {
          stop: () => {
            stopped = true
            cleanup()
            try {
              audio.pause()
              audio.currentTime = 0
            } catch (e) {}
          },
          setVolume: (newVol) => {
            try {
              audio.volume = Math.max(0, Math.min(1, newVol))
            } catch (e) {}
          }
        }
      } catch (e) {
        if (onEnded) onEnded()
        return null
      }
    }

    triggerBufferSource(buffer, volume, onEnded = null) {
      try {
        const source = this.audioCtx.createBufferSource()
        const gainNode = this.audioCtx.createGain()
        source.buffer = buffer
        gainNode.gain.setValueAtTime(volume, this.audioCtx.currentTime)
        source.connect(gainNode)
        gainNode.connect(this.audioCtx.destination)

        let stopped = false
        source.onended = () => {
          source.onended = null
          try { gainNode.disconnect() } catch (e) {}
          if (!stopped && onEnded) onEnded()
        }
        source.start(0)

        return {
          stop: () => {
            stopped = true
            source.onended = null
            try { source.stop(0) } catch (e) {}
            try { source.disconnect() } catch (e) {}
            try { gainNode.disconnect() } catch (e) {}
          },
          setVolume: (newVol) => {
            try {
              const clamped = Math.max(0, Math.min(1, newVol))
              gainNode.gain.setValueAtTime(clamped, this.audioCtx.currentTime)
            } catch (e) {}
          }
        }
      } catch (e) {
        if (onEnded) onEnded()
        return null
      }
    }

    playDirectSound(fileSrc, volume = 0.95) {
      if (!fileSrc) return null
      if (!this.activeAssetPreviewHandles) {
        this.activeAssetPreviewHandles = new Set()
      }

      const entry = { handle: null }
      let finished = false
      this.activeAssetPreviewHandles.add(entry)

      const handle = this.playPadSound(fileSrc, volume, {
        onEnded: () => {
          finished = true
          this.activeAssetPreviewHandles.delete(entry)
        }
      })

      if (!handle || finished) {
        this.activeAssetPreviewHandles.delete(entry)
        return handle
      }

      entry.handle = handle
      return handle
    }

    stopSoundAssetsPreviews() {
      if (this.activeAssetPreviewHandles && this.activeAssetPreviewHandles.size > 0) {
        const entries = Array.from(this.activeAssetPreviewHandles)
        this.activeAssetPreviewHandles.clear()
        entries.forEach(entry => {
          if (entry && entry.handle && typeof entry.handle.stop === 'function') {
            entry.handle.stop()
          }
        })
      }

      if (this.activeAssetImportPreviewLayerIds && this.activeAssetImportPreviewLayerIds.size > 0) {
        const layerIds = Array.from(this.activeAssetImportPreviewLayerIds)
        this.activeAssetImportPreviewLayerIds.clear()
        layerIds.forEach(layerId => this.stopTrackPreview(layerId))
      }
    }

    getLayerAuditionButton(layer) {
      if (!layer) return null
      return document.querySelector(`.audition-btn[data-layer-id="${layer.id}"]`) ||
        (layer.isPrimary ? document.querySelector(`.audition-btn[data-audition="${layer.category}"]`) : null)
    }

    setAuditionButtonState(btn, isPlaying) {
      if (!btn) return
      btn.classList.toggle('is-previewing', !!isPlaying)
      btn.setAttribute('aria-pressed', isPlaying ? 'true' : 'false')
      const baseTitle = btn.dataset.baseTitle || btn.getAttribute('title') || 'Preview Sound'
      if (!btn.dataset.baseTitle) btn.dataset.baseTitle = baseTitle
      btn.setAttribute('title', isPlaying ? 'Stop Preview' : baseTitle)
      const icon = btn.querySelector('i')
      if (icon) {
        icon.className = isPlaying ? 'fa-solid fa-stop' : 'fa-solid fa-play'
      }
    }

    stopTrackPreview(layerId) {
      if (this.activeAssetImportPreviewLayerIds) {
        this.activeAssetImportPreviewLayerIds.delete(layerId)
      }
      if (!layerId || !this.activeTrackPreviews) return false
      const entry = this.activeTrackPreviews.get(layerId)
      if (!entry) return false

      this.activeTrackPreviews.delete(layerId)
      if (entry.handle && typeof entry.handle.stop === 'function') {
        entry.handle.stop()
      }
      const btn = entry.btn || this.getLayerAuditionButton(this.getLayer(layerId))
      this.setAuditionButtonState(btn, false)
      return true
    }

    startTrackPreview(layer, btn, fileSrc, volume = 1.0) {
      if (!layer || !fileSrc) return null
      this.stopTrackPreview(layer.id)

      const targetBtn = btn || this.getLayerAuditionButton(layer)
      const token = ++this.previewTokenCounter
      const entry = { token, btn: targetBtn, handle: null }
      this.activeTrackPreviews.set(layer.id, entry)
      this.setAuditionButtonState(targetBtn, true)

      const handle = this.playPadSound(fileSrc, volume, {
        onEnded: () => {
          const current = this.activeTrackPreviews.get(layer.id)
          if (current && current.token === token) {
            this.activeTrackPreviews.delete(layer.id)
            if (this.activeAssetImportPreviewLayerIds) {
              this.activeAssetImportPreviewLayerIds.delete(layer.id)
            }
            this.setAuditionButtonState(current.btn || this.getLayerAuditionButton(layer), false)
          }
        }
      })

      if (!handle) {
        const current = this.activeTrackPreviews.get(layer.id)
        if (current && current.token === token) {
          this.activeTrackPreviews.delete(layer.id)
          if (this.activeAssetImportPreviewLayerIds) {
            this.activeAssetImportPreviewLayerIds.delete(layer.id)
          }
          this.setAuditionButtonState(targetBtn, false)
        }
        return null
      }

      // Guard against synchronous onEnded having already cleared this entry
      if (this.activeTrackPreviews.get(layer.id) === entry) {
        entry.handle = handle
      }
      return handle
    }

    toggleTrackAudition(layer, btn) {
      if (!layer) return
      if (this.activeTrackPreviews.has(layer.id)) {
        this.stopTrackPreview(layer.id)
        return
      }
      if (!layer.soundFamily) {
        this.showToast(`Please import a base sound for "${layer.name}" first`, 'info')
        this.triggerBaseSoundImport(layer.category, layer.id)
        return
      }
      const fileSrc = this.resolveSoundFile(layer.category, layer.soundFamily, layer.intensity)
      if (fileSrc) {
        this.startTrackPreview(layer, btn, fileSrc, layer.volume)
      }
    }

    getLayerSampleSelect(layer) {
      if (!layer) return null
      if (layer.isPrimary) {
        return document.getElementById(`${layer.category}-beat-audio`) ||
          document.querySelector(`.custom-track-sample-select[data-layer-id="${layer.id}"]`)
      }
      return document.querySelector(`.layer-family-select[data-layer-id="${layer.id}"]`)
    }

    syncLayerSoundRemoveButton(layer) {
      const selectEl = this.getLayerSampleSelect(layer)
      const wrap = selectEl ? selectEl.closest('.sample-picker-wrap') : null
      if (!wrap) return

      const soundData = layer.soundFamily
        ? this.manifest?.categories?.[layer.category]?.sounds?.[layer.soundFamily]
        : null
      const isUserSound = !!(soundData && soundData.isCustom)

      let removeBtn = wrap.querySelector('.remove-user-sound-btn')
      if (!isUserSound) {
        if (removeBtn) removeBtn.style.display = 'none'
        return
      }

      if (!removeBtn) {
        removeBtn = document.createElement('button')
        removeBtn.type = 'button'
        removeBtn.className = 'remove-user-sound-btn'
        removeBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i>'
        wrap.appendChild(removeBtn)
      }

      removeBtn.style.display = 'inline-flex'
      removeBtn.title = `Remove "${soundData.name}" from ${layer.name}`
      removeBtn.setAttribute('aria-label', `Remove ${soundData.name}`)
      removeBtn.onclick = (e) => {
        e.preventDefault()
        e.stopPropagation()
        this.confirmDeleteSound(layer.category, layer.soundFamily, soundData.name)
      }
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

      // 1b. "Preview on Add" checkmark toggle on built-in tracks
      document.querySelectorAll('.track-preview-checkbox').forEach(cb => {
        const track = cb.dataset.track
        if (track) {
          cb.checked = this.isTrackPreviewEnabled(track)
          cb.addEventListener('change', (e) => {
            this.setTrackPreviewOnImport(track, e.target.checked)
          })
        }
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
          this.openAddTrackModal()
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

    initTrackScrollSync() {
      this.bindStepRulerScrollSync()
      this.getTrackScrollViewports().forEach(vp => {
        this.bindTrackScrollViewport(vp)
      })
    }

    getTrackScrollViewports() {
      return Array.from(document.querySelectorAll('.track-pads-viewport'))
    }

    bindStepRulerScrollSync() {
      const rulerVp = this.stepRulerViewport
      if (!rulerVp || rulerVp.dataset.scrollBound === '1') return
      rulerVp.dataset.scrollBound = '1'

      const markRulerOrigin = () => {
        this.userScrollOrigin = 'ruler'
        if (this.rulerScrollOriginTimer) clearTimeout(this.rulerScrollOriginTimer)
        this.rulerScrollOriginTimer = setTimeout(() => {
          if (this.userScrollOrigin === 'ruler') this.userScrollOrigin = null
        }, 180)
      }

      rulerVp.addEventListener('pointerdown', markRulerOrigin, { passive: true })
      rulerVp.addEventListener('touchstart', markRulerOrigin, { passive: true })
      rulerVp.addEventListener('wheel', markRulerOrigin, { passive: true })

      let rulerRafId = null
      rulerVp.addEventListener('scroll', () => {
        const now = performance.now()
        if (now < this.suppressRulerScrollUntil) return
        if (this.lastProgrammaticRulerLeft !== null && Math.abs(rulerVp.scrollLeft - this.lastProgrammaticRulerLeft) <= 1) {
          return
        }
        this.lastProgrammaticRulerLeft = null
        if (this.userScrollOrigin !== 'ruler') return
        markRulerOrigin()

        if (rulerRafId !== null) return
        rulerRafId = requestAnimationFrame(() => {
          rulerRafId = null
          const left = rulerVp.scrollLeft
          this.suppressTrackScrollUntil = performance.now() + 100
          this.getTrackScrollViewports().forEach(vp => {
            if (Math.abs(vp.scrollLeft - left) > 0.5) {
              vp.scrollLeft = left
            }
          })
        })
      }, { passive: true })
    }

    bindTrackScrollViewport(trackViewport) {
      if (!trackViewport || trackViewport.dataset.scrollBound === '1') return
      trackViewport.dataset.scrollBound = '1'

      const syncActiveToRuler = () => {
        if (performance.now() < this.suppressTrackScrollUntil) return
        this.userScrollOrigin = 'track'
        this.activeTrackViewport = trackViewport
        this.syncRulerOffsetNow(trackViewport.scrollLeft)
      }

      const trackRow = trackViewport.closest('.track-channel')
      if (trackRow) {
        trackRow.addEventListener('pointerenter', syncActiveToRuler, { passive: true })
      }
      trackViewport.addEventListener('pointerdown', syncActiveToRuler, { passive: true })
      trackViewport.addEventListener('touchstart', syncActiveToRuler, { passive: true })
      trackViewport.addEventListener('wheel', () => {
        this.userScrollOrigin = 'track'
        this.activeTrackViewport = trackViewport
      }, { passive: true })
      trackViewport.addEventListener('focusin', syncActiveToRuler, { passive: true })

      trackViewport.addEventListener('scroll', () => {
        if (performance.now() < this.suppressTrackScrollUntil || this.userScrollOrigin === 'ruler') return
        this.activeTrackViewport = trackViewport
        this.scheduleRulerSync(trackViewport.scrollLeft)
      }, { passive: true })
    }

    scheduleRulerSync(targetLeft) {
      this.pendingRulerLeft = targetLeft
      if (this.scrollSyncRafId !== null) return
      this.scrollSyncRafId = requestAnimationFrame(() => {
        this.scrollSyncRafId = null
        const nextLeft = this.pendingRulerLeft
        this.pendingRulerLeft = null
        if (nextLeft !== null) {
          this.syncRulerOffsetNow(nextLeft)
        }
      })
    }

    syncRulerOffsetNow(targetLeft) {
      const rulerVp = this.stepRulerViewport
      if (!rulerVp) return
      const maxLeft = Math.max(0, rulerVp.scrollWidth - rulerVp.clientWidth)
      const clamped = Math.max(0, Math.min(targetLeft, maxLeft))
      if (Math.abs(rulerVp.scrollLeft - clamped) <= 0.5) return
      this.lastProgrammaticRulerLeft = clamped
      this.suppressRulerScrollUntil = performance.now() + 100
      rulerVp.scrollLeft = clamped
    }

    scrollMatrixToOffset(targetLeft, smooth = false) {
      const guardMs = smooth ? 450 : 100
      const now = performance.now()
      this.suppressRulerScrollUntil = now + guardMs
      this.suppressTrackScrollUntil = now + guardMs

      const trackVps = this.getTrackScrollViewports()
      const beatMaxLeft = trackVps.length
        ? Math.max(0, trackVps[0].scrollWidth - trackVps[0].clientWidth)
        : (this.stepRulerViewport ? Math.max(0, this.stepRulerViewport.scrollWidth - this.stepRulerViewport.clientWidth) : 0)
      const sharedTarget = Math.max(0, Math.min(targetLeft, beatMaxLeft))

      const targets = []
      if (this.stepRulerViewport) targets.push(this.stepRulerViewport)
      trackVps.forEach(vp => targets.push(vp))

      targets.forEach(vp => {
        const vpMax = Math.max(0, vp.scrollWidth - vp.clientWidth)
        const clamped = Math.max(0, Math.min(sharedTarget, vpMax))
        if (vp === this.stepRulerViewport) {
          this.lastProgrammaticRulerLeft = clamped
        }
        if (Math.abs(vp.scrollLeft - clamped) <= 0.5) return
        if (smooth && typeof vp.scrollTo === 'function') {
          vp.scrollTo({ left: clamped, behavior: 'smooth' })
        } else {
          vp.scrollLeft = clamped
        }
      })
    }

    scrollMatrixToStepIfNeeded(stepIdx, center = false) {
      const trackVps = this.getTrackScrollViewports()
      const refVp = trackVps[0] || this.stepRulerViewport
      if (!refVp || refVp.scrollWidth <= refVp.clientWidth + 10) return

      if (!center && stepIdx === 0) {
        if (refVp.scrollLeft > 0) {
          this.scrollMatrixToOffset(0, true)
        }
        return
      }

      const beatIdx = Math.floor(stepIdx / 4)
      const stepInBeat = stepIdx % 4
      // Match .step-ruler left pad (12px), chunk width + gap (240px + 8px = 248px), step pitch (~56.7px)
      const stepLeft = 12 + beatIdx * 248 + 10.6 + stepInBeat * 56.7
      const stepRight = stepLeft + 49

      if (center) {
        const centered = Math.max(0, (stepLeft + 24.5) - (refVp.clientWidth / 2))
        this.scrollMatrixToOffset(centered, true)
        return
      }

      const visibleLeft = refVp.scrollLeft
      const visibleRight = visibleLeft + refVp.clientWidth
      if (stepRight > visibleRight - 25) {
        this.scrollMatrixToOffset(stepRight - refVp.clientWidth + 60, true)
      } else if (stepLeft < visibleLeft + 12) {
        this.scrollMatrixToOffset(Math.max(0, stepLeft - 20), true)
      }
    }

    addBeat(playFeedback = true) {
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
            soundFamily: layer.soundFamily || '',
            intensity: layer.intensity || 'med',
            volume: 1.0,
            repeat: 1,
            active: false
          }
          layer.steps[s] = [pad]
        }
      })

      // 2. Add Beat Header in Step Ruler
      if (this.stepRuler) {
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
        this.stepRuler.appendChild(headerEl)

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

      // 5. Tactile audio feedback & smooth auto-scroll to the new beat (only if track beats overflow)
      if (playFeedback) {
        this.playPadSound(this.resolveSoundFile('hihat', 'hihat-808', 'low'), 0.5)
        setTimeout(() => {
          const trackVps = this.getTrackScrollViewports()
          const refVp = trackVps[0] || this.stepRulerViewport
          if (refVp && refVp.scrollWidth > refVp.clientWidth + 10) {
            this.scrollMatrixToOffset(refVp.scrollWidth, true)
          }
        }, 50)
      }

      this.saveActiveSession()
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
      this.saveActiveSession()
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
      if (parentTrack === 'custom') {
        this.openAddTrackModal()
        return null
      }
      const baseCategory = parentTrack
      if (!this.sublayerCounters[parentTrack]) {
        this.sublayerCounters[parentTrack] = 0
      }
      const layerNum = ++this.sublayerCounters[parentTrack]
      const layerId = `layer-${parentTrack}-${Date.now()}-${Math.floor(Math.random() * 1000)}`

      const defaultFamilies = {
        kick: 'kick-808',
        snare: 'snare-808',
        hihat: 'hihat-acoustic'
      }

      const trackManifest = this.manifest?.categories?.[baseCategory]
      const defaultFamily = defaultFamilies[baseCategory] ||
        trackManifest?.baseTrackSound ||
        (trackManifest?.sounds && Object.keys(trackManifest.sounds).length > 0 ? Object.keys(trackManifest.sounds)[0] : '') || ''

      const trackDisplayName = trackManifest?.name || (parentTrack.charAt(0).toUpperCase() + parentTrack.slice(1))
      const layerName = `${trackDisplayName} L${layerNum}`
      const layerColor = this.isBuiltinTrack(baseCategory) ? null : this.getTrackColor(baseCategory)

      const newLayer = {
        id: layerId,
        badge: `L${layerNum}`,
        name: layerName,
        category: baseCategory,
        color: layerColor,
        soundFamily: defaultFamily,
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
          soundFamily: newLayer.soundFamily || '',
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

      // Audio feedback when adding layer (only if sound is available)
      if (newLayer.soundFamily) {
        this.playPadSound(this.resolveSoundFile(newLayer.category, newLayer.soundFamily, 'med'), 0.8)
      } else {
        this.showToast(`Added ${layerName}. Import a base sound to use it.`, 'info')
      }

      if (this.renderTrackpadLanes) this.renderTrackpadLanes()
      this.saveActiveSession()
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

      const isBuiltin = this.isBuiltinTrack(layer.category)
      const layerEl = document.createElement('div')
      layerEl.className = `track-channel sublayer ${isBuiltin ? '' : 'custom-beat '}${layer.category}-beat${layer.muted ? ' is-muted' : ''}`
      layerEl.dataset.layerId = layer.id
      layerEl.dataset.track = layer.category
      if (!isBuiltin) {
        layer.color = this.getTrackColor(layer.category, layer.color)
        this.applyTrackColorVars(layerEl, layer.category, layer.color)
      }

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
        <div class="track-pads-viewport" data-track-scroll="${layer.id}">
          <div class="pads-grid">
            ${this.renderAllBeatChunksHTML(layer)}
          </div>
        </div>
      `

      container.appendChild(layerEl)
      this.bindLayerDOMEvents(layerEl, layer)
      const vpEl = layerEl.querySelector('.track-pads-viewport')
      this.bindTrackScrollViewport(vpEl)
      if (vpEl && !layer.isPrimary && layer.parentTrack) {
        const parentVp = document.querySelector(`.primary-layer[data-track="${layer.parentTrack}"] .track-pads-viewport`)
        if (parentVp && parentVp.scrollLeft > 0) {
          vpEl.scrollLeft = parentVp.scrollLeft
        }
      }
    }

    getSoundFamilyOptionsHTML(category, selectedSoundFamily) {
      let optionsHTML = ''
      if (this.manifest && this.manifest.categories && this.manifest.categories[category]) {
        const sounds = this.manifest.categories[category].sounds || {}
        const entries = Object.entries(sounds)
        if (entries.length > 0) {
          optionsHTML = entries.map(([soundId, sound]) => `
            <option value="${soundId}" data-sound-id="${soundId}" ${soundId === selectedSoundFamily ? 'selected' : ''}>
              ${sound.name}${sound.isCustom ? ' (User)' : ''}
            </option>
          `).join('')
        } else {
          optionsHTML = `<option value="" disabled ${!selectedSoundFamily ? 'selected' : ''}>No Base Sound (Import Required)</option>`
        }
      } else if (selectedSoundFamily && selectedSoundFamily !== '__import__') {
        optionsHTML = `<option value="${selectedSoundFamily}" selected>${selectedSoundFamily}</option>`
      } else {
        optionsHTML = `<option value="" disabled selected>No Base Sound (Import Required)</option>`
      }

      optionsHTML += `
        <option value="__import__" class="import-sound-opt" data-track="${category}">
          + Import Base Sound...
        </option>
      `
      return optionsHTML
    }

    bindLayerDOMEvents(layerEl, layer) {
      // 1. Layer Name Input
      const nameInput = layerEl.querySelector('.sublayer-name-input')
      if (nameInput) {
        nameInput.addEventListener('change', (e) => {
          layer.name = e.target.value.trim() || layer.name
          this.saveActiveSession()
        })
      }

      // Audition Button
      const auditionBtn = layerEl.querySelector('.sublayer-audition-btn')
      if (auditionBtn) {
        auditionBtn.addEventListener('click', () => {
          this.toggleTrackAudition(layer, auditionBtn)
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
          this.saveActiveSession()
        })
      }

      // 3. Solo Button
      const soloBtn = layerEl.querySelector('.solo-btn')
      if (soloBtn) {
        soloBtn.addEventListener('click', () => {
          layer.solo = !layer.solo
          soloBtn.classList.toggle('active', layer.solo)
          this.updateAllSoloStates()
          this.saveActiveSession()
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
        this.syncLayerSoundRemoveButton(layer)
        familySelect.addEventListener('change', (e) => {
          const val = e.target.value
          if (val === '__import__') {
            familySelect.value = layer.soundFamily || ''
            this.triggerBaseSoundImport(layer.category, layer.id)
            return
          }
          layer.soundFamily = val
          layer.steps.forEach(stepPads => {
            stepPads.forEach(pad => { pad.soundFamily = layer.soundFamily })
          })
          this.syncLayerSoundRemoveButton(layer)
          if (layer.soundFamily) {
            this.startTrackPreview(layer, auditionBtn, this.resolveSoundFile(layer.category, layer.soundFamily, layer.intensity), layer.volume)
          }
          this.saveActiveSession()
        })
      }

      // 6. Volume Slider
      const volumeSlider = layerEl.querySelector('.layer-volume-slider')
      if (volumeSlider) {
        volumeSlider.addEventListener('input', (e) => {
          const val = parseInt(e.target.value, 10)
          layer.volume = val / 100
          const activePreview = this.activeTrackPreviews.get(layer.id)
          if (activePreview?.handle?.setVolume) {
            activePreview.handle.setVolume(layer.volume)
          }
          const display = volumeSlider.nextElementSibling
          if (display) display.textContent = `${val}%`
          this.saveActiveSession()
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
          if (layer.soundFamily) {
            this.startTrackPreview(layer, auditionBtn, this.resolveSoundFile(layer.category, layer.soundFamily, layer.intensity), layer.volume)
          }
          this.saveActiveSession()
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

      this.stopTrackPreview(layerId)
      this.layers.splice(idx, 1)

      const layerEl = document.querySelector(`.track-channel.sublayer[data-layer-id="${layerId}"]`)
      if (layerEl) {
        layerEl.style.transition = 'all 0.2s ease'
        layerEl.style.opacity = '0'
        layerEl.style.transform = 'scale(0.95)'
        setTimeout(() => layerEl.remove(), 200)
      }

      this.updateAllSoloStates()
      if (this.renderTrackpadLanes) this.renderTrackpadLanes()
      this.saveActiveSession()
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
          soundFamily: layer.soundFamily || '',
          intensity: layer.intensity || 'med',
          volume: 1.0,
          repeat: 1,
          active: true
        }

        if (!layer.steps[s]) layer.steps[s] = []
        layer.steps[s].push(newPad)
        this.reRenderStepCell(layer, s)
      }

      // Audition preview hit
      if (layer.soundFamily) {
        this.playPadSound(this.resolveSoundFile(layer.category, layer.soundFamily, layer.intensity), 0.8)
        this.pulseMeter(layer.category)
      } else {
        this.showToast(`Please import a base sound for "${layer.name}" first`, 'info')
        this.triggerBaseSoundImport(layer.category, layer.id)
      }

      if (this.renderTrackpadLanes) this.renderTrackpadLanes()
      this.saveActiveSession()
    }

    addPadToStep(layerId, step, config = {}) {
      const layer = this.getLayer(layerId)
      if (!layer) return

      const newPadId = `pad-${layerId}-${step}-${Date.now()}-${Math.floor(Math.random() * 1000)}`
      const newPad = {
        id: newPadId,
        category: config.category || layer.category,
        soundFamily: config.soundFamily !== undefined ? config.soundFamily : (layer.soundFamily || ''),
        intensity: config.intensity || layer.intensity,
        volume: config.volume !== undefined ? config.volume : 1.0,
        repeat: config.repeat || 1,
        active: true
      }

      layer.steps[step].push(newPad)

      // Re-render the specific step cell in DOM immediately with its settings & remove buttons
      this.reRenderStepCell(layer, step)

      // Audition preview
      if (newPad.soundFamily) {
        this.playPadSound(this.resolveSoundFile(newPad.category, newPad.soundFamily, newPad.intensity), newPad.volume * layer.volume)
      } else {
        this.showToast(`Please import a base sound for "${layer.name}" first`, 'info')
        this.triggerBaseSoundImport(newPad.category, layer.id)
      }

      if (this.renderTrackpadLanes) this.renderTrackpadLanes()
      this.saveActiveSession()
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
        this.saveActiveSession()
        return
      }

      // If stacked pad or sublayer pad: remove it completely
      pads.splice(padIdx, 1)

      // Ensure step never has 0 pads
      if (pads.length === 0) {
        pads.push({
          id: `pad-${layer.id}-${step}-${Date.now()}`,
          category: layer.category,
          soundFamily: layer.soundFamily || '',
          intensity: layer.intensity,
          volume: 1.0,
          repeat: 1,
          active: false
        })
      }

      this.reRenderStepCell(layer, step)
      if (this.renderTrackpadLanes) this.renderTrackpadLanes()
      this.saveActiveSession()
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

      // 1. Sound Category: dynamically populate with all categories & select pad's current category
      this.populatePopoverCategories(pad.category)

      // 2. Sound Family options based on Category & select pad's current sound family
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

      // Update Drawer Context Subtitle (which pad/step is currently being configured)
      if (this.popoverSubtitle) {
        const beatNum = Math.floor(step / 4) + 1
        const stepInBeat = (step % 4) + 1
        this.popoverSubtitle.textContent = `${layer.name || layer.category} • Beat ${beatNum} • Step ${stepInBeat}`
      }

      // Open Side Drawer
      this.openSideDrawer('pad-config')
    }

    closePadPopover() {
      this.closeSideDrawer('pad-config')
    }

    populatePopoverCategories(selectedCategory = null) {
      if (!this.popoverSoundCat || !this.manifest || !this.manifest.categories) return
      const targetCategory = selectedCategory || this.popoverSoundCat.value
      this.popoverSoundCat.innerHTML = Object.entries(this.manifest.categories).map(([catKey, cat]) => `
        <option value="${catKey}" ${catKey === targetCategory ? 'selected' : ''}>${cat.name}</option>
      `).join('')
      if (this.manifest.categories[targetCategory]) {
        this.popoverSoundCat.value = targetCategory
      }
    }

    populatePopoverSoundFamilies(category, selectedFamily = null) {
      if (!this.popoverSoundFamily) return
      if (!this.manifest || !this.manifest.categories || !this.manifest.categories[category]) {
        this.popoverSoundFamily.innerHTML = `
          <option value="" disabled selected>No Base Sound (Import Required)</option>
          <option value="__import__" class="import-sound-opt" data-track="${category}">+ Import Base Sound...</option>
        `
        return
      }
      const sounds = this.manifest.categories[category].sounds || {}
      const entries = Object.entries(sounds)
      let optionsHTML = ''
      if (entries.length > 0) {
        optionsHTML = entries.map(([id, sound]) => `
          <option value="${id}" ${id === selectedFamily ? 'selected' : ''}>${sound.name}${sound.isCustom ? ' (User)' : ''}</option>
        `).join('')
      } else {
        optionsHTML = `<option value="" disabled ${!selectedFamily ? 'selected' : ''}>No Base Sound (Import Required)</option>`
      }
      optionsHTML += `<option value="__import__" class="import-sound-opt" data-track="${category}">+ Import Base Sound...</option>`
      this.popoverSoundFamily.innerHTML = optionsHTML
      if (selectedFamily && sounds[selectedFamily]) {
        this.popoverSoundFamily.value = selectedFamily
      } else if (entries.length > 0) {
        this.popoverSoundFamily.value = entries[0][0]
      } else {
        this.popoverSoundFamily.value = ''
      }
    }

    bindPadPopoverEvents() {
      // Close drawer
      if (this.popoverClose) {
        this.popoverClose.onclick = () => {
          this.closePadPopover()
        }
      }
      if (this.popoverDone) {
        this.popoverDone.onclick = () => {
          this.closePadPopover()
        }
      }

      // Category change -> update family options & active pad category
      if (this.popoverSoundCat) {
        this.popoverSoundCat.onchange = (e) => {
          if (!this.activePopoverPad) return
          const { layerId, step, padId } = this.activePopoverPad
          const layer = this.getLayer(layerId)
          const pad = layer ? layer.steps[step].find(p => p.id === padId) : null
          if (!pad) return

          const newCategory = e.target.value
          pad.category = newCategory
          const catSounds = this.manifest?.categories?.[newCategory]?.sounds || {}
          const soundKeys = Object.keys(catSounds)
          const defaultFam = this.manifest?.categories?.[newCategory]?.baseTrackSound ||
            (soundKeys.length > 0 ? soundKeys[0] : '')

          this.populatePopoverSoundFamilies(newCategory, defaultFam)
          pad.soundFamily = defaultFam

          this.reRenderStepCell(layer, step)
          if (pad.soundFamily) {
            this.playPadSound(this.resolveSoundFile(pad.category, pad.soundFamily, pad.intensity), pad.volume)
          }
          this.saveActiveSession()
        }
      }

      // Family change
      if (this.popoverSoundFamily) {
        this.popoverSoundFamily.onchange = (e) => {
          if (!this.activePopoverPad) return
          const { layerId, step, padId } = this.activePopoverPad
          const layer = this.getLayer(layerId)
          const pad = layer ? layer.steps[step].find(p => p.id === padId) : null
          if (!pad) return

          const val = e.target.value
          if (val === '__import__') {
            this.popoverSoundFamily.value = pad.soundFamily || ''
            this.triggerBaseSoundImport(pad.category, layer.id)
            return
          }

          pad.soundFamily = val
          this.reRenderStepCell(layer, step)
          if (pad.soundFamily) {
            this.playPadSound(this.resolveSoundFile(pad.category, pad.soundFamily, pad.intensity), pad.volume)
          }
          this.saveActiveSession()
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
            if (pad.soundFamily) {
              this.playPadSound(this.resolveSoundFile(pad.category, pad.soundFamily, pad.intensity), pad.volume)
            }
            this.saveActiveSession()
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
          this.saveActiveSession()
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
            this.saveActiveSession()
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

          if (!pad.soundFamily) {
            this.showToast('Please import a base sound first', 'info')
            this.triggerBaseSoundImport(pad.category, layer.id)
            return
          }
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

      // Delete Button inside Configure Pad Drawer
      if (this.popoverDelete) {
        this.popoverDelete.onclick = () => {
          if (!this.activePopoverPad) return
          const { layerId, step, padId } = this.activePopoverPad
          this.removePad(layerId, step, padId)
          this.closePadPopover()
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
            this.saveActiveSession()
          })
        }

        // Solo Button
        const soloBtn = document.getElementById(`${track}-solo`)
        if (soloBtn) {
          soloBtn.addEventListener('click', () => {
            layer.solo = !layer.solo
            soloBtn.classList.toggle('active', layer.solo)
            this.updateAllSoloStates()
            this.saveActiveSession()
          })
        }

        // Audition Button
        const auditionBtn = document.querySelector(`.audition-btn[data-audition="${track}"]`)
        if (auditionBtn) {
          auditionBtn.addEventListener('click', () => {
            this.toggleTrackAudition(layer, auditionBtn)
          })
        }

        // Volume Slider
        const volumeSlider = document.getElementById(`${track}-volume`)
        if (volumeSlider) {
          volumeSlider.addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 10)
            layer.volume = val / 100
            const activePreview = this.activeTrackPreviews.get(layer.id)
            if (activePreview?.handle?.setVolume) {
              activePreview.handle.setVolume(layer.volume)
            }
            const display = volumeSlider.nextElementSibling
            if (display && display.classList.contains('volume-value')) {
              display.textContent = `${val}%`
            }
            this.saveActiveSession()
          })
        }

        // Categorized Sound Family Selector
        const sampleSelect = document.getElementById(`${track}-beat-audio`)
        if (sampleSelect) {
          sampleSelect.innerHTML = this.getSoundFamilyOptionsHTML(track, layer.soundFamily)
          if (sampleSelect.querySelector(`option[value="${layer.soundFamily}"]`)) {
            sampleSelect.value = layer.soundFamily
          }
          this.syncLayerSoundRemoveButton(layer)

          sampleSelect.addEventListener('change', (e) => {
            const val = e.target.value
            if (val === '__import__') {
              sampleSelect.value = layer.soundFamily
              this.triggerBaseSoundImport(track, layer.id)
              return
            }
            const soundId = val
            layer.soundFamily = soundId
            layer.steps.forEach(stepPads => {
              stepPads.forEach(pad => { pad.soundFamily = soundId })
            })
            this.syncLayerSoundRemoveButton(layer)
            this.startTrackPreview(layer, auditionBtn, this.resolveSoundFile(layer.category, layer.soundFamily, layer.intensity), layer.volume)
            this.saveActiveSession()
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

            this.startTrackPreview(layer, this.getLayerAuditionButton(layer), this.resolveSoundFile(layer.category, layer.soundFamily, layer.intensity), layer.volume)
            this.saveActiveSession()
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

      // Auto-follow playhead across synced timeline & track viewports (only if overflowing)
      if (this.isPlaying) {
        this.scrollMatrixToStepIfNeeded(currentStep, false)
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
    // 8. Transport Engine: Start / Pause / Stop
    // ------------------------------------------------------------------------
    start() {
      this.ensureAudioContextRunning()
      const interval = (60 / this.bpm) * 1000 / 2 // 8-step resolution (8th notes)

      if (!this.isPlaying) {
        if (this.libPreviewTimer) {
          this.stopLibraryPreview()
        }
        if (this.playBtn) {
          this.playBtn.innerHTML = `
            <div class="play-icon-wrap">
              <i class="fa-solid fa-pause"></i>
            </div>
            <span class="play-text">PAUSE</span>
          `
          this.playBtn.classList.add('active')
        }

        if (this.statusBadge) {
          this.statusBadge.classList.add('running')
          if (this.statusLabel) this.statusLabel.textContent = 'PLAYING'
        }

        if (this.clearBtn) this.clearBtn.disabled = true

        // Fire current step immediately and start tick loop
        this.repeatAnimation()
        this.isPlaying = setInterval(() => {
          this.repeatAnimation()
        }, interval)
      } else {
        // While playing, clicking pauses at the exact current position instead of resetting
        this.pause()
      }
    }

    pause() {
      if (this.isPlaying) {
        clearInterval(this.isPlaying)
        this.isPlaying = null
      }

      if (this.playBtn) {
        this.playBtn.innerHTML = `
          <div class="play-icon-wrap">
            <i class="fa-solid fa-play"></i>
          </div>
          <span class="play-text">RESUME</span>
        `
        this.playBtn.classList.remove('active')
      }

      if (this.statusBadge) {
        this.statusBadge.classList.remove('running')
        if (this.statusLabel) this.statusLabel.textContent = 'PAUSED'
      }

      if (this.clearBtn) this.clearBtn.disabled = false

      // Keep playhead and step dots stationed at the paused step
      const pausedStep = (this.index - 1 + this.totalSteps) % this.totalSteps
      document.querySelectorAll('.step-dot').forEach(dot => {
        dot.classList.remove('active')
      })
      const activeStepDots = document.querySelectorAll(`.step-dot[data-step="${pausedStep}"]`)
      activeStepDots.forEach(dot => dot.classList.add('active'))

      if (this.tlPlayhead) {
        const stepPercent = (pausedStep / this.totalSteps) * 100
        this.tlPlayhead.style.left = `${stepPercent}%`
      }
      if (this.updateTimelineMetrics) this.updateTimelineMetrics()
    }

    stop(reset = true) {
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

      if (reset) {
        this.index = 0
        document.querySelectorAll('.step-dot').forEach(dot => {
          dot.classList.remove('active')
        })
        if (this.tlPlayhead) this.tlPlayhead.style.left = '0%'
      }
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
      this.saveActiveSession()
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
      this.saveActiveSession()
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
      this.saveActiveSession()
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
      this.saveActiveSession()
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
      this.syncLayerSoundRemoveButton(layer)
      this.saveActiveSession()
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
      this.saveActiveSession()
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

      // Sound Assets Drawer (Toggle on button click, close via close/dismiss buttons)
      if (this.soundAssetsBtn && this.soundAssetsModal) {
        this.soundAssetsBtn.addEventListener('click', () => {
          this.toggleSoundAssetsDrawer()
        })
      }

      if (this.closeAssetsModalBtn && this.soundAssetsModal) {
        this.closeAssetsModalBtn.addEventListener('click', () => {
          this.closeSoundAssetsDrawer()
        })
      }

      if (this.dismissAssetsModalBtn && this.soundAssetsModal) {
        this.dismissAssetsModalBtn.addEventListener('click', () => {
          this.closeSoundAssetsDrawer()
        })
      }
    }

    // ------------------------------------------------------------------------
    // Unified Right-Side Drawer Manager (Single Active Drawer, Zero Backdrop)
    // ------------------------------------------------------------------------
    initSideDrawerManager() {
      this.activeSideDrawer = null
      this.sideDrawers = {
        'sound-assets': {
          el: this.soundAssetsModal,
          toggleBtn: this.soundAssetsBtn
        },
        'pad-config': {
          el: this.padPopover,
          toggleBtn: null
        },
        'save': {
          el: this.saveModal,
          toggleBtn: this.saveSeqBtn
        },
        'export': {
          el: this.exportModal,
          toggleBtn: this.exportBtn
        }
      }
    }

    openSideDrawer(key) {
      const target = this.sideDrawers && this.sideDrawers[key]
      if (!target || !target.el) return

      Object.entries(this.sideDrawers).forEach(([k, entry]) => {
        if (k !== key && entry.el && entry.el.classList.contains('active')) {
          entry.el.classList.remove('active')
          entry.el.setAttribute('aria-hidden', 'true')
          if (entry.toggleBtn) {
            entry.toggleBtn.classList.remove('drawer-trigger-active')
            entry.toggleBtn.setAttribute('aria-expanded', 'false')
          }
          if (k === 'pad-config') {
            this.activePopoverPad = null
          }
          if (k === 'sound-assets') {
            this.stopSoundAssetsPreviews()
          }
        }
      })

      target.el.classList.add('active')
      target.el.setAttribute('aria-hidden', 'false')
      if (target.toggleBtn) {
        target.toggleBtn.classList.add('drawer-trigger-active')
        target.toggleBtn.setAttribute('aria-expanded', 'true')
      }

      this.activeSideDrawer = key
    }

    closeSideDrawer(key = null) {
      if (!this.sideDrawers) return

      if (key) {
        const entry = this.sideDrawers[key]
        if (entry && entry.el) {
          entry.el.classList.remove('active')
          entry.el.setAttribute('aria-hidden', 'true')
          if (entry.toggleBtn) {
            entry.toggleBtn.classList.remove('drawer-trigger-active')
            entry.toggleBtn.setAttribute('aria-expanded', 'false')
          }
        }
        if (key === 'pad-config') {
          this.activePopoverPad = null
        }
        if (key === 'sound-assets') {
          this.stopSoundAssetsPreviews()
        }
        if (this.activeSideDrawer === key) {
          this.activeSideDrawer = null
        }
      } else {
        Object.entries(this.sideDrawers).forEach(([k, entry]) => {
          if (entry.el) {
            entry.el.classList.remove('active')
            entry.el.setAttribute('aria-hidden', 'true')
          }
          if (entry.toggleBtn) {
            entry.toggleBtn.classList.remove('drawer-trigger-active')
            entry.toggleBtn.setAttribute('aria-expanded', 'false')
          }
        })
        this.stopSoundAssetsPreviews()
        this.activePopoverPad = null
        this.activeSideDrawer = null
      }
    }

    toggleSideDrawer(key, onBeforeOpen = null) {
      const entry = this.sideDrawers && this.sideDrawers[key]
      if (!entry || !entry.el) return
      if (entry.el.classList.contains('active')) {
        this.closeSideDrawer(key)
      } else {
        if (typeof onBeforeOpen === 'function') onBeforeOpen()
        this.openSideDrawer(key)
      }
    }

    openSoundAssetsDrawer() {
      this.openSideDrawer('sound-assets')
    }

    closeSoundAssetsDrawer() {
      this.closeSideDrawer('sound-assets')
    }

    toggleSoundAssetsDrawer() {
      this.toggleSideDrawer('sound-assets')
    }

    syncOpenDrawerState() {
      if (!this.activeSideDrawer) return

      if (this.activeSideDrawer === 'save') {
        this.updateSaveModalStats()
      } else if (this.activeSideDrawer === 'pad-config' && this.activePopoverPad) {
        const { layerId, step, padId } = this.activePopoverPad
        const layer = this.getLayer(layerId)
        const exists = !!(layer && layer.steps && layer.steps[step] && layer.steps[step].some(p => p.id === padId))
        if (!exists) {
          this.closePadPopover()
        }
      }
    }

    // ------------------------------------------------------------------------
    // 12. Complete Audio Library Management & Custom Sound Tracks Architecture
    // ------------------------------------------------------------------------
    async initAudioLibrary() {
      if (window.AudioLibrary) {
        try {
          await window.AudioLibrary.init()
          if (this.manifest) {
            await window.AudioLibrary.syncManifestWithDB(this.manifest)
          }
        } catch (err) {
          console.warn('AudioLibrary init failed:', err)
        }
      }
    }

    async renderStoredCustomTracks() {
      if (!window.AudioLibrary) return
      try {
        const allTracks = await window.AudioLibrary.getAllTracks()
        const customTracks = allTracks.filter(t => t.type === 'custom')
        const container = document.getElementById('custom-layers-container')
        for (const track of customTracks) {
          const alreadyInDOM = container && container.querySelector(`.track-channel-group[data-track="${track.id}"]`)
          if (!alreadyInDOM) {
            this.createCustomTrackDOM(track)
          }
        }
      } catch (err) {
        console.warn('Could not render stored custom tracks:', err)
      }
    }

    createCustomTrackDOM(track) {
      if (!track || !track.id) return

      let layer = this.layers.find(l => l.id === `${track.id}-primary`)
      const customSounds = this.manifest?.categories?.[track.id]?.sounds || {}
      const soundFamily = track.baseTrackSound || (Object.keys(customSounds).length > 0 ? Object.keys(customSounds)[0] : '') || ''
      const trackColor = this.getTrackColor(track.id, track.color || layer?.color)

      if (!layer) {
        layer = {
          id: `${track.id}-primary`,
          badge: String(track.trackNumber || (this.layers.length + 1)).padStart(2, '0'),
          name: track.name,
          category: track.id,
          color: trackColor,
          soundFamily: soundFamily,
          intensity: 'med',
          volume: 1.0,
          muted: false,
          solo: false,
          isPrimary: true,
          parentTrack: track.id,
          steps: []
        }

        for (let s = 0; s < this.totalSteps; s++) {
          const pad = {
            id: `pad-${track.id}-primary-${s}`,
            category: track.id,
            soundFamily: soundFamily,
            intensity: 'med',
            volume: 1.0,
            repeat: 1,
            active: false
          }
          layer.steps.push([pad])
        }

        this.layers.push(layer)
      } else {
        layer.color = trackColor
      }

      const container = document.getElementById('custom-layers-container')
      if (!container) return

      // Remove any existing DOM for this track (e.g. on re-render)
      const existing = container.querySelector(`.track-channel-group[data-track="${track.id}"]`)
      if (existing) existing.remove()

      const groupEl = document.createElement('div')
      groupEl.className = 'track-channel-group custom-track-group'
      groupEl.dataset.track = track.id
      this.applyTrackColorVars(groupEl, track.id, trackColor)

      const optionsHTML = this.getSoundFamilyOptionsHTML(track.id, layer.soundFamily)

      groupEl.innerHTML = `
        <div class="track-channel custom-beat primary-layer ${layer.muted ? 'is-muted' : ''}" data-track="${track.id}" data-layer-id="${layer.id}">
          <div class="channel-strip">
            <div class="channel-main-row">
              <div class="channel-identity">
                <div class="track-badge">${layer.badge}</div>
                <div class="channel-name-wrap">
                  <div class="title-mute">
                    <h2 class="channel-name">${track.name}</h2>
                    <button class="track-btn audition-btn" data-layer-id="${layer.id}" title="Preview Sound" aria-label="Audition ${track.name}">
                      <i class="fa-solid fa-play"></i>
                    </button>
                    <button class="track-btn mute-btn ${layer.muted ? 'active' : ''}" data-layer-id="${layer.id}" title="Mute Track (M)">
                      <i class="fa-solid ${layer.muted ? 'fa-volume-xmark' : 'fa-volume-high'}"></i>
                    </button>
                    <button class="track-btn solo-btn ${layer.solo ? 'active' : ''}" data-layer-id="${layer.id}" title="Solo Track (S)">
                      <span>S</span>
                    </button>
                    <button class="track-btn delete-custom-track-btn" data-track-id="${track.id}" title="Delete Custom Track">
                      <i class="fa-solid fa-trash-can"></i>
                    </button>
                  </div>
                </div>
              </div>

              <div class="sample-picker-wrap">
                <i class="fa-solid fa-compact-disc sample-icon"></i>
                <select class="sample-select custom-track-sample-select" data-track="${track.id}" data-layer-id="${layer.id}" aria-label="${track.name} Sound Family">
                  ${optionsHTML}
                </select>
              </div>

              <div class="volume-station">
                <i class="fa-solid fa-volume-low vol-icon"></i>
                <input type="range" class="volume-slider custom-track-volume" data-layer-id="${layer.id}" min="0" max="100" value="${Math.round(layer.volume * 100)}" aria-label="${track.name} Volume" />
                <span class="volume-value">${Math.round(layer.volume * 100)}%</span>
              </div>
            </div>

            <div class="intensity-station" data-layer-id="${layer.id}" data-track="${track.id}">
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
          <div class="track-pads-viewport" data-track-scroll="${layer.id}">
            <div class="pads-grid">
              ${this.renderAllBeatChunksHTML(layer)}
            </div>
          </div>
        </div>

        <!-- Sub-Layers Container for Custom Track -->
        <div class="track-sublayers" id="${track.id}-sublayers"></div>

        <div class="add-layer-bar">
          <button class="add-layer-btn" data-track="${track.id}" title="Add independent 4-pad layer beneath ${track.name}">
            <i class="fa-solid fa-plus"></i> Add Layer to ${track.name}
          </button>
          ${this.renderTrackPreviewToggleHTML(track.id, track.name, 'Preview on Add')}
        </div>
      `

      container.appendChild(groupEl)
      this.bindCustomTrackDOMEvents(groupEl, layer, track)
      this.bindTrackScrollViewport(groupEl.querySelector('.track-pads-viewport'))

      if (this.renderTrackpadLanes) this.renderTrackpadLanes()
      this.saveActiveSession()
    }

    bindCustomTrackDOMEvents(groupEl, layer, track) {
      // 1. Audition button
      const auditionBtn = groupEl.querySelector('.audition-btn')
      if (auditionBtn) {
        auditionBtn.addEventListener('click', () => {
          this.toggleTrackAudition(layer, auditionBtn)
        })
      }

      // 2. Mute button
      const muteBtn = groupEl.querySelector('.mute-btn')
      if (muteBtn) {
        muteBtn.addEventListener('click', () => {
          layer.muted = !layer.muted
          muteBtn.classList.toggle('active', layer.muted)
          const icon = muteBtn.querySelector('i')
          if (icon) {
            icon.className = layer.muted ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high'
          }
          const row = groupEl.querySelector('.primary-layer')
          if (row) row.classList.toggle('is-muted', layer.muted)
          this.saveActiveSession()
        })
      }

      // 3. Solo button
      const soloBtn = groupEl.querySelector('.solo-btn')
      if (soloBtn) {
        soloBtn.addEventListener('click', () => {
          layer.solo = !layer.solo
          soloBtn.classList.toggle('active', layer.solo)
          this.updateAllSoloStates()
          this.saveActiveSession()
        })
      }

      // 4. Delete custom track button
      const deleteTrackBtn = groupEl.querySelector('.delete-custom-track-btn')
      if (deleteTrackBtn) {
        deleteTrackBtn.addEventListener('click', () => {
          this.confirmDeleteTrack(track.id, track.name)
        })
      }

      // 5. Sound Family Selector
      const sampleSelect = groupEl.querySelector('.custom-track-sample-select')
      if (sampleSelect) {
        this.syncLayerSoundRemoveButton(layer)
        sampleSelect.addEventListener('change', (e) => {
          const val = e.target.value
          if (val === '__import__') {
            sampleSelect.value = layer.soundFamily || ''
            this.triggerBaseSoundImport(track.id, layer.id)
            return
          }
          layer.soundFamily = val
          layer.steps.forEach(stepPads => {
            stepPads.forEach(pad => { pad.soundFamily = val })
          })
          this.syncLayerSoundRemoveButton(layer)
          if (layer.soundFamily) {
            this.startTrackPreview(layer, auditionBtn, this.resolveSoundFile(layer.category, layer.soundFamily, layer.intensity), layer.volume)
          }
          this.saveActiveSession()
        })
      }

      // 6. Volume Slider
      const volumeSlider = groupEl.querySelector('.custom-track-volume')
      if (volumeSlider) {
        volumeSlider.addEventListener('input', (e) => {
          const val = parseInt(e.target.value, 10)
          layer.volume = val / 100
          const activePreview = this.activeTrackPreviews.get(layer.id)
          if (activePreview?.handle?.setVolume) {
            activePreview.handle.setVolume(layer.volume)
          }
          const display = volumeSlider.nextElementSibling
          if (display && display.classList.contains('volume-value')) {
            display.textContent = `${val}%`
          }
          this.saveActiveSession()
        })
      }

      // 7. Intensity Variation Pills
      const pills = groupEl.querySelectorAll('.intensity-pill')
      pills.forEach(pill => {
        pill.addEventListener('click', () => {
          const intensity = pill.dataset.intensity
          layer.intensity = intensity
          pills.forEach(p => p.classList.remove('active'))
          pill.classList.add('active')
          layer.steps.forEach(stepPads => {
            stepPads.forEach(pad => { pad.intensity = intensity })
          })
          if (layer.soundFamily) {
            this.startTrackPreview(layer, auditionBtn, this.resolveSoundFile(layer.category, layer.soundFamily, layer.intensity), layer.volume)
          }
          this.saveActiveSession()
        })
      })

      // 8. Bind Step Cells
      for (let s = 0; s < this.totalSteps; s++) {
        const cellEl = groupEl.querySelector(`.beat-step-cell[data-step="${s}"]`)
        if (cellEl) {
          this.bindStepCellEvents(cellEl, layer, s)
        }
      }

      // 9. Add Layer to [Custom Track]
      const addLayerBtn = groupEl.querySelector('.add-layer-btn')
      if (addLayerBtn) {
        addLayerBtn.addEventListener('click', () => {
          this.addLayer(track.id)
        })
      }

      // 9b. Preview on Add checkmark
      const previewCheckbox = groupEl.querySelector('.track-preview-checkbox')
      if (previewCheckbox) {
        previewCheckbox.checked = this.isTrackPreviewEnabled(track.id)
        previewCheckbox.addEventListener('change', (e) => {
          this.setTrackPreviewOnImport(track.id, e.target.checked)
        })
      }

      // 10. Chunk Add Layer buttons
      groupEl.querySelectorAll('.chunk-add-layer-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation()
          const beatNum = btn.dataset.beat || '1'
          this.addLayerToBeatChunk(layer.id, parseInt(beatNum, 10))
        })
      })
    }

    triggerBaseSoundImport(trackId, targetLayerId = null) {
      this.ensureAudioContextRunning()
      this.pendingImport = { trackId, targetLayerId }
      if (this.audioFileImporter) {
        this.audioFileImporter.value = ''
        this.audioFileImporter.click()
      }
    }

    openImportProgressModal(fileName, trackName) {
      if (this.importFilenameText) this.importFilenameText.textContent = fileName
      if (this.importTargetTag) this.importTargetTag.textContent = `Target: ${trackName}`
      if (this.importProgressBarFill) this.importProgressBarFill.style.width = '5%'
      if (this.importProgressPct) this.importProgressPct.textContent = '5%'
      if (this.importStatusText) this.importStatusText.textContent = 'Preparing audio decoder...'

      const chips = ['chip-base', 'chip-low', 'chip-med-low', 'chip-med', 'chip-med-high', 'chip-high']
      chips.forEach(id => {
        const el = document.getElementById(id)
        if (el) el.className = 'var-chip'
      })

      if (this.importProgressModal) {
        this.importProgressModal.style.display = 'flex'
        void this.importProgressModal.offsetWidth
        this.importProgressModal.classList.add('active')
      }
    }

    updateImportProgressUI(progress) {
      if (this.importProgressBarFill) {
        this.importProgressBarFill.style.width = `${progress.percent}%`
      }
      if (this.importProgressPct) {
        this.importProgressPct.textContent = `${progress.percent}%`
      }
      if (this.importStatusText) {
        this.importStatusText.textContent = progress.message
      }

      if (progress.step === 'base-save') {
        const chip = document.getElementById('chip-base')
        if (chip) chip.className = 'var-chip done'
      }

      if (progress.level) {
        const levelChipIdMap = {
          'low': 'chip-low',
          'med-low': 'chip-med-low',
          'med': 'chip-med',
          'med-high': 'chip-med-high',
          'high': 'chip-high'
        }
        const chipId = levelChipIdMap[progress.level]
        if (chipId) {
          const chip = document.getElementById(chipId)
          if (chip) chip.className = 'var-chip active'
        }
      }

      if (progress.step === 'done') {
        const chips = ['chip-base', 'chip-low', 'chip-med-low', 'chip-med', 'chip-med-high', 'chip-high']
        chips.forEach(id => {
          const el = document.getElementById(id)
          if (el) el.className = 'var-chip done'
        })
      }
    }

    closeImportProgressModal() {
      if (this.importProgressModal) {
        this.importProgressModal.classList.remove('active')
        setTimeout(() => {
          if (this.importProgressModal && !this.importProgressModal.classList.contains('active')) {
            this.importProgressModal.style.display = ''
          }
        }, 250)
      }
    }

    openAddTrackModal() {
      if (this.customTrackNameInput) this.customTrackNameInput.value = ''
      if (this.newTrackPreviewCheckbox) this.newTrackPreviewCheckbox.checked = true
      if (this.addTrackModal) {
        this.addTrackModal.style.display = 'flex'
        void this.addTrackModal.offsetWidth
        this.addTrackModal.classList.add('active')
      }
      if (this.customTrackNameInput) {
        setTimeout(() => this.customTrackNameInput.focus(), 60)
      }
    }

    closeAddTrackModal() {
      if (this.addTrackModal) {
        this.addTrackModal.classList.remove('active')
        setTimeout(() => {
          if (this.addTrackModal && !this.addTrackModal.classList.contains('active')) {
            this.addTrackModal.style.display = ''
          }
        }, 250)
      }
    }

    async executeAddTrack() {
      if (!this.customTrackNameInput) return
      const name = this.customTrackNameInput.value.trim()
      if (!name) {
        this.showToast('Please enter a track name', 'error')
        return
      }

      const previewOnImport = this.newTrackPreviewCheckbox ? this.newTrackPreviewCheckbox.checked : true

      try {
        const newTrack = await window.AudioLibrary.addCustomTrack(name, { previewOnImport })
        this.setTrackPreviewOnImport(newTrack.id, previewOnImport)
        await window.AudioLibrary.syncManifestWithDB(this.manifest)
        this.createCustomTrackDOM(newTrack)
        this.populatePopoverCategories()
        this.renderSoundAssetsModal()
        this.closeAddTrackModal()
        this.showToast(`Track "${name}" created!`, 'success')
        this.saveActiveSession()

        // Prompt to import base sound
        setTimeout(() => {
          this.triggerBaseSoundImport(newTrack.id)
        }, 350)
      } catch (err) {
        this.showToast(`Error creating track: ${err.message}`, 'error')
      }
    }

    openConfirmActionModal({ title, subtitle, message, confirmBtnText = 'Confirm', onConfirm }) {
      if (this.confirmActionTitle) this.confirmActionTitle.textContent = title
      if (this.confirmActionSubtitle) this.confirmActionSubtitle.textContent = subtitle || 'Please confirm to proceed'
      if (this.confirmActionMsg) this.confirmActionMsg.textContent = message
      if (this.confirmActionBtn) {
        this.confirmActionBtn.innerHTML = `<i class="fa-solid fa-trash-can"></i> ${confirmBtnText}`
      }
      this.confirmActionCallback = onConfirm
      if (this.confirmActionModal) {
        this.confirmActionModal.style.display = 'flex'
        void this.confirmActionModal.offsetWidth
        this.confirmActionModal.classList.add('active')
      }
    }

    closeConfirmActionModal() {
      if (this.confirmActionModal) {
        this.confirmActionModal.classList.remove('active')
        setTimeout(() => {
          if (this.confirmActionModal && !this.confirmActionModal.classList.contains('active')) {
            this.confirmActionModal.style.display = ''
          }
        }, 250)
      }
      this.confirmActionCallback = null
    }

    confirmDeleteTrack(trackId, trackName) {
      this.openConfirmActionModal({
        title: 'Delete Custom Track',
        subtitle: 'Remove instrument & all associated media',
        message: `Are you sure you want to delete "${trackName}"? All its base audio samples and generated variations will be permanently removed from IndexedDB.`,
        confirmBtnText: 'Delete Track',
        onConfirm: async () => {
          try {
            await window.AudioLibrary.deleteTrack(trackId)
            delete this.manifest.categories[trackId]
            if (this.trackPreviewPrefs && trackId in this.trackPreviewPrefs) {
              delete this.trackPreviewPrefs[trackId]
              this.saveTrackPreviewPrefs()
            }

            // Stop any active previews and remove all layers for this track from this.layers
            this.layers
              .filter(l => l.category === trackId || l.parentTrack === trackId)
              .forEach(l => this.stopTrackPreview(l.id))
            this.layers = this.layers.filter(l => l.category !== trackId && l.parentTrack !== trackId)

            // Remove DOM group
            const groupEl = document.querySelector(`.track-channel-group[data-track="${trackId}"]`)
            if (groupEl) groupEl.remove()

            this.populatePopoverCategories()
            if (this.renderTrackpadLanes) this.renderTrackpadLanes()
            this.renderSoundAssetsModal()
            this.showToast(`Custom track "${trackName}" deleted.`, 'success')
            this.saveActiveSession()
          } catch (err) {
            this.showToast(`Error deleting track: ${err.message}`, 'error')
          }
        }
      })
    }

    confirmDeleteSound(trackId, soundId, soundName) {
      this.openConfirmActionModal({
        title: 'Delete Imported Base Sound',
        subtitle: 'Remove audio file and variations',
        message: `Are you sure you want to delete "${soundName}" and its 5 studio variations from IndexedDB?`,
        confirmBtnText: 'Delete Sound',
        onConfirm: async () => {
          try {
            await window.AudioLibrary.deleteBaseSound(trackId, soundId)
            await window.AudioLibrary.syncManifestWithDB(this.manifest)

            // Switch any layer or pad using this deleted sound to the track fallback (or empty)
            const cat = this.manifest.categories[trackId]
            const remainingKeys = cat ? Object.keys(cat.sounds || {}) : []
            const fallbackSound = cat && remainingKeys.length > 0
              ? (cat.baseTrackSound && cat.sounds[cat.baseTrackSound] ? cat.baseTrackSound : remainingKeys[0])
              : ''

            this.layers.forEach(layer => {
              if (layer.category === trackId && layer.soundFamily === soundId) {
                this.stopTrackPreview(layer.id)
                layer.soundFamily = fallbackSound
              }
              layer.steps.forEach((pads, stepIdx) => {
                let stepChanged = false
                pads.forEach(p => {
                  if (p.category === trackId && p.soundFamily === soundId) {
                    p.soundFamily = fallbackSound
                    stepChanged = true
                  }
                })
                if (stepChanged) {
                  this.reRenderStepCell(layer, stepIdx)
                }
              })
            })

            if (this.activePopoverPad) {
              const { layerId, step, padId } = this.activePopoverPad
              const popLayer = this.getLayer(layerId)
              const popPad = popLayer ? popLayer.steps[step].find(p => p.id === padId) : null
              if (popPad && popPad.category === trackId) {
                this.populatePopoverSoundFamilies(trackId, popPad.soundFamily)
              }
            }

            this.refreshTrackSoundSelectors(trackId)
            this.renderSoundAssetsModal()
            if (this.renderTrackpadLanes) this.renderTrackpadLanes()
            this.showToast(`Sound "${soundName}" removed.`, 'success')
            this.saveActiveSession()
          } catch (err) {
            this.showToast(`Error deleting sound: ${err.message}`, 'error')
          }
        }
      })
    }

    openRenameTrackModal(trackId, currentName) {
      this.activeRenameTrackId = trackId
      if (this.renameTrackInput) this.renameTrackInput.value = currentName || ''
      if (this.renameTrackModal) {
        this.renameTrackModal.style.display = 'flex'
        void this.renameTrackModal.offsetWidth
        this.renameTrackModal.classList.add('active')
      }
      if (this.renameTrackInput) {
        setTimeout(() => this.renameTrackInput.focus(), 60)
      }
    }

    closeRenameTrackModal() {
      if (this.renameTrackModal) {
        this.renameTrackModal.classList.remove('active')
        setTimeout(() => {
          if (this.renameTrackModal && !this.renameTrackModal.classList.contains('active')) {
            this.renameTrackModal.style.display = ''
          }
        }, 250)
      }
      this.activeRenameTrackId = null
    }

    async executeTrackRename() {
      if (!this.activeRenameTrackId || !this.renameTrackInput) return
      const newName = this.renameTrackInput.value.trim()
      if (!newName) {
        this.showToast('Please enter a valid track name', 'error')
        return
      }

      try {
        await window.AudioLibrary.renameTrack(this.activeRenameTrackId, newName)
        await window.AudioLibrary.syncManifestWithDB(this.manifest)

        // Update layer name and DOM elements
        this.layers.forEach(layer => {
          if (layer.category === this.activeRenameTrackId && layer.isPrimary) {
            layer.name = newName
          }
        })

        const groupEl = document.querySelector(`.track-channel-group[data-track="${this.activeRenameTrackId}"]`)
        if (groupEl) {
          const titleEl = groupEl.querySelector('.channel-name')
          if (titleEl) titleEl.textContent = newName
          const addBtn = groupEl.querySelector('.add-layer-btn')
          if (addBtn) addBtn.innerHTML = `<i class="fa-solid fa-plus"></i> Add Layer to ${newName}`
        }

        this.populatePopoverCategories()
        if (this.renderTrackpadLanes) this.renderTrackpadLanes()
        this.renderSoundAssetsModal()
        this.closeRenameTrackModal()
        this.showToast(`Track renamed to "${newName}"`, 'success')
        this.saveActiveSession()
      } catch (err) {
        this.showToast(`Error renaming track: ${err.message}`, 'error')
      }
    }

    refreshTrackSoundSelectors(trackId) {
      // 1. Primary track select (built-in or custom)
      const primarySelect = document.getElementById(`${trackId}-beat-audio`) ||
        document.querySelector(`.custom-track-sample-select[data-track="${trackId}"]`)
      const primaryLayer = this.layers.find(l => l.category === trackId && l.isPrimary)
      if (primarySelect && primaryLayer) {
        primarySelect.innerHTML = this.getSoundFamilyOptionsHTML(trackId, primaryLayer.soundFamily)
        primarySelect.value = primaryLayer.soundFamily || ''
        this.syncLayerSoundRemoveButton(primaryLayer)
      }

      // 2. Sublayer selects
      document.querySelectorAll(`.track-channel.sublayer[data-track="${trackId}"] .layer-family-select`).forEach(sel => {
        const layerId = sel.dataset.layerId
        const layer = this.layers.find(l => l.id === layerId)
        if (layer) {
          sel.innerHTML = this.getSoundFamilyOptionsHTML(trackId, layer.soundFamily)
          sel.value = layer.soundFamily || ''
          this.syncLayerSoundRemoveButton(layer)
        }
      })

      // 3. Pad popover if open
      if (this.popoverSoundCat && this.popoverSoundCat.value === trackId) {
        const currentFam = this.popoverSoundFamily ? this.popoverSoundFamily.value : null
        this.populatePopoverSoundFamilies(trackId, currentFam)
      }
    }

    bindAudioLibraryEvents() {
      // 1. Open Add Track Modal
      if (this.openAddTrackBtn) {
        this.openAddTrackBtn.addEventListener('click', () => {
          this.openAddTrackModal()
        })
      }

      if (this.closeAddTrackBtn) {
        this.closeAddTrackBtn.addEventListener('click', () => {
          this.closeAddTrackModal()
        })
      }

      if (this.cancelAddTrackBtn) {
        this.cancelAddTrackBtn.addEventListener('click', () => {
          this.closeAddTrackModal()
        })
      }

      if (this.confirmAddTrackBtn) {
        this.confirmAddTrackBtn.addEventListener('click', () => {
          this.executeAddTrack()
        })
      }

      if (this.customTrackNameInput) {
        this.customTrackNameInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            this.executeAddTrack()
          }
        })
      }

      // Suggestion pills
      if (this.trackNameSuggestions) {
        this.trackNameSuggestions.querySelectorAll('.track-suggestion-pill').forEach(pill => {
          pill.addEventListener('click', () => {
            const name = pill.dataset.name
            if (this.customTrackNameInput && name) {
              this.customTrackNameInput.value = name
              this.customTrackNameInput.focus()
            }
          })
        })
      }

      // 2. Audio File Importer Change Listener
      if (this.audioFileImporter) {
        this.audioFileImporter.addEventListener('change', async (e) => {
          const file = e.target.files && e.target.files[0]
          if (!file || !this.pendingImport) return

          const { trackId, targetLayerId } = this.pendingImport
          const initiatedFromAssetsDrawer = !targetLayerId && this.activeSideDrawer === 'sound-assets'
          const track = (await window.AudioLibrary.getTrack(trackId)) ||
            (this.manifest?.categories?.[trackId] ? { id: trackId, name: this.manifest.categories[trackId].name } : { id: trackId, name: trackId })

          const trackName = track ? track.name : trackId

          this.openImportProgressModal(file.name, trackName)

          try {
            const importedSound = await window.AudioLibrary.importBaseSound(trackId, file, (progress) => {
              this.updateImportProgressUI(progress)
            })

            await window.AudioLibrary.syncManifestWithDB(this.manifest)

            this.refreshTrackSoundSelectors(trackId)
            this.renderSoundAssetsModal()
            this.populatePopoverCategories()

            if (targetLayerId) {
              const layer = this.layers.find(l => l.id === targetLayerId)
              if (layer) {
                layer.soundFamily = importedSound.id
                layer.steps.forEach(pads => {
                  pads.forEach(p => { p.soundFamily = importedSound.id })
                })
                const sel = document.querySelector(`.sample-select[data-layer-id="${targetLayerId}"]`)
                if (sel) sel.value = importedSound.id
                this.syncLayerSoundRemoveButton(layer)
              }
            } else {
              const primaryLayer = this.layers.find(l => l.category === trackId && l.isPrimary)
              if (primaryLayer) {
                primaryLayer.soundFamily = importedSound.id
                primaryLayer.steps.forEach(pads => {
                  pads.forEach(p => { p.soundFamily = importedSound.id })
                })
                const sel = document.getElementById(`${trackId}-beat-audio`) ||
                  document.querySelector(`.custom-track-sample-select[data-track="${trackId}"]`)
                if (sel) sel.value = importedSound.id
                this.syncLayerSoundRemoveButton(primaryLayer)
              }
            }

            // If Pad Popover is currently open, refresh its categories and sound families
            if (this.activePopoverPad) {
              const { layerId, step, padId } = this.activePopoverPad
              const layer = this.getLayer(layerId)
              const pad = layer ? layer.steps[step].find(p => p.id === padId) : null
              if (pad) {
                if (pad.category === trackId) {
                  pad.soundFamily = importedSound.id
                  this.reRenderStepCell(layer, step)
                }
                this.populatePopoverCategories(pad.category)
                this.populatePopoverSoundFamilies(pad.category, pad.soundFamily)
              }
            }

            this.saveActiveSession()

            setTimeout(() => {
              this.closeImportProgressModal()
              this.showToast(`Imported "${importedSound.name}" with 5 studio variations!`, 'success')
              if (this.isTrackPreviewEnabled(trackId)) {
                if (initiatedFromAssetsDrawer && this.activeSideDrawer !== 'sound-assets') {
                  return
                }
                const fileSrc = this.resolveSoundFile(trackId, importedSound.id, 'med')
                const targetLayer = targetLayerId
                  ? this.getLayer(targetLayerId)
                  : this.layers.find(l => l.category === trackId && l.isPrimary)
                if (targetLayer && fileSrc) {
                  this.startTrackPreview(targetLayer, this.getLayerAuditionButton(targetLayer), fileSrc, targetLayer.volume)
                  if (initiatedFromAssetsDrawer && this.activeAssetImportPreviewLayerIds) {
                    this.activeAssetImportPreviewLayerIds.add(targetLayer.id)
                  }
                } else if (fileSrc) {
                  this.playDirectSound(fileSrc, 0.85)
                }
              }
            }, 500)

          } catch (err) {
            console.error('Import error:', err)
            this.closeImportProgressModal()
            if (err && err.code === 'DUPLICATE_SOUND') {
              this.showToast(err.message, 'warning', 5200)
            } else {
              this.showToast(`Import failed: ${err.message}`, 'error', 4500)
            }
          } finally {
            this.pendingImport = null
            if (this.audioFileImporter) this.audioFileImporter.value = ''
          }
        })
      }

      // 3. Confirm Action Modal
      if (this.cancelConfirmActionBtn) {
        this.cancelConfirmActionBtn.addEventListener('click', () => {
          this.closeConfirmActionModal()
        })
      }
      if (this.closeConfirmActionBtn) {
        this.closeConfirmActionBtn.addEventListener('click', () => {
          this.closeConfirmActionModal()
        })
      }
      if (this.confirmActionBtn) {
        this.confirmActionBtn.addEventListener('click', async () => {
          if (typeof this.confirmActionCallback === 'function') {
            const cb = this.confirmActionCallback
            this.confirmActionCallback = null
            this.closeConfirmActionModal()
            await cb()
          }
        })
      }

      // 4. Rename Track Modal
      if (this.cancelRenameBtn) {
        this.cancelRenameBtn.addEventListener('click', () => {
          this.closeRenameTrackModal()
        })
      }
      if (this.closeRenameBtn) {
        this.closeRenameBtn.addEventListener('click', () => {
          this.closeRenameTrackModal()
        })
      }
      if (this.confirmRenameBtn) {
        this.confirmRenameBtn.addEventListener('click', () => {
          this.executeTrackRename()
        })
      }
      if (this.renameTrackInput) {
        this.renameTrackInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            this.executeTrackRename()
          }
        })
      }

      // Backdrop overlay click handlers
      if (this.addTrackModal) {
        this.addTrackModal.addEventListener('click', (e) => {
          if (e.target === this.addTrackModal) this.closeAddTrackModal()
        })
      }
      if (this.confirmActionModal) {
        this.confirmActionModal.addEventListener('click', (e) => {
          if (e.target === this.confirmActionModal) this.closeConfirmActionModal()
        })
      }
      if (this.renameTrackModal) {
        this.renameTrackModal.addEventListener('click', (e) => {
          if (e.target === this.renameTrackModal) this.closeRenameTrackModal()
        })
      }
    }

    renderSoundAssetsModal() {
      if (!this.soundCategoriesList || !this.manifest || !this.manifest.categories) return
      this.soundCategoriesList.innerHTML = ''

      Object.entries(this.manifest.categories).forEach(([catKey, cat]) => {
        const isBuiltin = cat.type === 'builtin' || this.isBuiltinTrack(catKey)
        const catCard = document.createElement('div')
        catCard.className = `category-card ${!isBuiltin ? 'custom-category-card' : ''}`
        catCard.dataset.track = catKey
        if (!isBuiltin) {
          cat.color = this.getTrackColor(catKey, cat.color)
          this.applyTrackColorVars(catCard, catKey, cat.color)
        }

        let soundFamiliesHTML = ''
        const sounds = cat.sounds || {}
        const soundEntries = Object.entries(sounds)

        if (soundEntries.length === 0) {
          soundFamiliesHTML = `
            <div class="empty-track-state">
              <i class="fa-solid fa-cloud-arrow-up empty-icon"></i>
              <div class="empty-text-wrap">
                <h4>No Base Sounds In This Track Yet</h4>
                <p>Import your own audio samples (.wav, .mp3, .ogg, etc.) to start sequencing with this track.</p>
              </div>
              <button class="modal-track-action-btn track-import-btn import-first-btn" data-track="${catKey}">
                <i class="fa-solid fa-plus"></i> Import First Base Sound
              </button>
            </div>
          `
        } else {
          soundEntries.forEach(([soundKey, sound]) => {
            const isBase = soundKey === cat.baseTrackSound
            const variationsHTML = sound.variations ? Object.entries(sound.variations).map(([varKey, v]) => `
              <button class="variation-preview-btn" data-src="${v.file}" title="Preview ${sound.name} (${v.label})">
                <span class="var-name"><i class="fa-solid fa-play"></i> ${v.label}</span>
                <span class="var-specs">${v.filterCutoffHz < 19000 ? v.filterCutoffHz + 'Hz' : 'Direct'} &bull; Peak ${v.peak}</span>
              </button>
            `).join('') : ''

            soundFamiliesHTML += `
              <div class="sound-family-item" data-sound-id="${soundKey}">
                <div class="family-info-row">
                  <div class="family-name">
                    <i class="fa-solid fa-compact-disc"></i>
                    <span>${sound.name}</span>
                    ${isBase ? '<span class="base-sound-tag"><i class="fa-solid fa-star"></i> Track Base</span>' : ''}
                    ${sound.isCustom ? '<span class="custom-sound-tag"><i class="fa-solid fa-user"></i> Imported</span>' : ''}
                  </div>
                  <div class="family-meta-pills">
                    <span class="meta-pill"><i class="fa-solid fa-wave-square"></i> ${sound.type || 'Percussion'}</span>
                    <span class="meta-pill"><i class="fa-solid fa-ruler-horizontal"></i> ${sound.frequencyRange || 'Full Range'}</span>
                    ${sound.duration ? `<span class="meta-pill"><i class="fa-solid fa-stopwatch"></i> ${sound.duration.toFixed(2)}s</span>` : ''}
                    ${sound.isCustom ? `
                      <button class="sound-delete-btn" data-track="${catKey}" data-sound-id="${soundKey}" data-name="${sound.name}" title="Delete imported sound and variations">
                        <i class="fa-solid fa-trash-can"></i>
                      </button>
                    ` : ''}
                  </div>
                </div>
                <p class="family-desc">${sound.description || 'Studio audio sample'}</p>
                <div class="variations-row">
                  ${variationsHTML}
                </div>
              </div>
            `
          })
        }

        catCard.innerHTML = `
          <div class="category-header">
            <div class="category-title-wrap">
              <span class="category-badge ${!isBuiltin ? 'custom-track-badge' : ''}">
                ${isBuiltin ? `Track 0${cat.trackNumber || 1}` : `Custom Track`}
              </span>
              <h3 class="category-name">${cat.name}</h3>
            </div>
            <div class="category-actions">
              ${this.renderTrackPreviewToggleHTML(catKey, cat.name, 'Preview')}
              <button class="modal-track-action-btn track-import-btn" data-track="${catKey}" title="Import new base sound into ${cat.name}">
                <i class="fa-solid fa-file-arrow-up"></i> Import Base Sound
              </button>
              ${!isBuiltin ? `
                <button class="modal-track-action-btn track-rename-btn" data-track="${catKey}" data-name="${cat.name}" title="Rename Track">
                  <i class="fa-solid fa-pen"></i>
                </button>
                <button class="modal-track-action-btn track-delete-btn" data-track="${catKey}" data-name="${cat.name}" title="Delete Custom Track">
                  <i class="fa-solid fa-trash-can"></i>
                </button>
              ` : ''}
            </div>
          </div>
          <div class="sound-families-container">
            ${soundFamiliesHTML}
          </div>
        `

        this.soundCategoriesList.appendChild(catCard)
      })

      // Bind Preview Buttons
      this.soundCategoriesList.querySelectorAll('.variation-preview-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const src = btn.dataset.src
          if (src) this.playDirectSound(src)
        })
      })

      // Bind Preview-on-Import Checkboxes inside Sound Library modal
      this.soundCategoriesList.querySelectorAll('.track-preview-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => {
          e.stopPropagation()
          const trackId = cb.dataset.track
          if (trackId) this.setTrackPreviewOnImport(trackId, e.target.checked)
        })
      })

      // Bind Import Buttons inside Sound Library modal
      this.soundCategoriesList.querySelectorAll('.track-import-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation()
          const trackId = btn.dataset.track
          if (trackId) this.triggerBaseSoundImport(trackId)
        })
      })

      // Bind Track Rename Buttons
      this.soundCategoriesList.querySelectorAll('.track-rename-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation()
          const trackId = btn.dataset.track
          const currentName = btn.dataset.name
          if (trackId) this.openRenameTrackModal(trackId, currentName)
        })
      })

      // Bind Track Delete Buttons
      this.soundCategoriesList.querySelectorAll('.track-delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation()
          const trackId = btn.dataset.track
          const trackName = btn.dataset.name
          if (trackId) this.confirmDeleteTrack(trackId, trackName)
        })
      })

      // Bind Sound Delete Buttons
      this.soundCategoriesList.querySelectorAll('.sound-delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation()
          const trackId = btn.dataset.track
          const soundId = btn.dataset.soundId
          const soundName = btn.dataset.name
          if (trackId && soundId) this.confirmDeleteSound(trackId, soundId, soundName)
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

        const isLibOpen = !!(this.libDrawer && this.libDrawer.classList.contains('active'))
        const isSaveModalOpen = !!(this.saveModal && this.saveModal.classList.contains('active'))

        if (isLibOpen && !isSaveModalOpen) {
          if (e.code === 'Space') {
            e.preventDefault()
            this.toggleLibraryPreview()
            return
          }
          if (e.code === 'ArrowLeft') {
            e.preventDefault()
            this.stepLibraryTrack(-1, true)
            return
          }
          if (e.code === 'ArrowRight') {
            e.preventDefault()
            this.stepLibraryTrack(1, true)
            return
          }
          if (e.code === 'Escape') {
            if (this.libMoreMenu && this.libMoreMenu.classList.contains('open')) {
              this.closeLibraryMoreMenu()
              return
            }
            this.closeLibrary()
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
            if (this.addTrackModal && this.addTrackModal.classList.contains('active')) {
              this.closeAddTrackModal()
              break
            }
            if (this.confirmActionModal && this.confirmActionModal.classList.contains('active')) {
              this.closeConfirmActionModal()
              break
            }
            if (this.renameTrackModal && this.renameTrackModal.classList.contains('active')) {
              this.closeRenameTrackModal()
              break
            }
            if (this.clearModal && this.clearModal.classList.contains('active')) {
              this.clearModal.classList.remove('active')
              break
            }
            if (this.uxLawsModal && this.uxLawsModal.classList.contains('active')) {
              this.uxLawsModal.classList.remove('active')
              break
            }
            if (isLibOpen && isSaveModalOpen) {
              this.closeSaveModal()
              break
            }
            this.closeSideDrawer()
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
        const isBuiltinLane = this.isBuiltinTrack(layer.category)
        const customTheme = isBuiltinLane ? null : this.getTrackColorTheme(layer.category, layer.color)

        const laneEl = document.createElement('div')
        laneEl.className = `tl-mini-lane tl-lane-${layer.category}`
        laneEl.dataset.layerId = layer.id
        if (customTheme) {
          this.applyTrackColorVars(laneEl, layer.category, layer.color)
        }

        const labelEl = document.createElement('div')
        labelEl.className = `tl-lane-tag tl-mini-lane-tag ${layer.category}-tint`
        const shortName = (layer.name || layer.category).replace(/primary/i, '').trim().slice(0, 5).toUpperCase()
        labelEl.textContent = shortName
        if (customTheme) {
          labelEl.style.color = customTheme.timelineText
        }
        laneEl.appendChild(labelEl)

        const stepsWrap = document.createElement('div')
        stepsWrap.className = 'tl-lane-steps-grid tl-mini-steps-row'

        for (let s = 0; s < this.totalSteps; s++) {
          const pads = layer.steps[s] || []
          const activePad = pads.find(p => p.active)
          const hasActive = !!activePad

          const stepDot = document.createElement('div')
          let activeSpecific = ''
          if (hasActive) {
            const effectiveCat = activePad.category || layer.category
            if (effectiveCat === 'kick') activeSpecific = 'active-kick kick-active'
            else if (effectiveCat === 'snare') activeSpecific = 'active-snare snare-active'
            else if (effectiveCat === 'hihat') activeSpecific = 'active-hihat hihat-active'
            else {
              activeSpecific = 'active-custom'
              const padTheme = this.getTrackColorTheme(
                effectiveCat,
                effectiveCat === layer.category ? layer.color : null
              )
              if (effectiveCat !== layer.category) {
                this.applyTrackColorVars(stepDot, effectiveCat)
              }
              stepDot.style.background = padTheme.color
              stepDot.style.boxShadow = `0 0 6px ${padTheme.glow}`
            }
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

      // Auto-scroll ruler & track viewports if step is out of view
      this.scrollMatrixToStepIfNeeded(clamped, true)

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
        this.exportBtn.addEventListener('click', () => this.toggleExportModal())
      }
      if (this.closeExportBtn) {
        this.closeExportBtn.addEventListener('click', () => this.closeExportModal())
      }
      if (this.cancelExportBtn) {
        this.cancelExportBtn.addEventListener('click', () => this.closeExportModal())
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

    prepareExportModal() {
      this.updateTimelineMetrics()
      if (this.exportProgressWrap) this.exportProgressWrap.style.display = 'none'
      if (this.exportProgressFill) this.exportProgressFill.style.width = '0%'
      if (this.confirmExportBtn) this.confirmExportBtn.disabled = false
    }

    openExportModal() {
      if (!this.exportModal) return
      this.prepareExportModal()
      this.openSideDrawer('export')
    }

    closeExportModal() {
      this.closeSideDrawer('export')
    }

    toggleExportModal() {
      this.toggleSideDrawer('export', () => this.prepareExportModal())
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
    // 16. Full-Screen Sequence Library & Preview Player Engine
    // ------------------------------------------------------------------------
    escapeHTML(str) {
      return String(str ?? '').replace(/[&<>"']/g, ch => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      })[ch])
    }

    initSequenceLibrary() {
      this.library = this.loadStoredLibrary()
      this.previewSeqId = null
      this.libPreviewTimer = null
      this.libPreviewStep = 0
      this.libPreviewSubTimeouts = []
      this.libPreviewVolume = 0.85
      this.libPreviewMuted = false
      this.libCardDragMoved = false

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
      this.libScrollPrevBtn = document.getElementById('lib-scroll-prev-btn')
      this.libScrollNextBtn = document.getElementById('lib-scroll-next-btn')
      this.libSwipeNextBtn = document.getElementById('lib-swipe-next-btn')
      this.libStorageCountText = document.getElementById('lib-storage-count-text')

      // Bottom Preview Player DOM
      this.libPlayerEl = document.getElementById('lib-preview-player')
      this.libPlayerThumb = document.getElementById('lib-player-thumb')
      this.libPlayerTitle = document.getElementById('lib-player-title')
      this.libPlayerMeta = document.getElementById('lib-player-meta')
      this.libPlayerStatus = document.getElementById('lib-player-status')
      this.libPlayerPrevBtn = document.getElementById('lib-player-prev-btn')
      this.libPlayerToggleBtn = document.getElementById('lib-player-toggle-btn')
      this.libPlayerPlayIcon = document.getElementById('lib-player-play-icon')
      this.libPlayerNextBtn = document.getElementById('lib-player-next-btn')
      this.libPlayerMuteBtn = document.getElementById('lib-player-mute-btn')
      this.libPlayerVolIcon = document.getElementById('lib-player-vol-icon')
      this.libPlayerVolumeInput = document.getElementById('lib-player-volume')
      this.libMoreBtn = document.getElementById('lib-player-more-btn')
      this.libMoreMenu = document.getElementById('lib-player-more-menu')
      this.libMoreLoadBtn = document.getElementById('lib-more-load-btn')
      this.libMoreRenameBtn = document.getElementById('lib-more-rename-btn')
      this.libMoreDuplicateBtn = document.getElementById('lib-more-duplicate-btn')
      this.libMoreDeleteBtn = document.getElementById('lib-more-delete-btn')

      // Save drawer bindings
      if (this.saveSeqBtn) {
        this.saveSeqBtn.addEventListener('click', () => this.toggleSaveModal())
      }
      if (this.closeSaveBtn) {
        this.closeSaveBtn.addEventListener('click', () => this.closeSaveModal())
      }
      if (this.cancelSaveBtn) {
        this.cancelSaveBtn.addEventListener('click', () => this.closeSaveModal())
      }
      if (this.confirmSaveBtn) {
        this.confirmSaveBtn.addEventListener('click', () => {
          const name = this.saveNameInput ? this.saveNameInput.value.trim() : ''
          this.saveCurrentSequence(name)
        })
      }
      if (this.saveNameInput) {
        this.saveNameInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            const name = this.saveNameInput.value.trim()
            this.saveCurrentSequence(name)
          }
        })
      }

      // Library Overlay bindings
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
          this.stopLibraryPreview()
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

      this.bindLibraryCarouselScroll()
      this.bindLibraryPlayerEvents()

      this.updateLibraryBadge()
      this.renderLibraryList('')
    }

    bindLibraryCarouselScroll() {
      if (!this.libList) return

      const scrollByCard = (direction) => {
        const delta = Math.max(320, Math.round(this.libList.clientWidth * 0.72)) * direction
        this.libList.scrollBy({ left: delta, behavior: 'smooth' })
      }

      if (this.libScrollPrevBtn) {
        this.libScrollPrevBtn.addEventListener('click', () => scrollByCard(-1))
      }
      if (this.libScrollNextBtn) {
        this.libScrollNextBtn.addEventListener('click', () => scrollByCard(1))
      }
      if (this.libSwipeNextBtn) {
        this.libSwipeNextBtn.addEventListener('click', () => scrollByCard(1))
      }

      // Map vertical mouse wheel over carousel stage into smooth horizontal scrolling
      this.libList.addEventListener('wheel', (e) => {
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          e.preventDefault()
          this.libList.scrollLeft += e.deltaY * 1.15
          this.updateLibraryScrollNav()
        }
      }, { passive: false })

      // Click-and-drag horizontal panning without hijacking buttons/clicks
      let isPointerDown = false
      let startX = 0
      let startScrollLeft = 0

      this.libList.addEventListener('mousedown', (e) => {
        if (e.button !== 0 || e.target.closest('button, input, a')) return
        isPointerDown = true
        this.libCardDragMoved = false
        startX = e.pageX - this.libList.offsetLeft
        startScrollLeft = this.libList.scrollLeft
        this.libList.classList.add('is-dragging')
      })

      window.addEventListener('mousemove', (e) => {
        if (!isPointerDown) return
        const x = e.pageX - this.libList.offsetLeft
        const walk = x - startX
        if (Math.abs(walk) > 6) {
          this.libCardDragMoved = true
        }
        if (this.libCardDragMoved) {
          this.libList.scrollLeft = startScrollLeft - walk
        }
      })

      const endDrag = () => {
        if (!isPointerDown) return
        isPointerDown = false
        this.libList.classList.remove('is-dragging')
        setTimeout(() => {
          this.libCardDragMoved = false
        }, 40)
      }

      window.addEventListener('mouseup', endDrag)
      this.libList.addEventListener('scroll', () => this.updateLibraryScrollNav(), { passive: true })
      window.addEventListener('resize', () => this.updateLibraryScrollNav())
    }

    updateLibraryScrollNav() {
      if (!this.libList) return
      const maxScroll = Math.max(0, this.libList.scrollWidth - this.libList.clientWidth)
      const current = this.libList.scrollLeft
      if (this.libScrollPrevBtn) {
        this.libScrollPrevBtn.disabled = current <= 6
      }
      if (this.libScrollNextBtn) {
        this.libScrollNextBtn.disabled = current >= maxScroll - 6
      }
      if (this.libSwipeNextBtn) {
        this.libSwipeNextBtn.style.display = maxScroll > 12 ? 'inline-flex' : 'none'
      }
    }

    bindLibraryPlayerEvents() {
      if (this.libPlayerToggleBtn) {
        this.libPlayerToggleBtn.addEventListener('click', () => this.toggleLibraryPreview())
      }
      if (this.libPlayerPrevBtn) {
        this.libPlayerPrevBtn.addEventListener('click', () => this.stepLibraryTrack(-1, true))
      }
      if (this.libPlayerNextBtn) {
        this.libPlayerNextBtn.addEventListener('click', () => this.stepLibraryTrack(1, true))
      }
      if (this.libPlayerMuteBtn) {
        this.libPlayerMuteBtn.addEventListener('click', () => {
          this.libPreviewMuted = !this.libPreviewMuted
          this.syncLibraryVolumeUI()
        })
      }
      if (this.libPlayerVolumeInput) {
        this.libPlayerVolumeInput.addEventListener('input', (e) => {
          const val = parseInt(e.target.value, 10)
          this.libPreviewVolume = isNaN(val) ? 0.85 : Math.max(0, Math.min(1, val / 100))
          if (this.libPreviewVolume > 0 && this.libPreviewMuted) {
            this.libPreviewMuted = false
          }
          this.syncLibraryVolumeUI()
        })
      }
      if (this.libMoreBtn) {
        this.libMoreBtn.addEventListener('click', (e) => {
          e.stopPropagation()
          if (!this.libMoreMenu) return
          const willOpen = !this.libMoreMenu.classList.contains('open')
          this.libMoreMenu.classList.toggle('open', willOpen)
          this.libMoreBtn.setAttribute('aria-expanded', willOpen ? 'true' : 'false')
        })
      }
      if (this.libMoreLoadBtn) {
        this.libMoreLoadBtn.addEventListener('click', () => {
          this.closeLibraryMoreMenu()
          if (this.previewSeqId) this.loadSequence(this.previewSeqId)
        })
      }
      if (this.libMoreRenameBtn) {
        this.libMoreRenameBtn.addEventListener('click', () => {
          this.closeLibraryMoreMenu()
          if (this.previewSeqId) this.renameSequence(this.previewSeqId)
        })
      }
      if (this.libMoreDuplicateBtn) {
        this.libMoreDuplicateBtn.addEventListener('click', () => {
          this.closeLibraryMoreMenu()
          if (this.previewSeqId) this.duplicateSequence(this.previewSeqId)
        })
      }
      if (this.libMoreDeleteBtn) {
        this.libMoreDeleteBtn.addEventListener('click', () => {
          this.closeLibraryMoreMenu()
          if (this.previewSeqId) this.deleteSequence(this.previewSeqId)
        })
      }
      document.addEventListener('click', (e) => {
        if (this.libMoreMenu && this.libMoreMenu.classList.contains('open')) {
          if (!e.target.closest('.lib-more-wrap')) {
            this.closeLibraryMoreMenu()
          }
        }
      })
      this.syncLibraryVolumeUI()
    }

    closeLibraryMoreMenu() {
      if (this.libMoreMenu) this.libMoreMenu.classList.remove('open')
      if (this.libMoreBtn) this.libMoreBtn.setAttribute('aria-expanded', 'false')
    }

    syncLibraryVolumeUI() {
      const effectivePct = this.libPreviewMuted ? 0 : Math.round(this.libPreviewVolume * 100)
      if (this.libPlayerVolumeInput) {
        this.libPlayerVolumeInput.value = effectivePct
      }
      if (this.libPlayerVolIcon) {
        let iconClass = 'fa-solid fa-volume-high'
        if (this.libPreviewMuted || effectivePct === 0) {
          iconClass = 'fa-solid fa-volume-xmark'
        } else if (effectivePct < 45) {
          iconClass = 'fa-solid fa-volume-low'
        }
        this.libPlayerVolIcon.className = iconClass
      }
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

    getSequenceThemeMeta(seq, index = 0) {
      const id = seq.id || ''
      const lower = (seq.name || '').toLowerCase()
      if (id === 'seq-factory-trap' || lower.includes('trap')) {
        return { themeClass: 'theme-purple', genreLabel: 'TRAP • DARK' }
      }
      if (id === 'seq-factory-boombap' || lower.includes('boom') || lower.includes('hip')) {
        return { themeClass: 'theme-amber', genreLabel: 'HIP-HOP • BOOM BAP' }
      }
      if (id === 'seq-factory-techno' || lower.includes('techno') || lower.includes('house')) {
        return { themeClass: 'theme-teal', genreLabel: 'TECHNO • UNDERGROUND' }
      }
      const themes = ['theme-purple', 'theme-amber', 'theme-teal', 'theme-pink', 'theme-blue']
      return {
        themeClass: themes[index % themes.length],
        genreLabel: seq.genre || 'CUSTOM • STUDIO'
      }
    }

    countSequenceActivePads(seq) {
      let activePadCount = 0
      ;(seq.layers || []).forEach(l => {
        ;(l.steps || []).forEach(pads => {
          pads.forEach(p => { if (p.active) activePadCount++ })
        })
      })
      return activePadCount
    }

    buildSequenceWaveHeights(seq, barCount = 34) {
      const totalSteps = Math.max(1, seq.totalSteps || 8)
      const stepEnergy = new Array(totalSteps).fill(0)
      ;(seq.layers || []).forEach(layer => {
        for (let s = 0; s < totalSteps; s++) {
          const pads = (layer.steps && layer.steps[s]) || []
          pads.forEach(p => {
            if (!p.active) return
            const weight = (p.repeat && p.repeat > 1 ? 1.35 : 1) * (layer.category === 'kick' ? 1.45 : 1)
            stepEnergy[s] += weight
          })
        }
      })

      const maxEnergy = Math.max(1, ...stepEnergy)
      const heights = []
      for (let i = 0; i < barCount; i++) {
        const pos = i / Math.max(1, barCount - 1)
        const stepIdx = Math.min(totalSteps - 1, Math.floor(pos * totalSteps))
        const hitNorm = stepEnergy[stepIdx] / maxEnergy
        // Asymmetric studio envelope peaking around first third & tapering cleanly under title
        const envelope = pos < 0.45
          ? 0.45 + 0.55 * Math.sin((pos / 0.45) * Math.PI * 0.65)
          : Math.max(0.14, 1 - (pos - 0.45) * 1.45)
        const ripple = 0.72 + 0.28 * Math.abs(Math.sin(i * 1.47 + totalSteps))
        const pct = Math.round(Math.max(14, Math.min(96, (22 + hitNorm * 58) * envelope * ripple)))
        heights.push(pct)
      }
      return heights
    }

    buildWaveformBarsHTML(heights, className = 'seq-wave-bar') {
      return heights.map((h, idx) =>
        `<span class="${className}" data-bar-index="${idx}" style="--bar-h:${h}%;--bar-idx:${idx};"></span>`
      ).join('')
    }

    getFilteredLibrary(filterText = '') {
      const query = (filterText || '').trim().toLowerCase()
      if (!query) return [...this.library]
      return this.library.filter((seq, idx) => {
        const meta = this.getSequenceThemeMeta(seq, idx)
        return (seq.name || '').toLowerCase().includes(query) ||
          String(seq.bpm || '').includes(query) ||
          meta.genreLabel.toLowerCase().includes(query)
      })
    }

    updateLibraryBadge(visibleCount = null) {
      const total = this.library ? this.library.length : 0
      const displayCount = visibleCount !== null ? visibleCount : total
      if (this.libBadge) this.libBadge.textContent = total
      if (this.libStorageCountText) {
        this.libStorageCountText.textContent = `${displayCount} ${displayCount === 1 ? 'Preset' : 'Presets'}`
      }
    }

    updateSaveModalStats() {
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
    }

    prepareSaveModal() {
      const defaultName = `Pattern ${this.library.length + 1}`
      if (this.saveNameInput) {
        this.saveNameInput.value = defaultName
        setTimeout(() => {
          this.saveNameInput.focus()
          this.saveNameInput.select()
        }, 120)
      }
      this.updateSaveModalStats()
    }

    openSaveModal() {
      if (!this.saveModal) return
      this.prepareSaveModal()
      this.openSideDrawer('save')
    }

    closeSaveModal() {
      this.closeSideDrawer('save')
    }

    toggleSaveModal() {
      this.toggleSideDrawer('save', () => this.prepareSaveModal())
    }

    openLibrary() {
      if (!this.libDrawer || !this.libBackdrop) return
      this.closeSideDrawer()
      const query = this.libSearchInput ? this.libSearchInput.value : ''
      if (!this.previewSeqId || !this.library.some(s => s.id === this.previewSeqId)) {
        const preferred = this.library.find(s => s.id === this.currentSeqId) || this.library[0]
        this.previewSeqId = preferred ? preferred.id : null
      }
      this.renderLibraryList(query)
      this.libDrawer.classList.add('active')
      this.libBackdrop.classList.add('active')
      document.body.classList.add('library-open')
      requestAnimationFrame(() => this.updateLibraryScrollNav())
    }

    closeLibrary() {
      this.stopLibraryPreview()
      this.closeLibraryMoreMenu()
      if (this.libDrawer) this.libDrawer.classList.remove('active')
      if (this.libBackdrop) this.libBackdrop.classList.remove('active')
      document.body.classList.remove('library-open')
    }

    toggleLibrary() {
      if (this.libDrawer && this.libDrawer.classList.contains('active')) {
        this.closeLibrary()
      } else {
        this.openLibrary()
      }
    }

    isLibraryPreviewPlaying() {
      return !!this.libPreviewTimer
    }

    selectLibraryPreview(seqId, scrollIntoView = true) {
      const idx = this.library.findIndex(s => s.id === seqId)
      const seq = idx !== -1 ? this.library[idx] : null
      this.previewSeqId = seq ? seq.id : null

      if (this.libList) {
        this.libList.querySelectorAll('.lib-seq-card').forEach(cardEl => {
          const isMatch = cardEl.dataset.seqId === this.previewSeqId
          cardEl.classList.toggle('is-previewing', isMatch)
          cardEl.classList.toggle('is-playing', isMatch && this.isLibraryPreviewPlaying())
          if (isMatch && scrollIntoView) {
            cardEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
          }
        })
      }

      this.syncLibraryPlayerUI(seq, idx)
    }

    syncLibraryPlayerUI(seq, indexInLib = 0) {
      const hasSeq = !!seq
      const themeClasses = ['theme-purple', 'theme-amber', 'theme-teal', 'theme-pink', 'theme-blue']
      const themeMeta = hasSeq
        ? this.getSequenceThemeMeta(seq, Math.max(0, indexInLib))
        : { themeClass: 'theme-purple', genreLabel: 'NO PRESETS' }

      if (this.libPlayerThumb) {
        themeClasses.forEach(tc => this.libPlayerThumb.classList.remove(tc))
        this.libPlayerThumb.classList.add(themeMeta.themeClass)
        const heights = hasSeq
          ? this.buildSequenceWaveHeights(seq, 16)
          : [28, 46, 62, 40, 74, 52, 84, 58, 44, 68, 36, 54, 30, 42, 26, 20]
        this.libPlayerThumb.innerHTML = this.buildWaveformBarsHTML(heights, 'lib-thumb-bar')
      }

      if (this.libPlayerToggleBtn) {
        themeClasses.forEach(tc => this.libPlayerToggleBtn.classList.remove(tc))
        this.libPlayerToggleBtn.classList.add(themeMeta.themeClass)
        this.libPlayerToggleBtn.disabled = !hasSeq
      }

      const filteredCount = this.getFilteredLibrary(this.libSearchInput ? this.libSearchInput.value : '').length
      if (this.libPlayerPrevBtn) this.libPlayerPrevBtn.disabled = filteredCount <= 1
      if (this.libPlayerNextBtn) this.libPlayerNextBtn.disabled = filteredCount <= 1
      if (this.libMoreBtn) this.libMoreBtn.disabled = !hasSeq

      if (this.libPlayerTitle) {
        this.libPlayerTitle.textContent = hasSeq ? seq.name : 'No preset selected'
      }
      if (this.libPlayerMeta) {
        if (hasSeq) {
          const pads = this.countSequenceActivePads(seq)
          this.libPlayerMeta.textContent = `${seq.bpm || 120} BPM • ${seq.numBeats || 2}B • ${(seq.layers || []).length} Tracks • ${pads} Pads`
        } else {
          this.libPlayerMeta.textContent = 'Save or search a preset to preview'
        }
      }

      this.syncLibraryPlayingStateUI()
    }

    syncLibraryPlayingStateUI() {
      const playing = this.isLibraryPreviewPlaying()
      if (this.libPlayerEl) {
        this.libPlayerEl.classList.toggle('is-playing', playing)
      }
      if (this.libPlayerStatus) {
        this.libPlayerStatus.style.display = playing ? 'inline-flex' : 'none'
      }
      if (this.libPlayerPlayIcon) {
        this.libPlayerPlayIcon.className = playing ? 'fa-solid fa-pause' : 'fa-solid fa-play'
      }
      if (this.libList) {
        this.libList.querySelectorAll('.lib-seq-card').forEach(cardEl => {
          const isTarget = cardEl.dataset.seqId === this.previewSeqId
          cardEl.classList.toggle('is-playing', playing && isTarget)
          if (!playing) {
            cardEl.querySelectorAll('.seq-wave-bar.is-step-active').forEach(b => b.classList.remove('is-step-active'))
          }
        })
      }
    }

    stepLibraryTrack(offset, autoPlay = true) {
      const filtered = this.getFilteredLibrary(this.libSearchInput ? this.libSearchInput.value : '')
      if (filtered.length === 0) return

      const currentIdx = filtered.findIndex(s => s.id === this.previewSeqId)
      const nextIdx = currentIdx === -1
        ? 0
        : (currentIdx + offset + filtered.length) % filtered.length
      const nextSeq = filtered[nextIdx]
      const shouldPlay = autoPlay || this.isLibraryPreviewPlaying()

      this.stopLibraryPreview()
      this.selectLibraryPreview(nextSeq.id, true)
      if (shouldPlay) {
        this.startLibraryPreview()
      }
    }

    toggleLibraryPreview(targetSeqId = null) {
      if (targetSeqId && targetSeqId !== this.previewSeqId) {
        this.stopLibraryPreview()
        this.selectLibraryPreview(targetSeqId, true)
        this.startLibraryPreview()
        return
      }
      if (this.isLibraryPreviewPlaying()) {
        this.stopLibraryPreview()
      } else {
        this.startLibraryPreview()
      }
    }

    startLibraryPreview() {
      this.ensureAudioContextRunning()
      const filtered = this.getFilteredLibrary(this.libSearchInput ? this.libSearchInput.value : '')
      if (filtered.length === 0) return

      let seq = filtered.find(s => s.id === this.previewSeqId)
      if (!seq) {
        seq = filtered[0]
        this.selectLibraryPreview(seq.id, true)
      }

      // Pause main deck if running so workspace audio never clashes with library preview
      if (this.isPlaying) {
        this.stop(false)
      }

      this.stopLibraryPreview()
      this.libPreviewStep = 0
      const intervalMs = (60 / (seq.bpm || 120)) * 1000 / 2

      this.stepLibraryPreview()
      this.libPreviewTimer = setInterval(() => {
        this.stepLibraryPreview()
      }, intervalMs)
      this.syncLibraryPlayingStateUI()
    }

    stopLibraryPreview() {
      if (this.libPreviewTimer) {
        clearInterval(this.libPreviewTimer)
        this.libPreviewTimer = null
      }
      if (this.libPreviewSubTimeouts && this.libPreviewSubTimeouts.length > 0) {
        this.libPreviewSubTimeouts.forEach(t => clearTimeout(t))
        this.libPreviewSubTimeouts = []
      }
      this.libPreviewStep = 0
      this.syncLibraryPlayingStateUI()
    }

    stepLibraryPreview() {
      const seq = this.library.find(s => s.id === this.previewSeqId)
      if (!seq) {
        this.stopLibraryPreview()
        return
      }

      const totalSteps = Math.max(1, seq.totalSteps || 8)
      const currentStep = this.libPreviewStep % totalSteps
      this.libPreviewStep = (currentStep + 1) % totalSteps

      const layers = seq.layers || []
      const hasAnySolo = layers.some(l => l.solo)
      const stepIntervalMs = (60 / (seq.bpm || 120)) * 1000 / 2
      const masterGain = this.libPreviewMuted ? 0 : this.libPreviewVolume

      if (masterGain > 0) {
        layers.forEach(layer => {
          if (hasAnySolo && !layer.solo) return
          if (layer.muted) return
          const padsAtStep = (layer.steps && layer.steps[currentStep]) || []
          padsAtStep.forEach(pad => {
            if (!pad.active) return
            const soundFile = this.resolveSoundFile(pad.category, pad.soundFamily, pad.intensity)
            const vol = Math.max(0, Math.min(1, (pad.volume !== undefined ? pad.volume : 1) * (layer.volume !== undefined ? layer.volume : 1) * masterGain))
            const repeatCount = pad.repeat || 1
            if (repeatCount === 1) {
              this.playPadSound(soundFile, vol)
            } else {
              for (let r = 0; r < repeatCount; r++) {
                const delay = (r * stepIntervalMs) / repeatCount
                if (delay === 0) {
                  this.playPadSound(soundFile, vol)
                } else {
                  const tId = setTimeout(() => {
                    if (this.isLibraryPreviewPlaying() && this.previewSeqId === seq.id) {
                      this.playPadSound(soundFile, vol)
                    }
                  }, delay)
                  this.libPreviewSubTimeouts.push(tId)
                }
              }
            }
          })
        })
      }

      // Sweep bar highlight across the playing card's waveform
      if (this.libList) {
        const activeCard = Array.from(this.libList.querySelectorAll('.lib-seq-card'))
          .find(el => el.dataset.seqId === seq.id)
        if (activeCard) {
          const bars = activeCard.querySelectorAll('.seq-wave-bar')
          const totalBars = bars.length
          if (totalBars > 0) {
            const bandSize = Math.max(2, Math.ceil(totalBars / totalSteps))
            const bandStart = Math.floor((currentStep / totalSteps) * totalBars)
            bars.forEach((bar, bIdx) => {
              const inBand = bIdx >= bandStart && bIdx < bandStart + bandSize
              bar.classList.toggle('is-step-active', inBand)
            })
          }
        }
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
          color: layer.color || this.getTrackColor(layer.category) || null,
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
      this.currentSeqId = newSeq.id
      this.previewSeqId = newSeq.id
      this.saveStoredLibrary()
      this.renderLibraryList(this.libSearchInput ? this.libSearchInput.value : '')
      this.closeSaveModal()
      this.showToast(`Saved sequence: "${seqName}"`, 'success')
      this.playPadSound(this.resolveSoundFile('snare', 'snare-808', 'high'), 0.8)
    }

    loadSequence(seqId) {
      const seq = this.library.find(s => s.id === seqId)
      if (!seq) return

      // Stop playback if running (both main transport and library preview)
      this.stopLibraryPreview()
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
        const layerColor = this.isBuiltinTrack(layerData.category)
          ? null
          : this.getTrackColor(layerData.category, layerData.color)

        const restoredLayer = {
          id: layerData.id,
          badge: layerData.badge,
          name: layerData.name,
          category: layerData.category,
          color: layerColor,
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
        } else if (!this.isBuiltinTrack(restoredLayer.category)) {
          const trackObj = {
            id: restoredLayer.category,
            name: restoredLayer.name,
            trackNumber: parseInt(restoredLayer.badge, 10) || 4,
            color: restoredLayer.color,
            baseTrackSound: restoredLayer.soundFamily,
            type: 'custom'
          }
          this.createCustomTrackDOM(trackObj)
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
      this.currentSeqId = seq.id
      this.renderTrackpadRuler()
      this.renderTrackpadLanes()
      this.updateTimelineMetrics()

      this.closeLibrary()
      this.showToast(`Sequence loaded: "${seq.name}"`, 'success')
      this.playPadSound(this.resolveSoundFile('kick', 'kick-808', 'high'), 0.9)
      this.saveActiveSession()
    }

    deleteSequence(seqId) {
      const idx = this.library.findIndex(s => s.id === seqId)
      if (idx === -1) return
      const removedName = this.library[idx].name
      if (!confirm(`Are you sure you want to delete sequence "${removedName}"?`)) return
      if (this.previewSeqId === seqId) {
        this.stopLibraryPreview()
      }
      this.library.splice(idx, 1)
      if (this.currentSeqId === seqId) {
        this.currentSeqId = null
      }
      if (this.previewSeqId === seqId) {
        const fallback = this.library[Math.min(idx, this.library.length - 1)] || null
        this.previewSeqId = fallback ? fallback.id : null
      }
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

    duplicateSequence(seqId) {
      const idx = this.library.findIndex(s => s.id === seqId)
      if (idx === -1) return
      const source = this.library[idx]
      const copy = JSON.parse(JSON.stringify(source))
      copy.id = `seq-${Date.now()}-${Math.floor(Math.random() * 1000)}`
      copy.name = `${source.name} (Copy)`
      copy.createdAt = 'Duplicated Preset'
      this.library.splice(idx + 1, 0, copy)
      this.previewSeqId = copy.id
      this.saveStoredLibrary()
      this.renderLibraryList(this.libSearchInput ? this.libSearchInput.value : '')
      this.selectLibraryPreview(copy.id, true)
      this.showToast(`Duplicated "${source.name}"`, 'success')
    }

    renderLibraryList(filterText = '') {
      if (!this.libList) return
      this.libList.innerHTML = ''

      const query = (filterText || '').trim().toLowerCase()
      const filtered = this.getFilteredLibrary(filterText)
      this.updateLibraryBadge(filtered.length)
      this.libList.classList.toggle('is-single-result', filtered.length === 1)

      if (filtered.length === 0) {
        if (this.isLibraryPreviewPlaying()) {
          this.stopLibraryPreview()
        }
        this.syncLibraryPlayerUI(null, -1)
        this.libList.innerHTML = `
          <div class="lib-empty-state">
            <div class="empty-icon-wrap">
              <i class="fa-solid fa-folder-open"></i>
            </div>
            <h3 class="empty-title">${query ? 'No matching presets' : 'Your Library is empty'}</h3>
            <p class="empty-desc">${query ? 'Try searching by preset name, genre, or BPM.' : 'Save your first custom beat pattern to keep it here.'}</p>
          </div>
        `
        this.updateLibraryScrollNav()
        return
      }

      // Ensure preview selection stays valid inside filtered items
      if (!this.previewSeqId || !filtered.some(s => s.id === this.previewSeqId)) {
        if (this.isLibraryPreviewPlaying()) {
          this.stopLibraryPreview()
        }
        const preferred = filtered.find(s => s.id === this.currentSeqId) || filtered[0]
        this.previewSeqId = preferred ? preferred.id : null
      }

      filtered.forEach(seq => {
        const libIdx = this.library.findIndex(s => s.id === seq.id)
        const themeMeta = this.getSequenceThemeMeta(seq, Math.max(0, libIdx))
        const activePadCount = this.countSequenceActivePads(seq)
        const waveHeights = this.buildSequenceWaveHeights(seq, 34)
        const waveHTML = this.buildWaveformBarsHTML(waveHeights, 'seq-wave-bar')
        const isCurrentActive = this.currentSeqId === seq.id
        const isPreviewTarget = this.previewSeqId === seq.id
        const isPlayingThis = isPreviewTarget && this.isLibraryPreviewPlaying()
        const safeName = this.escapeHTML(seq.name)
        const safeMetaLine = this.escapeHTML(`${themeMeta.genreLabel} • ${seq.bpm || 120} BPM`)
        const safeDate = this.escapeHTML(seq.createdAt || 'Saved Beat')

        const card = document.createElement('div')
        card.className = `lib-seq-card ${themeMeta.themeClass} ${isCurrentActive ? 'is-active-seq' : ''} ${isPreviewTarget ? 'is-previewing' : ''} ${isPlayingThis ? 'is-playing' : ''}`
        card.dataset.seqId = seq.id
        card.setAttribute('role', 'listitem')

        card.innerHTML = `
          <div class="seq-card-manage">
            <button type="button" class="seq-action-btn rename-action-btn" title="Rename preset" aria-label="Rename sequence ${safeName}">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button type="button" class="seq-action-btn delete-seq delete-action-btn" title="Delete preset" aria-label="Delete sequence ${safeName}">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>

          <div class="seq-card-stage">
            <div class="seq-card-waveform" aria-hidden="true">
              ${waveHTML}
            </div>

            <div class="seq-card-headline">
              <div class="seq-card-title-line">
                ${isCurrentActive ? '<span class="seq-active-badge"><i class="fa-solid fa-circle-check"></i> ACTIVE</span>' : ''}
                <h4 class="seq-card-title" title="${safeName}">${safeName}</h4>
              </div>
              <div class="seq-genre-pill">
                <i class="fa-solid fa-music"></i>
                <span>${safeMetaLine}</span>
              </div>
            </div>
          </div>

          <div class="seq-card-badges seq-card-tags">
            <span class="seq-badge seq-tag tag-length" title="Sequence Length"><i class="fa-solid fa-music"></i> ${seq.numBeats || 2}B (${seq.totalSteps || 8}S)</span>
            <span class="seq-badge seq-tag tag-tracks" title="Active Instrument Tracks"><i class="fa-solid fa-layer-group"></i> ${(seq.layers || []).length} Tracks</span>
            <span class="seq-badge seq-tag tag-pads" title="Active Trigger Pads"><i class="fa-solid fa-table-cells"></i> ${activePadCount} Pads</span>
          </div>

          <div class="seq-card-footer">
            <span class="seq-card-date"><i class="fa-regular fa-clock"></i> ${safeDate}</span>
            <button type="button" class="card-action-btn seq-load-btn load-action-btn" title="Load this sequence into sequencer" aria-label="Load sequence ${safeName}">
              <i class="fa-solid fa-play"></i>
              <span>LOAD</span>
            </button>
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
          if (this.libCardDragMoved) return
          this.toggleLibraryPreview(seq.id)
        })

        this.libList.appendChild(card)
      })

      const activePreviewSeq = filtered.find(s => s.id === this.previewSeqId) || filtered[0]
      const activeIdx = this.library.findIndex(s => s.id === activePreviewSeq.id)
      this.syncLibraryPlayerUI(activePreviewSeq, activeIdx)
      requestAnimationFrame(() => this.updateLibraryScrollNav())
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
        if (type === 'warning' || type === 'error') iconHtml = '<i class="fa-solid fa-triangle-exclamation"></i>'
        if (type === 'info') iconHtml = '<i class="fa-solid fa-info"></i>'
        iconWrap.innerHTML = iconHtml
        iconWrap.className = `toast-icon-wrap ${type}`
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

  // Expose kit on window for programmatic testing & inspection
  window.__drumKit = kit
})
