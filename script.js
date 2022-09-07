/**
 * @file What this script does.
 * @author m4573Rm4c0 <soacmaster@proton.me>
 */
// TODO:
// - Fix dialog/modal style on dark mode
// - Collect network stats and console.table them
// - Collect parameters into object and console.table them
// - Remove fiatCurrency and fiatPrice from rewards (fiatPrice on network stats table, fiatcurrency on parameters table)
// - Fix tooltips on mobile (out of screen) (set width to auto/content)
// - Show Witnesses and Witnessed last 5 days (interval possible)
// - Show challenges
// - Show total hostspots around a certain radius (Km) (allow to pick radius/hex)
// - Show AVG challenges / miner last 24 hours
// - Show AVG rewards whole network (total miners / rewards)
// - Implement text loading animation on stats:
//   https://dev.to/stackfindover/youtube-loading-animation-using-html-and-css-44c2
// Debug and fix promises chain:
// - Simplify and organize promises chain properly
// - Check when synchronous code is needed and when not.
// - Return Promise (async) or Throw error (sync) accordingly
//  stepOne()
//    .then(stepTwo, handleErrorOne)
//    .then(stepThree, handleErrorTwo)
//    .then(null, handleErrorThree)
// - Make sure promises chain work! Test all steps and scenarios
// - Also important:
//  - Move all styles to style.css, simplify them (also minimize css)
//  - Improve SEO stuff (check recommendations from online analysis)
//  - Share it in reddit, discord, telegram, and medium (create post)
//  - Ask Uri about how to improve design/UI
//  - document functions
//  - organize and simplify code
//  - add helium miners/retailers or crypto ads
// - Extra:
//  - Show graph/sparkline of selected period: https://www.chartjs.org/docs/latest/
//  - Make that updating properties, the correpondant element get updated automatically:
//    https://medium.com/@suvechhyabanerjee92/watch-an-object-for-changes-in-vanilla-javascript-a5f1322a4ca5

// Helper function
const domReady = (cb) => {
  document.readyState === "interactive" || document.readyState === "complete"
    ? cb()
    : document.addEventListener("DOMContentLoaded", cb);
};

// Display body when DOM is loaded
domReady(() => {
  document.body.style.visibility = "visible";
});

const miner = {
  name: null,
  id: null,
  owner: null,
  added: null,
  sinceAdded: null,
  location: null,
  lat: null,
  lng: null,
  scale: null,
  online: null,
};

const period = {
  sDate: new Date(),
  eDate: new Date(),
  unit: null,
  diff: null,
};
period.sDate.setDate(period.sDate.getDate() - 1);

const rewards = {
  hnt: 0,
  hntDay: 0,
  hntHour: 0,
  fiatCurrency: "USD",
  fiatPrice: 0,
  fiat: 0,
  fiatDay: 0,
  fiatHour: 0,
};

// 1000 ms x 60 seconds x 60 minutes x 24 hours
const MS_PER_DAY = 1000 * 60 * 60 * 24;

// a and b are javascript Date objects
/**
 *
 * @param a
 * @param b
 */
function dateDiff(a, b) {
  const dA = new Date(a);
  const dB = new Date(b);
  // with Date.UTC you discard the time and time-zone information
  const utcA = Date.UTC(
    dA.getFullYear(),
    dA.getMonth(),
    dA.getDate(),
    dA.getHours(),
    dA.getMinutes()
  );
  const utcB = Date.UTC(
    dB.getFullYear(),
    dB.getMonth(),
    dB.getDate(),
    dB.getHours(),
    dB.getMinutes()
  );
  let res = (utcA - utcB) / MS_PER_DAY;
  period.unit = res;
  let unit;
  if (res < 1) {
    res = Math.ceil(res * 24);
    res > 1 ? (unit = "hours") : (unit = "hour");
  } else {
    res = Math.ceil(res);
    res > 1 ? (unit = "days") : (unit = "day");
  }
  res = `${res} ${unit}`;
  return res;
}

const baseURL = "https://api.helium.io/v1";
const cgQueryURL =
  "https://api.coingecko.com/api/v3/simple/price?ids=helium&vs_currencies=";
const explorerURL = "https://explorer.helium.com";
const gMapsURL = "https://www.google.com/maps?q=";

