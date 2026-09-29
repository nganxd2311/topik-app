"use strict";
// ---------- Tiện ích ----------
const $ = (sel) => document.querySelector(sel);

// Tạo phần tử bằng textContent (KHÔNG dùng innerHTML) -> tránh lỗi XSS
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
// Bỏ dấu tiếng Việt + chữ thường để tìm kiếm dễ hơn ("nghi" khớp "nghĩ")
const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");

// ---------- Trạng thái ----------
let words = [];
let view = "list";
const filter = { level: "all", query: "" };
let known = new Set();
try { known = new Set(JSON.parse(localStorage.getItem("known") || "[]")); } catch (e) { /* bỏ qua */ }
const saveKnown = () => { try { localStorage.setItem("known", JSON.stringify([...known])); } catch (e) { /* bỏ qua */ } };

function filtered() {
  const q = norm(filter.query.trim());
  return words.filter((w) =>
    (filter.level === "all" || w.level === filter.level) &&
    (!q || norm([w.word, w.meaning, w.pron].join(" ")).includes(q)));
}

// ---------- Danh sách ----------
function showList() {
  const v = $("#view");
  const list = filtered();
  v.replaceChildren(el("p", "muted", `${list.length} từ`));
  list.forEach((w) => {
    const c = el("article", "card");
    c.append(el("h3", "", w.word), el("span", "tag", w.level), el("p", "pron", w.pron),
      el("p", "", w.meaning), el("p", "muted", "Cách dùng: " + w.usage), el("p", "ex", w.example));
    v.append(c);
  });
}

// ---------- Flashcard ----------
let deck = [], idx = 0, flipped = false;
function showFlash() { deck = filtered(); idx = 0; flipped = false; drawCard(); }
function drawCard() {
  const v = $("#view");
  if (!deck.length) { v.replaceChildren(el("p", "muted", "Không có từ nào khớp bộ lọc.")); return; }
  const w = deck[idx];
  const card = el("div", "flash" + (flipped ? " back" : ""));
  card.tabIndex = 0;
  if (flipped) {
    card.append(el("p", "pron", w.pron), el("h2", "", w.meaning), el("p", "muted", w.usage), el("p", "ex", w.example));
  } else {
    card.append(el("p", "big", w.word));
  }
  const flip = () => { flipped = !flipped; drawCard(); };
  card.onclick = flip;
  card.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); } };

  const go = (d) => { idx = (idx + d + deck.length) % deck.length; flipped = false; drawCard(); };
  const prev = el("button", "btn", "Trước"); prev.onclick = () => go(-1);
  const next = el("button", "btn", "Sau"); next.onclick = () => go(1);
  const mark = el("button", "btn" + (known.has(w.id) ? " known" : ""), known.has(w.id) ? "Đã nhớ" : "Đánh dấu đã nhớ");
  mark.onclick = () => { known.has(w.id) ? known.delete(w.id) : known.add(w.id); saveKnown(); drawCard(); };
  const mix = el("button", "btn", "Xáo trộn"); mix.onclick = () => { deck = shuffle(deck); idx = 0; flipped = false; drawCard(); };

  const done = deck.filter((x) => known.has(x.id)).length;
  v.replaceChildren(el("p", "muted", `Thẻ ${idx + 1}/${deck.length} - đã nhớ ${done}`), card,
    Object.assign(el("div", "row"), {}));
  v.lastChild.append(prev, mark, next, mix);
}

// ---------- Quiz ----------
let quiz = null;
function showQuiz() {
  const pool = filtered();
  if (pool.length < 4) { $("#view").replaceChildren(el("p", "muted", "Cần ít nhất 4 từ để làm quiz. Hãy đổi bộ lọc.")); return; }
  quiz = { qs: shuffle(pool).slice(0, 10), i: 0, score: 0 };
  drawQuestion();
}
function drawQuestion() {
  const v = $("#view");
  if (quiz.i >= quiz.qs.length) {
    const again = el("button", "btn", "Làm lại"); again.onclick = showQuiz;
    v.replaceChildren(el("h2", "big", `${quiz.score}/${quiz.qs.length}`), el("p", "muted", "Điểm của bạn"), again);
    return;
  }
  const q = quiz.qs[quiz.i];
  const others = [...new Set(words.filter((w) => w.meaning !== q.meaning).map((w) => w.meaning))];
  const options = shuffle([q.meaning, ...shuffle(others).slice(0, 3)]);
  const box = el("div", "opts");
  const next = el("button", "btn", quiz.i === quiz.qs.length - 1 ? "Xem kết quả" : "Câu tiếp");
  next.hidden = true;
  next.onclick = () => { quiz.i++; drawQuestion(); };
  options.forEach((text) => {
    const b = el("button", "opt", text);
    b.onclick = () => {
      box.querySelectorAll("button").forEach((x) => { x.disabled = true; if (x.textContent === q.meaning) x.classList.add("ok"); });
      if (text === q.meaning) quiz.score++; else b.classList.add("bad");
      next.hidden = false;
    };
    box.append(b);
  });
  v.replaceChildren(el("p", "muted", `Câu ${quiz.i + 1}/${quiz.qs.length}`), el("p", "big", q.word), el("p", "pron", q.pron), box, next);
}

// ---------- Điều khiển ----------
const views = { list: showList, flash: showFlash, quiz: showQuiz };
const render = () => views[view]();

document.querySelectorAll(".tabs button").forEach((b) => {
  b.onclick = () => {
    view = b.dataset.view;
    document.querySelectorAll(".tabs button").forEach((x) => x.classList.toggle("on", x === b));
    render();
  };
});
$("#search").oninput = (e) => { filter.query = e.target.value; render(); };
$("#level").onchange = (e) => { filter.level = e.target.value; render(); };

// ---------- Khởi động: nạp dữ liệu ----------
fetch("data/words.json")
  .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
  .then((data) => {
    words = data;
    [...new Set(words.map((w) => w.level))].forEach((lv) => {
      const o = el("option", "", lv); o.value = lv; $("#level").append(o);
    });
    render();
  })
  .catch(() => $("#view").replaceChildren(el("p", "muted",
    "Không tải được dữ liệu. Hãy chạy bằng server: python3 -m http.server rồi mở http://localhost:8000")));
