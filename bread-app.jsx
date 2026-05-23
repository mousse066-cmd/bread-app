import { useState, useRef, useEffect } from "react";

// ── SUPABASE CONFIG ─────────────────────────────────────────────
const SUPABASE_URL = "https://knukirwgdietkodkehjx.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtudWtpcndnZGlldGtvZGtlaGp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNTA5MjgsImV4cCI6MjA5NDgyNjkyOH0.2zopf0974XeuPEG9_paYJSPpQ4NOoYVbyqZ0-GQwgWk";

const sb = {
  from: (table) => ({
    select: async (cols = "*", opts = {}) => {
      let url = `${SUPABASE_URL}/rest/v1/${table}?select=${cols}`;
      if (opts.order) url += `&order=${opts.order}`;
      if (opts.eq) url += `&${opts.eq.col}=eq.${opts.eq.val}`;
      if (opts.limit) url += `&limit=${opts.limit}`;
      const r = await fetch(url, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
      return r.json();
    },
    insert: async (data) => {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: "POST",
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
        body: JSON.stringify(data)
      });
      return r.json();
    },
    update: async (data, match) => {
      const url = `${SUPABASE_URL}/rest/v1/${table}?${match.col}=eq.${match.val}`;
      const r = await fetch(url, {
        method: "PATCH",
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
        body: JSON.stringify(data)
      });
      return r.json();
    },
    rpc: async (fn, params) => {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
        method: "POST",
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(params)
      });
      return r.json();
    }
  })
};

// ── CLAUDE API ──────────────────────────────────────────────────
async function claude(system, user, useSearch = false) {
  const body = {
    model: "claude-sonnet-4-20250514", max_tokens: 1500, system,
    messages: [{ role: "user", content: typeof user === "string" ? user : user }]
  };
  if (useSearch) body.tools = [{ type: "web_search_20250305", name: "web_search" }];
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
  });
  const d = await r.json();
  const text = d.content.filter(b => b.type === "text").map(b => b.text).join("");
  return text.replace(/```json|```/g, "").trim();
}

