/**
 * @file What this script does.
 * @author m4573Rm4c0 <soacmaster@proton.me>
 */
// TODO:
// - document functions
// - minify javascript
// - upload into github and hosting
// - add google analytics tracking
// - share it in reddit. discord and telegram
// Future:
// - Simplify and organize promises chain properly:
//  - Check when synchronous code is needed and when not.
//  - Return Promise (async) or Throw error (sync) accordingly
//  stepOne()
//    .then(stepTwo, handleErrorOne)
//    .then(stepThree, handleErrorTwo)
//    .then(null, handleErrorThree)
// - Move all styles to style.css, simplify them
// - Make that updating properties, the correpondant element get updated automatically: https://medium.com/@suvechhyabanerjee92/watch-an-object-for-changes-in-vanilla-javascript-a5f1322a4ca5
// - Handle multiple miners with same name (show pop up and select one)
// - Use TSparticles (https://particles.js.org/docs/index.html#Official-components-for-some-of-the-most-used-frameworks)
// - Show HNT's supply
// - Show total miners
// - Show AVG rewards whole network (total miners / rewards)
// - Show Witnesses and Witnessed last 5 days (time interval not possible)
// - Show challenges
// - Show total hostspots around a certain radius (Km)
// - Show transmit scale and online
// - Show AVG challenges / miner last 24 hours
// - organize and simplify code

import { Particles } from './particles.min.js'

// Helper function
const domReady = (cb) => {
  document.readyState === 'interactive' || document.readyState === 'complete'
    ? cb()
    : document.addEventListener('DOMContentLoaded', cb)
}

// Display body when DOM is loaded
domReady(() => {
  document.body.style.visibility = 'visible'
})

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
  online: null
}

const period = {
  sDate: new Date(),
  eDate: new Date(),
  unit: null,
  diff: null
}
period.sDate.setDate(period.sDate.getDate() - 1)

const rewards = {
  hnt: 0,
  hntDay: 0,
  hntHour: 0,
  fiatCurrency: 'USD',
  fiatPrice: 0,
  fiat: 0,
  fiatDay: 0,
  fiatHour: 0
}

// 1000 ms x 60 seconds x 60 minutes x 24 hours
const MS_PER_DAY = 1000 * 60 * 60 * 24

// a and b are javascript Date objects
/**
 *
 * @param a
 * @param b
 */
function dateDiff (a, b) {
  const dA = new Date(a)
  const dB = new Date(b)
  // with Date.UTC you discard the time and time-zone information
  const utcA = Date.UTC(dA.getFullYear(), dA.getMonth(), dA.getDate(), dA.getHours(), dA.getMinutes())
  const utcB = Date.UTC(dB.getFullYear(), dB.getMonth(), dB.getDate(), dB.getHours(), dB.getMinutes())
  let res = (utcA - utcB) / MS_PER_DAY
  period.unit = res
  let unit
  if (res < 1) {
    res = Math.ceil(res * 24)
    res > 1 ? unit = 'hours' : unit = 'hour'
  } else {
    res = Math.ceil(res)
    res > 1 ? unit = 'days' : unit = 'day'
  }
  res = `${res} ${unit}`
  return res
}

const baseURL = 'https://api.helium.io/v1'
const cgQueryURL = 'https://api.coingecko.com/api/v3/simple/price?ids=helium&vs_currencies='
const explorerURL = 'https://explorer.helium.com'
const gMapsURL = 'https://www.google.com/maps?q='

Object.assign(String.prototype, {
  capitalize () {
    return this.charAt(0).toUpperCase() + this.slice(1)
  }
})

const elements = document.querySelectorAll('[id]')
const els = {}
for (const el of elements) {
  const iden = el.id
  const curIden = iden.split('-')
  let newIden = curIden[0]
  if (curIden.length > 1) {
    newIden = curIden[0]
    for (let i = 1; i < curIden.length; i++) {
      newIden += curIden[i].capitalize()
    }
  }
  els[newIden] = el
}

// initialize start and end datetimes

Object.assign(Date.prototype, {
  toDatetimeLocal () {
    const date = this
    const ten = (i) => { return (i < 10 ? '0' : '') + i }
    const YYYY = date.getFullYear()
    const MM = ten(date.getMonth() + 1)
    const DD = ten(date.getDate())
    const HH = ten(date.getHours())
    const II = ten(date.getMinutes())
    const SS = ten(date.getSeconds())
    const MS = ten(date.getMilliseconds())
    return `${YYYY}-${MM}-${DD}T${HH}:${II}:${SS}.${MS}`
  }
})

