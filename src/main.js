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

const JIAOBEI_OUTCOMES = {
  sheng: {
    chance: 0.55,
    sound: "./audio/shengjiao.mp3",
    text: "\u9999\u706b\u5fae\u52a8\u3002\n\n\u795e\u5e99\u56de\u5e94\u4e86\u4f60\u3002",
    button: "\u8fdb\u5165\u6c42\u7b7e",
  },
  xiao: {
    chance: 0.25,
    sound: "./audio/xiaojiao.mp3",
    text: "\u4f60\u7684\u5fc3\uff0c\n\u4f3c\u4e4e\u8fd8\u6ca1\u6709\u771f\u6b63\u9759\u4e0b\u6765\u3002",
    button: "\u518d\u6b21\u8bf7\u793a",
  },
  yin: {
    chance: 0.2,
    sound: "./audio/yinjiao.mp3",
    text: "\u4eca\u591c\u7684\u795e\u5e99\uff0c\n\u8fd8\u672a\u51c6\u5907\u56de\u7b54\u3002",
    button: "\u7a0d\u540e\u518d\u95ee",
  },
};
const JIAOBEI_THROW_SOUND = "./audio/throw.mp3";

const backgroundA = document.querySelector(".background-a");
const backgroundB = document.querySelector(".background-b");
const enterHitbox = document.querySelector("[data-enter]");
const audioToggle = document.querySelector("[data-audio-toggle]");
const stage = document.querySelector(".stage");
const jiaobeiPage = document.querySelector(".jiaobei-page");
const castJiaobeiButton = document.querySelector("[data-cast-jiaobei]");
const jiaobeiResult = document.querySelector("[data-jiaobei-result]");
const fortuneScroll = document.querySelector("[data-fortune-scroll]");
const fortuneId = document.querySelector("[data-fortune-id]");
const fortuneTitle = document.querySelector("[data-fortune-title]");
const fortuneEnergy = document.querySelector("[data-fortune-energy]");
const fortuneContent = document.querySelector("[data-fortune-content]");
const fortuneInterpretation = document.querySelector("[data-fortune-interpretation]");
const fortuneAdvice = document.querySelector("[data-fortune-advice]");
const returnHomeButton = document.querySelector("[data-return-home]");
const returnTempleButton = document.querySelector("[data-return-temple]");
const askAgainButton = document.querySelector("[data-ask-again]");

let activePeriod = "";
let visibleBackground = backgroundA;
let hiddenBackground = backgroundB;
let audioContext = null;
let currentAudio = null;
let audioStarted = false;
let transitionStarted = false;
let isEnteringTemple = false;
let volumeFadeFrame = null;
let fortunes = [];
let fortuneLoadPromise = null;
let jiaobeiStarted = false;
let currentFortune = null;
let previousFortuneId = "";
let jiaobeiCastToken = 0;
let jiaobeiPhase = "ready";
let currentJiaobeiOutcome = "";
const FORTUNES_DATA_SOURCE = "/data/fortunes.json?v=20260519";

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
  if (isEnteringTemple || transitionStarted) return;

  isEnteringTemple = true;
  transitionStarted = true;
  enterHitbox.setAttribute("aria-disabled", "true");
  playCurrentAudio().then(() => fadeCurrentVolume(0.18, 900));

  stage.classList.add("is-entering", "is-transitioning");

  window.setTimeout(() => {
    stage.classList.add("is-transition-message");
  }, 800);

  window.setTimeout(() => {
    stage.classList.add("is-transition-leaving");
  }, 3600);

  window.setTimeout(() => {
    if (!isEnteringTemple) return;

    if (window.location.hash !== "#jiaobei") {
      window.location.hash = "jiaobei";
      return;
    }

    showJiaobeiPage();
  }, 4500);
}