Object.assign(String.prototype, {
  capitalize() {
    return this.charAt(0).toUpperCase() + this.slice(1);
  },
});

const elements = document.querySelectorAll("[id]");
const els = {};
for (const el of elements) {
  const iden = el.id;
  const curIden = iden.split("-");
  let newIden = curIden[0];
  if (curIden.length > 1) {
    newIden = curIden[0];
    for (let i = 1; i < curIden.length; i++) {
      newIden += curIden[i].capitalize();
    }
  }
  els[newIden] = el;
}

// initialize start and end datetimes

Object.assign(Date.prototype, {
  toDatetimeLocal() {
    const date = this;
    const ten = (i) => {
      return (i < 10 ? "0" : "") + i;
    };
    const YYYY = date.getFullYear();
    const MM = ten(date.getMonth() + 1);
    const DD = ten(date.getDate());
    const HH = ten(date.getHours());
    const II = ten(date.getMinutes());
    const SS = ten(date.getSeconds());
    const MS = ten(date.getMilliseconds());
    return `${YYYY}-${MM}-${DD}T${HH}:${II}:${SS}.${MS}`;
  },
});

els.dateStart.value = period.sDate.toDatetimeLocal().split(".")[0];
els.dateEnd.value = period.eDate.toDatetimeLocal().split(".")[0];
els.dateStart.min = "2019-08-01T00:00:01";
els.dateEnd.min = els.dateStart.min;
els.dateStart.max = els.dateEnd.value.split("T")[0];
els.dateEnd.max = els.dateStart.max;
period.eDate = period.eDate.toISOString().split(".")[0];
period.sDate = period.sDate.toISOString().split(".")[0];

// set into dark mode if detected
if (
  window.matchMedia &&
  window.matchMedia("(prefers-color-scheme: dark)").matches
) {
  document.body.classList.toggle("dark");
  els.themeToggler.classList.toggle("fa-sun");
  els.check.classList.toggle("dark");
  els.fiatSelect.classList.toggle("dark");
  els.periodSelect.classList.toggle("dark");
}

// event listeners

document.addEventListener("DOMContentLoaded", () => {
  checkPrice().then(updateStats).then(updateTotalRewards);
});

els.themeToggler.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  els.themeToggler.classList.toggle("fa-sun");
  els.check.classList.toggle("dark");
  els.fiatSelect.classList.toggle("dark");
  els.periodSelect.classList.toggle("dark");
});

document.addEventListener("scroll", () => scrollFunction());
window.addEventListener("scroll", () => scrollFunction());

/**
 *
 */
function scrollFunction() {
  if (
    document.body.scrollTop > 20 ||
    document.documentElement.scrollTop > 20 ||
    window.pageYOffset > 20 ||
    window.scrollY > 20
  ) {
    els.totopBtn.style.visibility = "visible";
    els.aboutBtn.style.visibility = "hidden";
  } else {
    els.totopBtn.style.visibility = "hidden";
    els.aboutBtn.style.visibility = "visible";
  }
}

els.totopBtn.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

els.aboutBtn.addEventListener("click", () => {
  els.aboutContainer.scrollIntoView({ behavior: "smooth" });
});

els.fiatSelect.addEventListener("change", () => {
  checkPrice();
});

els.copyClip.addEventListener("mouseout", () => {
  els.minerTooltip.innerHTML = "Copy address to clipboard";
});

els.copyClipOwner.addEventListener("mouseout", () => {
  els.ownerTooltip.innerHTML = "Copy address to clipboard";
});

els.copyClip.addEventListener("click", () => {
  if (els.minerId.hasAttribute("data-id")) {
    const val = els.minerId.getAttribute("data-id");
    navigator.clipboard.writeText(val);
    els.minerTooltip.innerHTML = "🤫 Address copied 🤫";
  }
});

els.copyClipOwner.addEventListener("click", () => {
  if (els.minerId.hasAttribute("data-id")) {
    const val = els.ownerId.getAttribute("data-id");
    navigator.clipboard.writeText(val);
    els.ownerTooltip.innerHTML = "🤫 Address copied 🤫";
  }
});

els.periodSelect.addEventListener("change", () => updatePeriod());