els.dateStart.value = period.sDate.toDatetimeLocal().split('.')[0]
els.dateEnd.value = period.eDate.toDatetimeLocal().split('.')[0]
els.dateStart.min = '2019-08-01T00:00:01'
els.dateEnd.min = els.dateStart.min
els.dateStart.max = els.dateEnd.value.split('T')[0]
els.dateEnd.max = els.dateStart.max
period.eDate = period.eDate.toISOString().split('.')[0]
period.sDate = period.sDate.toISOString().split('.')[0]

// event listeners
let particles

window.addEventListener('DOMContentLoaded', () => {
  checkPrice()
  particles = Particles.init({
    // color: '#474dff',
    color: '#27cf8f',
    connectParticles: true,
    maxParticles: 150,
    minDistance: 100,
    selector: '.background',
    sizeVariations: 15,
    speed: 0.075
  })
})

els.playPause.addEventListener('click', () => {
  els.playPause.classList.contains('fa-play') ? particles.resumeAnimation() : particles.pauseAnimation()
  els.playPause.classList.toggle('fa-play')
})

els.themeToggler.addEventListener('click', () => {
  document.body.classList.toggle('dark')
  els.themeToggler.classList.toggle('fa-sun')
})

window.addEventListener('scroll', () => scrollFunction())

/**
 *
 */
function scrollFunction () {
  if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
    els.totopBtn.style.visibility = 'visible'
    els.aboutBtn.style.visibility = 'hidden'
    els.playPause.style.visibility = 'hidden'
  } else {
    els.totopBtn.style.visibility = 'hidden'
    els.aboutBtn.style.visibility = 'visible'
    els.playPause.style.visibility = 'visible'
  }
}

els.totopBtn.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
})

els.aboutBtn.addEventListener('click', () => {
  els.aboutContainer.scrollIntoView({ behavior: 'smooth' })
})

els.fiatSelect.addEventListener('change', () => {
  checkPrice()
})

els.copyClip.addEventListener('mouseout', () => {
  els.minerTooltip.innerHTML = 'Copy miner\'s address to clipboard'
})

els.copyClipOwner.addEventListener('mouseout', () => {
  els.ownerTooltip.innerHTML = 'Copy owner\'s address to clipboard'
})

els.copyClip.addEventListener('click', () => {
  if (els.minerId.hasAttribute('data-id')) {
    const val = els.minerId.getAttribute('data-id')
    navigator.clipboard.writeText(val)
    els.minerTooltip.innerHTML = '🤫 Miner\'s address copied 🤫'
  }
})

els.copyClipOwner.addEventListener('click', () => {
  if (els.minerId.hasAttribute('data-id')) {
    const val = els.ownerId.getAttribute('data-id')
    navigator.clipboard.writeText(val)
    els.ownerTooltip.innerHTML = '🤫 Owner\'s address copied 🤫'
  }
})

els.periodSelect.addEventListener('change', () => updatePeriod())

els.customCheck.addEventListener('change', () => {
  const checked = els.customCheck.checked
  if (!checked) {
    els.periodSelect.removeAttribute('disabled')
    els.dateStart.setAttribute('disabled', '')
    els.dateEnd.setAttribute('disabled', '')
  } else {
    els.periodSelect.setAttribute('disabled', '')
    els.dateStart.removeAttribute('disabled')
    els.dateEnd.removeAttribute('disabled')
  }
})

els.checkForm.addEventListener('submit', () => scriptFlow())

// update max date value for datetime-local input elements (start and end) in
// case the page wasn't updated in a while (current date changed)
els.dateStart.addEventListener('change', () => {
  let currDate = new Date()
  currDate = currDate.toDatetimeLocal().split('T')[0]
  els.dateStart.max = currDate
  els.dateEnd.max = els.dateStart.max
})
els.dateEnd.addEventListener('change', () => {
  let currDate = new Date()
  currDate = currDate.toDatetimeLocal().split('T')[0]
  els.dateStart.max = currDate
  els.dateEnd.max = els.dateStart.max
})

els.checkForm.addEventListener('submit', event => event.preventDefault())

/**
 *
 * @example
 */
