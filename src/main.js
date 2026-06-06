import { createClient } from "@supabase/supabase-js";
import "./styles.css";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const isConfigured = Boolean(supabaseUrl && supabaseAnonKey);
const supabase = isConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null;

const opponents = [
  "KIA 타이거즈",
  "LG 트윈스",
  "두산 베어스",
  "한화 이글스",
  "SSG 랜더스",
  "NC 다이노스",
  "키움 히어로즈",
  "롯데 자이언츠",
  "KT 위즈"
];

let curCat = "ticket";
let curTrade = "sell";
let curFilter = "all";
let posts = [];
let isSubmitting = false;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function init() {
  populateOpponents();
  bindEvents();
  toggleConfiguredUi();
  renderPosts();

  if (isConfigured) {
    loadPosts();
    subscribeRealtime();
  }

  setInterval(renderPosts, 60000);
}

function populateOpponents() {
  ["#ts-opponent", "#tb-opponent"].forEach((selector) => {
    const select = $(selector);
    select.append(new Option("상대팀 선택", ""));
    opponents.forEach((name) => select.append(new Option(name, name)));
  });
}

function bindEvents() {
  $$(".cat-btn").forEach((button) => {
    button.addEventListener("click", () => switchCat(button.dataset.cat));
  });

  $$(".trade-btn").forEach((button) => {
    button.addEventListener("click", () => switchTrade(button.dataset.trade));
  });

  $$(".filter-btn").forEach((button) => {
    button.addEventListener("click", () => setFilter(button.dataset.filter, button));
  });

  $$("form[data-form]").forEach((form) => {
    form.addEventListener("submit", handleSubmit);
  });
}

function toggleConfiguredUi() {
  $("#config-warning").classList.toggle("hidden", isConfigured);
  $$(".submit-btn").forEach((button) => {
    button.disabled = !isConfigured;
  });
}

function switchCat(cat) {
  curCat = cat;
  $("#cat-ticket").className = `cat-btn${cat === "ticket" ? " active-ticket" : ""}`;
  $("#cat-goods").className = `cat-btn${cat === "goods" ? " active-goods" : ""}`;
  showForm();
}

function switchTrade(trade) {
  curTrade = trade;
  $("#trade-sell").className = `trade-btn${trade === "sell" ? " active-sell" : ""}`;
  $("#trade-buy").className = `trade-btn${trade === "buy" ? " active-buy" : ""}`;
  showForm();
}

function showForm() {
  $$("form[data-form]").forEach((form) => {
    form.classList.toggle("hidden", form.dataset.form !== `${curCat}-${curTrade}`);
  });
}

function setFilter(filter, button) {
  curFilter = filter;
  $$(".filter-btn").forEach((btn) => btn.classList.remove("active"));
  button.classList.add("active");
  renderPosts();
}

async function loadPosts() {
  const { data, error } = await supabase
    .from("transfer_posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    showToast("게시글을 불러오지 못했습니다.");
    console.error(error);
    return;
  }

  posts = data ?? [];
  renderPosts();
}

function subscribeRealtime() {
  supabase
    .channel("public:transfer_posts")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "transfer_posts" },
      () => loadPosts()
    )
    .subscribe((status) => {
      if (status === "CHANNEL_ERROR") showToast("실시간 연결을 확인해주세요.");
    });
}

async function handleSubmit(event) {
  event.preventDefault();
  if (!isConfigured || isSubmitting) return;

  const form = event.currentTarget;
  const [category, tradeType] = form.dataset.form.split("-");
  const payload = buildPayload(category, tradeType);
  if (!payload) return;

  isSubmitting = true;
  setSubmitState(true);

  const { error } = await supabase.from("transfer_posts").insert(payload);

  isSubmitting = false;
  setSubmitState(false);

  if (error) {
    showToast("등록에 실패했습니다.");
    console.error(error);
    return;
  }

  form.reset();
  showToast("게시글이 등록되었습니다.");
  await loadPosts();
}

function setSubmitState(disabled) {
  $$(".submit-btn").forEach((button) => {
    button.disabled = disabled || !isConfigured;
  });
}

