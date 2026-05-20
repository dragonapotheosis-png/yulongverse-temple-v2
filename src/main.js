const PERIODS = {
  morning: {
    background: "./assets/baked/morning.png",
    audio: "./audio/dawn.mp3",
    indoorAudio: "./audio/dawnindoor.mp3",
  },
  day: {
    background: "./assets/baked/day.png",
    audio: "./audio/day.mp3",
    indoorAudio: "./audio/dayindoor.mp3",
  },
  dusk: {
    background: "./assets/baked/dusk.png",
    audio: "./audio/dusk.mp3",
    indoorAudio: "./audio/duskindoor.mp3",
  },
  night: {
    background: "./assets/baked/night.png",
    audio: "./audio/night.mp3",
    indoorAudio: "./audio/nightindoor.mp3",
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
const INNER_TEMPLE_FOOTSTEP_SOUND = "./audio/\u8fdb\u5165\u5185\u6bbf\u811a\u6b65\u58f0.mp3";
const FORTUNE_SHAKE_SOUNDS = ["./audio/\u6447\u7b7e\u7b521.mp3", "./audio/\u6447\u7b7e\u7b522.mp3"];
const OUTER_AMBIENT_VOLUME = 0.3;
const INNER_AMBIENT_VOLUME = 0.16;

const backgroundA = document.querySelector(".background-a");
const backgroundB = document.querySelector(".background-b");
const enterHitbox = document.querySelector("[data-enter]");
const practiceHitbox = document.querySelector(".hitbox-practice");
const scrollsHitbox = document.querySelector(".hitbox-scrolls");
const audioToggle = document.querySelector("[data-audio-toggle]");
const stage = document.querySelector(".stage");
const sanctumPage = document.querySelector(".sanctum-page");
const sanctumMenu = document.querySelector("[data-sanctum-menu]");
const practicePanel = document.querySelector("[data-practice-panel]");
const scrollsPanel = document.querySelector("[data-scrolls-panel]");
const futurePanel = document.querySelector("[data-future-panel]");
const openJiaobeiButton = document.querySelector("[data-open-jiaobei]");
const openPracticeButton = document.querySelector("[data-open-practice]");
const openScrollsButton = document.querySelector("[data-open-scrolls]");
const openFutureButton = document.querySelector("[data-open-future]");
const sanctumHomeButton = document.querySelector("[data-sanctum-home]");
const sanctumBackButtons = document.querySelectorAll("[data-sanctum-back]");
const jiaobeiPage = document.querySelector(".jiaobei-page");
const castJiaobeiButton = document.querySelector("[data-cast-jiaobei]");
const jiaobeiResult = document.querySelector("[data-jiaobei-result]");
const fortuneDraw = document.querySelector("[data-fortune-draw]");
const drawFortuneButton = document.querySelector("[data-draw-fortune]");
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
let indoorAudio = null;
let activeAudioSpace = "outdoor";
let audioStarted = false;
let transitionStarted = false;
let isEnteringTemple = false;
let ambientFadeFrame = null;
let fortunes = [];
let fortuneLoadPromise = null;
let jiaobeiStarted = false;
let currentFortune = null;
let previousFortuneId = "";
let jiaobeiCastToken = 0;
let jiaobeiPhase = "ready";
let currentJiaobeiOutcome = "";
let fortuneDrawStarted = false;
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

function disposeAudio(audio) {
  if (!audio) return;
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
}

function createAmbientAudio(path, volume) {
  const audio = new Audio(path);
  audio.preload = "auto";
  audio.loop = true;
  audio.volume = volume;
  audio.addEventListener("error", () => {
    debugAudio("audio error", {
      audioPath: path,
      errorName: describeMediaError(audio.error),
    });
  });
  audio.load();
  return audio;
}

function createCurrentAudio(period) {
  disposeAudio(currentAudio);
  disposeAudio(indoorAudio);

  const isInside = stage?.classList.contains("is-home-hidden")
    || stage?.classList.contains("is-sanctum")
    || stage?.classList.contains("is-jiaobei");
  activeAudioSpace = isInside ? "indoor" : "outdoor";
  currentAudio = createAmbientAudio(period.audio, isInside ? 0 : OUTER_AMBIENT_VOLUME);
  indoorAudio = createAmbientAudio(period.indoorAudio, isInside ? INNER_AMBIENT_VOLUME : 0);

  currentAudio.addEventListener("loadedmetadata", () => {
    debugAudio("audio loadedmetadata", {
      audioSpace: "outdoor",
      duration: currentAudio.duration,
    });
  });

  currentAudio.addEventListener("canplay", () => {
    debugAudio("audio canplay", {
      audioSpace: "outdoor",
    });
  });

  indoorAudio.addEventListener("loadedmetadata", () => {
    debugAudio("audio loadedmetadata", {
      audioSpace: "indoor",
      duration: indoorAudio.duration,
    });
  });

  indoorAudio.addEventListener("canplay", () => {
    debugAudio("audio canplay", {
      audioSpace: "indoor",
    });
  });

  debugAudio("audio create");
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

async function playCurrentAudio(startSpace = null) {
  if (!currentAudio || !indoorAudio) {
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
    const isInside = stage.classList.contains("is-home-hidden")
      || stage.classList.contains("is-sanctum")
      || stage.classList.contains("is-jiaobei");
    const startingSpace = startSpace || (isInside ? "indoor" : "outdoor");
    activeAudioSpace = startingSpace;
    currentAudio.volume = startingSpace === "outdoor" ? OUTER_AMBIENT_VOLUME : 0;
    indoorAudio.volume = startingSpace === "indoor" ? INNER_AMBIENT_VOLUME : 0;
    currentAudio.loop = true;
    indoorAudio.loop = true;
    await Promise.all([currentAudio.play(), indoorAudio.play()]);
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

function crossfadeAmbience(targetSpace, duration = 1500) {
  activeAudioSpace = targetSpace;
  if (!currentAudio || !indoorAudio) return;

  const targetOutdoorVolume = targetSpace === "outdoor" ? OUTER_AMBIENT_VOLUME : 0;
  const targetIndoorVolume = targetSpace === "indoor" ? INNER_AMBIENT_VOLUME : 0;

  if (!audioStarted) {
    currentAudio.volume = targetOutdoorVolume;
    indoorAudio.volume = targetIndoorVolume;
    return;
  }

  if (ambientFadeFrame) {
    cancelAnimationFrame(ambientFadeFrame);
  }

  currentAudio.play().catch(() => {});
  indoorAudio.play().catch(() => {});
  const startOutdoorVolume = currentAudio.volume;
  const startIndoorVolume = indoorAudio.volume;
  const startedAt = performance.now();

  function tick(now) {
    const progress = Math.min((now - startedAt) / duration, 1);
    currentAudio.volume = startOutdoorVolume + (targetOutdoorVolume - startOutdoorVolume) * progress;
    indoorAudio.volume = startIndoorVolume + (targetIndoorVolume - startIndoorVolume) * progress;

    if (progress < 1) {
      ambientFadeFrame = requestAnimationFrame(tick);
      return;
    }

    currentAudio.volume = targetOutdoorVolume;
    indoorAudio.volume = targetIndoorVolume;
    ambientFadeFrame = null;
  }

  ambientFadeFrame = requestAnimationFrame(tick);
}

function stopCurrentAudio() {
  if (!currentAudio && !indoorAudio) return;

  audioStarted = false;
  currentAudio?.pause();
  indoorAudio?.pause();
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
  const audioReady = playCurrentAudio("outdoor");

  stage.classList.add("is-home-hidden", "is-entering", "is-transitioning");
  console.log("hide home");
  console.log("transition overlay active");

  window.setTimeout(() => {
    stage.classList.add("is-transition-message");
    playInnerTempleFootsteps();
    audioReady.then(() => crossfadeAmbience("indoor", 1800));
  }, 800);

  window.setTimeout(() => {
    stage.classList.add("is-transition-leaving");
  }, 3600);

  window.setTimeout(() => {
    if (!isEnteringTemple) return;
    console.log("transition end");
    console.log("route to inner-temple");

    if (window.location.hash !== "#inner-temple") {
      window.history.pushState(null, "", "#inner-temple");
    }

    showSanctumPage("menu", { keepTransition: true });
    console.log("inner-temple rendered");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        console.log("overlay fade out");
        stage.classList.remove(
          "is-entering",
          "is-transitioning",
          "is-transition-message",
          "is-transition-leaving",
        );
        isEnteringTemple = false;
        transitionStarted = false;
        enterHitbox.removeAttribute("aria-disabled");
        crossfadeAmbience("indoor", 1800);
      });
    });
  }, 4500);
}

function enterInnerArea(targetHash) {
  if (isEnteringTemple || transitionStarted) return;

  isEnteringTemple = true;
  transitionStarted = true;
  enterHitbox.setAttribute("aria-disabled", "true");
  const audioReady = playCurrentAudio("outdoor");

  stage.classList.add("is-entering", "is-transitioning", "is-light-transition");

  window.setTimeout(() => {
    playInnerTempleFootsteps();
    audioReady.then(() => crossfadeAmbience("indoor", 1800));
  }, 260);

  window.setTimeout(() => {
    if (!isEnteringTemple) return;

    stage.classList.add("is-home-hidden");
    const normalizedHash = targetHash.startsWith("#") ? targetHash : `#${targetHash}`;
    if (window.location.hash !== normalizedHash) {
      window.history.pushState(null, "", normalizedHash);
    }

    if (normalizedHash === "#practice") {
      showSanctumPage("practice", { keepTransition: true });
    } else if (normalizedHash === "#scrolls") {
      showSanctumPage("scrolls", { keepTransition: true });
    } else if (normalizedHash === "#future") {
      showSanctumPage("future", { keepTransition: true });
    } else {
      showSanctumPage("menu", { keepTransition: true });
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        stage.classList.remove("is-entering", "is-transitioning", "is-light-transition");
        isEnteringTemple = false;
        transitionStarted = false;
        enterHitbox.removeAttribute("aria-disabled");
        crossfadeAmbience("indoor", 1800);
      });
    });
  }, 760);
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