async function loadFortunes() {
  if (fortunes.length) return fortunes;

  if (!fortuneLoadPromise) {
    fortuneLoadPromise = fetch(FORTUNES_DATA_SOURCE, {
      cache: "no-store",
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`fortunes.json ${response.status}`);
        }

        return response.json();
      })
      .then((data) => {
        fortunes = Array.isArray(data) ? data : [];
        return fortunes;
      })
      .catch((error) => {
        fortunes = [];
        return fortunes;
      });
  }

  return fortuneLoadPromise;
}

function setText(node, value) {
  if (!node) return;
  node.textContent = value || "";
}

function getRandomIndex(max) {
  if (max <= 0) return 0;

  if (window.crypto?.getRandomValues) {
    const values = new Uint32Array(1);
    window.crypto.getRandomValues(values);
    return values[0] % max;
  }

  return Math.floor(Math.random() * max);
}

function getJiaobeiOutcome() {
  const roll = Math.random();
  if (roll < JIAOBEI_OUTCOMES.sheng.chance) return "sheng";
  if (roll < JIAOBEI_OUTCOMES.sheng.chance + JIAOBEI_OUTCOMES.xiao.chance) return "xiao";
  return "yin";
}

function playTempleEffectSound(path, volume = 0.24) {
  if (!path) return;

  const sound = new Audio(path);
  sound.preload = "auto";
  sound.volume = volume;
  sound.play().catch(() => {});
}

function playJiaobeiSound(outcomeKey) {
  playTempleEffectSound(JIAOBEI_OUTCOMES[outcomeKey]?.sound, 0.24);
}

function clearJiaobeiOutcomeClasses() {
  jiaobeiPage.classList.remove("is-result-sheng", "is-result-xiao", "is-result-yin");
}

function renderFortune(selectedFortune) {
  setText(fortuneId, selectedFortune.id);
  setText(fortuneTitle, selectedFortune.title);
  setText(fortuneEnergy, selectedFortune.energy);
  setText(fortuneContent, selectedFortune.content);
  setText(fortuneInterpretation, selectedFortune.interpretation);
  setText(fortuneAdvice, selectedFortune.advice);
  fortuneScroll.hidden = false;
  fortuneScroll.classList.add("is-visible");
  stage.classList.add("is-fortune");

  if (window.location.hash !== "#fortune") {
    window.location.hash = "fortune";
  }
}

function drawFortune() {
  if (!fortunes.length) {
    jiaobeiResult.textContent = "\u7b7e\u8bd7\u5c1a\u672a\u5907\u59a5\uff0c\n\u8bf7\u7a0d\u540e\u518d\u6765\u3002";
    castJiaobeiButton.disabled = false;
    return;
  }

  let randomIndex = getRandomIndex(fortunes.length);
  const selectedFortune = fortunes[randomIndex];
  if (fortunes.length > 1 && selectedFortune.id === previousFortuneId) {
    randomIndex = (randomIndex + 1 + getRandomIndex(fortunes.length - 1)) % fortunes.length;
  }

  currentFortune = fortunes[randomIndex];
  previousFortuneId = currentFortune.id;
  renderFortune(currentFortune);
}

function resetJiaobeiFlow() {
  jiaobeiCastToken += 1;
  jiaobeiStarted = false;
  jiaobeiPhase = "ready";
  currentJiaobeiOutcome = "";
  currentFortune = null;
  castJiaobeiButton.disabled = false;
  castJiaobeiButton.textContent = "\u63b7\u7b4a";
  jiaobeiPage.classList.remove("is-casting");
  clearJiaobeiOutcomeClasses();
  jiaobeiResult.textContent = "";
  fortuneScroll.hidden = true;
  fortuneScroll.classList.remove("is-visible");
  setText(fortuneId, "");
  setText(fortuneTitle, "");
  setText(fortuneEnergy, "");
  setText(fortuneContent, "");
  setText(fortuneInterpretation, "");
  setText(fortuneAdvice, "");
  stage.classList.remove("is-fortune");
}

