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
const stage = document.querySelector(".stage");

let activePeriod = "";
let visibleBackground = backgroundA;
let hiddenBackground = backgroundB;
let audioContext = null;
let currentAudio = null;
let audioStarted = false;
let transitionStarted = false;
let volumeFadeFrame = null;

function getPeriodKey(date = new Date()) {
  const hour = date.getHours();

  if (hour >= 5 && hour < 8) return "morning";
  if (hour >= 8 && hour < 17) return "day";
  if (hour >= 17 && hour < 22) return "dusk";
  return "night";
}

function describeMediaError(error) {
  if (!error) return "NO_MEDIA_ERROR";

  const names = {
    1: "MEDIA_ERR_ABORTED",
    2: "MEDIA_ERR_NETWORK",
    3: "MEDIA_ERR_DECODE",
    4: "MEDIA_ERR_SRC_NOT_SUPPORTED",
  };

  return names[error.code] || `UNKNOWN_MEDIA_ERROR_${error.code}`;
}

function debugAudio(eventName, extra = {}) {
  const period = PERIODS[activePeriod || getPeriodKey()];
  console.log("[temple-audio-debug]", {
    event: eventName,
    currentTimePeriod: activePeriod || getPeriodKey(),
    currentAudioPath: period.audio,
    readyState: currentAudio?.readyState,
    networkState: currentAudio?.networkState,
    paused: currentAudio?.paused,
    mediaError: describeMediaError(currentAudio?.error),
    ...extra,
  });
}

function preloadBackgrounds() {
  Object.values(PERIODS).forEach((period) => {
    const image = new Image();
    image.src = period.background;
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

function createCurrentAudio(period) {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.removeAttribute("src");
    currentAudio.load();
  }

  currentAudio = new Audio(period.audio);
  currentAudio.preload = "auto";
  currentAudio.loop = true;
  currentAudio.volume = 0.3;

  currentAudio.addEventListener("loadedmetadata", () => {
    debugAudio("audio loadedmetadata", {
      duration: currentAudio.duration,
    });
  });

  currentAudio.addEventListener("canplay", () => {
    debugAudio("audio canplay");
  });

  currentAudio.addEventListener("error", () => {
    debugAudio("audio error", {
      errorName: describeMediaError(currentAudio.error),
    });
  });

  debugAudio("audio create");
  currentAudio.load();
}

function applyPeriod(periodKey) {
  if (periodKey === activePeriod) return;

  activePeriod = periodKey;
  const period = PERIODS[periodKey];
  setBackground(period);
  createCurrentAudio(period);
  debugAudio("current period applied");
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

async function playCurrentAudio() {
  if (!currentAudio) {
    createCurrentAudio(PERIODS[activePeriod || getPeriodKey()]);
  }

  try {
    await unlockAudioContext();
  } catch (error) {
    debugAudio("audio context unlock failed", {
      errorMessage: error?.message,
    });
  }

  try {
    currentAudio.volume = 0.3;
    currentAudio.loop = true;
    await currentAudio.play();
    audioStarted = true;
    audioToggle.classList.add("is-on");
    audioToggle.setAttribute("aria-label", "Disable ambient audio");
    debugAudio("audio play success");
  } catch (error) {
    audioStarted = false;
    audioToggle.classList.remove("is-on");
    audioToggle.setAttribute("aria-label", "Enable ambient audio");
    debugAudio("audio play failed", {
      errorName: error?.name,
      errorMessage: error?.message,
    });
  }
}

function fadeCurrentVolume(target, duration = 800) {
  if (!currentAudio) return;

  if (volumeFadeFrame) {
    cancelAnimationFrame(volumeFadeFrame);
  }

  const start = currentAudio.volume;
  const startedAt = performance.now();

  function tick(now) {
    const progress = Math.min((now - startedAt) / duration, 1);
    currentAudio.volume = start + (target - start) * progress;

    if (progress < 1) {
      volumeFadeFrame = requestAnimationFrame(tick);
      return;
    }

    currentAudio.volume = target;
    volumeFadeFrame = null;
  }

  volumeFadeFrame = requestAnimationFrame(tick);
}

function stopCurrentAudio() {
  if (!currentAudio) return;

  audioStarted = false;
  currentAudio.pause();
  audioToggle.classList.remove("is-on");
  audioToggle.setAttribute("aria-label", "Enable ambient audio");
  debugAudio("audio paused");
}

function toggleAudio(event) {
  event.stopPropagation();

  if (audioStarted) {
    stopCurrentAudio();
    return;
  }

  playCurrentAudio();
}

function enterTemple() {
  if (transitionStarted) return;

  transitionStarted = true;
  enterHitbox.setAttribute("aria-disabled", "true");
  playCurrentAudio().then(() => fadeCurrentVolume(0.18, 900));

  stage.classList.add("is-transitioning");

  window.setTimeout(() => {
    stage.classList.add("is-transition-message");
  }, 800);

  window.setTimeout(() => {
    stage.classList.add("is-transition-leaving");
  }, 3600);

  window.setTimeout(() => {
    window.location.hash = "jiaobei";
  }, 4500);
}

function startAudioFromPage(event) {
  if (event.target.closest("[data-audio-toggle]")) return;
  playCurrentAudio();
}

preloadBackgrounds();
applyPeriod(getPeriodKey());
window.setInterval(() => {
  const nextPeriod = getPeriodKey();
  if (nextPeriod !== activePeriod && !audioStarted) {
    applyPeriod(nextPeriod);
  }
}, 30_000);

enterHitbox.addEventListener("click", enterTemple);
audioToggle.addEventListener("click", toggleAudio);
document.addEventListener("pointerdown", startAudioFromPage, { once: true, capture: true });
