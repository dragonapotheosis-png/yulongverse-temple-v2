const PERIODS = {
  morning: {
    title: "清晨",
    text: "天地初醒，\n雾气仍在殿前流动。",
    background: "./assets/morning-temple.png.png",
    audio: "./audio/清晨森林.mp3",
    icon: "./ui/icons/icon-dawn.png",
  },
  day: {
    title: "白天",
    text: "光落在殿前，\n万物都在安静生长。",
    background: "./assets/day-temple.png.png",
    audio: "./audio/白天神庙.mp3",
    icon: "./ui/icons/icon-day.png",
  },
  dusk: {
    title: "黄昏",
    text: "余光停在石阶上，\n天地正在慢慢入夜。",
    background: "./assets/dusk-temple.png.png",
    audio: "./audio/黄昏神庙.mp3",
    icon: "./ui/icons/icon-dusk.png",
  },
  night: {
    title: "深夜",
    text: "天地仍未沉睡，\n请让心先安静下来。",
    background: "./assets/night-temple.png.png",
    audio: "./audio/夜晚森林.mp3",
    icon: "./ui/icons/icon-night.png",
  },
};

const backgroundA = document.querySelector(".background-a");
const backgroundB = document.querySelector(".background-b");
const titleNode = document.querySelector("[data-time-title]");
const textNode = document.querySelector("[data-time-text]");
const timeIcon = document.querySelector(".time-icon");
const enterButton = document.querySelector("[data-enter]");
const audioState = document.querySelector("[data-audio-state]");
const stage = document.querySelector(".stage");

let activePeriod = "";
let visibleBackground = backgroundA;
let hiddenBackground = backgroundB;
let activeAudio = null;
let fadingAudio = null;
let audioEnabled = false;

function getPeriodKey(date = new Date()) {
  const hour = date.getHours();

  if (hour >= 5 && hour < 8) return "morning";
  if (hour >= 8 && hour < 17) return "day";
  if (hour >= 17 && hour < 22) return "dusk";
  return "night";
}

function preloadAssets() {
  Object.values(PERIODS).forEach((period) => {
    const image = new Image();
    image.src = period.background;
  });

  if (window.location.protocol.startsWith("http")) {
    fetch("./data/fortunes.json").catch(() => {});
  }
}

function setBackground(period) {
  hiddenBackground.src = period.background;
  hiddenBackground.classList.add("is-visible");
  visibleBackground.classList.remove("is-visible");

  const previous = visibleBackground;
  visibleBackground = hiddenBackground;
  hiddenBackground = previous;
}

function setCopy(period) {
  titleNode.textContent = period.title;
  textNode.innerHTML = period.text.replace("\n", "<br />");
  timeIcon.src = period.icon;
}

function createAudio(src) {
  const audio = new Audio(src);
  audio.loop = true;
  audio.volume = 0;
  audio.preload = "auto";
  return audio;
}

function fadeVolume(audio, target, duration = 1600, onDone) {
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
  if (!audioEnabled) return;

  fadingAudio = activeAudio;
  activeAudio = createAudio(period.audio);

  try {
    await activeAudio.play();
    fadeVolume(activeAudio, 0.3);
    audioState.textContent = `环境音：${period.title} · 30%`;
  } catch {
    audioState.textContent = "环境音：请再次轻点进入";
  }

  if (fadingAudio) {
    fadeVolume(fadingAudio, 0, 1600, () => {
      fadingAudio.pause();
      fadingAudio.src = "";
      fadingAudio = null;
    });
  }
}

function applyPeriod(periodKey) {
  if (periodKey === activePeriod) return;

  activePeriod = periodKey;
  const period = PERIODS[periodKey];

  setBackground(period);
  setCopy(period);
  switchAudio(period);
}

async function enterTemple() {
  audioEnabled = true;
  stage.classList.add("is-entered");
  enterButton.setAttribute("aria-label", "已进入神庙，环境音播放中");
  await switchAudio(PERIODS[activePeriod || getPeriodKey()]);
}

function schedulePeriodCheck() {
  applyPeriod(getPeriodKey());
  window.setInterval(() => applyPeriod(getPeriodKey()), 30_000);
}

enterButton.addEventListener("click", enterTemple);

preloadAssets();
schedulePeriodCheck();

