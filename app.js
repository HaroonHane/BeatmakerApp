/**
 * BEATMAKER STUDIO | DRUM SEQUENCER ENGINE
 * Crafted with Pinterest/Dribbble Hardware Studio Aesthetics
 * Built following the 8 Laws of UX with Categorized Assets & 5-Tier Intensity Variations
 */

document.addEventListener('DOMContentLoaded', () => {
  class DrumKit {
    constructor() {
      // Manifest reference
      this.manifest = window.SOUND_MANIFEST || null

      // Sequencer playback state
      this.isPlaying = null
      this.index = 0
      this.bpm = 150
      this.tapTimes = []

      // Track states: Mute, Solo, Volume, Sound Family & 5-Tier Intensity
      this.trackStates = {
        kick: {
          muted: false,
          solo: false,
          volume: 1.0,
          soundFamily: 'kick-classic',
          intensity: 'med'
        },
        snare: {
          muted: false,
          solo: false,
          volume: 1.0,
          soundFamily: 'snare-acoustic',
          intensity: 'med'
        },
        hihat: {
          muted: false,
          solo: false,
          volume: 1.0,
          soundFamily: 'hihat-808',
          intensity: 'med'
        }
      }

      // Preset Beat Patterns (8 steps) with Dedicated Sound Families & Intensity Variations
      this.presets = {
        trap: {
          bpm: 140,
          kick: [0, 4, 6],
          snare: [2, 6],
          hihat: [0, 1, 2, 3, 4, 5, 6, 7],
          soundFamilies: { kick: 'kick-808', snare: 'snare-808', hihat: 'hihat-808' },
          intensities: { kick: 'high', snare: 'med-high', hihat: 'med' }
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
      this.pads = document.querySelectorAll('.pad')
      this.playBtn = document.querySelector('.play')
      this.playText = document.querySelector('.play-text')
      this.clearBtn = document.querySelector('.clear-btn')
      this.statusBadge = document.getElementById('status-badge')
      this.statusLabel = this.statusBadge ? this.statusBadge.querySelector('.status-label') : null

      // Audio Elements
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
      // Sync track audio elements to default base variation
      this.updateTrackAudio('kick')
      this.updateTrackAudio('snare')
      this.updateTrackAudio('hihat')

      this.bindPadEvents()
      this.bindTransportEvents()
      this.bindTempoEvents()
      this.bindTrackControls()
      this.bindIntensityEvents()
      this.bindPresetEvents()
      this.bindModalEvents()
      this.bindKeyboardShortcuts()
      this.renderSoundAssetsModal()
    }

    // ------------------------------------------------------------------------
    // Sound Mapping & Asset Resolution
    // ------------------------------------------------------------------------
    getTrackAudioSrc(track) {
      const state = this.trackStates[track]
      if (this.manifest && this.manifest.categories && this.manifest.categories[track]) {
        const cat = this.manifest.categories[track]
        const soundData = cat.sounds[state.soundFamily]
        if (soundData && soundData.variations && soundData.variations[state.intensity]) {
          return soundData.variations[state.intensity].file
        }
        if (soundData && soundData.baseFile) {
          return soundData.baseFile
        }
      }

      // Hardcoded fallback if manifest unavailable
      if (track === 'kick') return './sounds/kick/base/kick-classic.wav'
      if (track === 'snare') return './sounds/snare/base/snare-acoustic01.wav'
      return './sounds/hihat/base/hihat-808.wav'
    }

    updateTrackAudio(track) {
      const src = this.getTrackAudioSrc(track)
      let audioElement
      if (track === 'kick') audioElement = this.kickPadAudio
      else if (track === 'snare') audioElement = this.snarePadAudio
      else if (track === 'hihat') audioElement = this.hihatPadAudio

      if (audioElement) {
        audioElement.src = src
      }
    }

    // ------------------------------------------------------------------------
    // Audio Engine: Trigger Sample with Zero Latency & Overlap
    // ------------------------------------------------------------------------
      playSample(track, overrideIntensity = null) {
        // Check Solo logic: if any track is soloed, only soloed tracks play
        const hasSolo = Object.values(this.trackStates).some(s => s.solo)
        if (hasSolo && !this.trackStates[track].solo) {
          return
        }

        // Check Mute logic
        if (this.trackStates[track].muted) {
          return
        }

        // If override intensity is provided and different from track default, play custom sample variation
        if (overrideIntensity && this.manifest && this.manifest.categories && this.manifest.categories[track]) {
          const soundId = this.trackStates[track].soundFamily
          const cat = this.manifest.categories[track]
          const soundData = cat.sounds[soundId]
          if (soundData && soundData.variations && soundData.variations[overrideIntensity]) {
            const directAudio = new Audio(soundData.variations[overrideIntensity].file)
            directAudio.volume = this.trackStates[track].volume
            directAudio.play().catch(() => { })
            this.pulseMeter(track)
            return
          }
        }

        let audioElement
        switch (track) {
          case 'kick':
            audioElement = this.kickPadAudio
            break
          case 'snare':
            audioElement = this.snarePadAudio
            break
          case 'hihat':
            audioElement = this.hihatPadAudio
            break
        }

        if (audioElement && audioElement.src) {
          // Clone audio element for seamless overlapping hits at high tempos
          const soundClone = audioElement.cloneNode()
          soundClone.volume = this.trackStates[track].volume
          soundClone.currentTime = 0
          const playPromise = soundClone.play()
          if (playPromise !== undefined) {
            playPromise.catch(() => {
              // Audio autoplay policy fallback
            })
          }

          // Trigger VU Meter animation
          this.pulseMeter(track)
        }
      }

      playDirectSound(fileSrc) {
        if (!fileSrc) return
        const audio = new Audio(fileSrc)
        audio.volume = 0.95
        audio.play().catch(() => { })
      }

      // Pulse mini VU meter
      pulseMeter(track) {
        const meter = this.meters[track]
        if (meter) {
          meter.style.height = '100%'
          setTimeout(() => {
            meter.style.height = '0%'
          }, 120)
        }
      }

      // Pulse Visualizer Bars (Simulated audio spectrum)
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
      // Sequencer Core Loop (Doherty Threshold & Von Restorff Isolation)
      // ------------------------------------------------------------------------
      repeatAnimation() {
        const currentStep = this.index % 8
        this.index++

        // 1. Update Top Step Column Dots & Headings
        document.querySelectorAll('.step-dot').forEach(dot => {
          dot.classList.remove('active')
        })
        const activeStepDots = document.querySelectorAll(`.step-dot[data-step="${currentStep}"]`)
        activeStepDots.forEach(dot => dot.classList.add('active'))

        // 2. Query and trigger active pads for this step
        const stepPads = document.querySelectorAll(`.b${currentStep}`)
        let anySoundTriggered = false

        stepPads.forEach(pad => {
          // Apply tactile hit animation
          pad.style.animation = 'triger 0.22s ease-out'

          if (pad.classList.contains('active')) {
            const padIntensity = pad.dataset.intensity || null
            if (pad.classList.contains('kick-pad')) {
              this.playSample('kick', padIntensity)
              anySoundTriggered = true
            }
            if (pad.classList.contains('snare-pad')) {
              this.playSample('snare', padIntensity)
              anySoundTriggered = true
            }
            if (pad.classList.contains('hihat-pad')) {
              this.playSample('hihat', padIntensity)
              anySoundTriggered = true
            }
          }
        })

        if (anySoundTriggered) {
          this.pulseVisualizer()
        }
      }

      // ------------------------------------------------------------------------
      // Transport Controls (Play / Stop)
      // ------------------------------------------------------------------------
      start() {
        const interval = (60 / this.bpm) * 1000 / 2 // 8-step resolution (8th notes)

        if (!this.isPlaying) {
          // Start playback
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

          // Play immediately on click then repeat interval
          this.repeatAnimation()
          this.isPlaying = setInterval(() => {
            this.repeatAnimation()
            this.pads.forEach(pad => {
              pad.addEventListener('animationend', function () {
                this.style.animation = ''
              }, { once: true })
            })
          }, interval)
        } else {
          // Stop playback
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

        // Clear step indicator dots
        document.querySelectorAll('.step-dot').forEach(dot => {
          dot.classList.remove('active')
        })

        this.index = 0
      }

      // ------------------------------------------------------------------------
      // Pad Events (Doherty Instant Feedback on Tap & Velocity Cycling)
      // ------------------------------------------------------------------------
      bindPadEvents() {
        this.pads.forEach(pad => {
            // Left-Click: Toggle pad active / inactive
            pad.addEventListener('click', (e) => {
              if (e.shiftKey) {
                // Shift+Click acts like velocity cycling
                this.cyclePadIntensity(pad)
                return
              }

              pad.classList.toggle('active')
                if (!pad.classList.contains('active')) {
                  pad.classList.remove('ghost', 'accent')
                  delete pad.dataset.intensity
                } else {
                  const track = pad.dataset.track || (
                    pad.classList.contains('kick-pad') ? 'kick' :
                      pad.classList.contains('snare-pad') ? 'snare' : 'hihat'
                  )
                  this.playSample(track)
                }
              })

            // Right-Click: Velocity / Intensity cycling (Low -> Med -> High -> Low)
            pad.addEventListener('contextmenu', (e) => {
              e.preventDefault()
              this.cyclePadIntensity(pad)
            })
          })
        }

    cyclePadIntensity(pad) {
          const track = pad.dataset.track || (
            pad.classList.contains('kick-pad') ? 'kick' :
              pad.classList.contains('snare-pad') ? 'snare' : 'hihat'
          )

      if(!pad.classList.contains('active')) {
          pad.classList.add('active')
          pad.dataset.intensity = 'med'
          pad.classList.remove('ghost', 'accent')
        } else {
          const current = pad.dataset.intensity || 'med'
          if (current === 'med') {
            pad.dataset.intensity = 'high'
            pad.classList.remove('ghost')
            pad.classList.add('accent')
          } else if (current === 'high') {
            pad.dataset.intensity = 'low'
            pad.classList.remove('accent')
            pad.classList.add('ghost')
          } else {
            pad.dataset.intensity = 'med'
            pad.classList.remove('ghost', 'accent')
          }
        }

        this.playSample(track, pad.dataset.intensity)
      }

      // ------------------------------------------------------------------------
      // 5-Tier Intensity Variations Events
      // ------------------------------------------------------------------------
      bindIntensityEvents() {
        document.querySelectorAll('.intensity-station').forEach(station => {
          const track = station.dataset.track
          const pills = station.querySelectorAll('.intensity-pill')
          pills.forEach(pill => {
            pill.addEventListener('click', () => {
              const intensity = pill.dataset.intensity
              this.trackStates[track].intensity = intensity

              // Update active pill visual state
              pills.forEach(p => p.classList.remove('active'))
              pill.classList.add('active')

              // Update track audio source & play instant audition preview
              this.updateTrackAudio(track)
              this.playSample(track)
            })
          })
        })
      }

      // ------------------------------------------------------------------------
      // Tempo / BPM Controls
      // ------------------------------------------------------------------------
      setTempo(val) {
        let bpm = parseInt(val, 10)
        if (isNaN(bpm)) bpm = 120
        bpm = Math.max(20, Math.min(300, bpm))
        this.bpm = bpm

        if (this.tempoSlider) this.tempoSlider.value = bpm
        if (this.tempoNumber) this.tempoNumber.textContent = bpm

        // If running, restart interval smoothly without stopping
        if (this.isPlaying) {
          clearInterval(this.isPlaying)
          const interval = (60 / this.bpm) * 1000 / 2
          this.isPlaying = setInterval(() => {
            this.repeatAnimation()
            this.pads.forEach(pad => {
              pad.addEventListener('animationend', function () {
                this.style.animation = ''
              }, { once: true })
            })
          }, interval)
        }
      }

      bindTempoEvents() {
        if (this.tempoSlider) {
          this.tempoSlider.addEventListener('input', (e) => {
            this.setTempo(e.target.value)
          })
        }

        // BPM Stepper Nudge Buttons
        const btnMinus5 = document.getElementById('bpm-minus-5')
        const btnMinus1 = document.getElementById('bpm-minus-1')
        const btnPlus1 = document.getElementById('bpm-plus-1')
        const btnPlus5 = document.getElementById('bpm-plus-5')

        if (btnMinus5) btnMinus5.addEventListener('click', () => this.setTempo(this.bpm - 5))
        if (btnMinus1) btnMinus1.addEventListener('click', () => this.setTempo(this.bpm - 1))
        if (btnPlus1) btnPlus1.addEventListener('click', () => this.setTempo(this.bpm + 1))
        if (btnPlus5) btnPlus5.addEventListener('click', () => this.setTempo(this.bpm + 5))

        // Tap Tempo functionality
        if (this.tapTempoBtn) {
          this.tapTempoBtn.addEventListener('click', () => {
            const now = Date.now()
            // Discard taps older than 2.5 seconds
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

            // Visual feedback on tap
            this.tapTempoBtn.style.transform = 'scale(0.92)'
            setTimeout(() => {
              this.tapTempoBtn.style.transform = ''
            }, 100)
          })
        }
      }

      // ------------------------------------------------------------------------
      // Track Channel Controls (Mute, Solo, Volume, Sample Select, Audition)
      // ------------------------------------------------------------------------
      bindTrackControls() {
        // Mute Buttons
        ['kick', 'snare', 'hihat'].forEach(track => {
          const muteBtn = document.getElementById(`${track}-mute`)
          if (muteBtn) {
            muteBtn.addEventListener('click', () => {
              this.trackStates[track].muted = !this.trackStates[track].muted
              muteBtn.classList.toggle('active', this.trackStates[track].muted)

              // Update mute icon
              const icon = muteBtn.querySelector('i')
              if (icon) {
                icon.className = this.trackStates[track].muted
                  ? 'fa-solid fa-volume-xmark'
                  : 'fa-solid fa-volume-high'
              }

              // Update parent track channel row visual state
              const trackRow = document.querySelector(`.track-channel[data-track="${track}"]`)
              if (trackRow) {
                trackRow.classList.toggle('is-muted', this.trackStates[track].muted)
              }
            })
          }

          // Solo Buttons
          const soloBtn = document.getElementById(`${track}-solo`)
          if (soloBtn) {
            soloBtn.addEventListener('click', () => {
              this.trackStates[track].solo = !this.trackStates[track].solo
              soloBtn.classList.toggle('active', this.trackStates[track].solo)
              this.updateSoloState()
            })
          }

          // Audition Buttons (Play sample preview)
          const auditionBtn = document.querySelector(`.audition-btn[data-audition="${track}"]`)
          if (auditionBtn) {
            auditionBtn.addEventListener('click', () => {
              this.playSample(track)
            })
          }

          // Volume Sliders
          const volumeSlider = document.getElementById(`${track}-volume`)
          if (volumeSlider) {
            volumeSlider.addEventListener('input', (e) => {
              const val = parseInt(e.target.value, 10)
              this.trackStates[track].volume = val / 100
              const display = volumeSlider.nextElementSibling
              if (display && display.classList.contains('volume-value')) {
                display.textContent = `${val}%`
              }
            })
          }

          // Categorized Sound Family Selectors
          const sampleSelect = document.getElementById(`${track}-beat-audio`)
          if (sampleSelect) {
            sampleSelect.addEventListener('change', (e) => {
              const selectedOption = sampleSelect.options[sampleSelect.selectedIndex]
              const soundId = selectedOption.dataset.soundId || this.fallbackExtractSoundId(track, e.target.value)

              this.trackStates[track].soundFamily = soundId
              this.updateTrackAudio(track)

              // Instant preview on sample family switch
              this.playSample(track)
            })
          }
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

      // Refresh visual state when Solo buttons change
      updateSoloState() {
        const hasSolo = Object.values(this.trackStates).some(s => s.solo)
        ['kick', 'snare', 'hihat'].forEach(track => {
          const trackRow = document.querySelector(`.track-channel[data-track="${track}"]`)
          if (trackRow) {
            if (hasSolo) {
              trackRow.classList.toggle('is-dimmed', !this.trackStates[track].solo)
            } else {
              trackRow.classList.remove('is-dimmed')
            }
          }
        })
      }

      // ------------------------------------------------------------------------
      // Programmatic Track Sound & Intensity Controls
      // ------------------------------------------------------------------------
      setTrackIntensity(track, intensity) {
        if (!this.trackStates[track]) return
        this.trackStates[track].intensity = intensity

        const station = document.querySelector(`.intensity-station[data-track="${track}"]`)
        if (station) {
          const pills = station.querySelectorAll('.intensity-pill')
          pills.forEach(p => p.classList.toggle('active', p.dataset.intensity === intensity))
        }

        this.updateTrackAudio(track)
      }

      setTrackSoundFamily(track, soundId) {
        if (!this.trackStates[track]) return
        this.trackStates[track].soundFamily = soundId

        const select = document.getElementById(`${track}-beat-audio`)
        if (select) {
          for (let i = 0; i < select.options.length; i++) {
            if (select.options[i].dataset.soundId === soundId || select.options[i].value.includes(soundId)) {
              select.selectedIndex = i
              break
            }
          }
        }

        this.updateTrackAudio(track)
      }

      // ------------------------------------------------------------------------
      // Presets & Random Pattern Generator (Hick's Law)
      // ------------------------------------------------------------------------
      loadPreset(presetKey) {
        const preset = this.presets[presetKey]
        if (!preset) return

        // Clear current grid
        this.clearAllPads()

        // Set preset BPM
        if (preset.bpm) {
          this.setTempo(preset.bpm)
        }

        // Apply preset sound families and intensity variations
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

        // Activate corresponding pads
        ['kick', 'snare', 'hihat'].forEach(track => {
          const activeSteps = preset[track] || []
          activeSteps.forEach(step => {
            const pad = document.querySelector(`.pad.${track}-pad.b${step}`)
            if (pad) {
              pad.classList.add('active')
            }
          })
        })

        // Audio feedback: play Kick to signal loaded pattern
        this.playSample('kick')
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

        // Randomize Sound Families & Intensity Levels
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

        // Generate musically coherent groove
        // Kick on 0 and 4 or random
        const kickSteps = [0, 4]
        if (Math.random() > 0.5) kickSteps.push(2)
        if (Math.random() > 0.6) kickSteps.push(6)

        // Snare on 2 and 6
        const snareSteps = [2, 6]
        if (Math.random() > 0.7) snareSteps.push(7)

        // Hi-hat regular rhythm or syncopated
        const hihatSteps = []
        for (let i = 0; i < 8; i++) {
          if (i % 2 === 0 || Math.random() > 0.35) {
            hihatSteps.push(i)
          }
        }

        kickSteps.forEach(step => {
          const pad = document.querySelector(`.pad.kick-pad.b${step}`)
          if (pad) pad.classList.add('active')
        })
        snareSteps.forEach(step => {
          const pad = document.querySelector(`.pad.snare-pad.b${step}`)
          if (pad) pad.classList.add('active')
        })
        hihatSteps.forEach(step => {
          const pad = document.querySelector(`.pad.hihat-pad.b${step}`)
          if (pad) pad.classList.add('active')
        })

        this.playSample('kick')
      }

      // ------------------------------------------------------------------------
      // Clear Modal & Pad Clearing
      // ------------------------------------------------------------------------
      clearAllPads() {
        this.pads.forEach(pad => {
          pad.classList.remove('active', 'ghost', 'accent')
          delete pad.dataset.intensity
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
        // Clear Confirmation Modal
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
            if (e.target === this.clearModal) {
              this.clearModal.classList.remove('active')
            }
          })
        }

        // 8 UX Laws Modal
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
            if (e.target === this.uxLawsModal) {
              this.uxLawsModal.classList.remove('active')
            }
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
            if (e.target === this.soundAssetsModal) {
              this.soundAssetsModal.classList.remove('active')
            }
          })
        }
      }

      // ------------------------------------------------------------------------
      // Sound Assets Inspector Modal Renderer
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

        // Bind direct preview clicks in the inspector
        this.soundCategoriesList.querySelectorAll('.variation-preview-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const src = btn.dataset.src
            this.playDirectSound(src)
          })
        })
      }

      // ------------------------------------------------------------------------
      // Keyboard Shortcuts (Doherty Threshold Power User Ergonomics)
      // ------------------------------------------------------------------------
      bindKeyboardShortcuts() {
        window.addEventListener('keydown', (e) => {
          // Prevent hotkeys when user is actively interacting with an input or select
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
                if (this.clearModal.classList.contains('active')) {
                  this.clearModal.classList.remove('active')
                } else {
                  this.clearModal.classList.add('active')
                }
              }
              break
            case 'KeyT':
              e.preventDefault()
              if (this.tapTempoBtn) {
                this.tapTempoBtn.click()
              }
              break
            case 'Digit1':
              this.playSample('kick')
              break
            case 'Digit2':
              this.playSample('snare')
              break
            case 'Digit3':
              this.playSample('hihat')
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
              break
          }
        })
      }
    }

    // Initialize Studio Kit
    const kit = new DrumKit()

  // Load a default energetic Trap 808 preset pattern on launch
  kit.loadPreset('trap')
  })