els.customCheck.addEventListener("change", () => {
  const checked = els.customCheck.checked;
  if (!checked) {
    els.periodSelect.removeAttribute("disabled");
    els.dateStart.setAttribute("disabled", "");
    els.dateEnd.setAttribute("disabled", "");
  } else {
    els.periodSelect.setAttribute("disabled", "");
    els.dateStart.removeAttribute("disabled");
    els.dateEnd.removeAttribute("disabled");
  }
  els.startBlock.classList.toggle("colored");
  els.endBlock.classList.toggle("colored");
});

els.checkForm.addEventListener("submit", () => scriptFlow());

// update max date value for datetime-local input elements (start and end) in
// case the page wasn't updated in a while (current date changed)
els.dateStart.addEventListener("change", () => {
  let currDate = new Date();
  currDate = currDate.toDatetimeLocal().split("T")[0];
  els.dateStart.max = currDate;
  els.dateEnd.max = els.dateStart.max;
});
els.dateEnd.addEventListener("change", () => {
  let currDate = new Date();
  currDate = currDate.toDatetimeLocal().split("T")[0];
  els.dateStart.max = currDate;
  els.dateEnd.max = els.dateStart.max;
});

els.checkForm.addEventListener("submit", (e) => e.preventDefault());
els.minerDialog.addEventListener("cancel", (e) => e.preventDefault());
els.minerLocations.addEventListener("change", () => {
  if (this === "default") els.confirmBtn.setAttribute("disabled", "");
  else els.confirmBtn.removeAttribute("disabled");
});
els.statsDetails.addEventListener("toggle", () => {
  const first = els.statsDetails.hasAttribute("open") ? "fa-plus" : "fa-minus";
  const second = first === "fa-minus" ? "fa-plus" : "fa-minus";
  els.statsIcoLeft.classList.replace(first, second);
  els.statsIcoRight.classList.replace(first, second);
});
els.minerDetails.addEventListener("toggle", () => {
  const first = els.minerDetails.hasAttribute("open") ? "fa-plus" : "fa-minus";
  const second = first === "fa-minus" ? "fa-plus" : "fa-minus";
  els.minerIcoLeft.classList.replace(first, second);
  els.minerIcoRight.classList.replace(first, second);
});

// BLOCK SCROLLING

// left: 37, up: 38, right: 39, down: 40,
// spacebar: 32, pageup: 33, pagedown: 34, end: 35, home: 36
const keys = { 37: 1, 38: 1, 39: 1, 40: 1 };

function preventDefault(e) {
  e.preventDefault();
}

function preventDefaultForScrollKeys(e) {
  if (keys[e.keyCode]) {
    preventDefault(e);
    return false;
  }
}

// modern Chrome requires { passive: false } when adding event
let supportsPassive = false;
try {
  window.addEventListener(
    "test",
    null,
    Object.defineProperty({}, "passive", {
      get: () => (supportsPassive = true),
    })
  );
} catch (e) {}

const wheelOpt = supportsPassive ? { passive: false } : false;
const wheelEvent =
  "onwheel" in document.createElement("div") ? "wheel" : "mousewheel";

// call this to Disable
function disableScroll() {
  window.addEventListener("DOMMouseScroll", preventDefault, false); // older FF
  window.addEventListener(wheelEvent, preventDefault, wheelOpt); // modern desktop
  window.addEventListener("touchmove", preventDefault, wheelOpt); // mobile
  window.addEventListener("keydown", preventDefaultForScrollKeys, false);
}

// call this to Enable
function enableScroll() {
  window.removeEventListener("DOMMouseScroll", preventDefault, false);
  window.removeEventListener(wheelEvent, preventDefault, wheelOpt);
  window.removeEventListener("touchmove", preventDefault, wheelOpt);
  window.removeEventListener("keydown", preventDefaultForScrollKeys, false);
}

/**
 *
 * @example
 */
