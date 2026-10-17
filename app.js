const motion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const smoke = document.querySelector("#smoke");
const ctx = smoke.getContext("2d");
const grains = Array.from({ length: 42 }, () => ({
  x: Math.random(),
  y: Math.random(),
  r: 50 + Math.random() * 140,
  speed: 0.012 + Math.random() * 0.03,
  alpha: 0.035 + Math.random() * 0.06,
  phase: Math.random() * Math.PI * 2,
  tint: Math.random()
}));

function resizeSmoke() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  smoke.width = Math.floor(window.innerWidth * ratio);
  smoke.height = Math.floor(window.innerHeight * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

const pointer = { x: 0.72, y: 0.42 };
const puffs = [];
window.addEventListener("pointermove", (event) => {
  pointer.x = event.clientX / window.innerWidth;
  pointer.y = event.clientY / window.innerHeight;
});

function puffAt(x, y) {
  for (let index = 0; index < 16; index += 1) {
    puffs.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 2.2,
      vy: -0.6 - Math.random() * 1.6,
      r: 18 + Math.random() * 54,
      life: 1,
      rose: Math.random() > 0.45
    });
  }
}

function drawSmoke(time) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  ctx.clearRect(0, 0, w, h);
  grains.forEach((grain) => {
    const drift = Math.sin(time * 0.00015 + grain.phase) * 0.06;
    const pull = pointer.x - grain.x;
    const x = (grain.x + drift + pull * 0.08) * w;
    const y = ((grain.y - ((time * grain.speed) / 1000) % 1) + 1) % 1 * (h + grain.r * 2) - grain.r;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, grain.r);
    const rose = grain.tint > 0.72;
    gradient.addColorStop(0, rose ? `rgba(226,59,90,${grain.alpha})` : `rgba(246,220,226,${grain.alpha})`);
    gradient.addColorStop(0.45, `rgba(90,16,36,${grain.alpha * 0.45})`);
    gradient.addColorStop(1, "rgba(18,6,11,0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, grain.r, 0, Math.PI * 2);
    ctx.fill();
  });
  for (let index = puffs.length - 1; index >= 0; index -= 1) {
    const puff = puffs[index];
    puff.x += puff.vx;
    puff.y += puff.vy;
    puff.life -= 0.012;
    puff.r += 0.8;
    if (puff.life <= 0) {
      puffs.splice(index, 1);
      continue;
    }
    const gradient = ctx.createRadialGradient(puff.x, puff.y, 0, puff.x, puff.y, puff.r);
    gradient.addColorStop(0, puff.rose ? `rgba(226,59,90,${puff.life * 0.45})` : `rgba(246,220,226,${puff.life * 0.35})`);
    gradient.addColorStop(1, "rgba(18,6,11,0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(puff.x, puff.y, puff.r, 0, Math.PI * 2);
    ctx.fill();
  }
  if (!document.hidden) requestAnimationFrame(drawSmoke);
}

if (!motion) {
  resizeSmoke();
  window.addEventListener("resize", resizeSmoke);
  requestAnimationFrame(drawSmoke);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) requestAnimationFrame(drawSmoke);
  });
}

const items = window.MENU.items.map((item, index) => ({ ...item, index }));
const queryInput = document.querySelector("#q");
const list = document.querySelector("#list");
const chips = document.querySelector("#chips");
const count = document.querySelector("#count");
const empty = document.querySelector("#empty");
const stockButton = document.querySelector("#stock");
const sortSelect = document.querySelector("#sort");
const hints = ["вишня", "мята", "манго", "лёд", "никобустер"];
let hintIndex = 0;
let category = "все";
let stockOnly = false;

const lookalikes = { а: "a", е: "e", о: "o", р: "p", с: "c", у: "y", х: "x", к: "k", ё: "e" };

function fold(value) {
  return value.toLowerCase().replace(/ё/g, "е").replace(/[аеорсухкё]/g, (letter) => lookalikes[letter] || letter);
}

function money(value) {
  return `${new Intl.NumberFormat("ru-RU").format(value)} ₽`;
}

function stockText(value) {
  if (!value) return "нет в наличии";
  const mod10 = value % 10;
  const mod100 = value % 100;
  const word = mod10 === 1 && mod100 !== 11 ? "штука" : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? "штуки" : "штук";
  return `в наличии · ${value} ${word}`;
}

function escapeHtml(value) {
  return value.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
}

function highlight(name, query) {
  const safe = escapeHtml(name);
  const needle = query.trim();
  if (needle.length < 2) return safe;
  const pattern = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return safe.replace(new RegExp(pattern, "ig"), (match) => `<mark>${match}</mark>`);
}

function matches(item, query) {
  if (!query) return true;
  const haystack = fold(`${item.name} ${item.category}`);
  return query.split(/\s+/).filter(Boolean).every((part) => haystack.includes(part));
}

function visibleItems() {
  const query = fold(queryInput.value.trim());
  let rows = items.filter((item) => (category === "все" || item.category === category) && (!stockOnly || item.stock > 0) && matches(item, query));
  if (sortSelect.value === "price") rows.sort((a, b) => a.price - b.price || a.index - b.index);
  if (sortSelect.value === "price-desc") rows.sort((a, b) => b.price - a.price || a.index - b.index);
  if (sortSelect.value === "name") rows.sort((a, b) => a.name.localeCompare(b.name, "ru"));
  return rows;
}