function playInnerTempleFootsteps() {
  playTempleEffectSound(INNER_TEMPLE_FOOTSTEP_SOUND, 0.35);
}

function playJiaobeiSound(outcomeKey) {
  playTempleEffectSound(JIAOBEI_OUTCOMES[outcomeKey]?.sound, 0.24);
}

function playFortuneShakeSound() {
  const soundPath = FORTUNE_SHAKE_SOUNDS[getRandomIndex(FORTUNE_SHAKE_SOUNDS.length)];
  playTempleEffectSound(soundPath, 0.32);
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
  fortuneDrawStarted = false;
  castJiaobeiButton.disabled = false;
  castJiaobeiButton.hidden = false;
  castJiaobeiButton.textContent = "\u63b7\u7b4a";
  drawFortuneButton.disabled = false;
  fortuneDraw.hidden = true;
  fortuneDraw.classList.remove("is-shaking");
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
      beginFortuneDraw();
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
    if (currentJiaobeiOutcome === "sheng") {
      castJiaobeiButton.hidden = true;
      fortuneDraw.hidden = false;
      drawFortuneButton.disabled = false;
    } else {
      castJiaobeiButton.disabled = false;
      castJiaobeiButton.textContent = outcome.button;
    }
  }, 1350);
}

async function beginFortuneDraw() {
  if (fortuneDrawStarted || jiaobeiPhase !== "result" || currentJiaobeiOutcome !== "sheng") return;

  fortuneDrawStarted = true;
  drawFortuneButton.disabled = true;
  fortuneDraw.classList.add("is-shaking");
  playFortuneShakeSound();
  await loadFortunes();

  const drawDelay = 800 + Math.floor(Math.random() * 401);
  window.setTimeout(() => {
    fortuneDraw.classList.remove("is-shaking");
    fortuneDraw.hidden = true;
    drawFortune();
  }, drawDelay);
}