function updatePeriod() {
  // update current time
  const end = new Date();
  let begin = new Date();
  let diff;

  const selected = els.periodSelect.value;
  switch (selected) {
    case "1h":
    case "2h":
    case "3h":
    case "6h":
    case "12h":
    case "24h":
      diff = parseInt(selected.replace("h", ""));
      begin.setHours(begin.getHours() - diff);
      break;
    case "2d":
    case "3d":
    case "7d":
    case "14d":
    case "30d":
    case "60d":
    case "90d":
    case "180d":
      diff = parseInt(selected.replace("d", ""));
      begin.setDate(begin.getDate() - diff);
      break;
    case "1y":
    case "2y":
      diff = parseInt(selected.replace("y", ""));
      begin.setFullYear(begin.getFullYear() - diff);
      break;
    case "max":
      begin = new Date("2019-08-01T00:00:01.00Z"); // Helium's beginning
      break;
    default:
      break;
  }
  period.sDate = begin.toISOString().split(".")[0];
  period.eDate = end.toISOString().split(".")[0];
  els.dateStart.value = begin.toDatetimeLocal().split(".")[0];
  els.dateEnd.value = end.toDatetimeLocal().split(".")[0];
  els.dateStart.max = els.dateEnd.value.split("T")[0];
  els.dateEnd.max = els.dateStart.max;
}

// showing loading, hide check button
/**
 *
 */
function toggleStyle() {
  if (!(els.customCheck.checked || els.periodSelect.value === "max")) {
    els.timeInterval.style.visibility = "hidden";
  }
  els.loader.style.display = els.check.innerHTML === "Check" ? "block" : "none";
  els.check.innerHTML =
    els.check.innerHTML === "Check" ? "Checking..." : "Check";
  els.check.toggleAttribute("disabled");
}

/**
 *
 */
function displayResults() {
  els.results.style.display = "";
}

/**
 *
 */
function hideResults() {
  els.results.style.display = "none";
}

/**
 *
 * @param response
 * @example
 */
function getResponse(response) {
  if (response.status >= 200 && response.status < 300)
    return Promise.resolve(response.json());
  else return Promise.reject(new Error(response.statusText));
}

/**
 *
 * @param data
 * @example
 */
function showRewards(data) {
  rewards.hnt = data.data.total;
  rewards.hntDay = rewards.hnt / period.unit;
  rewards.hntHour = rewards.hntDay / 24;
  els.rewards.innerHTML = rewards.hnt.toFixed(3);
  els.rewardsDay.innerHTML = rewards.hntDay.toFixed(3);
  els.rewardsHour.innerHTML = rewards.hntHour.toFixed(3);
  const currency = els.fiatSelect.options[els.fiatSelect.selectedIndex].text;
  rewards.fiatCurrency = currency;
  rewards.fiat = rewards.hnt * rewards.fiatPrice;
  rewards.fiatDay = rewards.hntDay * rewards.fiatPrice;
  rewards.fiatHour = rewards.hntHour * rewards.fiatPrice;
  els.rewardsFiatLbl.innerHTML = rewards.fiatCurrency;
  els.rewardsFiat.innerHTML = rewards.fiat.toFixed(2);
  els.rewardsFiatDay.innerHTML = rewards.fiatDay.toFixed(2);
  els.rewardsFiatHour.innerHTML = rewards.fiatHour.toFixed(2);
  console.log("Rewards:");
  console.table(rewards);
  toggleStyle();
  displayResults();
}

/**
 *
 * @param data
 */
async function updatePrice(data) {
  els.hntPrice.title = rewards.fiatCurrency;
  rewards.fiatPrice = data.helium[rewards.fiatCurrency.toLowerCase()];
  els.price.innerHTML = rewards.fiatPrice;
}

/**
 *
 */
function numToShort(number) {
  const short = new Intl.NumberFormat("en-GB", {
    notation: "compact",
    compactDisplay: "short",
  }).format(number);
  return short;
}

/**
 *
 */
async function updateTotalRewards() {
  const queryURL = `${baseURL}/rewards/sum?min_time=-1%20day`;
  await fetch(queryURL)
    .then(getResponse)
    .then((resp) => {
      const rewardsShort = numToShort(resp.data.total);
      els.hntRewards.innerHTML = rewardsShort;
    });
}

/**
 *
 */
