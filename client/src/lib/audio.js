/**
 * Disabled Audio Manager (Silent / Sound Muted)
 */

class SoundEngine {
  constructor() {
    this.enabled = false;
  }

  init() {}
  ensureContext() {}
  toggle() { return false; }
  playCaptureTone() {}
  playStartTone() {}
  playVictoryFanfare() {}
  playClick() {}
  play() {}
}

export const sounds = new SoundEngine();
export default sounds;