function showSanctumMenu() {
  console.log("render inner-temple");
  sanctumMenu.hidden = false;
  practicePanel.hidden = true;
  scrollsPanel.hidden = true;
  futurePanel.hidden = true;
}

function showPracticePanel() {
  sanctumMenu.hidden = true;
  practicePanel.hidden = false;
  scrollsPanel.hidden = true;
  futurePanel.hidden = true;
}

function showScrollsPanel() {
  sanctumMenu.hidden = true;
  practicePanel.hidden = true;
  scrollsPanel.hidden = false;
  futurePanel.hidden = true;
}

function showFuturePanel() {
  sanctumMenu.hidden = true;
  practicePanel.hidden = true;
  scrollsPanel.hidden = true;
  futurePanel.hidden = false;
}

function showSanctumPage(mode = "menu", options = {}) {
  stage.classList.add("is-sanctum");
  if (options.keepTransition) {
    stage.classList.remove("is-jiaobei", "is-fortune");
  } else {
    stage.classList.remove(
      "is-entering",
      "is-transitioning",
      "is-transition-message",
      "is-transition-leaving",
      "is-jiaobei",
      "is-fortune",
    );
    isEnteringTemple = false;
    transitionStarted = false;
    enterHitbox.removeAttribute("aria-disabled");
  }
  resetJiaobeiFlow();
  crossfadeAmbience("indoor", 1500);

  if (mode === "practice") {
    showPracticePanel();
    return;
  }

  if (mode === "scrolls") {
    showScrollsPanel();
    return;
  }

  if (mode === "future") {
    showFuturePanel();
    return;
  }

  showSanctumMenu();
}