async function updateStats() {
  const queryURL = `${baseURL}/stats`;
  await fetch(queryURL)
    .then(getResponse)
    .then((resp) => {
      const supplyShort = numToShort(resp.data.token_supply);
      const totalMinersShort = numToShort(resp.data.counts.hotspots);
      const totalOnline = numToShort(resp.data.counts.hotspots_online);
      const totalValidators = numToShort(resp.data.counts.validators);
      const totalOuis = numToShort(resp.data.counts.ouis);
      const totalBlocks = numToShort(resp.data.counts.blocks);
      const totalTransactions = numToShort(resp.data.counts.transactions);
      const totalChallenges = numToShort(resp.data.counts.challenges);
      const percOnline = parseInt(
        (resp.data.counts.hotspots_online * 100) / resp.data.counts.hotspots
      );
      els.hntSupply.innerHTML = supplyShort;
      els.totalMiners.innerHTML = totalMinersShort;
      els.totalMiners.title = `Online: ${totalOnline} (${percOnline}%)`;
      els.totalValidators.innerHTML = totalValidators;
      els.totalOuis.innerHTML = totalOuis;
      els.totalBlocks.innerHTML = totalBlocks;
      els.totalTransactions.innerHTML = totalTransactions;
      els.totalChallenges.innerHTML = totalChallenges;
    });
}

/**
 *
 */
async function checkPrice() {
  const currency = els.fiatSelect.options[els.fiatSelect.selectedIndex].text;
  rewards.fiatCurrency = currency;
  const queryURL = `${cgQueryURL}${rewards.fiatCurrency.toLowerCase()}`;
  await fetch(queryURL).then(getResponse).then(updatePrice);
}

function storeMinerInfo(minerData) {
  miner.name = minerData.name;
  miner.id = minerData.address;
  miner.owner = minerData.owner;
  miner.added = minerData.timestamp_added;
  miner.location = `${minerData.geocode.long_city} (${minerData.geocode.long_country})`;
  miner.lat = minerData.lat;
  miner.lng = minerData.lng;
  miner.scale = minerData.reward_scale;
  miner.online = minerData.status.online === "online";
  if (miner.online) {
    els.infoThLeft.style.color = "green";
    els.infoThRight.style.color = "green";
    els.infoThLeft.title = "Online";
    els.infoThRight.title = "Online";
  } else {
    els.infoThLeft.style.color = "red";
    els.infoThRight.style.color = "red";
    els.infoThLeft.title = "Offline";
    els.infoThRight.title = "Offline";
  }
  els.minerId.removeAttribute("data-id");
  els.minerId.removeAttribute("href");
  els.ownerId.removeAttribute("data-id");
  els.ownerId.removeAttribute("href");
  els.minerId.setAttribute("data-id", miner.id);
  els.minerId.setAttribute("href", `${explorerURL}/hotspots/${miner.id}`);
  els.ownerId.setAttribute("data-id", miner.owner);
  els.ownerId.setAttribute("href", `${explorerURL}/accounts/${miner.owner}`);
  const hiddenAddress = `${miner.id.substring(0, 7)}...${miner.id.substring(
    miner.id.length - 7,
    miner.id.length
  )}`;
  els.minerId.innerHTML = hiddenAddress;
  let added = new Date(miner.added);
  miner.sinceAdded = dateDiff(new Date(), added);
  added = added.toDateString();
  els.addedDate.innerHTML = `${added} (${miner.sinceAdded})`;
  const hiddenOwner = `${miner.owner.substring(0, 7)}...${miner.owner.substring(
    miner.owner.length - 7,
    miner.owner.length
  )}`;
  els.location.innerHTML = miner.location;
  els.location.setAttribute("href", `${gMapsURL}${miner.lat},${miner.lng}`);
  els.ownerId.innerHTML = hiddenOwner;
  els.scale.innerHTML = miner.scale;
  console.log("Miner found:");
  console.table(miner);
}

/**
 *
 * @param data
 * @example
 */
