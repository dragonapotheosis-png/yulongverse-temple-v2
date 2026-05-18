const PERIODS = {
  morning: {
    background: "./assets/baked/morning.png",
    audio: "./audio/清晨森林.mp3",
  },
  day: {
    background: "./assets/baked/day.png",
    audio: "./audio/白天神庙.mp3",
  },
  dusk: {
    background: "./assets/baked/dusk.png",
    audio: "./audio/黄昏神庙.mp3",
  },
  night: {
    background: "./assets/baked/night.png",
    audio: "./audio/夜晚森林.mp3",
  },
};

const backgroundA = document.querySelector(".background-a");
const backgroundB = document.querySelector(".background-b");
const enterHitbox = document.querySelector("[data-enter]");
const audioToggle = document.querySelector("[data-audio-toggle]");

let activePeriod = "";
let visibleBackground = backgroundA;
let hiddenBackground = backgroundB;
let audioEnabled = false;
let muted = false;
let activeAudio = null;
let fadingAudio = null;

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

function preloadAudio() {
  Object.values(PERIODS).forEach((period) => {
    const audio = new Audio(period.audio);
    audio.preload = "auto";
  });
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
  switchAudio(period);
}

function enterTemple() {
  startAudio();
  window.location.hash = "temple";
}

function createAudio(src) {
  const audio = new Audio(src);
  audio.loop = true;
  audio.volume = 0;
  audio.preload = "auto";
  return audio;
}

function fadeVolume(audio, target, duration = 1800, onDone) {
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

async function switchAudio(period) {
  if (!audioEnabled || muted || activeAudio?.dataset?.src === period.audio) return;

  fadingAudio = activeAudio;
  activeAudio = createAudio(period.audio);
  activeAudio.dataset.src = period.audio;

  try {
    await activeAudio.play();
    fadeVolume(activeAudio, 0.3);
    audioToggle.classList.add("is-on");
    audioToggle.setAttribute("aria-label", "关闭环境音");
  } catch {
    activeAudio = fadingAudio;
    fadingAudio = null;
    audioEnabled = false;
    audioToggle.classList.remove("is-on");
    audioToggle.setAttribute("aria-label", "开启环境音");
  }

  if (fadingAudio) {
    fadeVolume(fadingAudio, 0, 1800, () => {
      fadingAudio.pause();
      fadingAudio.src = "";
      fadingAudio = null;
    });
  }
}

async function startAudio() {
  if (audioEnabled && !muted) return;

  audioEnabled = true;
  muted = false;
  await switchAudio(PERIODS[activePeriod || getPeriodKey()]);
}

function stopAudio() {
  muted = true;
  audioToggle.classList.remove("is-on");
  audioToggle.setAttribute("aria-label", "开启环境音");

  if (activeAudio) {
    const audio = activeAudio;
    activeAudio = null;
    fadeVolume(audio, 0, 900, () => {
      audio.pause();
      audio.src = "";
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

preloadBackgrounds();
preloadAudio();
applyPeriod(getPeriodKey());
window.setInterval(() => applyPeriod(getPeriodKey()), 30_000);

enterHitbox.addEventListener("click", enterTemple);
audioToggle.addEventListener("click", toggleAudio);
document.addEventListener("pointerdown", startAudio, { once: true });
