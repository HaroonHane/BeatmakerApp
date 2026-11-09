/**
 * BEATMAKER STUDIO | DRUM SEQUENCER ENGINE
 * Crafted with Pinterest/Dribbble Hardware Studio Aesthetics
 * Built following the 8 Laws of UX
 */

document.addEventListener('DOMContentLoaded', () => {
  class DrumKit {
    constructor() {
      // Sequencer state
      this.isPlaying = null
      this.index = 0
      this.bpm = 150
      this.tapTimes = []

      // Track states: Mute & Solo
      this.trackStates = {
        kick: { muted: false, solo: false, volume: 1.0 },
        snare: { muted: false, solo: false, volume: 1.0 },
        hihat: { muted: false, solo: false, volume: 1.0 }
      }

      // Preset Beat Patterns (8 steps)
      this.presets = {
        trap: {
          bpm: 140,
          kick: [0, 4, 6],
          snare: [2, 6],
          hihat: [0, 1, 2, 3, 4, 5, 6, 7]
        },
        boombap: {
          bpm: 92,
          kick: [0, 3, 5],
          snare: [2, 6],
          hihat: [0, 2, 4, 6]
        },
        house: {
          bpm: 126,
          kick: [0, 2, 4, 6],
          snare: [2, 6],
          hihat: [1, 3, 5, 7]
        },
        techno: {
          bpm: 132,
          kick: [0, 2, 4, 6],
          snare: [4, 7],
          hihat: [0, 1, 2, 3, 4, 5, 6, 7]
        },
        lofi: {
          bpm: 84,
          kick: [0, 3],
          snare: [2, 6],
          hihat: [0, 2, 3, 4, 6, 7]
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
      this.bindPadEvents()
      this.bindTransportEvents()
      this.bindTempoEvents()
      this.bindTrackControls()
      this.bindPresetEvents()
      this.bindModalEvents()
      this.bindKeyboardShortcuts()
    }

    // ------------------------------------------------------------------------
    // Audio Engine: Trigger Sample with Zero Latency & Overlap
    // ------------------------------------------------------------------------
    playSample(track) {
      // Check Solo logic: if any track is soloed, only soloed tracks play
      const hasSolo = Object.values(this.trackStates).some(s => s.solo)
      if (hasSolo && !this.trackStates[track].solo) {
        return
      }

      // Check Mute logic
      if (this.trackStates[track].muted) {
        return
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
          if (pad.classList.contains('kick-pad')) {
            this.playSample('kick')
            anySoundTriggered = true
          }
          if (pad.classList.contains('snare-pad')) {
            this.playSample('snare')
            anySoundTriggered = true
          }
          if (pad.classList.contains('hihat-pad')) {
            this.playSample('hihat')
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
    // Pad Events (Doherty Instant Feedback on Tap)
    // ------------------------------------------------------------------------
    bindPadEvents() {
      this.pads.forEach(pad => {
        pad.addEventListener('click', () => {
          pad.classList.toggle('active')

          // Audition sound immediately when pad is toggled active
          if (pad.classList.contains('active')) {
            const track = pad.dataset.track || (
              pad.classList.contains('kick-pad') ? 'kick' :
              pad.classList.contains('snare-pad') ? 'snare' : 'hihat'
            )
            this.playSample(track)
          }
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

        // Sample Select Dropdowns
        const sampleSelect = document.getElementById(`${track}-beat-audio`)
        if (sampleSelect) {
          sampleSelect.addEventListener('change', (e) => {
            const newSrc = e.target.value
            let targetAudio
            if (track === 'kick') targetAudio = this.kickPadAudio
            else if (track === 'snare') targetAudio = this.snarePadAudio
            else if (track === 'hihat') targetAudio = this.hihatPadAudio

            if (targetAudio) {
              targetAudio.src = newSrc
              // Instant preview on sample select
              this.playSample(track)
            }
          })
        }
      })
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
      this.pads.forEach(pad => pad.classList.remove('active'))
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
