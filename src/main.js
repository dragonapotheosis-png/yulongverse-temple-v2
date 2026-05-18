const PERIODS = {
  morning: {
    background: "./assets/baked/morning.png",
  },
  day: {
    background: "./assets/baked/day.png",
  },
  dusk: {
    background: "./assets/baked/dusk.png",
  },
  night: {
    background: "./assets/baked/night.png",
  },
};

const backgroundA = document.querySelector(".background-a");
const backgroundB = document.querySelector(".background-b");
const enterHitbox = document.querySelector("[data-enter]");

let activePeriod = "";
let visibleBackground = backgroundA;
let hiddenBackground = backgroundB;

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
  setBackground(PERIODS[periodKey]);
}

function enterTemple() {
  window.location.hash = "temple";
}

preloadBackgrounds();
applyPeriod(getPeriodKey());
window.setInterval(() => applyPeriod(getPeriodKey()), 30_000);

enterHitbox.addEventListener("click", enterTemple);