function rowHtml(item, query) {
  return `<article class="row${item.stock ? "" : " is-out"}">
    <div class="name">${item.stock ? '<i class="ember"></i>' : ""}${highlight(item.name, query)}</div>
    <div class="price">${money(item.price)}</div>
    <div class="meta">${escapeHtml(item.category)} · ${stockText(item.stock)}</div>
  </article>`;
}

function render() {
  const query = queryInput.value.trim();
  const rows = visibleItems();
  const inStock = rows.filter((item) => item.stock > 0).length;
  count.textContent = rows.length ? `Показано ${rows.length} · в наличии ${inStock}` : "Ничего не найдено";
  empty.hidden = rows.length > 0;
  empty.textContent = stockOnly ? "В этом отборе сейчас пусто. Снимите «только в наличии» или смените вкус." : "Такого вкуса на полке нет.";
  const grouped = sortSelect.value === "sheet" && !query;
  if (!grouped) {
    list.innerHTML = rows.map((item) => rowHtml(item, query)).join("");
    return;
  }
  const groups = [];
  rows.forEach((item) => {
    const last = groups[groups.length - 1];
    if (!last || last.name !== item.category) groups.push({ name: item.category, rows: [item] });
    else last.rows.push(item);
  });
  list.innerHTML = groups.map((group) => {
    const ready = group.rows.filter((item) => item.stock > 0).length;
    return `<section class="group"><h3>${escapeHtml(group.name)} <span>${ready} из ${group.rows.length}</span></h3>${group.rows.map((item) => rowHtml(item, "")).join("")}</section>`;
  }).join("");
}

function chip(label, value) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.classList.toggle("is-on", value === category);
  button.setAttribute("aria-pressed", String(value === category));
  button.addEventListener("click", () => {
    category = value;
    [...chips.children].forEach((child) => {
      const on = child === button;
      child.classList.toggle("is-on", on);
      child.setAttribute("aria-pressed", String(on));
    });
    render();
  });
  chips.append(button);
}

chip("Все", "все");
window.MENU.categories.forEach((name) => chip(name, name));

document.querySelector("#finder").addEventListener("submit", (event) => {
  event.preventDefault();
  document.querySelector("#shelf").scrollIntoView({ behavior: motion ? "auto" : "smooth", block: "start" });
  render();
});
queryInput.addEventListener("input", render);
sortSelect.addEventListener("change", render);
stockButton.addEventListener("click", () => {
  stockOnly = !stockOnly;
  stockButton.setAttribute("aria-pressed", String(stockOnly));
  render();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "/" && document.activeElement !== queryInput) {
    event.preventDefault();
    queryInput.focus();
  }
  if (event.key === "Escape" && document.activeElement === queryInput) {
    queryInput.value = "";
    render();
  }
});

if (!motion) {
  setInterval(() => {
    if (queryInput.value || document.activeElement === queryInput) return;
    hintIndex = (hintIndex + 1) % hints.length;
    queryInput.placeholder = hints[hintIndex];
  }, 2200);
}

const header = document.querySelector(".top");
const onScroll = () => header.classList.toggle("is-solid", window.scrollY > 24);
document.addEventListener("scroll", onScroll, { passive: true });
onScroll();
render();

const cherry = document.querySelector("#cherry");
const cherryLine = document.querySelector("#cherry-line");
const cherryLines = [
  "Сок пошёл по стеблю.",
  "Дым стал гуще.",
  "На двери: 10:00–22:00.",
  "Ищем вишню на полке."
];
let cherryStep = 0;

function burstPetals(rect) {
  for (let index = 0; index < 12; index += 1) {
    const petal = document.createElement("i");
    petal.className = "burst";
    petal.style.left = `${rect.left + rect.width * 0.5}px`;
    petal.style.top = `${rect.top + rect.height * 0.58}px`;
    petal.style.setProperty("--dx", `${(Math.random() - 0.5) * 260}px`);
    petal.style.setProperty("--dy", `${-30 - Math.random() * 200}px`);
    document.body.append(petal);
    petal.addEventListener("animationend", () => petal.remove());
  }
}

cherry.addEventListener("animationend", (event) => {
  if (event.animationName === "squash") cherry.classList.remove("is-burst");
});
cherry.addEventListener("click", () => {
  cherry.classList.remove("is-burst");
  void cherry.offsetWidth;
  cherry.classList.add("is-burst");
  const text = cherryLines[cherryStep % cherryLines.length];
  cherryLine.hidden = false;
  cherryLine.textContent = text;
  cherryLine.classList.remove("is-on");
  void cherryLine.offsetWidth;
  cherryLine.classList.add("is-on");
  const rect = cherry.getBoundingClientRect();
  if (!motion) {
    puffAt(rect.left + rect.width * 0.46, rect.top + rect.height * 0.55);
    burstPetals(rect);
  }
  if (text.includes("полке")) {
    queryInput.value = "вишня";
    stockOnly = false;
    stockButton.setAttribute("aria-pressed", "false");
    render();
    document.querySelector("#shelf").scrollIntoView({ behavior: motion ? "auto" : "smooth", block: "start" });
  }
  cherryStep += 1;
});