async function getId(data) {
  const found = data.data.length > 0;
  if (found) {
    els.minerWildcard.innerHTML = els.minerName.value;
    if (data.data.length > 1) {
      els.minerLocations.innerHTML = '<option value="default">Choose…</option>';
      const minerInfo = data.data;
      for (let i = 0; i < minerInfo.length; i++) {
        const cityCountry = `${minerInfo[i].geocode.long_city} (${minerInfo[i].geocode.long_country})`;
        els.minerLocations.innerHTML += `<option value="${i}">${cityCountry}</option>`;
      }
      els.minerLocations.value;

      // If a browser doesn't support the dialog, then hide the dialog contents by default.
      if (typeof els.minerDialog.showModal !== "function") {
        els.minerDialog.hidden = true;
        alert(
          "Sorry, the <dialog> API is not supported by this browser. Please update your browser."
        );
      } else {
        els.confirmBtn.setAttribute("disabled", "");
        els.minerDialog.showModal();
        disableScroll();
        return new Promise((resolve) => {
          // "Confirm" button of form triggers "close" on dialog because of [method="dialog"]
          els.minerDialog.addEventListener("close", () => {
            els.minerDialog.removeEventListener("close", () => {});
            if (els.minerLocations.value !== "default") {
              enableScroll();
              storeMinerInfo(data.data[els.minerLocations.value]);
              resolve(miner.id);
            } else {
              els.minerDialog.removeAttribute("open");
              console.log("Miner not selected");
              getId(data);
            }
          });
        });
      }
    } else {
      storeMinerInfo(data.data[0]);
      return Promise.resolve(miner.id);
    }
  } else {
    els.noMinerFound.style.visibility = "visible";
    els.noMinerFound.style.opacity = 1;
    setTimeout(() => {
      els.noMinerFound.style.opacity = 0;
      els.noMinerFound.style.visibility = "hidden";
    }, 6000);
    return Promise.reject(new Error("Miner not found"));
  }
}

/**
 *
 * @example
 */
async function findMiner() {
  // hide results in case not hidden already
  hideResults();
  // toggle "Check" --> "Checking..." loading style
  toggleStyle();
  // parse miner name "First Second Third" to "first-second-third" for API request
  const name = els.minerName.value.trim().toLowerCase().replaceAll(" ", "-");
  // build URL
  const idQuery = `hotspots/name/${name}`;
  const idURL = `${baseURL}/${idQuery}`;
  // API request
  const minId = await fetch(idURL).then(getResponse);
  return minId;
}

/**
 *
 * @param minerId
 * @example
 */
async function getRewards(minerId) {
  if (els.customCheck.checked) {
    period.sDate = new Date(els.dateStart.value);
    period.sDate = period.sDate.toISOString().split(".")[0];
    period.eDate = new Date(els.dateEnd.value);
    period.eDate = period.eDate.toISOString().split(".")[0];
  } else {
    updatePeriod();
    if (els.periodSelect.value === "max") {
      period.sDate = miner.added.split(".")[0];
      const max = new Date(miner.added);
      els.dateStart.value = max.toDatetimeLocal().split(".")[0];
    }
  }
  period.diff = dateDiff(period.eDate, period.sDate);
  console.log("Period selected:");
  console.table(period);
  els.timeInterval.innerHTML = period.diff;
  if (els.customCheck.checked || els.periodSelect.value === "max") {
    els.timeInterval.style.visibility = "visible";
  }
  const epochQuery = `min_time=${period.sDate}.000Z&max_time=${period.eDate}.000Z`;
  const rewardsQuery = `hotspots/${minerId}/rewards/sum?${epochQuery}`;
  const rewardsURL = `${baseURL}/${rewardsQuery}`;
  // const selected = els.periodSelect.value
  await checkPrice();
  const rewards = await fetch(rewardsURL).then(getResponse);
  return rewards;
}

/**
 * Description.
 *
 * @param {string} title - The title of the book.
 * @param {string} author - The author of the book.
 * @returns {object} - The book object itself.
 * @see {@link https://gist.github.com/WebReflection/6076a40777b65c397b2b9b97247520f0}
 * @example
 */
async function scriptFlow() {
  await findMiner()
    .then(getId)
    .catch((error) => {
      if (error.message === "Miner not found") {
        toggleStyle();
        throw Error(error.message);
      } else {
        console.log("Request failed )':");
        console.log(error.message);
        console.log("Trying again...");
        setTimeout(() => {
          scriptFlow();
        }, 2000);
      }
    })
    .then(getRewards)
    .then(showRewards)
    .catch((error) => {
      console.log("Request failed )':");
      console.log(error);
      console.log("Trying again...");
      setTimeout(() => {
        getRewards();
      }, 2000);
    });
}