function updatePeriod () {
  // update current time
  const end = new Date()
  let begin = new Date()
  let diff

  const selected = els.periodSelect.value
  switch (selected) {
    case '1h':
    case '2h':
    case '3h':
    case '6h':
    case '12h':
    case '24h':
      diff = parseInt(selected.replace('h', ''))
      begin.setHours(begin.getHours() - diff)
      break
    case '7d':
    case '14d':
    case '30d':
    case '60d':
    case '90d':
    case '180d':
      diff = parseInt(selected.replace('d', ''))
      begin.setDate(begin.getDate() - diff)
      break
    case '1y':
      diff = parseInt(selected.replace('y', ''))
      begin.setFullYear(begin.getFullYear() - diff)
      break
    case 'max':
      begin = new Date('2019-08-01T00:00:01.00Z') // Helium's beginning
      break
    default:
      break
  }
  period.sDate = begin.toISOString().split('.')[0]
  period.eDate = end.toISOString().split('.')[0]
  els.dateStart.value = begin.toDatetimeLocal().split('.')[0]
  els.dateEnd.value = end.toDatetimeLocal().split('.')[0]
  els.dateStart.max = els.dateEnd.value.split('T')[0]
  els.dateEnd.max = els.dateStart.max
}

// showing loading, hide check button
/**
 *
 */
function toggleStyle () {
  els.loader.classList.toggle('hidden')
  els.check.innerHTML = els.check.innerHTML === 'Check' ? 'Checking...' : 'Check'
  els.check.toggleAttribute('disabled')
}

/**
 *
 */
function displayResults () {
  els.rewardsTable.style.visibility = 'visible'
  els.minerTable.style.visibility = 'visible'
}

/**
 *
 */
function hideResults () {
  els.rewardsTable.style.visibility = 'hidden'
  els.minerTable.style.visibility = 'hidden'
}

/**
 *
 * @param response
 * @example
 */
function getResponse (response) {
  if (response.status >= 200 && response.status < 300) return Promise.resolve(response.json())
  else return Promise.reject(new Error(response.statusText))
}

/**
 *
 * @param data
 */
async function updateRewards (data) {
  const fiat = data.helium[rewards.fiatCurrency.toLowerCase()]
  rewards.fiatPrice = fiat
  rewards.fiat = rewards.hnt * fiat
  rewards.fiatDay = rewards.hntDay * fiat
  rewards.fiatHour = rewards.hntHour * fiat
  els.rewardsFiatLbl.innerHTML = rewards.fiatCurrency
  els.rewardsFiat.innerHTML = rewards.fiat.toFixed(2)
  els.rewardsFiatDay.innerHTML = rewards.fiatDay.toFixed(2)
  els.rewardsFiatHour.innerHTML = rewards.fiatHour.toFixed(2)
  console.log('Rewards:')
  console.table(rewards)
}

/**
 *
 * @param data
 * @example
 */
async function showRewards (data) {
  rewards.hnt = data.data.total
  rewards.hntDay = rewards.hnt / period.unit
  rewards.hntHour = rewards.hntDay / 24
  els.rewards.innerHTML = rewards.hnt.toFixed(3)
  els.rewardsDay.innerHTML = rewards.hntDay.toFixed(3)
  els.rewardsHour.innerHTML = rewards.hntHour.toFixed(3)
  const currency = els.fiatSelect.options[els.fiatSelect.selectedIndex].text
  rewards.fiatCurrency = currency
  const queryURL = `${cgQueryURL}${currency.toLowerCase()}`
  await fetch(queryURL)
    .then(getResponse)
    .then(updateRewards)
  toggleStyle()
  displayResults()
}

/**
 *
 * @param data
 */
async function updatePrice (data) {
  els.fiatCurrency.innerHTML = rewards.fiatCurrency
  rewards.fiatPrice = data.helium[rewards.fiatCurrency.toLowerCase()]
  els.price.innerHTML = rewards.fiatPrice
}

/**
 *
 */
async function checkPrice () {
  const currency = els.fiatSelect.options[els.fiatSelect.selectedIndex].text
  rewards.fiatCurrency = currency
  const queryURL = `${cgQueryURL}${rewards.fiatCurrency.toLowerCase()}`
  await fetch(queryURL)
    .then(getResponse)
    .then(updatePrice)
}

/**
 *
 * @param data
 * @example
 */