async function castJiaobei() {
  if (jiaobeiPhase === "casting") return;

  if (jiaobeiPhase === "result") {
    if (currentJiaobeiOutcome === "sheng") {
      castJiaobeiButton.disabled = true;
      await loadFortunes();
      drawFortune();
      return;
    }

    const previousOutcome = currentJiaobeiOutcome;
    resetJiaobeiFlow();
    if (previousOutcome === "xiao") {
      window.requestAnimationFrame(() => castJiaobei());
    }
    return;
  }

  jiaobeiStarted = true;
  jiaobeiPhase = "casting";
  currentFortune = null;
  currentJiaobeiOutcome = getJiaobeiOutcome();
  const outcome = JIAOBEI_OUTCOMES[currentJiaobeiOutcome];
  const castToken = jiaobeiCastToken + 1;
  jiaobeiCastToken = castToken;
  castJiaobeiButton.disabled = true;
  castJiaobeiButton.textContent = "\u8bf7\u793a\u4e2d";
  jiaobeiPage.classList.add("is-casting");
  clearJiaobeiOutcomeClasses();
  jiaobeiResult.textContent = "";
  fortuneScroll.hidden = true;
  fortuneScroll.classList.remove("is-visible");
  playTempleEffectSound(JIAOBEI_THROW_SOUND, 0.18);

  loadFortunes();

  window.setTimeout(() => {
    if (castToken !== jiaobeiCastToken) return;
    playJiaobeiSound(currentJiaobeiOutcome);
    jiaobeiPage.classList.remove("is-casting");
    jiaobeiPage.classList.add(`is-result-${currentJiaobeiOutcome}`);
    jiaobeiResult.textContent = outcome.text;
  }, 900);

  window.setTimeout(() => {
    if (castToken !== jiaobeiCastToken) return;
    jiaobeiStarted = false;
    jiaobeiPhase = "result";
    castJiaobeiButton.disabled = false;
    castJiaobeiButton.textContent = outcome.button;
  }, 1350);
}
function showJiaobeiPage() {
  stage.classList.add("is-jiaobei");
  stage.classList.remove(
    "is-entering",
    "is-transitioning",
    "is-transition-message",
    "is-transition-leaving",
    "is-fortune",
  );
  isEnteringTemple = false;
  transitionStarted = false;
  enterHitbox.removeAttribute("aria-disabled");
  resetJiaobeiFlow();
  loadFortunes();
}

function showFortunePage() {
  stage.classList.add("is-jiaobei", "is-fortune");
  stage.classList.remove(
    "is-entering",
    "is-transitioning",
    "is-transition-message",
    "is-transition-leaving",
  );
  isEnteringTemple = false;
  transitionStarted = false;
  enterHitbox.removeAttribute("aria-disabled");

  if (fortuneScroll.hidden) {
    window.location.hash = "jiaobei";
  }
}

function showHomePage() {
  if (isEnteringTemple) return;

  stage.classList.remove(
    "is-jiaobei",
    "is-fortune",
    "is-entering",
    "is-transitioning",
    "is-transition-message",
    "is-transition-leaving",
  );
  isEnteringTemple = false;
  transitionStarted = false;
  enterHitbox.removeAttribute("aria-disabled");
  applyPeriod(getPeriodKey());
  resetJiaobeiFlow();
}

function routeByHash() {
  const hash = window.location.hash || "#home";

  if (hash === "#jiaobei") {
    showJiaobeiPage();
    return;
  }

  if (hash === "#fortune") {
    showFortunePage();
    return;
  }

  showHomePage();
}

function goHome() {
  window.location.hash = "home";
}

function askAgain() {
  currentFortune = null;
  jiaobeiCastToken += 1;
  window.location.hash = "jiaobei";
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
castJiaobeiButton.addEventListener("click", castJiaobei);
returnHomeButton.addEventListener("click", () => {
  goHome();
});
returnTempleButton.addEventListener("click", goHome);
askAgainButton.addEventListener("click", askAgain);
document.addEventListener("pointerdown", startAudioFromPage, { once: true, capture: true });
window.addEventListener("hashchange", routeByHash);
routeByHash();