function buildPayload(category, tradeType) {
  const base = {
    category,
    trade_type: tradeType,
    is_done: false
  };

  if (category === "ticket" && tradeType === "sell") {
    const opponent = $("#ts-opponent").value;
    const seat = $("#ts-seat").value.trim();
    const price = Number($("#ts-price").value);
    const authorName = $("#ts-author").value.trim();
    if (!opponent || !seat || Number.isNaN(price) || !authorName) {
      showToast("상대팀, 좌석 위치, 가격, 작성자 이름을 입력해주세요.");
      return null;
    }
    return {
      ...base,
      author_name: authorName,
      opponent,
      game_date: $("#ts-date").value || null,
      seat,
      price,
      kakao_url: $("#ts-kakao").value.trim() || null,
      description: $("#ts-desc").value.trim() || "-"
    };
  }

  if (category === "ticket" && tradeType === "buy") {
    const opponent = $("#tb-opponent").value;
    const quantity = Number($("#tb-count").value);
    const price = Number($("#tb-price").value);
    const authorName = $("#tb-author").value.trim();
    if (!opponent || Number.isNaN(quantity) || Number.isNaN(price) || !authorName) {
      showToast("상대팀, 매수, 가격, 작성자 이름을 입력해주세요.");
      return null;
    }
    return {
      ...base,
      author_name: authorName,
      opponent,
      game_date: $("#tb-date").value || null,
      quantity,
      price,
      kakao_url: $("#tb-kakao").value.trim() || null,
      description: $("#tb-desc").value.trim() || "-"
    };
  }

  if (category === "goods" && tradeType === "sell") {
    const itemName = $("#gs-name").value.trim();
    const quantity = Number($("#gs-qty").value);
    const price = Number($("#gs-price").value);
    const authorName = $("#gs-author").value.trim();
    if (!itemName || Number.isNaN(quantity) || Number.isNaN(price) || !authorName) {
      showToast("상품명, 수량, 가격, 작성자 이름을 입력해주세요.");
      return null;
    }
    return {
      ...base,
      author_name: authorName,
      item_name: itemName,
      quantity,
      price,
      kakao_url: $("#gs-kakao").value.trim() || null,
      description: $("#gs-desc").value.trim() || "-"
    };
  }

  const itemName = $("#gb-name").value.trim();
  const quantity = Number($("#gb-qty").value);
  const price = Number($("#gb-price").value);
  const authorName = $("#gb-author").value.trim();
  if (!itemName || Number.isNaN(quantity) || Number.isNaN(price) || !authorName) {
    showToast("상품명, 수량, 가격, 작성자 이름을 입력해주세요.");
    return null;
  }
  return {
    ...base,
    author_name: authorName,
    item_name: itemName,
    quantity,
    price,
    kakao_url: $("#gb-kakao").value.trim() || null,
    description: $("#gb-desc").value.trim() || "-"
  };
}

async function toggleDone(id, nextValue) {
  const { error } = await supabase
    .from("transfer_posts")
    .update({ is_done: nextValue })
    .eq("id", id);

  if (error) {
    showToast("상태 변경에 실패했습니다.");
    console.error(error);
    return;
  }

  showToast(nextValue ? "거래완료로 표시했습니다." : "거래중으로 변경했습니다.");
  await loadPosts();
}

function renderPosts() {
  const filtered = posts.filter((post) => curFilter === "all" || curFilter === `${post.category}-${post.trade_type}`);
  $("#post-count").textContent = filtered.length.toString();

  const list = $("#post-list");
  list.replaceChildren();

  if (!isConfigured) {
    list.append(emptyState("Supabase 연결 설정이 필요합니다.", "환경변수를 입력한 뒤 배포하면 모든 사용자가 같은 게시글을 볼 수 있습니다."));
    return;
  }

  if (!filtered.length) {
    list.append(emptyState("등록된 게시글이 없습니다.", "첫 번째 글을 등록해보세요."));
    return;
  }

  filtered.forEach((post) => list.append(postCard(post)));
}

