document.addEventListener('DOMContentLoaded', () => {
  class DrumKit {
    constructor () {
      this.pads = document.querySelectorAll('.pad')
      this.playBtn = document.querySelector('.play')
      this.clearBtn = document.querySelector('.clear-btn')
      this.modal = document.getElementById('clear-modal')
      this.modalCancel = document.querySelector('.modal-cancel')
      this.modalConfirm = document.querySelector('.modal-confirm')
      this.muteBtns = document.querySelectorAll('h4')
      this.kickPadAudio = document.querySelector('.kick-pad-audio')
      this.snarePadAudio = document.querySelector('.snare-pad-audio')
      this.hihatPadAudio = document.querySelector('.hihat-pad-audio')
      this.userSelectBeat = document.querySelectorAll('select')
      this.tempo = document.querySelector('.tempo-slider')
      this.tempoNumber = document.querySelector('#tempo-nr')
      this.kickVolumeSlider = document.getElementById('kick-volume')
      this.snareVolumeSlider = document.getElementById('snare-volume')
      this.hihatVolumeSlider = document.getElementById('hihat-volume')
      this.isPlaying = null
      this.index = 0
      this.bpm = 150
    }
    //Add Visually Active Fuctionality to  the the active elements
    active (e) {
      e.addEventListener('click', () => {
        e.classList.toggle('active')
      })
    }
    //Repeat the (Scale up )Animation And play the Active Beats
    repeatAnimation () {
      let steps = this.index % 8
      this.index++
      const activeBars = document.querySelectorAll(`.b${steps}`)
      
      // Update step indicator
      document.querySelectorAll('.step-dot').forEach(dot => {
        dot.classList.remove('active')
      })
      const currentStepDot = document.querySelector(`.step-dot[data-step="${steps}"]`)
      if (currentStepDot) {
        currentStepDot.classList.add('active')
      }
      
      activeBars.forEach(bar => {
        bar.style.animation = `triger 0.3s alternate ease 2`
        if (bar.classList.contains('active')) {
          if (bar.classList.contains('kick-pad')) {
            this.kickPadAudio.currentTime = 0
            this.kickPadAudio.play()
          }
          if (bar.classList.contains('hihat-pad')) {
            this.hihatPadAudio.currentTime = 0
            this.hihatPadAudio.play()
          }
          if (bar.classList.contains('snare-pad')) {
            this.snarePadAudio.currentTime = 0
            this.snarePadAudio.play()
          }
        }
      })
    }
    //Mute Functionality
    muteKick (e) {
      if (this.kickPadAudio.volume) {
        this.kickPadAudio.volume = 0
        e.style.background = 'rgba(0, 0, 0, 0.8)'
        e.style.backdropFilter = 'blur(10px)'
        e.style.color = 'white'
        e.style.borderColor = 'rgba(255, 255, 255, 0.3)'
      } else {
        e.style.background = 'rgba(255, 255, 255, 0.1)'
        e.style.backdropFilter = 'blur(10px)'
        e.style.color = 'rgba(255, 255, 255, 0.9)'
        e.style.borderColor = 'rgba(255, 255, 255, 0.2)'
        this.kickPadAudio.volume = 1
      }
    }
    muteHihat (e) {
      if (this.hihatPadAudio.volume) {
        this.hihatPadAudio.volume = 0
        e.style.background = 'rgba(0, 0, 0, 0.8)'
        e.style.backdropFilter = 'blur(10px)'
        e.style.color = 'white'
        e.style.borderColor = 'rgba(255, 255, 255, 0.3)'
      } else {
        e.style.background = 'rgba(255, 255, 255, 0.1)'
        e.style.backdropFilter = 'blur(10px)'
        e.style.color = 'rgba(255, 255, 255, 0.9)'
        e.style.borderColor = 'rgba(255, 255, 255, 0.2)'
        this.hihatPadAudio.volume = 1
      }
    }
    muteSnare (e) {
      if (this.snarePadAudio.volume) {
        this.snarePadAudio.volume = 0
        e.style.background = 'rgba(0, 0, 0, 0.8)'
        e.style.backdropFilter = 'blur(10px)'
        e.style.color = 'white'
        e.style.borderColor = 'rgba(255, 255, 255, 0.3)'
      } else {
        e.style.background = 'rgba(255, 255, 255, 0.1)'
        e.style.backdropFilter = 'blur(10px)'
        e.style.color = 'rgba(255, 255, 255, 0.9)'
        e.style.borderColor = 'rgba(255, 255, 255, 0.2)'
        this.snarePadAudio.volume = 1
      }
    }
    changeTempo (value) {
      this.bpm = value
      this.tempoNumber.textContent = value
    }
    updateTempo () {
      clearInterval(this.isPlaying)
      this.isPlaying = null
      const playBtn = document.querySelector('.play')
      if (playBtn.classList.contains('active')) {
        this.start()
      }
    }
    //Change volume for tracks
    changeVolume (track, value) {
      const volumePercent = value / 100
      const volumeDisplay = document.querySelector(`#${track}-volume`).nextElementSibling
      
      switch (track) {
        case 'kick':
          this.kickPadAudio.volume = volumePercent
          break
        case 'snare':
          this.snarePadAudio.volume = volumePercent
          break
        case 'hihat':
          this.hihatPadAudio.volume = volumePercent
          break
      }
      
      volumeDisplay.textContent = `${value}%`
    }
    //Update Audio when User Select Another Beat
    updateAudioTracks (e) {
      let selectedId = e.id
      let selectionValue = e.value
      switch (selectedId) {
        case 'kick-beat-audio':
          this.kickPadAudio.src = selectionValue
          break
        case 'snare-beat-audio':
          this.snarePadAudio.src = selectionValue
          break
        case 'hihat-beat-audio':
          this.hihatPadAudio.src = selectionValue
          break
      }
    }
    //Start  or Stop the Track Also increase  or decrease the BPM
    start () {
      const interval = (60 / this.bpm) * 1000
      if (!this.isPlaying) {
        this.playBtn.innerHTML = `<i class='fa-solid fa-pause'></i>`
        this.playBtn.classList.add('active')
        // Disable clear button while playing
        this.clearBtn.disabled = true
        this.isPlaying = setInterval(() => {
          this.repeatAnimation()
          this.pads.forEach(pad => {
            pad.addEventListener('animationend', function () {
              this.style.animation = ''
            })
          })
        }, interval)
      } else {
        this.playBtn.innerHTML = `<i class='fa-solid fa-play'></i>`
        this.playBtn.classList.remove('active')
        // Enable clear button when stopped
        this.clearBtn.disabled = false
        clearInterval(this.isPlaying)
        this.isPlaying = null
      }
    }
    //Show clear confirmation modal
    showClearModal () {
      this.modal.classList.add('active')
    }
    //Hide clear confirmation modal
    hideClearModal () {
      this.modal.classList.remove('active')
    }
    //Clear all active pads
    clearAll () {
      this.pads.forEach(pad => {
        pad.classList.remove('active')
      })
      // Clear step indicators
      document.querySelectorAll('.step-dot').forEach(dot => {
        dot.classList.remove('active')
      })
      this.hideClearModal()
    }
  }
  //Create object of Drumkit Class named as 'drumkit'
  const drumkit = new DrumKit()

  //Add Active pad functionality
  drumkit.pads.forEach(pad => {
    drumkit.active(pad)
  })
  //Start/ Stop function
  drumkit.playBtn.addEventListener('click', function () {
    drumkit.start()
  })
  //Show clear confirmation modal
  drumkit.clearBtn.addEventListener('click', function () {
    drumkit.showClearModal()
  })
  //Cancel clear action
  drumkit.modalCancel.addEventListener('click', function () {
    drumkit.hideClearModal()
  })
  //Confirm clear action
  drumkit.modalConfirm.addEventListener('click', function () {
    drumkit.clearAll()
  })
  //Close modal when clicking outside
  drumkit.modal.addEventListener('click', function (e) {
    if (e.target === drumkit.modal) {
      drumkit.hideClearModal()
    }
  })
  //Onclick to btns( Muted )
  drumkit.muteBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      switch (btn.id) {
        case 'kick-mute':
          drumkit.muteKick(btn)
          break
        case 'hihat-mute':
          drumkit.muteHihat(btn)
          break
        case 'snare-mute':
          drumkit.muteSnare(btn)
          break
      }
    })
  })
  drumkit.userSelectBeat.forEach(select => {
    select.addEventListener('change', function () {
      drumkit.updateAudioTracks(select)
    })
  })
  drumkit.tempo.addEventListener('input', function () {
    let tempoValue = drumkit.tempo.value
    drumkit.changeTempo(tempoValue)
  })
  drumkit.tempo.addEventListener('change', function () {
    drumkit.updateTempo()
  })
  //Volume controls
  drumkit.kickVolumeSlider.addEventListener('input', function () {
    drumkit.changeVolume('kick', this.value)
  })
  drumkit.snareVolumeSlider.addEventListener('input', function () {
    drumkit.changeVolume('snare', this.value)
  })
  drumkit.hihatVolumeSlider.addEventListener('input', function () {
    drumkit.changeVolume('hihat', this.value)
  })
})