function getId (data) {
  const found = data.data.length > 0
  if (found) {
    miner.name = data.data[0].name
    miner.id = data.data[0].address
    miner.owner = data.data[0].owner
    miner.added = data.data[0].timestamp_added
    miner.location = `${data.data[0].geocode.long_city} (${data.data[0].geocode.long_country})`
    miner.lat = data.data[0].lat
    miner.lng = data.data[0].lng
    miner.scale = data.data[0].reward_scale
    miner.online = data.data[0].status.online === 'online'
    els.minerId.setAttribute('data-id', miner.id)
    els.minerId.setAttribute('href', `${explorerURL}/hotspots/${miner.id}`)
    els.ownerId.setAttribute('data-id', miner.owner)
    els.ownerId.setAttribute('href', `${explorerURL}/accounts/${miner.owner}`)
    const hiddenAddress = `${miner.id.substring(0, 7)}...${miner.id.substring(miner.id.length - 7, miner.id.length)}`
    els.minerId.innerHTML = hiddenAddress
    let added = new Date(miner.added)
    miner.sinceAdded = dateDiff(new Date(), added)
    added = added.toDateString()
    els.addedDate.innerHTML = `${added} (${miner.sinceAdded})`
    const hiddenOwner = `${miner.owner.substring(0, 7)}...${miner.owner.substring(miner.owner.length - 7, miner.owner.length)}`
    els.location.innerHTML = miner.location
    els.location.setAttribute('href', `${gMapsURL}${miner.lat},${miner.lng}`)
    els.ownerId.innerHTML = hiddenOwner
    console.log('Miner found:')
    console.table(miner)
    return Promise.resolve(miner.id)
  } else {
    els.noMinerFound.style.visibility = 'visible'
    els.noMinerFound.style.opacity = 1
    setTimeout(() => {
      els.noMinerFound.style.opacity = 0
      els.noMinerFound.style.visibility = 'hidden'
    }, 6000)
    return Promise.reject(new Error('Miner not found'))
  }
}

/**
 *
 * @example
 */
async function getMinerId () {
  hideResults()
  toggleStyle()
  const name = els.minerName.value.trim().toLowerCase().replaceAll(' ', '-')
  const idQuery = `hotspots/name/${name}`
  const idURL = `${baseURL}/${idQuery}`
  els.minerId.removeAttribute('data-id')
  els.minerId.removeAttribute('href')
  els.ownerId.removeAttribute('data-id')
  els.ownerId.removeAttribute('href')
  els.rewardsFiat.innerHTML = `? ${rewards.fiatCurrency}`
  if (!(els.customCheck.checked || els.periodSelect.value === 'max')) {
    els.timeInterval.style.visibility = 'hidden'
  }
  const minId = await fetch(idURL)
    .then(getResponse)
    .then(getId)
    .catch((error) => {
      if (error.message === 'Miner not found') {
        toggleStyle()
        throw Error(error.message)
      } else {
        console.log('Request failed )\':')
        console.log(error.message)
        console.log('Trying again...')
        scriptFlow()
      }
    })
  return minId
}

/**
 *
 * @param minerId
 * @example
 */
async function getRewards (minerId) {
  if (els.customCheck.checked) {
    period.sDate = new Date(els.dateStart.value)
    period.sDate = period.sDate.toISOString().split('.')[0]
    period.eDate = new Date(els.dateEnd.value)
    period.eDate = period.eDate.toISOString().split('.')[0]
  } else {
    updatePeriod()
    if (els.periodSelect.value === 'max') {
      period.sDate = miner.added.split('.')[0]
      const max = new Date(miner.added)
      els.dateStart.value = max.toDatetimeLocal().split('.')[0]
    }
  }
  period.diff = dateDiff(period.eDate, period.sDate)
  console.log('Period selected:')
  console.table(period)
  els.timeInterval.innerHTML = period.diff
  if (els.customCheck.checked || els.periodSelect.value === 'max') {
    els.timeInterval.style.visibility = 'visible'
  }
  const epochQuery = `min_time=${period.sDate}.000Z&max_time=${period.eDate}.000Z`
  const rewardsQuery = `hotspots/${minerId}/rewards/sum?${epochQuery}`
  const rewardsURL = `${baseURL}/${rewardsQuery}`
  // const selected = els.periodSelect.value
  if (minerId !== undefined) {
    await fetch(rewardsURL)
      .then(getResponse)
      .then(showRewards)
      .catch((error) => {
        console.log('Request failed )\':')
        console.log(error)
        console.log('Trying again...')
        getRewards()
      })
  } else scriptFlow()
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
async function scriptFlow () {
  await getMinerId()
    .then((mId) => getRewards(mId))
    .catch((error) => {
      console.log(error.message)
    })
}