function postCard(post) {
  const card = el("article", `ticket-card ${cardClass(post)}${post.is_done ? " done" : ""}`);
  const top = el("div", "card-top");
  const titleWrap = el("div");
  const title = el("div", "card-title");

  if (post.category === "ticket") {
    title.append(document.createTextNode("삼성 라이온즈 vs "));
    title.append(el("span", "vs-badge", post.opponent ?? "상대 미정"));
    titleWrap.append(title, el("div", "card-sub", `${formatDate(post.game_date)} · 대구 삼성라이온즈파크`));
  } else {
    title.textContent = post.item_name ?? "상품명 미입력";
    titleWrap.append(title);
  }

  top.append(titleWrap, el("span", `price-badge ${priceClass(post)}`, `${fmt(post.price)}원${post.trade_type === "buy" ? " 희망" : ""}`));
  card.append(top);

  const meta = el("div", "card-meta");
  meta.append(el("span", `type-tag ${tagClass(post)}`, typeLabel(post)));
  meta.append(iconText("ti-user", post.author_name ?? "익명"));

  if (post.category === "ticket" && post.trade_type === "sell") {
    meta.append(iconText("ti-armchair", post.seat ?? "좌석 미입력"));
  } else {
    meta.append(iconText(post.category === "ticket" ? "ti-ticket" : "ti-packages", `${post.quantity ?? 1}${post.category === "ticket" ? "매" : "개"}`));
  }

  const ago = el("span", "", timeAgo(post.created_at));
  ago.style.marginLeft = "auto";
  ago.style.fontSize = "11px";
  ago.style.color = "var(--text3)";
  meta.append(ago);

  card.append(meta, el("div", "card-desc", post.description ?? "-"), cardFooter(post));
  return card;
}

function cardFooter(post) {
  const footer = el("div", "card-footer");
  const actions = el("div", "card-actions");

  if (post.kakao_url?.startsWith("http")) {
    const link = el("a", "kakao-link");
    link.href = post.kakao_url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.append(icon("ti-brand-kakao"), document.createTextNode("오픈채팅 바로가기"));
    actions.append(link);
  }

  if (post.is_done) {
    const doneBadge = el("span", "done-badge");
    doneBadge.append(icon("ti-check"), document.createTextNode("거래완료"));
    actions.append(doneBadge);
  }

  const button = el("button", "done-btn");
  button.type = "button";
  button.append(
    icon(post.is_done ? "ti-rotate-clockwise" : "ti-check"),
    document.createTextNode(post.is_done ? "거래중으로 변경" : "거래완료")
  );
  button.addEventListener("click", () => toggleDone(post.id, !post.is_done));

  footer.append(actions.children.length ? actions : el("span"), button);
  return footer;
}

function emptyState(title, desc) {
  const box = el("div", "empty-state");
  box.append(icon("ti-inbox"), document.createTextNode(title), document.createElement("br"), document.createTextNode(desc));
  return box;
}

function iconText(iconName, text) {
  const span = el("span");
  span.append(icon(iconName), document.createTextNode(` ${text}`));
  return span;
}

function icon(iconName) {
  const i = el("i", `ti ${iconName}`);
  i.setAttribute("aria-hidden", "true");
  return i;
}

function el(tag, className = "", text = "") {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function cardClass(post) {
  if (post.category === "ticket" && post.trade_type === "sell") return "sell-card";
  if (post.category === "ticket" && post.trade_type === "buy") return "buy-card";
  if (post.category === "goods" && post.trade_type === "sell") return "goods-sell-card";
  return "goods-buy-card";
}

function priceClass(post) {
  if (post.category === "ticket" && post.trade_type === "sell") return "sell-price";
  if (post.category === "ticket" && post.trade_type === "buy") return "buy-price";
  if (post.category === "goods" && post.trade_type === "sell") return "goods-sell-price";
  return "goods-buy-price";
}

function tagClass(post) {
  if (post.category === "ticket" && post.trade_type === "sell") return "tag-sell-ticket";
  if (post.category === "ticket" && post.trade_type === "buy") return "tag-buy-ticket";
  if (post.category === "goods" && post.trade_type === "sell") return "tag-sell-goods";
  return "tag-buy-goods";
}

function typeLabel(post) {
  const category = post.category === "ticket" ? "티켓" : "굿즈";
  const trade = post.trade_type === "sell" ? "양도" : "구매";
  return `${category} ${trade}`;
}

function fmt(number) {
  return Number(number ?? 0).toLocaleString("ko-KR");
}

function formatDate(date) {
  if (!date) return "날짜 미정";
  return new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "short" }).format(new Date(`${date}T00:00:00`));
}

function timeAgo(timestamp) {
  if (!timestamp) return "";
  const diff = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2200);
}

init();