// ── BREAD IMAGE ─────────────────────────────────────────────────
function BreadImg({ prompt, name, height = "100%" }) {
  const [loaded, setLoaded] = useState(false), [err, setErr] = useState(false);
  const seed = useRef(Math.floor(Math.random() * 99999));
  if (!prompt) return null;
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt + ", artisan bakery food photography, warm lighting, no text, no watermark, photorealistic")}?width=600&height=600&nologo=true&seed=${seed.current}`;
  return (
    <div style={{ position: "relative", width: "100%", paddingBottom: "100%", borderRadius: 14, overflow: "hidden", background: "#f5ede0" }}>
      {!loaded && !err && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <div style={{ width: 32, height: 32, border: "3px solid #e8d0b0", borderTop: "3px solid #c97b2e", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
          <p style={{ fontSize: 11, color: "#c4a882" }}>이미지 생성 중...</p>
        </div>
      )}
      {err && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48 }}>🍞</div>}
      <img src={url} alt={name} onLoad={() => setLoaded(true)} onError={() => setErr(true)}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: loaded ? "block" : "none", animation: "fadeIn .6s ease" }} />
    </div>
  );
}

// ── RADAR ───────────────────────────────────────────────────────
const RLABELS = ["당도", "산미", "고소함", "향신료", "쫀득함", "바삭함"];
function Radar({ values, size = 180, color = "#c97b2e" }) {
  const cx = size / 2, cy = size / 2, r = size * 0.35;
  const n = RLABELS.length;
  const angles = Array.from({ length: n }, (_, i) => (Math.PI * 2 * i) / n - Math.PI / 2);
  const pt = (v, i) => { const rt = v / 100; return [cx + r * rt * Math.cos(angles[i]), cy + r * rt * Math.sin(angles[i])]; };
  const gp = (rt) => angles.map(a => `${cx + r * rt * Math.cos(a)},${cy + r * rt * Math.sin(a)}`).join(" ");
  const dpts = values.map((v, i) => pt(v, i));
  const dp = dpts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ") + "Z";
  return (
    <svg width={size} height={size} style={{ overflow: "visible" }}>
      {[.25, .5, .75, 1].map((rt, i) => <polygon key={i} points={gp(rt)} fill="none" stroke={color + "30"} strokeWidth="1" />)}
      {angles.map((a, i) => <line key={i} x1={cx} y1={cy} x2={cx + r * Math.cos(a)} y2={cy + r * Math.sin(a)} stroke={color + "25"} strokeWidth="1" />)}
      <path d={dp} fill={color + "30"} stroke={color} strokeWidth="2" />
      {dpts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={3} fill={color} />)}
      {angles.map((a, i) => {
        const lx = cx + (r + 18) * Math.cos(a), ly = cy + (r + 18) * Math.sin(a);
        return <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fill={color} fontSize="10" fontFamily="'Noto Sans KR',sans-serif">{RLABELS[i]}</text>;
      })}
    </svg>
  );
}

// ── TYPEWRITER ──────────────────────────────────────────────────
function TW({ text, speed = 15, onDone }) {
  const [d, setD] = useState(""); const i = useRef(0);
  useEffect(() => {
    setD(""); i.current = 0;
    const iv = setInterval(() => {
      if (i.current < text.length) setD(text.slice(0, ++i.current));
      else { clearInterval(iv); onDone?.(); }
    }, speed);
    return () => clearInterval(iv);
  }, [text]);
  return <span>{d}<span style={{ animation: "blink 1s infinite" }}>▌</span></span>;
}

// ── LOADING ─────────────────────────────────────────────────────
function Loading({ text }) {
  return (
    <div style={{ minHeight: "50vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <div style={{ fontSize: 40, animation: "bounce 1s ease infinite" }}>🍞</div>
      <p style={{ fontSize: 15, color: "#c97b2e", fontWeight: 600 }}>{text}</p>
      <p style={{ fontSize: 12, color: "#c4a882" }}>잠깐만 기다려주세요...</p>
    </div>
  );
}

// ── CARD ────────────────────────────────────────────────────────
const Card = ({ children, style = {} }) => (
  <div style={{ background: "#fff", borderRadius: 18, padding: "20px", boxShadow: "0 2px 16px rgba(180,130,60,.1)", border: "1px solid #f0e0c8", marginBottom: 14, ...style }}>{children}</div>
);
const Sec = ({ children }) => <p style={{ fontSize: 10, letterSpacing: ".2em", color: "#c4a882", marginBottom: 12, textTransform: "uppercase" }}>{children}</p>;
const Btn = ({ children, onClick, disabled, style = {}, variant = "primary" }) => (
  <button onClick={onClick} disabled={disabled} style={{
    padding: "13px 20px", borderRadius: 12, border: "none", cursor: disabled ? "default" : "pointer",
    fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700, fontSize: 14, transition: "all .2s",
    background: disabled ? "#f0e0c8" : variant === "primary" ? "linear-gradient(135deg,#e8962e,#c97b2e)" : variant === "outline" ? "transparent" : "#fff8f0",
    color: disabled ? "#c4a882" : variant === "primary" ? "#fff" : "#c97b2e",
    border: variant === "outline" ? "2px solid #e8962e" : "none",
    boxShadow: disabled ? "none" : variant === "primary" ? "0 4px 14px rgba(200,120,40,.3)" : "none",
    ...style
  }}>{children}</button>
);

// ── BREAD WORLDCUP BRACKET DATA ─────────────────────────────────
const BREADS_POOL = [
  { name: "소금빵", emoji: "🧂", img: "salt bread, golden crispy exterior, soft inside, Japanese style, bakery photography" },
  { name: "크루아상", emoji: "🥐", img: "croissant, flaky golden layers, buttery, French bakery, close up" },
  { name: "시나몬 롤", emoji: "🌀", img: "cinnamon roll, gooey icing, warm spiral bread, bakery photography" },
  { name: "베이글", emoji: "⭕", img: "bagel, sesame seeds, chewy dense bread, New York style" },
  { name: "마카롱", emoji: "🫧", img: "macaron, colorful French pastry, pastel colors, close up" },
  { name: "바게트", emoji: "🥖", img: "baguette, crispy crust, French bread, rustic bakery" },
  { name: "단팥빵", emoji: "🫘", img: "anpan, Japanese sweet red bean bun, soft round bread" },
  { name: "슈크림", emoji: "🟡", img: "cream puff, choux pastry, custard cream, Japanese bakery" },
  { name: "마늘빵", emoji: "🧄", img: "garlic bread, buttery, crispy, golden, herb topping" },
  { name: "멜론빵", emoji: "🍈", img: "melon pan, Japanese sweet bread, crispy cookie top, round" },
  { name: "소보로빵", emoji: "🟤", img: "soboro bread, Korean streusel bun, crumbly sweet topping" },
  { name: "치아바타", emoji: "🍞", img: "ciabatta, Italian bread, open crumb, rustic, olive oil" },
  { name: "브리오슈", emoji: "💛", img: "brioche, rich buttery French bread, golden, soft, round" },
  { name: "호두빵", emoji: "🌰", img: "walnut bread, artisan loaf, whole wheat, rustic bakery" },
  { name: "딸기빵", emoji: "🍓", img: "strawberry bread, cream filled, Korean bakery, fresh strawberries" },
  { name: "초코빵", emoji: "🍫", img: "chocolate bread, dark chocolate swirl, soft Japanese milk bread" },
];

// ── REGIONS DATA ────────────────────────────────────────────────
const REGIONS = [
  { name: "서울", emoji: "🏙️" }, { name: "부산", emoji: "🌊" }, { name: "전주", emoji: "🏯" },
  { name: "경주", emoji: "🏛️" }, { name: "제주", emoji: "🌺" }, { name: "강릉", emoji: "☕" },
  { name: "대구", emoji: "🍎" }, { name: "인천", emoji: "✈️" }, { name: "광주", emoji: "🌸" },
  { name: "춘천", emoji: "🦆" },
];

// ── OPEN RUN DATA ───────────────────────────────────────────────
const OPENRUN_BAKERIES = [
  { name: "성심당", location: "대전", openTime: "08:00", specialty: "튀김소보로, 부추빵", waitTime: "30-60분", tip: "오픈 30분 전 줄 서야 안전", hot: true },
  { name: "태극당", location: "서울 을지로", openTime: "09:00", specialty: "모나카, 생크림케이크", waitTime: "10-20분", tip: "주말엔 더 일찍 가세요", hot: false },
  { name: "군산 이성당", location: "전북 군산", openTime: "08:30", specialty: "단팥빵, 야채빵", waitTime: "20-40분", tip: "한국 최초 빵집! 평일 추천", hot: true },
  { name: "뚜레쥬르 플래그십", location: "서울 강남", openTime: "07:00", specialty: "시즌 한정 빵", waitTime: "5-15분", tip: "시즌 한정 출시일 체크", hot: false },
  { name: "르뱅베이커리", location: "서울 서래마을", openTime: "08:00", specialty: "캉파뉴, 바게트", waitTime: "15-30분", tip: "금요일 신메뉴 출시", hot: true },
  { name: "밀도", location: "서울 여러 지점", openTime: "08:00", specialty: "식빵, 소금빵", waitTime: "20-40분", tip: "오픈런 필수 베이커리", hot: true },
  { name: "오월의종", location: "서울 마포", openTime: "09:00", specialty: "크루아상", waitTime: "30-50분", tip: "크루아상은 오전에만 판매", hot: true },
  { name: "풍년제과", location: "광주 충장로", openTime: "09:00", specialty: "모나카", waitTime: "10-20분", tip: "광주 여행 필수 코스", hot: false },
];

// ══════════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════════
export default function App() {
  const [page, setPage] = useState("home");
  const [loading, setLoading] = useState(false);
  const [loadText, setLoadText] = useState("");
  const [result, setResult] = useState(null);
  const [input, setInput] = useState("");
  const [input2, setInput2] = useState("");
  const [tdone, setTdone] = useState(false);
  const loadRef = useRef(null);

  const startLoad = (steps) => {
    setLoading(true); setResult(null); setTdone(false);
    let i = 0; setLoadText(steps[0]);
    loadRef.current = setInterval(() => { i = (i + 1) % steps.length; setLoadText(steps[i]); }, 900);
  };
  const stopLoad = () => { clearInterval(loadRef.current); setLoading(false); };

  const go = async (system, userMsg, steps, useSearch = false) => {
    startLoad(steps);
    try {
      const raw = await claude(system, userMsg, useSearch);
      const parsed = JSON.parse(raw);
      setResult(parsed); stopLoad();
    } catch { stopLoad(); alert("오류 발생! 다시 시도해주세요."); }
  };

  const nav = (p) => { setPage(p); setResult(null); setInput(""); setInput2(""); setTdone(false); };

  // CSS
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&family=Playfair+Display:ital,wght@0,700;1,500&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    html,body{background:#fdf8f2;font-family:'Noto Sans KR',sans-serif;color:#3d2c1e;}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
    @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
    @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
    @keyframes pop{0%{transform:scale(.8);opacity:0}100%{transform:scale(1);opacity:1}}
    textarea,input{outline:none;font-family:'Noto Sans KR',sans-serif;color:#3d2c1e;}
    ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-thumb{background:#e8d0b0;border-radius:2px;}
    .nav-item{display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px 6px;border-radius:12px;cursor:pointer;transition:all .2s;border:none;background:transparent;font-family:'Noto Sans KR',sans-serif;}
    .tag{padding:3px 10px;border-radius:12px;font-size:11px;font-weight:500;}
    .chip{padding:7px 14px;border-radius:20px;background:#fff8f0;border:1px solid #f0d8b8;color:#c97b2e;font-size:12px;cursor:pointer;font-family:'Noto Sans KR',sans-serif;transition:all .2s;}
    .chip:hover{background:#ffefd8;border-color:#e8962e;}
    .store-card{background:#fff;border:1px solid #f0e0c8;border-radius:14px;padding:16px;margin-bottom:10px;transition:all .2s;}
    .store-card:hover{box-shadow:0 4px 16px rgba(180,130,60,.15);border-color:#e8d0a8;}
    input::placeholder,textarea::placeholder{color:#c4a882;}
  `;

  // ── PAGES ─────────────────────────────────────────────────────

  // HOME
  const HomePage = () => (
    <div style={{ animation: "fadeIn .6s ease", paddingBottom: 60 }}>
      <div style={{ background: "linear-gradient(135deg,#fdf3e3,#fde8c8)", borderRadius: "0 0 32px 32px", padding: "40px 20px 36px", textAlign: "center", marginBottom: 24, boxShadow: "0 4px 24px rgba(200,130,40,.1)" }}>
        <div style={{ fontSize: 48, marginBottom: 10 }}>🥐</div>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(2rem,6vw,3rem)", color: "#8b4c1a", lineHeight: 1.2, marginBottom: 8 }}>
          밀가루와 나의<br />취향에 관한 연구
        </h1>
        <p style={{ fontSize: 13, color: "#c4a882", lineHeight: 1.7 }}>AI가 당신의 미각을 해독하고 세상의 모든 빵을 연구합니다</p>
      </div>
      <div style={{ padding: "0 16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          {[
            { p: "search", icon: "🔍", title: "빵 정보 검색", desc: "재료·역사·국내 판매처" },
            { p: "roulette", icon: "🎲", title: "오늘의 빵 룰렛", desc: "AI가 오늘 빵을 추천" },
            { p: "match", icon: "💘", title: "빵 궁합 테스트", desc: "두 빵의 케미 분석" },
            { p: "worldcup", icon: "🏆", title: "빵 월드컵", desc: "나의 최애 빵 결정전" },
          ].map(item => (
            <div key={item.p} onClick={() => nav(item.p)} style={{ background: "#fff", borderRadius: 18, padding: "18px 14px", cursor: "pointer", border: "1px solid #f0e0c8", boxShadow: "0 2px 12px rgba(180,130,60,.08)", transition: "all .2s" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(180,130,60,.18)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(180,130,60,.08)"; }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{item.icon}</div>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#8b4c1a", marginBottom: 4 }}>{item.title}</p>
              <p style={{ fontSize: 11.5, color: "#c4a882", lineHeight: 1.4 }}>{item.desc}</p>
            </div>
          ))}
        </div>
        {[
          { p: "sommelier", icon: "🍽️", title: "빵 소믈리에", desc: "분위기·음식으로 어울리는 빵 추천" },
          { p: "region", icon: "🗾", title: "지역별 명물 빵", desc: "전국 지역 대표 빵 탐험" },
          { p: "trend", icon: "📈", title: "유행하는 빵 이유", desc: "요즘 왜 이 빵이 뜨는걸까?" },
          { p: "openrun", icon: "⏰", title: "오픈런 알리미", desc: "줄 서야 먹을 수 있는 빵집" },
          { p: "map", icon: "📍", title: "빵집 지도", desc: "지역별 유명 빵집 찾기" },
          { p: "community", icon: "💬", title: "빵 커뮤니티", desc: "빵 덕후들과 소통하기" },
        ].map(item => (
          <div key={item.p} onClick={() => nav(item.p)} style={{ background: "#fff", borderRadius: 14, padding: "14px 16px", cursor: "pointer", border: "1px solid #f0e0c8", marginBottom: 10, display: "flex", alignItems: "center", gap: 14, transition: "all .2s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "#fff8f0"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#fff"; }}>
            <span style={{ fontSize: 26 }}>{item.icon}</span>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#8b4c1a" }}>{item.title}</p>
              <p style={{ fontSize: 12, color: "#c4a882" }}>{item.desc}</p>
            </div>
            <span style={{ marginLeft: "auto", color: "#e8d0b0", fontSize: 16 }}>›</span>
          </div>
        ))}
      </div>
    </div>
  );

  // SEARCH
  const SearchPage = () => {
    if (loading) return <Loading text="빵 정보 탐색 중..." />;
    if (result) {
      const rv = RLABELS.map(l => result.taste?.[l] ?? 50);
      return (
        <div style={{ animation: "fadeIn .6s ease", padding: "0 16px 80px" }}>
          <div style={{ textAlign: "center", padding: "24px 0 16px" }}>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 28, color: "#8b4c1a" }}>{result.breadName}</h2>
            <p style={{ fontSize: 12, color: "#c4a882", marginTop: 4 }}>{result.origin}</p>
          </div>
          <Card><Sec>AI VISUALIZATION</Sec><BreadImg prompt={result.imagePrompt} name={result.breadName} /></Card>
          <Card style={{ background: "#fff8f0" }}><Sec>ABOUT</Sec>
            <p style={{ fontSize: 14, lineHeight: 1.9, color: "#5d3c2a" }}>
              {tdone ? result.description : <TW text={result.description} onDone={() => setTdone(true)} />}
            </p>
          </Card>
          <Card><Sec>맛 프로파일</Sec><div style={{ display: "flex", justifyContent: "center" }}><Radar values={rv} /></div></Card>
          <Card><Sec>재료 분석</Sec>
            {result.ingredients?.map((ing, i) => (
              <div key={i} style={{ borderBottom: i < result.ingredients.length - 1 ? "1px solid #f5ede0" : "none", padding: "10px 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#3d2c1e" }}>{ing.name}</span>
                  <span style={{ fontSize: 11, color: "#c97b2e", background: "#fff3e0", padding: "2px 8px", borderRadius: 8 }}>{ing.amount}</span>
                </div>
                <p style={{ fontSize: 12.5, color: "#a08060" }}>{ing.role}</p>
              </div>
            ))}
          </Card>
          <Card><Sec>제조 과정</Sec>
            {result.steps?.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                <div style={{ minWidth: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg,#e8962e,#c97b2e)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{i + 1}</div>
                <p style={{ fontSize: 13.5, color: "#5d3c2a", lineHeight: 1.7 }}>{s}</p>
              </div>
            ))}
          </Card>
          <Card><Sec>🇰🇷 대한민국 판매 가게</Sec>
            {result.stores?.map((st, i) => (
              <div key={i} className="store-card">
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#3d2c1e" }}>{st.name}</span>
                  <span style={{ fontSize: 12, color: "#c97b2e", fontWeight: 600 }}>{st.price}</span>
                </div>
                <p style={{ fontSize: 11.5, color: "#c4a882", marginBottom: 4 }}>📍 {st.location}</p>
                <p style={{ fontSize: 12.5, color: "#a08060" }}>{st.feature}</p>
              </div>
            ))}
          </Card>
          <Btn onClick={() => { setResult(null); setInput(""); }} style={{ width: "100%" }}>다른 빵 검색하기</Btn>
        </div>
      );
    }
    return (
      <div style={{ padding: "24px 16px 80px", animation: "fadeIn .6s ease" }}>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, color: "#8b4c1a", marginBottom: 4 }}>🔍 빵 정보 검색</h2>
        <p style={{ fontSize: 13, color: "#c4a882", marginBottom: 20 }}>빵 이름을 입력하면 모든 정보를 알려드려요</p>
        <Card>
          <input value={input} onChange={e => setInput(e.target.value)} placeholder="예: 소금빵, 크루아상, 시나몬 롤..."
            style={{ width: "100%", fontSize: 16, background: "transparent", border: "none", borderBottom: "2px solid #f0d8b8", paddingBottom: 12 }} />
        </Card>
        <Btn onClick={() => go(
          `빵 정보 검색 AI. JSON만 출력. {"breadName":"","origin":"","description":"2문장","ingredients":[{"name":"","role":"","amount":""}],"steps":["","",""],"taste":{"당도":0,"산미":0,"고소함":0,"향신료":0,"쫀득함":0,"바삭함":0},"stores":[{"name":"","location":"","feature":"","price":""}],"imagePrompt":"영어로 빵 외관 묘사"}`,
          input, ["빵 정보 탐색 중...", "재료 분석 중...", "판매처 검색 중..."]
        )} disabled={!input.trim()} style={{ width: "100%", marginBottom: 16 }}>검색하기 →</Btn>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["소금빵", "크루아상", "시나몬 롤", "베이글", "마카롱", "바게트"].map(e => (
            <button key={e} className="chip" onClick={() => setInput(e)}>{e}</button>
          ))}
        </div>
      </div>
    );
  };

  // ROULETTE
  const RoulettePage = () => {
    if (loading) return <Loading text="오늘의 빵 선정 중..." />;
    if (result) return (
      <div style={{ animation: "fadeIn .6s ease", padding: "0 16px 80px" }}>
        <div style={{ textAlign: "center", padding: "24px 0 16px" }}>
          <p style={{ fontSize: 12, letterSpacing: ".2em", color: "#c4a882", marginBottom: 8 }}>TODAY'S BREAD</p>
          <div style={{ fontSize: 18, color: "#c97b2e", marginBottom: 6 }}>{result.mood}</div>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 32, color: "#8b4c1a" }}>{result.recommendation}</h2>
          <div style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 6, background: "#fff3e0", border: "1px solid #f0d0a0", borderRadius: 20, padding: "6px 18px" }}>
            <span style={{ fontSize: 13, color: "#a08060" }}>오늘의 빵 점수</span>
            <span style={{ fontSize: 24, color: "#c97b2e", fontWeight: 800 }}>{result.luckyScore}</span>
            <span style={{ fontSize: 12, color: "#c4a882" }}>/ 100</span>
          </div>
        </div>
        <Card><BreadImg prompt={result.imagePrompt} name={result.recommendation} /></Card>
        <Card style={{ background: "#fff8f0" }}><Sec>오늘 이 빵인 이유</Sec>
          <p style={{ fontSize: 14, lineHeight: 1.9, color: "#5d3c2a" }}>
            {tdone ? result.reason : <TW text={result.reason} onDone={() => setTdone(true)} />}
          </p>
        </Card>
        <Card><Sec>이 빵과 어울리는 것들</Sec>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {result.pairings?.map((p, i) => <span key={i} style={{ padding: "8px 14px", borderRadius: 20, background: "#fff3e0", border: "1px solid #f0d0a0", fontSize: 13, color: "#c97b2e" }}>{p}</span>)}
          </div>
        </Card>
        <Card style={{ background: "#fffbf0", border: "1px solid #f5e0a0" }}><Sec>FUN FACT 💡</Sec>
          <p style={{ fontSize: 14, color: "#5d3c2a", lineHeight: 1.8 }}>{result.funFact}</p>
        </Card>
        <Btn onClick={() => { setResult(null); setInput(""); }} style={{ width: "100%" }}>🎲 다시 뽑기</Btn>
      </div>
    );
    return (
      <div style={{ padding: "24px 16px 80px", animation: "fadeIn .6s ease" }}>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, color: "#8b4c1a", marginBottom: 4 }}>🎲 오늘의 빵 룰렛</h2>
        <p style={{ fontSize: 13, color: "#c4a882", marginBottom: 20 }}>오늘 기분이나 상황을 말해주면 AI가 딱 맞는 빵을 추천해요</p>
        <Card>
          <textarea value={input} onChange={e => setInput(e.target.value)} placeholder={"예: 오늘 날씨가 흐리고 기분이 좀 처져있어\n비워도 됩니다!"} rows={4}
            style={{ width: "100%", fontSize: 15, lineHeight: 1.8, background: "transparent", border: "none", resize: "none" }} />
        </Card>
        <Btn onClick={() => go(
          `오늘의 빵 추천 AI. JSON만 출력. {"recommendation":"빵이름","reason":"추천이유2문장","mood":"오늘무드키워드","pairings":["어울리는것1","어울리는것2","어울리는것3"],"luckyScore":0-100,"imagePrompt":"영어로빵외관묘사","funFact":"흥미로운사실"}`,
          input || "오늘 날씨와 계절을 고려해서 추천해줘",
          ["오늘의 빵 선정 중...", "기운 분석 중...", "최적의 빵 도출 중..."]
        )} style={{ width: "100%", marginBottom: 16 }}>🎲 오늘의 빵 뽑기</Btn>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["기분이 우울해", "활기찬 하루 시작", "카페에서 혼자", "비 오는 날"].map(e => (
            <button key={e} className="chip" onClick={() => setInput(e)}>{e}</button>
          ))}
        </div>
      </div>
    );
  };

  // MATCH
  const MatchPage = () => {
    if (loading) return <Loading text="궁합 분석 중..." />;
    if (result) {
      const score = result.score ?? 0;
      const gc = score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : score >= 40 ? "#f97316" : "#ef4444";
      return (
        <div style={{ animation: "fadeIn .6s ease", padding: "0 16px 80px" }}>
          <div style={{ textAlign: "center", padding: "24px 0 16px" }}>
            <p style={{ fontSize: 12, letterSpacing: ".2em", color: "#c4a882", marginBottom: 8 }}>COMPATIBILITY TEST</p>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, color: "#8b4c1a", marginBottom: 12 }}>
              {result.bread1?.name} × {result.bread2?.name}
            </h2>
            <div style={{ display: "inline-block", background: gc + "18", border: `2px solid ${gc}`, borderRadius: 16, padding: "12px 28px" }}>
              <div style={{ fontSize: 44, color: gc, fontWeight: 900, lineHeight: 1 }}>{result.grade}</div>
              <div style={{ fontSize: 13, color: "#a08060", marginTop: 4 }}>{result.verdict}</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            {[result.bread1, result.bread2].map((b, i) => (
              <Card key={i} style={{ marginBottom: 0 }}>
                <p style={{ fontSize: 10, letterSpacing: ".15em", color: "#c4a882", marginBottom: 8 }}>{i === 0 ? "빵 A" : "빵 B"}</p>
                <BreadImg prompt={b?.imagePrompt} name={b?.name} />
                <p style={{ fontSize: 13, color: "#8b4c1a", textAlign: "center", marginTop: 8, fontWeight: 700 }}>{b?.name}</p>
              </Card>
            ))}
          </div>
          <Card><Sec>궁합 점수</Sec>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1, background: "#f5ede0", borderRadius: 20, height: 10, overflow: "hidden" }}>
                <div style={{ width: `${score}%`, height: "100%", background: `linear-gradient(90deg,${gc}88,${gc})`, borderRadius: 20, transition: "width 1s ease" }} />
              </div>
              <span style={{ fontSize: 26, color: gc, fontWeight: 800, minWidth: 40 }}>{score}</span>
            </div>
          </Card>
          <Card style={{ background: "#fff8f0" }}><Sec>케미스트리 분석</Sec>
            <p style={{ fontSize: 14, lineHeight: 1.9, color: "#5d3c2a" }}>
              {tdone ? result.chemistry : <TW text={result.chemistry} onDone={() => setTdone(true)} />}
            </p>
          </Card>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            <Card style={{ marginBottom: 0, background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
              <Sec>👍 좋은 점</Sec>
              {result.goodPoints?.map((p, i) => <p key={i} style={{ fontSize: 12.5, color: "#16a34a", marginBottom: 6 }}>• {p}</p>)}
            </Card>
            <Card style={{ marginBottom: 0, background: "#fff5f5", border: "1px solid #fecaca" }}>
              <Sec>👎 아쉬운 점</Sec>
              {result.badPoints?.map((p, i) => <p key={i} style={{ fontSize: 12.5, color: "#dc2626", marginBottom: 6 }}>• {p}</p>)}
            </Card>
          </div>
          <Card style={{ background: "#fffbf0", border: "1px solid #f5e0a0" }}>
            <Sec>추천 상황</Sec>
            <p style={{ fontSize: 14, color: "#5d3c2a", marginBottom: 8 }}>📍 {result.recommendation}</p>
            <p style={{ fontSize: 13, color: "#a08060", fontStyle: "italic" }}>💬 "{result.funnyComment}"</p>
          </Card>
          <Btn onClick={() => { setResult(null); setInput(""); setInput2(""); }} style={{ width: "100%" }}>💘 다시 테스트</Btn>
        </div>
      );
    }
    return (
      <div style={{ padding: "24px 16px 80px", animation: "fadeIn .6s ease" }}>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, color: "#8b4c1a", marginBottom: 4 }}>💘 빵 궁합 테스트</h2>
        <p style={{ fontSize: 13, color: "#c4a882", marginBottom: 20 }}>두 빵의 케미스트리를 AI가 분석합니다</p>
        <Card>
          <p style={{ fontSize: 11, color: "#c4a882", marginBottom: 8 }}>첫 번째 빵</p>
          <input value={input} onChange={e => setInput(e.target.value)} placeholder="예: 소금빵"
            style={{ width: "100%", fontSize: 16, borderBottom: "2px solid #f0d8b8", paddingBottom: 12, marginBottom: 16, background: "transparent", border: "none", borderBottom: "2px solid #f0d8b8" }} />
          <p style={{ fontSize: 11, color: "#c4a882", marginBottom: 8 }}>두 번째 빵</p>
          <input value={input2} onChange={e => setInput2(e.target.value)} placeholder="예: 크루아상"
            style={{ width: "100%", fontSize: 16, borderBottom: "2px solid #f0d8b8", paddingBottom: 12, background: "transparent", border: "none", borderBottom: "2px solid #f0d8b8" }} />
        </Card>
        <Btn onClick={() => go(
          `빵 궁합 테스트 AI. JSON만 출력. {"score":0-100,"grade":"S/A/B/C/D","verdict":"한마디","chemistry":"분석2-3문장","goodPoints":["",""],"badPoints":[""],"recommendation":"추천상황","funnyComment":"재치있는한마디","bread1":{"name":"","imagePrompt":"영어묘사"},"bread2":{"name":"","imagePrompt":"영어묘사"}}`,
          `빵1: ${input}, 빵2: ${input2}`,
          ["궁합 분석 중...", "케미스트리 계산 중...", "판정 중..."]
        )} disabled={!input.trim() || !input2.trim()} style={{ width: "100%", marginBottom: 16 }}>💘 궁합 테스트 시작</Btn>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[["소금빵", "크루아상"], ["베이글", "마카롱"], ["시나몬롤", "바게트"]].map(([a, b], i) => (
            <button key={i} className="chip" onClick={() => { setInput(a); setInput2(b); }}>{a} × {b}</button>
          ))}
        </div>
      </div>
    );
  };

  // WORLDCUP
  const WorldcupPage = () => {
    const [wc, setWc] = useState(null);
    const [round, setRound] = useState([]);
    const [current, setCurrent] = useState(0);
    const [winners, setWinners] = useState([]);
    const [champion, setChampion] = useState(null);

    const startWC = () => {
      const shuffled = [...BREADS_POOL].sort(() => Math.random() - .5).slice(0, 8);
      setRound(shuffled); setCurrent(0); setWinners([]); setChampion(null); setWc("playing");
    };

    const pick = async (winner, loser) => {
      const newWinners = [...winners, winner];
      // save to supabase
      try { await sb.from("worldcup_votes").insert({ winner: winner.name, loser: loser.name }); } catch {}
      if (current + 1 < round.length / 2) {
        setWinners(newWinners); setCurrent(current + 1);
      } else {
        if (newWinners.length === 1) { setChampion(newWinners[0]); setWc("done"); }
        else { setRound(newWinners); setCurrent(0); setWinners([]); }
      }
    };

    if (wc === "done" && champion) return (
      <div style={{ padding: "24px 16px 80px", animation: "pop .5s ease", textAlign: "center" }}>
        <div style={{ fontSize: 60, marginBottom: 12 }}>🏆</div>
        <p style={{ fontSize: 13, color: "#c4a882", marginBottom: 8 }}>나의 최애 빵</p>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 36, color: "#8b4c1a", marginBottom: 20 }}>{champion.name}</h2>
        <Card><BreadImg prompt={champion.img} name={champion.name} /></Card>
        <p style={{ fontSize: 14, color: "#a08060", marginBottom: 24, lineHeight: 1.8 }}>
          {champion.emoji} <strong style={{ color: "#c97b2e" }}>{champion.name}</strong>이(가) 모든 빵을 제치고 당신의 최애 빵이 되었습니다!
        </p>
        <Btn onClick={() => setWc(null)} style={{ width: "100%" }}>🏆 다시 하기</Btn>
      </div>
    );

    if (wc === "playing") {
      const a = round[current * 2], b = round[current * 2 + 1];
      const total = round.length / 2;
      const roundName = total === 4 ? "8강" : total === 2 ? "4강" : "결승";
      return (
        <div style={{ padding: "24px 16px 80px", animation: "fadeIn .4s ease" }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <span style={{ background: "#fff3e0", border: "1px solid #f0d0a0", borderRadius: 20, padding: "4px 16px", fontSize: 12, color: "#c97b2e", fontWeight: 700 }}>{roundName} {current + 1}/{total}</span>
          </div>
          <p style={{ textAlign: "center", fontSize: 15, color: "#8b4c1a", fontWeight: 700, marginBottom: 20 }}>더 좋아하는 빵을 선택하세요!</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[a, b].map((bread, i) => (
              <div key={i} onClick={() => pick(bread, i === 0 ? b : a)} style={{ background: "#fff", border: "2px solid #f0e0c8", borderRadius: 18, padding: "14px", cursor: "pointer", textAlign: "center", transition: "all .2s" }}
                onMouseEnter={e => { e.currentTarget.style.border = "2px solid #c97b2e"; e.currentTarget.style.transform = "scale(1.02)"; }}
                onMouseLeave={e => { e.currentTarget.style.border = "2px solid #f0e0c8"; e.currentTarget.style.transform = "scale(1)"; }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>{bread.emoji}</div>
                <BreadImg prompt={bread.img} name={bread.name} />
                <p style={{ fontSize: 15, fontWeight: 700, color: "#8b4c1a", marginTop: 10 }}>{bread.name}</p>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 20 }}>
            <div style={{ background: "#f5ede0", borderRadius: 20, height: 6, overflow: "hidden" }}>
              <div style={{ width: `${((current + 1) / total) * 100}%`, height: "100%", background: "linear-gradient(90deg,#e8962e,#c97b2e)", transition: "width .4s" }} />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={{ padding: "24px 16px 80px", animation: "fadeIn .6s ease" }}>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, color: "#8b4c1a", marginBottom: 4 }}>🏆 빵 월드컵</h2>
        <p style={{ fontSize: 13, color: "#c4a882", marginBottom: 24 }}>16개의 빵 중 나의 최애 빵을 결정하세요!</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 24 }}>
          {BREADS_POOL.map((b, i) => (
            <div key={i} style={{ background: "#fff", border: "1px solid #f0e0c8", borderRadius: 12, padding: "12px 8px", textAlign: "center" }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>{b.emoji}</div>
              <p style={{ fontSize: 11, color: "#8b4c1a", fontWeight: 600 }}>{b.name}</p>
            </div>
          ))}
        </div>
        <Btn onClick={startWC} style={{ width: "100%" }}>🏆 월드컵 시작!</Btn>
      </div>
    );
  };

  // SOMMELIER
  const SommelierPage = () => {
    if (loading) return <Loading text="빵 소믈리에 분석 중..." />;
    if (result) return (
      <div style={{ animation: "fadeIn .6s ease", padding: "0 16px 80px" }}>
        <div style={{ textAlign: "center", padding: "24px 0 16px" }}>
          <p style={{ fontSize: 12, color: "#c4a882", marginBottom: 8 }}>BREAD SOMMELIER RECOMMENDS</p>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 30, color: "#8b4c1a" }}>{result.breadName}</h2>
        </div>
        <Card><BreadImg prompt={result.imagePrompt} name={result.breadName} /></Card>
        <Card style={{ background: "#fff8f0" }}><Sec>소믈리에 노트</Sec>
          <p style={{ fontSize: 14, lineHeight: 1.9, color: "#5d3c2a" }}>
            {tdone ? result.note : <TW text={result.note} onDone={() => setTdone(true)} />}
          </p>
        </Card>
        <Card><Sec>이 빵을 추천하는 이유</Sec>
          {result.reasons?.map((r, i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
              <span style={{ color: "#c97b2e", fontWeight: 700, minWidth: 20 }}>✓</span>
              <p style={{ fontSize: 13.5, color: "#5d3c2a", lineHeight: 1.6 }}>{r}</p>
            </div>
          ))}
        </Card>
        <Card style={{ background: "#fffbf0", border: "1px solid #f5e0a0" }}><Sec>페어링 추천</Sec>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {result.pairings?.map((p, i) => <span key={i} style={{ padding: "6px 14px", borderRadius: 20, background: "#fff3e0", border: "1px solid #f0d0a0", fontSize: 12.5, color: "#c97b2e" }}>{p}</span>)}
          </div>
        </Card>
        <Btn onClick={() => { setResult(null); setInput(""); }} style={{ width: "100%" }}>다시 추천받기</Btn>
      </div>
    );
    return (
      <div style={{ padding: "24px 16px 80px", animation: "fadeIn .6s ease" }}>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, color: "#8b4c1a", marginBottom: 4 }}>🍽️ 빵 소믈리에</h2>
        <p style={{ fontSize: 13, color: "#c4a882", marginBottom: 20 }}>분위기나 음식을 말하면 어울리는 빵을 추천해드려요</p>
        <Card>
          <textarea value={input} onChange={e => setInput(e.target.value)}
            placeholder={"예: 오늘 파스타를 먹을 건데 어울리는 빵이 뭐야?\n또는: 비 오는 날 카페에서 혼자 읽을 책이랑 먹을 빵"} rows={4}
            style={{ width: "100%", fontSize: 15, lineHeight: 1.8, background: "transparent", border: "none", resize: "none" }} />
        </Card>
        <Btn onClick={() => go(
          `빵 소믈리에 AI. JSON만 출력. {"breadName":"추천빵","note":"소믈리에노트2문장","reasons":["이유1","이유2","이유3"],"pairings":["페어링1","페어링2","페어링3"],"imagePrompt":"영어로빵외관묘사"}`,
          input, ["분위기 분석 중...", "최적 빵 선정 중...", "소믈리에 노트 작성 중..."]
        )} disabled={!input.trim()} style={{ width: "100%", marginBottom: 16 }}>🍽️ 빵 추천받기</Btn>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["비 오는 날 혼자 카페", "파스타랑 먹을 빵", "아침 든든하게", "친구들 파티"].map(e => (
            <button key={e} className="chip" onClick={() => setInput(e)}>{e}</button>
          ))}
        </div>
      </div>
    );
  };

  // REGION
  const RegionPage = () => {
    const [selected, setSelected] = useState(null);
    if (loading) return <Loading text={`${selected?.name} 명물 빵 탐색 중...`} />;
    if (result) return (
      <div style={{ animation: "fadeIn .6s ease", padding: "0 16px 80px" }}>
        <div style={{ textAlign: "center", padding: "24px 0 16px" }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>{selected?.emoji}</div>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 28, color: "#8b4c1a" }}>{selected?.name} 명물 빵</h2>
        </div>
        {result.breads?.map((b, i) => (
          <Card key={i}>
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{ width: 80, flexShrink: 0 }}>
                <BreadImg prompt={b.imagePrompt} name={b.name} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: "#8b4c1a" }}>{b.name}</span>
                  {b.mustTry && <span style={{ background: "#fff3e0", color: "#c97b2e", fontSize: 10, padding: "2px 8px", borderRadius: 10, fontWeight: 700 }}>MUST TRY</span>}
                </div>
                <p style={{ fontSize: 12.5, color: "#a08060", lineHeight: 1.6, marginBottom: 6 }}>{b.desc}</p>
                <p style={{ fontSize: 12, color: "#c97b2e" }}>🏪 {b.store}</p>
              </div>
            </div>
          </Card>
        ))}
        <Card style={{ background: "#fff8f0" }}><Sec>지역 빵 문화</Sec>
          <p style={{ fontSize: 14, lineHeight: 1.9, color: "#5d3c2a" }}>{result.culture}</p>
        </Card>
        <Btn onClick={() => { setResult(null); setSelected(null); }} style={{ width: "100%" }}>다른 지역 보기</Btn>
      </div>
    );
    return (
      <div style={{ padding: "24px 16px 80px", animation: "fadeIn .6s ease" }}>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, color: "#8b4c1a", marginBottom: 4 }}>🗾 지역별 명물 빵</h2>
        <p style={{ fontSize: 13, color: "#c4a882", marginBottom: 20 }}>전국 지역 대표 빵을 탐험해보세요</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {REGIONS.map(r => (
            <div key={r.name} onClick={() => {
              setSelected(r);
              go(
                `지역 명물 빵 AI. JSON만 출력. {"breads":[{"name":"빵이름","desc":"설명2문장","store":"대표가게","mustTry":true/false,"imagePrompt":"영어로빵외관묘사"}],"culture":"지역빵문화설명2문장"} breads는 3-4개.`,
                `${r.name} 지역의 명물 빵과 유명 베이커리를 알려줘`,
                [`${r.name} 명물 빵 탐색 중...`, "베이커리 정보 수집 중...", "정리 중..."]
              );
            }} style={{ background: "#fff", border: "1px solid #f0e0c8", borderRadius: 16, padding: "18px", cursor: "pointer", textAlign: "center", transition: "all .2s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "#fff8f0"; e.currentTarget.style.borderColor = "#e8c898"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#f0e0c8"; }}>
              <div style={{ fontSize: 30, marginBottom: 6 }}>{r.emoji}</div>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#8b4c1a" }}>{r.name}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // TREND
  const TrendPage = () => {
    if (loading) return <Loading text="트렌드 분석 중..." />;
    if (result) return (
      <div style={{ animation: "fadeIn .6s ease", padding: "0 16px 80px" }}>
        <div style={{ textAlign: "center", padding: "24px 0 16px" }}>
          <p style={{ fontSize: 12, color: "#c4a882", marginBottom: 8 }}>TREND ANALYSIS</p>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 28, color: "#8b4c1a" }}>{result.breadName}</h2>
          <div style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 6, background: "#fff3e0", borderRadius: 20, padding: "6px 16px", border: "1px solid #f0d0a0" }}>
            <span style={{ fontSize: 12, color: "#a08060" }}>트렌드 지수</span>
            <span style={{ fontSize: 22, color: "#c97b2e", fontWeight: 800 }}>{result.trendScore}</span>
            <span style={{ fontSize: 11, color: "#c4a882" }}>/ 100</span>
          </div>
        </div>
        <Card><BreadImg prompt={result.imagePrompt} name={result.breadName} /></Card>
        <Card style={{ background: "#fff8f0" }}><Sec>유행하는 이유</Sec>
          <p style={{ fontSize: 14, lineHeight: 1.9, color: "#5d3c2a" }}>
            {tdone ? result.reason : <TW text={result.reason} onDone={() => setTdone(true)} />}
          </p>
        </Card>
        <Card><Sec>트렌드 요인</Sec>
          {result.factors?.map((f, i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 18 }}>{["📱", "🎬", "🌏", "👥", "📰"][i % 5]}</span>
              <div>
                <p style={{ fontSize: 13.5, fontWeight: 700, color: "#8b4c1a", marginBottom: 2 }}>{f.title}</p>
                <p style={{ fontSize: 12.5, color: "#a08060", lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </Card>
        <Card style={{ background: "#fffbf0", border: "1px solid #f5e0a0" }}><Sec>앞으로의 전망</Sec>
          <p style={{ fontSize: 14, color: "#5d3c2a", lineHeight: 1.8 }}>{result.forecast}</p>
        </Card>
        <Btn onClick={() => { setResult(null); setInput(""); }} style={{ width: "100%" }}>다른 빵 분석하기</Btn>
      </div>
    );
    return (
      <div style={{ padding: "24px 16px 80px", animation: "fadeIn .6s ease" }}>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, color: "#8b4c1a", marginBottom: 4 }}>📈 유행하는 빵 이유 찾기</h2>
        <p style={{ fontSize: 13, color: "#c4a882", marginBottom: 20 }}>요즘 왜 이 빵이 뜨는 걸까요? AI가 분석해드려요</p>
        <Card>
          <input value={input} onChange={e => setInput(e.target.value)} placeholder="예: 소금빵, 두바이 초콜릿, 크루아상..."
            style={{ width: "100%", fontSize: 16, background: "transparent", border: "none", borderBottom: "2px solid #f0d8b8", paddingBottom: 12 }} />
        </Card>
        <Btn onClick={() => go(
          `빵 트렌드 분석 AI. JSON만 출력. {"breadName":"","trendScore":0-100,"reason":"유행이유2-3문장","factors":[{"title":"요인제목","desc":"설명"}],"forecast":"향후전망2문장","imagePrompt":"영어로빵외관묘사"} factors는 3-4개.`,
          `${input} 빵이 요즘 유행하는 이유를 SNS, 문화, 사회적 트렌드 관점에서 분석해줘`,
          ["트렌드 분석 중...", "SNS 데이터 수집 중...", "인사이트 도출 중..."], true
        )} disabled={!input.trim()} style={{ width: "100%", marginBottom: 16 }}>📈 트렌드 분석하기</Btn>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["소금빵", "두바이 초콜릿", "크루아상 타르트", "탕후루빵"].map(e => (
            <button key={e} className="chip" onClick={() => setInput(e)}>{e}</button>
          ))}
        </div>
      </div>
    );
  };

  // OPENRUN
  const OpenrunPage = () => {
    const [filter, setFilter] = useState("전체");
    const filtered = filter === "전체" ? OPENRUN_BAKERIES : filter === "🔥 핫플" ? OPENRUN_BAKERIES.filter(b => b.hot) : OPENRUN_BAKERIES.filter(b => b.location.includes(filter));
    return (
      <div style={{ padding: "24px 16px 80px", animation: "fadeIn .6s ease" }}>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, color: "#8b4c1a", marginBottom: 4 }}>⏰ 오픈런 알리미</h2>
        <p style={{ fontSize: 13, color: "#c4a882", marginBottom: 20 }}>줄 서야 먹을 수 있는 전국 유명 베이커리</p>
        <div style={{ display: "flex", gap: 8, marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>
          {["전체", "🔥 핫플", "서울", "부산", "대전", "전북", "광주"].map(f => (
            <button key={f} className="chip" onClick={() => setFilter(f)}
              style={{ background: filter === f ? "#c97b2e" : "#fff8f0", color: filter === f ? "#fff" : "#c97b2e", border: `1px solid ${filter === f ? "#c97b2e" : "#f0d8b8"}`, whiteSpace: "nowrap" }}>{f}</button>
          ))}
        </div>
        {filtered.map((b, i) => (
          <Card key={i} style={{ position: "relative", overflow: "hidden" }}>
            {b.hot && <div style={{ position: "absolute", top: 16, right: 16, background: "#ef4444", color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 8 }}>🔥 HOT</div>}
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ background: "linear-gradient(135deg,#fff3e0,#fde8c8)", borderRadius: 12, padding: "10px 12px", textAlign: "center", minWidth: 64 }}>
                <p style={{ fontSize: 10, color: "#c4a882", marginBottom: 2 }}>OPEN</p>
                <p style={{ fontSize: 18, fontWeight: 800, color: "#c97b2e" }}>{b.openTime}</p>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: "#3d2c1e", marginBottom: 3 }}>{b.name}</p>
                <p style={{ fontSize: 12, color: "#c4a882", marginBottom: 6 }}>📍 {b.location}</p>
                <p style={{ fontSize: 13, color: "#a08060", marginBottom: 6 }}>🍞 {b.specialty}</p>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ background: "#fff3e0", border: "1px solid #f0d0a0", borderRadius: 10, padding: "2px 8px", fontSize: 11, color: "#c97b2e" }}>⏱ 대기 {b.waitTime}</span>
                </div>
                <p style={{ fontSize: 11.5, color: "#a08060", marginTop: 8, lineHeight: 1.5 }}>💡 {b.tip}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  // MAP
  const MapPage = () => {
    if (loading) return <Loading text="빵집 정보 검색 중..." />;
    if (result) return (
      <div style={{ animation: "fadeIn .6s ease", padding: "0 16px 80px" }}>
        <div style={{ textAlign: "center", padding: "20px 0 16px" }}>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, color: "#8b4c1a" }}>📍 {input} 근처 빵집</h2>
        </div>
        {result.bakeries?.map((b, i) => (
          <Card key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
              <div>
                <span style={{ fontSize: 16, fontWeight: 700, color: "#3d2c1e" }}>{b.name}</span>
                {b.famous && <span style={{ marginLeft: 8, background: "#fff3e0", color: "#c97b2e", fontSize: 10, padding: "2px 6px", borderRadius: 8, fontWeight: 700 }}>유명</span>}
              </div>
              <span style={{ fontSize: 12, color: "#c97b2e", fontWeight: 600 }}>{b.priceRange}</span>
            </div>
            <p style={{ fontSize: 12, color: "#c4a882", marginBottom: 6 }}>📍 {b.address}</p>
            <p style={{ fontSize: 12, color: "#a08060", marginBottom: 6 }}>🕐 {b.hours}</p>
            <p style={{ fontSize: 13, color: "#5d3c2a", marginBottom: 6 }}>🍞 대표메뉴: {b.specialty}</p>
            <p style={{ fontSize: 12, color: "#a08060", lineHeight: 1.5 }}>{b.desc}</p>
          </Card>
        ))}
        <Btn onClick={() => { setResult(null); setInput(""); }} style={{ width: "100%" }}>다른 지역 검색</Btn>
      </div>
    );
    return (
      <div style={{ padding: "24px 16px 80px", animation: "fadeIn .6s ease" }}>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, color: "#8b4c1a", marginBottom: 4 }}>📍 빵집 지도</h2>
        <p style={{ fontSize: 13, color: "#c4a882", marginBottom: 20 }}>지역 이름을 입력하면 유명 빵집을 찾아드려요</p>
        <Card>
          <input value={input} onChange={e => setInput(e.target.value)} placeholder="예: 서울 홍대, 부산 서면, 전주 한옥마을..."
            style={{ width: "100%", fontSize: 16, background: "transparent", border: "none", borderBottom: "2px solid #f0d8b8", paddingBottom: 12 }} />
        </Card>
        <Btn onClick={() => go(
          `지역 빵집 검색 AI. JSON만 출력. {"bakeries":[{"name":"빵집이름","address":"주소","hours":"영업시간","specialty":"대표메뉴","priceRange":"가격대","desc":"특징한문장","famous":true/false}]} bakeries는 4-6개.`,
          `${input} 지역의 유명 베이커리와 빵집을 알려줘. 실제 존재하는 가게 위주로.`,
          ["빵집 정보 수집 중...", "리뷰 분석 중...", "정리 중..."], true
        )} disabled={!input.trim()} style={{ width: "100%", marginBottom: 16 }}>📍 빵집 찾기</Btn>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["서울 홍대", "부산 서면", "전주 한옥마을", "제주 시내", "강릉 시내"].map(e => (
            <button key={e} className="chip" onClick={() => setInput(e)}>{e}</button>
          ))}
        </div>
      </div>
    );
  };

  // COMMUNITY
  const CommunityPage = () => {
    const [posts, setPosts] = useState([]);
    const [tab, setTab] = useState("list");
    const [viewPost, setViewPost] = useState(null);
    const [pTitle, setPTitle] = useState(""), [pBody, setPBody] = useState(""), [pNick, setPNick] = useState(""), [pTag, setPTag] = useState("자유");
    const [commentText, setCommentText] = useState(""), [commentNick, setCommentNick] = useState("");
    const [postsLoaded, setPostsLoaded] = useState(false);
    const TAGS = ["자유", "리뷰", "레시피", "질문", "추천"];
    const TAG_COLORS = { "자유": "#c97b2e", "리뷰": "#16a34a", "레시피": "#2563eb", "질문": "#9333ea", "추천": "#e11d48" };

    useEffect(() => {
      sb.from("posts").select("*", { order: "created_at.desc" }).then(data => {
        if (Array.isArray(data)) setPosts(data);
        setPostsLoaded(true);
      });
    }, []);

    const submitPost = async () => {
      if (!pTitle.trim() || !pBody.trim() || !pNick.trim()) return alert("제목, 내용, 닉네임을 입력해주세요.");
      const res = await sb.from("posts").insert({ title: pTitle, body: pBody, nick: pNick, tag: pTag });
      if (Array.isArray(res) && res[0]) {
        setPosts([res[0], ...posts]);
        setPTitle(""); setPBody(""); setPNick(""); setPTag("자유"); setTab("list");
        alert("게시글이 등록됐어요! 🍞");
      } else alert("저장 중 오류가 발생했어요.");
    };

    const likePost = async (post) => {
      const res = await sb.from("posts").update({ likes: (post.likes || 0) + 1 }, { col: "id", val: post.id });
      if (Array.isArray(res) && res[0]) {
        setPosts(posts.map(p => p.id === post.id ? res[0] : p));
        if (viewPost?.id === post.id) setViewPost(res[0]);
      }
    };

    const submitComment = async () => {
      if (!commentText.trim() || !commentNick.trim()) return alert("닉네임과 댓글을 입력해주세요.");
      await sb.from("comments").insert({ post_id: viewPost.id, nick: commentNick, text: commentText });
      setCommentText("");
      // reload comments
      const comments = await sb.from("comments").select("*", { eq: { col: "post_id", val: viewPost.id }, order: "created_at.asc" });
      if (Array.isArray(comments)) setViewPost({ ...viewPost, _comments: comments });
    };

    const openPost = async (post) => {
      const comments = await sb.from("comments").select("*", { eq: { col: "post_id", val: post.id }, order: "created_at.asc" });
      setViewPost({ ...post, _comments: Array.isArray(comments) ? comments : [] });
      setTab("view");
    };

    if (tab === "view" && viewPost) return (
      <div style={{ padding: "16px 16px 80px", animation: "fadeIn .5s ease" }}>
        <button onClick={() => { setTab("list"); setViewPost(null); }} style={{ background: "none", border: "none", color: "#c97b2e", fontSize: 14, cursor: "pointer", marginBottom: 16, display: "flex", alignItems: "center", gap: 4, fontFamily: "'Noto Sans KR',sans-serif" }}>← 목록으로</button>
        <Card>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <span className="tag" style={{ background: TAG_COLORS[viewPost.tag] + "20", color: TAG_COLORS[viewPost.tag] }}>{viewPost.tag}</span>
            <span style={{ fontSize: 11, color: "#c4a882" }}>{viewPost.nick}</span>
          </div>
          <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, color: "#3d2c1e", marginBottom: 14, lineHeight: 1.4 }}>{viewPost.title}</h3>
          <p style={{ fontSize: 14.5, lineHeight: 1.9, color: "#5d3c2a", whiteSpace: "pre-wrap" }}>{viewPost.body}</p>
        </Card>
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <button onClick={() => likePost(viewPost)} style={{ padding: "10px 20px", borderRadius: 20, border: "1px solid #f0d8b8", background: "#fff8f0", color: "#c97b2e", fontSize: 13, cursor: "pointer", fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 600 }}>
            🍞 맛있어요 {viewPost.likes || 0}
          </button>
        </div>
        <Card>
          <Sec>댓글 {viewPost._comments?.length ?? 0}개</Sec>
          {(viewPost._comments ?? []).length === 0 && <p style={{ fontSize: 13, color: "#c4a882", textAlign: "center", padding: "12px 0" }}>첫 댓글을 남겨보세요 🍞</p>}
          {(viewPost._comments ?? []).map((c, i) => (
            <div key={c.id} style={{ borderBottom: i < viewPost._comments.length - 1 ? "1px solid #f5ede0" : "none", padding: "12px 0" }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: "#c97b2e", fontWeight: 700 }}>{c.nick}</span>
                <span style={{ fontSize: 11, color: "#c4a882" }}>{new Date(c.created_at).toLocaleDateString("ko-KR")}</span>
              </div>
              <p style={{ fontSize: 13.5, color: "#5d3c2a", lineHeight: 1.7 }}>{c.text}</p>
            </div>
          ))}
        </Card>
        <Card>
          <input value={commentNick} onChange={e => setCommentNick(e.target.value)} placeholder="닉네임"
            style={{ width: "100%", fontSize: 13, borderBottom: "1px solid #f0e0c8", paddingBottom: 10, marginBottom: 12, background: "transparent", border: "none", borderBottom: "1px solid #f0e0c8" }} />
          <textarea value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="댓글을 입력하세요..." rows={3}
            style={{ width: "100%", fontSize: 14, lineHeight: 1.7, background: "transparent", border: "none", resize: "none" }} />
          <Btn onClick={submitComment} style={{ width: "100%", marginTop: 10 }}>댓글 달기</Btn>
        </Card>
      </div>
    );

    if (tab === "write") return (
      <div style={{ padding: "16px 16px 80px", animation: "fadeIn .5s ease" }}>
        <button onClick={() => setTab("list")} style={{ background: "none", border: "none", color: "#c97b2e", fontSize: 14, cursor: "pointer", marginBottom: 16, display: "flex", alignItems: "center", gap: 4, fontFamily: "'Noto Sans KR',sans-serif" }}>← 목록으로</button>
        <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, color: "#8b4c1a", marginBottom: 20 }}>새 글 쓰기 ✍️</h3>
        <Card>
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            {TAGS.map(t => (
              <button key={t} onClick={() => setPTag(t)} style={{ padding: "6px 14px", borderRadius: 20, border: `1px solid ${pTag === t ? TAG_COLORS[t] : "#f0d8b8"}`, background: pTag === t ? TAG_COLORS[t] + "18" : "transparent", color: pTag === t ? TAG_COLORS[t] : "#a08060", fontSize: 12, cursor: "pointer", fontFamily: "'Noto Sans KR',sans-serif" }}>{t}</button>
            ))}
          </div>
          <input value={pNick} onChange={e => setPNick(e.target.value)} placeholder="닉네임"
            style={{ width: "100%", fontSize: 14, borderBottom: "1px solid #f0e0c8", paddingBottom: 12, marginBottom: 14, background: "transparent", border: "none", borderBottom: "1px solid #f0e0c8" }} />
          <input value={pTitle} onChange={e => setPTitle(e.target.value)} placeholder="제목을 입력하세요"
            style={{ width: "100%", fontSize: 16, fontWeight: 700, borderBottom: "1px solid #f0e0c8", paddingBottom: 12, marginBottom: 14, background: "transparent", border: "none", borderBottom: "1px solid #f0e0c8" }} />
          <textarea value={pBody} onChange={e => setPBody(e.target.value)} placeholder="빵에 대한 이야기를 자유롭게 써주세요..." rows={8}
            style={{ width: "100%", fontSize: 14.5, lineHeight: 1.8, background: "transparent", border: "none", resize: "none" }} />
        </Card>
        <Btn onClick={submitPost} style={{ width: "100%" }}>게시하기 →</Btn>
      </div>
    );

    return (
      <div style={{ padding: "16px 16px 80px", animation: "fadeIn .6s ease" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, color: "#8b4c1a" }}>💬 빵 커뮤니티</h2>
            <p style={{ fontSize: 12, color: "#c4a882", marginTop: 2 }}>빵 덕후들의 공간</p>
          </div>
          <Btn onClick={() => setTab("write")} variant="outline" style={{ padding: "10px 16px", fontSize: 13 }}>✍️ 글쓰기</Btn>
        </div>
        {!postsLoaded && <p style={{ textAlign: "center", color: "#c4a882", padding: "40px 0" }}>불러오는 중...</p>}
        {postsLoaded && posts.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🍞</div>
            <p style={{ fontSize: 14, color: "#c4a882" }}>아직 글이 없어요. 첫 번째 글을 써보세요!</p>
          </div>
        )}
        {posts.map(p => (
          <div key={p.id} onClick={() => openPost(p)} style={{ background: "#fff", border: "1px solid #f0e0c8", borderRadius: 14, padding: "16px", marginBottom: 10, cursor: "pointer", transition: "all .2s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "#fff8f0"; e.currentTarget.style.borderColor = "#e8c898"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#f0e0c8"; }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
              <span className="tag" style={{ background: (TAG_COLORS[p.tag] || "#c97b2e") + "20", color: TAG_COLORS[p.tag] || "#c97b2e" }}>{p.tag}</span>
              <span style={{ fontSize: 11, color: "#c4a882" }}>{p.nick}</span>
              <span style={{ fontSize: 11, color: "#c4a882", marginLeft: "auto" }}>{new Date(p.created_at).toLocaleDateString("ko-KR")}</span>
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#3d2c1e", marginBottom: 6, lineHeight: 1.3 }}>{p.title}</p>
            <p style={{ fontSize: 12.5, color: "#a08060", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{p.body}</p>
            <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
              <span style={{ fontSize: 12, color: "#c4a882" }}>🍞 {p.likes || 0}</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // NAV ITEMS
  const navItems = [
    { key: "home", icon: "🏠", label: "홈" },
    { key: "search", icon: "🔍", label: "검색" },
    { key: "roulette", icon: "🎲", label: "룰렛" },
    { key: "worldcup", icon: "🏆", label: "월드컵" },
    { key: "community", icon: "💬", label: "커뮤니티" },
  ];

  const pageMap = {
    home: <HomePage />, search: <SearchPage />, roulette: <RoulettePage />,
    match: <MatchPage />, worldcup: <WorldcupPage />, sommelier: <SommelierPage />,
    region: <RegionPage />, trend: <TrendPage />, openrun: <OpenrunPage />,
    map: <MapPage />, community: <CommunityPage />
  };

  return (
    <>
      <style>{css}</style>
      <div style={{ minHeight: "100vh", background: "#fdf8f2", paddingBottom: 70 }}>
        {pageMap[page] || <HomePage />}
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(255,252,248,.95)", borderTop: "1px solid #f0e0c8", backdropFilter: "blur(12px)", zIndex: 100, padding: "8px 0 10px" }}>
          <div style={{ display: "flex", justifyContent: "space-around", maxWidth: 660, margin: "0 auto" }}>
            {navItems.map(item => (
              <button key={item.key} className="nav-item" onClick={() => nav(item.key)}
                style={{ color: page === item.key ? "#c97b2e" : "#c4a882", background: page === item.key ? "#fff3e0" : "transparent" }}>
                <span style={{ fontSize: 22 }}>{item.icon}</span>
                <span style={{ fontSize: 10, fontWeight: page === item.key ? 700 : 400 }}>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
