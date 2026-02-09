// Duelmasters Quickstart shell (always playable) — v1.4.0
(function(){
  const LS_KEY = "dm_quickstart_save_v140";
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

  // seed
  function seeded(){
    const url = new URL(window.location.href);
    if (url.searchParams.get("reset")==="1") { localStorage.removeItem(LS_KEY); }
    let st = localStorage.getItem(LS_KEY);
    if (st) return JSON.parse(st);
    const state = {
      version: "1.4.0",
      player: { name: "You", stable: "THE IVORY TOWER", philosophy: "Balanced", fame: 3, popularity: 2 },
      week: 1,
      warriors: [
        { id:"W1", name:"TARUL", style:"PARRY-STRIKE", ST:16,CN:10,SZ:10,WT:13,WL:13,SP:11,DF:11, fame:2, popularity:1, titles:[], injuries:[], career:{w:0,l:1,k:0}},
        { id:"W2", name:"ORCREST", style:"PARRY-LUNGE", ST:12,CN:11,SZ:11,WT:12,WL:12,SP:13,DF:12, fame:3, popularity:2, titles:["Spring Open"], injuries:["off-hand numb"], career:{w:1,l:0,k:0}},
        { id:"W3", name:"BLOB", style:"BASHING ATTACK", ST:18,CN:19,SZ:7,WT:4,WL:20,SP:12,DF:5, fame:1, popularity:0, titles:[], injuries:["trick knee"], career:{w:0,l:1,k:0}},
      ],
      newsletter: [],
      flags: { featureTournaments: true, featurePlanModal: true }
    };
    localStorage.setItem(LS_KEY, JSON.stringify(state));
    return state;
  }

  let STATE = seeded();

  function save(){ localStorage.setItem(LS_KEY, JSON.stringify(STATE)); }

  // toast
  function toast(msg){
    const el = $("#toast");
    el.textContent = msg;
    el.classList.add("show");
    setTimeout(()=>el.classList.remove("show"), 2200);
  }

  // nav
  function setRoute(route){ window.currentRoute = route; render(); }
  $$(".nav .btn").forEach(b=>b.addEventListener("click", ()=> setRoute(b.dataset.nav)));

  // views
  function viewDashboard(){
    const w = STATE.warriors;
    const champCount = w.filter(x=>x.titles.length>0).length;
    return `
      <div class="hero">
        <div class="h">
          <div class="title">Welcome back, ${STATE.player.name} — <span class="muted">${STATE.player.stable}</span></div>
          <span class="chip">Week ${STATE.week}</span>
          <span class="chip">Fame ${STATE.player.fame}</span>
          <span class="chip">Popularity ${STATE.player.popularity}</span>
          <span class="chip">${champCount} Champion${champCount!==1?"s":""}</span>
        </div>
        <div class="muted" style="margin-top:8px">This is the macOS Quickstart build. Full systems load in later zips, but everything here is click-around safe.</div>
      </div>

      <div class="grid">
        <div class="col-8">
          <div class="card">
            <div class="rowb"><div class="title">Recent Newsletter</div><button class="btn secondary" data-act="advance">Advance Week</button></div>
            <div class="list" style="margin-top:8px">
              ${(STATE.newsletter.slice(-5).reverse().map((n,i)=> `
                <div class="rowb">
                  <div>
                    <div><span class="pill">Week ${n.week}</span> <span class="muted">Headline:</span> ${n.headline}</div>
                    <div class="muted">${n.summary}</div>
                  </div>
                  <a href="#" class="link" data-week="${n.week}" data-act="open-news">Open</a>
                </div>
              `).join("")) || `<div class="muted">No newsletter yet. Run a round to generate one.</div>`}
            </div>
          </div>
        </div>
        <div class="col-4">
          <div class="card">
            <div class="title">Tips</div>
            <ul class="muted">
              <li>Lungers pressure Bashers; Parry styles love mistakes.</li>
              <li>OE = how hard you push; AL = how much you move.</li>
              <li>Target head/chest to force a true finisher chance.</li>
            </ul>
          </div>
        </div>
      </div>
    `;
  }

  function viewRoster(){
    const rows = STATE.warriors.map(w=>`
      <div class="rowb">
        <div class="row">
          <div class="title">${w.name}</div>
          ${w.titles.length? `<span class="chip" title="Champion">🏆 ${w.titles.join(", ")}</span>`:""}
          <span class="chip">${w.style}</span>
          <span class="chip" title="Fame">F ${w.fame}</span>
          <span class="chip" title="Popularity">P ${w.popularity}</span>
        </div>
        <a class="link" href="#" data-id="${w.id}" data-act="open-sheet">Open Sheet</a>
      </div>
    `).join("");
    return `<div class="card"><div class="title">Roster</div><div class="list" style="margin-top:8px">${rows}</div></div>`;
  }

  function viewRunRound(){
    return `
      <div class="card">
        <div class="rowb">
          <div class="title">Run Round</div>
          <button class="btn" data-act="simulate">Simulate Fights</button>
        </div>
        <div class="muted">This quickstart runs a mock fight and appends a newsletter entry.</div>
      </div>
    `;
  }

  function viewTournaments(){
    return `
      <div class="card">
        <div class="rowb"><div class="title">Tournaments</div><span class="chip">Seasonal</span></div>
        <div class="muted">Bracket UI, seeding, and summaries arrive in upcoming packs. This shell keeps navigation working.</div>
      </div>
    `;
  }

  function viewHelp(){
    return `
      <div class="card">
        <div class="title">Help</div>
        <div class="list" style="margin-top:8px">
          <div><span class="tag">OE (Offensive Effort)</span> — How hard you press. Higher = more attacks, more fatigue.</div>
          <div><span class="tag">AL (Activity Level)</span> — How much you move. Higher = mobility, initiative, more tiring.</div>
          <div><span class="tag">Tactics</span> — Lunge, Bash, Slash, Aim, Parry, Dodge, Responsiveness, Riposte. Use sparingly.</div>
        </div>
      </div>
    `;
  }

  function render(){
    const route = window.currentRoute || "dashboard";
    const app = $("#app");
    app.innerHTML = (
      route==="dashboard" ? viewDashboard() :
      route==="roster"    ? viewRoster() :
      route==="runround"  ? viewRunRound() :
      route==="tournaments"?viewTournaments() :
      viewHelp()
    );
    bind();
  }

  function openSheet(id){
    const w = STATE.warriors.find(x=>x.id===id);
    if (!w) return;
    const detail = window.open("", "_blank");
    detail.document.write(`
      <html><head><title>${w.name} — Sheet</title>
      <style>body{background:#0b0f15;color:#e6eefb;font:14px ui-sans-serif;margin:0} .wrap{padding:24px}
      .card{background:#121826;border:1px solid #1f2a3a;border-radius:16px;padding:16px}
      .row{display:flex;gap:10px;align-items:center;flex-wrap:wrap} .chip{background:#1f2937;padding:4px 8px;border-radius:999px;border:1px solid #1f2a3a}
      .title{font-weight:800;font-size:20px}</style>
      </head><body><div class="wrap">
        <div class="card">
          <div class="row">
            <div class="title">${w.name}</div>
            ${w.titles.length? `<span class="chip">🏆 ${w.titles.join(", ")}</span>`:""}
            <span class="chip">${w.style}</span>
            <span class="chip">Fame ${w.fame}</span>
            <span class="chip">Popularity ${w.popularity}</span>
          </div>
          <div style="margin-top:8px">Career: ${w.career.w}-${w.career.l}-${w.career.k}</div>
          <div class="row" style="margin-top:8px">${w.injuries.map(i=>`<span class="chip">${i}</span>`).join("")}</div>
        </div>
      </div></body></html>
    `);
    detail.document.close();
  }

  function mockFight(){
    // Minimal: pick two distinct warriors; generate a flavor log; bump fame/pop softly.
    const a = STATE.warriors[0], d = STATE.warriors[1] || STATE.warriors[0];
    if (a.id===d.id) return;
    const flashy = Math.random()<0.3;
    const kill = Math.random()<0.1;
    const winner = Math.random()<0.5 ? a : d;
    const loser = winner.id===a.id ? d : a;
    winner.career.w++; loser.career.l++;
    if (kill){ winner.career.k++; loser.injuries.push("concussion"); }
    if (flashy){ winner.popularity = Math.min(10, (winner.popularity||0)+1); }
    winner.fame = Math.min(10, (winner.fame||0)+1);

    STATE.newsletter.push({
      week: STATE.week,
      headline: `${winner.name} overcomes ${loser.name}`,
      summary: `${winner.name} ${flashy?"dazzled the crowd and":""} ${kill?"finished":"subdued"} ${loser.name}.`,
      fights: [ { a: a.name, d: d.name, by: kill?"Kill": "Decision", flashy, duration: (2+Math.floor(Math.random()*5)) } ]
    });
    save();
    toast(`${winner.name} ${kill?"finishes":"defeats"} ${loser.name}.`);
    render();
  }

  function advanceWeek(){
    STATE.week += 1;
    STATE.newsletter.push({
      week: STATE.week,
      headline: "Quiet week",
      summary: "A calm in the arena. Plans are laid, steel is sharpened."
    });
    save();
    toast(`Advanced to week ${STATE.week}`);
    render();
  }

  function bind(){
    $$("#app [data-act='simulate']").forEach(b=> b.addEventListener("click", mockFight));
    $$("#app [data-act='advance']").forEach(b=> b.addEventListener("click", advanceWeek));
    $$("#app [data-act='open-news']").forEach(a=> a.addEventListener("click", (e)=>{
      e.preventDefault();
      const wk = Number(a.getAttribute("data-week"));
      const n = STATE.newsletter.find(x=>x.week===wk);
      if (!n) return;
      alert(`WEEK ${n.week}\n${n.headline}\n\n${n.summary}`);
    }));
    $$("#app [data-act='open-sheet']").forEach(a=> a.addEventListener("click", (e)=>{
      e.preventDefault();
      openSheet(a.getAttribute("data-id"));
    }));
  }

  render();
})();