function showJiaobeiPage() {
  stage.classList.add("is-jiaobei");
  stage.classList.remove(
    "is-sanctum",
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
  crossfadeAmbience("indoor", 1500);
}

function showFortunePage() {
  stage.classList.add("is-jiaobei", "is-fortune");
  stage.classList.remove(
    "is-sanctum",
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
    "is-home-hidden",
    "is-sanctum",
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
  crossfadeAmbience("outdoor", 1500);
}

function routeByHash() {
  const hash = window.location.hash || "#home";

  if (hash === "#inner-temple" || hash === "#sanctum") {
    showSanctumPage();
    return;
  }

  if (hash === "#practice") {
    showSanctumPage("practice");
    return;
  }

  if (hash === "#scrolls") {
    showSanctumPage("scrolls");
    return;
  }

  if (hash === "#future") {
    showSanctumPage("future");
    return;
  }

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
practiceHitbox.addEventListener("click", (event) => {
  event.preventDefault();
  enterInnerArea("practice");
});
scrollsHitbox.addEventListener("click", (event) => {
  event.preventDefault();
  enterInnerArea("scrolls");
});
audioToggle.addEventListener("click", toggleAudio);
castJiaobeiButton.addEventListener("click", castJiaobei);
drawFortuneButton.addEventListener("click", beginFortuneDraw);
openJiaobeiButton.addEventListener("click", () => {
  window.location.hash = "jiaobei";
});
openPracticeButton.addEventListener("click", () => {
  window.location.hash = "practice";
});
openScrollsButton.addEventListener("click", () => {
  window.location.hash = "scrolls";
});
openFutureButton.addEventListener("click", () => {
  window.location.hash = "future";
});
sanctumHomeButton.addEventListener("click", goHome);
sanctumBackButtons.forEach((button) => {
  button.addEventListener("click", () => {
    window.location.hash = "inner-temple";
  });
});
returnHomeButton.addEventListener("click", () => {
  goHome();
});
returnTempleButton.addEventListener("click", goHome);
askAgainButton.addEventListener("click", askAgain);
document.addEventListener("pointerdown", startAudioFromPage, { once: true, capture: true });
window.addEventListener("hashchange", routeByHash);
routeByHash();

