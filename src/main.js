const PERIODS = {
  morning: {
    background: "./assets/baked/morning.png",
    audio: "./audio/dawn.mp3",
  },
  day: {
    background: "./assets/baked/day.png",
    audio: "./audio/day.mp3",
  },
  dusk: {
    background: "./assets/baked/dusk.png",
    audio: "./audio/dusk.mp3",
  },
  night: {
    background: "./assets/baked/night.png",
    audio: "./audio/night.mp3",
  },
};

const backgroundA = document.querySelector(".background-a");
const backgroundB = document.querySelector(".background-b");
const enterHitbox = document.querySelector("[data-enter]");
const audioToggle = document.querySelector("[data-audio-toggle]");

const audioCache = new Map();

let activePeriod = "";
let visibleBackground = backgroundA;
let hiddenBackground = backgroundB;
let audioContext = null;
let audioEnabled = false;
let muted = false;
let activeAudio = null;
let fadingAudio = null;
let currentPreloadLink = null;

function getPeriodKey(date = new Date()) {
  const hour = date.getHours();

  if (hour >= 5 && hour < 8) return "morning";
  if (hour >= 8 && hour < 17) return "day";
  if (hour >= 17 && hour < 22) return "dusk";
  return "night";
}

function preloadBackgrounds() {
  Object.values(PERIODS).forEach((period) => {
    const image = new Image();
    image.src = period.background;
  });
}

function createAudio(src, preload = "metadata") {
  const audio = new Audio(src);
  audio.preload = preload;
  audio.loop = true;
  audio.volume = 0;
  audio.dataset.src = src;
  return audio;
}

function getAudio(src, preload = "metadata") {
  if (!audioCache.has(src)) {
    audioCache.set(src, createAudio(src, preload));
  }

  const audio = audioCache.get(src);
  if (preload === "auto" && audio.preload !== "auto") {
    audio.preload = "auto";
  }

  return audio;
}

function preloadCurrentAudio(period) {
  if (currentPreloadLink) {
    currentPreloadLink.remove();
  }

  currentPreloadLink = document.createElement("link");
  currentPreloadLink.rel = "preload";
  currentPreloadLink.as = "audio";
  currentPreloadLink.type = "audio/mpeg";
  currentPreloadLink.href = period.audio;
  document.head.append(currentPreloadLink);

  const audio = getAudio(period.audio, "auto");
  audio.load();
}

function setBackground(period) {
  hiddenBackground.style.backgroundImage = `url("${period.background}")`;
  hiddenBackground.classList.add("is-visible");
  visibleBackground.classList.remove("is-visible");

  const previous = visibleBackground;
  visibleBackground = hiddenBackground;
  hiddenBackground = previous;
}

function applyPeriod(periodKey) {
  if (periodKey === activePeriod) return;

  activePeriod = periodKey;
  const period = PERIODS[periodKey];
  setBackground(period);
  preloadCurrentAudio(period);
  switchAudio(period);
}

function fadeVolume(audio, target, duration = 1200, onDone) {
  const start = audio.volume;
  const startedAt = performance.now();

  function tick(now) {
    const progress = Math.min((now - startedAt) / duration, 1);
    audio.volume = start + (target - start) * progress;

    if (progress < 1) {
      requestAnimationFrame(tick);
      return;
    }

    audio.volume = target;
    onDone?.();
  }

  requestAnimationFrame(tick);
}

async function unlockAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  if (!audioContext) {
    audioContext = new AudioContextClass();
  }

  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }

  const source = audioContext.createBufferSource();
  const gain = audioContext.createGain();
  gain.gain.value = 0;
  source.buffer = audioContext.createBuffer(1, 1, 22050);
  source.connect(gain).connect(audioContext.destination);
  source.start(0);
}

async function switchAudio(period) {
  if (!audioEnabled || muted || activeAudio?.dataset?.src === period.audio) return;

  const nextAudio = getAudio(period.audio, "auto");
  fadingAudio = activeAudio;
  activeAudio = nextAudio;

  try {
    await activeAudio.play();
    fadeVolume(activeAudio, 0.3);
    audioToggle.classList.add("is-on");
    audioToggle.setAttribute("aria-label", "Disable ambient audio");
  } catch {
    activeAudio = fadingAudio;
    fadingAudio = null;
    audioEnabled = false;
    audioToggle.classList.remove("is-on");
    audioToggle.setAttribute("aria-label", "Enable ambient audio");
    return;
  }

  if (fadingAudio && fadingAudio !== activeAudio) {
    fadeVolume(fadingAudio, 0, 1200, () => {
      fadingAudio.pause();
      fadingAudio.currentTime = 0;
      fadingAudio = null;
    });
  }
}

async function startAudio() {
  if (audioEnabled && !muted) return;

  muted = false;
  audioEnabled = true;

  try {
    await unlockAudioContext();
  } catch {
    // HTMLAudioElement playback still handles browsers without Web Audio unlock.
  }

  await switchAudio(PERIODS[activePeriod || getPeriodKey()]);
}

function stopAudio() {
  muted = true;
  audioToggle.classList.remove("is-on");
  audioToggle.setAttribute("aria-label", "Enable ambient audio");

  if (activeAudio) {
    const audio = activeAudio;
    activeAudio = null;
    fadeVolume(audio, 0, 700, () => {
      audio.pause();
    });
  }
}

function toggleAudio(event) {
  event.stopPropagation();

  if (audioEnabled && !muted) {
    stopAudio();
    return;
  }

  startAudio();
}

function enterTemple() {
  startAudio();
  window.location.hash = "temple";
}

function tryAutoplay() {
  audioEnabled = true;
  muted = false;
  switchAudio(PERIODS[activePeriod || getPeriodKey()]);
}

function startAudioFromPage(event) {
  if (event.target.closest("[data-audio-toggle]")) return;
  startAudio();
}

preloadBackgrounds();
applyPeriod(getPeriodKey());
tryAutoplay();
window.setInterval(() => applyPeriod(getPeriodKey()), 30_000);

enterHitbox.addEventListener("click", enterTemple);
audioToggle.addEventListener("click", toggleAudio);
document.addEventListener("pointerdown", startAudioFromPage, { once: true, capture: true });
