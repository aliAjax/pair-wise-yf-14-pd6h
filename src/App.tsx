import { useMemo, useState, type CSSProperties } from "react";
import "./styles.css";

/* ================= 数据模型 ================= */

type Category = "面光" | "侧光" | "逆光" | "效果光";
type Filter = Category | "全部";

interface Fixture {
  id: string; // 灯具编号
  channel: number; // 通道号
  category: Category;
  gel: string; // 色片
  focus: string; // 焦点位置
  preset: number; // 亮度预设 %
  focusConfirmed: boolean; // 焦点是否已确认
  x: number; // 灯位图坐标（视图百分比）
  y: number;
}

interface CueLevel {
  fixtureId: string;
  intensity: number; // 该 Cue 下此灯亮度 %
}

interface Cue {
  id: string;
  number: number;
  name: string;
  note: string;
  levels: CueLevel[]; // 各灯通道（由灯具派生）与亮度，随 Cue 整体调序
}

interface VersionNote {
  id: string;
  version: string;
  text: string;
  cueIds: string[]; // 被引用的 Cue
}

const CATEGORY_COLORS: Record<Category, string> = {
  面光: "#f59e0b",
  侧光: "#06b6d4",
  逆光: "#7c3aed",
  效果光: "#ec4899",
};
const CATEGORIES = Object.keys(CATEGORY_COLORS) as Category[];
const VERSIONS = ["版本A", "版本B", "版本C"];

let seq = 0;
const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

/* ================= 初始数据 ================= */

const initialFixtures: Fixture[] = [
  { id: "FOH-01", channel: 1, category: "面光", gel: "R201", focus: "舞台中前区", preset: 80, focusConfirmed: true, x: 32, y: 58 },
  { id: "FOH-02", channel: 2, category: "面光", gel: "R201", focus: "舞台中前区", preset: 80, focusConfirmed: true, x: 50, y: 58 },
  { id: "FOH-03", channel: 3, category: "面光", gel: "R203", focus: "门口追光位", preset: 75, focusConfirmed: false, x: 68, y: 58 },
  { id: "SL-L1", channel: 21, category: "侧光", gel: "R079", focus: "左侧流动位", preset: 65, focusConfirmed: true, x: 10, y: 16 },
  { id: "SL-L2", channel: 22, category: "侧光", gel: "R080", focus: "左侧中场", preset: 65, focusConfirmed: false, x: 10, y: 28 },
  { id: "SL-R1", channel: 25, category: "侧光", gel: "R079", focus: "右侧流动位", preset: 65, focusConfirmed: true, x: 90, y: 16 },
  { id: "SL-R2", channel: 26, category: "侧光", gel: "R080", focus: "右侧中场", preset: 60, focusConfirmed: true, x: 90, y: 28 },
  { id: "BL-01", channel: 41, category: "逆光", gel: "R358", focus: "天幕前区", preset: 70, focusConfirmed: true, x: 36, y: 12 },
  { id: "BL-02", channel: 42, category: "逆光", gel: "R358", focus: "天幕前区", preset: 70, focusConfirmed: false, x: 64, y: 12 },
  { id: "FX-01", channel: 61, category: "效果光", gel: "—", focus: "地面光束", preset: 50, focusConfirmed: false, x: 24, y: 47 },
  { id: "FX-02", channel: 62, category: "效果光", gel: "—", focus: "地面光束", preset: 50, focusConfirmed: true, x: 76, y: 47 },
];

const initialCues: Cue[] = [
  {
    id: "cue-1",
    number: 1,
    name: "开场暗场",
    note: "仅保留工作灯",
    levels: [
      { fixtureId: "SL-L1", intensity: 15 },
      { fixtureId: "FX-01", intensity: 20 },
    ],
  },
  {
    id: "cue-12",
    number: 12,
    name: "冷蓝侧光",
    note: "二幕开场",
    levels: [
      { fixtureId: "SL-L1", intensity: 65 },
      { fixtureId: "SL-L2", intensity: 65 },
      { fixtureId: "SL-R1", intensity: 65 },
      { fixtureId: "SL-R2", intensity: 50 },
      { fixtureId: "BL-01", intensity: 40 },
    ],
  },
  {
    id: "cue-18",
    number: 18,
    name: "追光入场",
    note: "需演员走位确认",
    levels: [
      { fixtureId: "FOH-03", intensity: 90 },
      { fixtureId: "FOH-01", intensity: 30 },
    ],
  },
  {
    id: "cue-24",
    number: 24,
    name: "暖色谢幕",
    note: "全台面光80%",
    levels: [
      { fixtureId: "FOH-01", intensity: 80 },
      { fixtureId: "FOH-02", intensity: 80 },
      { fixtureId: "FOH-03", intensity: 80 },
      { fixtureId: "BL-01", intensity: 60 },
      { fixtureId: "BL-02", intensity: 60 },
      { fixtureId: "FX-01", intensity: 40 },
      { fixtureId: "FX-02", intensity: 40 },
    ],
  },
];

const initialNotes: VersionNote[] = [
  { id: "note-1", version: "版本A", text: "二幕开场侧光偏冷，导演要求整体再降 5%。", cueIds: ["cue-12"] },
  { id: "note-2", version: "版本A", text: "追光 Cue 待演员走位确认后再定亮度。", cueIds: ["cue-18"] },
  { id: "note-3", version: "版本B", text: "谢幕改暖色，面光整体 80%，逆光 60%。", cueIds: ["cue-24"] },
  { id: "note-4", version: "版本C", text: "新排版本：先复用版本B 的谢幕处理，待定。", cueIds: [] },
];

/* ================= 应用 ================= */

function App() {
  const [showName, setShowName] = useState("《夜航船》秋季巡演版");
  const [fixtures, setFixtures] = useState<Fixture[]>(initialFixtures);
  const [cues, setCues] = useState<Cue[]>(initialCues);
  const [notes, setNotes] = useState<VersionNote[]>(initialNotes);
  const [activeCueId, setActiveCueId] = useState<string | null>("cue-12");
  const [selectedFixtureId, setSelectedFixtureId] = useState<string | null>("FOH-03");
  const [filter, setFilter] = useState<Filter>("全部");
  const [activeVersion, setActiveVersion] = useState(VERSIONS[0]);
  const [warning, setWarning] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [noteCue, setNoteCue] = useState("");

  const fixtureMap = useMemo(
    () => new Map(fixtures.map((f) => [f.id, f])),
    [fixtures]
  );
  const activeCue = cues.find((c) => c.id === activeCueId) ?? null;
  const selectedFixture = selectedFixtureId
    ? fixtureMap.get(selectedFixtureId) ?? null
    : null;
  const pendingFocus = fixtures.filter((f) => !f.focusConfirmed).length;

  // 筛选：只显示相关灯位与含相关回路的 Cue
  const visibleFixtures =
    filter === "全部" ? fixtures : fixtures.filter((f) => f.category === filter);
  const visibleCues =
    filter === "全部"
      ? cues
      : cues.filter((c) =>
          c.levels.some((l) => fixtureMap.get(l.fixtureId)?.category === filter)
        );
  const versionNotes = notes.filter((n) => n.version === activeVersion);

  const cueById = (id: string) => cues.find((c) => c.id === id);
  const sortedLevels = (cue: Cue) =>
    [...cue.levels].sort(
      (a, b) =>
        (fixtureMap.get(a.fixtureId)?.channel ?? 0) -
        (fixtureMap.get(b.fixtureId)?.channel ?? 0)
    );

  /* ---------- 灯具操作（改动即时同步灯位图与当前场景） ---------- */

  const updateFixture = (id: string, patch: Partial<Fixture>) =>
    setFixtures((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  const renameFixture = (oldId: string, newId: string) => {
    const id = newId.trim();
    if (!id || id === oldId || fixtures.some((f) => f.id === id)) return false;
    setFixtures((prev) => prev.map((f) => (f.id === oldId ? { ...f, id } : f)));
    setCues((prev) =>
      prev.map((c) => ({
        ...c,
        levels: c.levels.map((l) =>
          l.fixtureId === oldId ? { ...l, fixtureId: id } : l
        ),
      }))
    );
    if (selectedFixtureId === oldId) setSelectedFixtureId(id);
    return true;
  };

  const addFixture = () => {
    const id = `NEW-${String(fixtures.length + 1).padStart(2, "0")}`;
    const maxChannel = fixtures.reduce((m, f) => Math.max(m, f.channel), 0);
    const fixture: Fixture = {
      id,
      channel: maxChannel + 1,
      category: "面光",
      gel: "—",
      focus: "待定",
      preset: 50,
      focusConfirmed: false, // 新灯具计入待确认焦点
      x: 50,
      y: 30,
    };
    setFixtures((prev) => [...prev, fixture]);
    setSelectedFixtureId(id);
  };

  const removeFixture = (id: string) => {
    setFixtures((prev) => prev.filter((f) => f.id !== id));
    setCues((prev) =>
      prev.map((c) => ({ ...c, levels: c.levels.filter((l) => l.fixtureId !== id) }))
    );
    if (selectedFixtureId === id) setSelectedFixtureId(null);
  };

  /* ---------- Cue 操作 ---------- */

  const updateCueMeta = (id: string, patch: Partial<Pick<Cue, "name" | "note">>) =>
    setCues((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const setLevel = (cueId: string, fixtureId: string, intensity: number) =>
    setCues((prev) =>
      prev.map((c) =>
        c.id === cueId
          ? {
              ...c,
              levels: c.levels.map((l) =>
                l.fixtureId === fixtureId ? { ...l, intensity } : l
              ),
            }
          : c
      )
    );

  const addLevel = (cueId: string, fixtureId: string) => {
    const fixture = fixtureMap.get(fixtureId);
    if (!fixture) return;
    setCues((prev) =>
      prev.map((c) =>
        c.id === cueId && !c.levels.some((l) => l.fixtureId === fixtureId)
          ? {
              ...c,
              levels: [...c.levels, { fixtureId, intensity: fixture.preset }],
            }
          : c
      )
    );
  };

  const removeLevel = (cueId: string, fixtureId: string) =>
    setCues((prev) =>
      prev.map((c) =>
        c.id === cueId
          ? { ...c, levels: c.levels.filter((l) => l.fixtureId !== fixtureId) }
          : c
      )
    );

  // 调序：levels（各灯通道与亮度）随 Cue 对象整体移动，天然保留
  const moveCue = (id: string, dir: -1 | 1) =>
    setCues((prev) => {
      const idx = prev.findIndex((c) => c.id === id);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(idx, 1);
      next.splice(target, 0, item);
      return next;
    });

  const addCue = () => {
    const number = cues.reduce((m, c) => Math.max(m, c.number), 0) + 1;
    const cue: Cue = {
      id: uid("cue"),
      number,
      name: "新Cue",
      note: "",
      levels: fixtures.map((f) => ({ fixtureId: f.id, intensity: f.preset })),
    };
    setCues((prev) => [...prev, cue]);
    setActiveCueId(cue.id);
  };

  // 被版本备注引用的 Cue 必须先解除引用才能移除
  const removeCue = (cue: Cue) => {
    const refs = notes.filter((n) => n.cueIds.includes(cue.id));
    if (refs.length > 0) {
      setWarning(
        `Cue ${cue.number}「${cue.name}」正被 ${refs
          .map((r) => r.version)
          .join("、")} 的备注引用，请先在对应版本备注中解除引用，再移除该 Cue。`
      );
      return;
    }
    setWarning(null);
    setCues((prev) => prev.filter((c) => c.id !== cue.id));
    if (activeCueId === cue.id) setActiveCueId(null);
  };

  /* ---------- 版本备注操作 ---------- */

  const addNote = () => {
    const text = noteText.trim();
    if (!text) return;
    setNotes((prev) => [
      ...prev,
      { id: uid("note"), version: activeVersion, text, cueIds: noteCue ? [noteCue] : [] },
    ]);
    setNoteText("");
    setNoteCue("");
  };

  const removeNote = (id: string) =>
    setNotes((prev) => prev.filter((n) => n.id !== id));

  const addNoteRef = (noteId: string, cueId: string) =>
    setNotes((prev) =>
      prev.map((n) =>
        n.id === noteId && !n.cueIds.includes(cueId)
          ? { ...n, cueIds: [...n.cueIds, cueId] }
          : n
      )
    );

  const removeNoteRef = (noteId: string, cueId: string) =>
    setNotes((prev) =>
      prev.map((n) =>
        n.id === noteId ? { ...n, cueIds: n.cueIds.filter((id) => id !== cueId) } : n
      )
    );

  /* ================= 界面 ================= */

  return (
    <main className="app">
      <header className="hero">
        <p>hxyfront-62002 · 剧场灯光 · 排练台</p>
        <h1>灯光 Cue 表排练台</h1>
        <label className="show-name">
          <span>演出名称</span>
          <input value={showName} onChange={(e) => setShowName(e.target.value)} />
        </label>
      </header>

      <section className="metrics">
        <article>
          <small>灯具数量</small>
          <strong>{fixtures.length}</strong>
          <span className="metric-sub">{CATEGORIES.map((c) => `${c}${fixtures.filter((f) => f.category === c).length}`).join(" · ")}</span>
        </article>
        <article>
          <small>Cue数量</small>
          <strong>{cues.length}</strong>
          <span className="metric-sub">按触发顺序排列</span>
        </article>
        <article>
          <small>当前场景</small>
          <strong>{activeCue ? `Cue ${activeCue.number}` : "—"}</strong>
          <span className="metric-sub">{activeCue ? activeCue.name : "未选择"}</span>
        </article>
        <article className={pendingFocus > 0 ? "warn-card" : ""}>
          <small>待确认焦点</small>
          <strong>{pendingFocus}</strong>
          <span className="metric-sub">
            {pendingFocus > 0
              ? fixtures.filter((f) => !f.focusConfirmed).map((f) => f.id).join("、")
              : "全部灯具焦点已确认"}
          </span>
        </article>
      </section>

      <div className="board">
        <aside className="side-col">
          <section className="panel">
            <h2>灯具筛选</h2>
            <div className="chips">
              {(["全部", ...CATEGORIES] as Filter[]).map((c) => (
                <button
                  key={c}
                  className={filter === c ? "chip active" : "chip"}
                  style={c !== "全部" ? ({ "--chip-color": CATEGORY_COLORS[c] } as CSSProperties) : undefined}
                  onClick={() => setFilter(c)}
                >
                  {c}
                </button>
              ))}
            </div>
            <p className="hint">
              {filter === "全部"
                ? "显示全部灯位与 Cue。"
                : `仅显示${filter}灯位及含${filter}回路的 Cue；筛选期间调序锁定。`}
            </p>
          </section>

          <section className="panel">
            <h2>演出版本备注</h2>
            <div className="tabs">
              {VERSIONS.map((v) => (
                <button
                  key={v}
                  className={v === activeVersion ? "tab active" : "tab"}
                  onClick={() => setActiveVersion(v)}
                >
                  {v}
                </button>
              ))}
            </div>
            <div className="notes">
              {versionNotes.length === 0 && <p className="hint">该版本暂无备注。</p>}
              {versionNotes.map((n) => (
                <article className="note" key={n.id}>
                  <p>{n.text}</p>
                  {n.cueIds.length > 0 && (
                    <div className="refs">
                      {n.cueIds.map((id) => {
                        const c = cueById(id);
                        if (!c) return null;
                        return (
                          <span className="ref-chip" key={id}>
                            Cue {c.number} · {c.name}
                            <button
                              title="解除引用"
                              onClick={() => removeNoteRef(n.id, id)}
                            >
                              ✕
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                  <div className="note-actions">
                    <select
                      value=""
                      onChange={(e) => e.target.value && addNoteRef(n.id, e.target.value)}
                    >
                      <option value="">引用Cue…</option>
                      {cues
                        .filter((c) => !n.cueIds.includes(c.id))
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            Cue {c.number} · {c.name}
                          </option>
                        ))}
                    </select>
                    <button onClick={() => removeNote(n.id)}>删除</button>
                  </div>
                </article>
              ))}
            </div>
            <div className="note-form">
              <textarea
                rows={2}
                placeholder={`为${activeVersion}添加排练备注…`}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
              />
              <div className="note-form-row">
                <select value={noteCue} onChange={(e) => setNoteCue(e.target.value)}>
                  <option value="">不引用Cue</option>
                  {cues.map((c) => (
                    <option key={c.id} value={c.id}>
                      Cue {c.number} · {c.name}
                    </option>
                  ))}
                </select>
                <button className="primary" onClick={addNote}>
                  添加备注
                </button>
              </div>
            </div>
          </section>
        </aside>

        <section className="panel plot-panel">
          <div className="heading">
            <div>
              <p>舞台平面</p>
              <h2>灯位图</h2>
            </div>
            <span className="hint">
              {filter === "全部"
                ? `${fixtures.length} 个灯具`
                : `${visibleFixtures.length} / ${fixtures.length} 个${filter}灯具`}
            </span>
          </div>
          <svg viewBox="0 0 100 76" className="plot" role="img" aria-label="舞台平面灯位图">
            <text x="50" y="5" className="plot-label">天幕 / 上场门</text>
            <rect x="14" y="8" width="72" height="36" rx="1.5" className="stage" />
            <rect x="14" y="44" width="72" height="6" className="apron" />
            <text x="50" y="48.2" className="plot-label">台唇</text>
            <line x1="8" y1="58" x2="92" y2="58" className="rig-line" />
            <text x="50" y="63.5" className="plot-label">面光桥（观众席上方）</text>
            <text x="50" y="72" className="plot-label">观众席</text>
            <line x1="10" y1="10" x2="10" y2="42" className="rig-line" />
            <line x1="90" y1="10" x2="90" y2="42" className="rig-line" />
            {visibleFixtures.map((f) => {
              const level = activeCue?.levels.find((l) => l.fixtureId === f.id);
              const intensity = level?.intensity ?? 0;
              const color = CATEGORY_COLORS[f.category];
              const selected = f.id === selectedFixtureId;
              return (
                <g
                  key={f.id}
                  transform={`translate(${f.x} ${f.y})`}
                  className="fixture-dot"
                  onClick={() => setSelectedFixtureId(f.id)}
                >
                  {intensity > 0 && (
                    <circle
                      r={4.6 + intensity / 26}
                      fill={color}
                      opacity={0.14 + (0.5 * intensity) / 100}
                    />
                  )}
                  {selected && <circle r="5.4" fill="none" stroke="#ffffff" strokeWidth="0.8" />}
                  {!f.focusConfirmed && (
                    <circle r="4.4" fill="none" stroke="#fbbf24" strokeWidth="0.7" strokeDasharray="1.6 1.2" />
                  )}
                  <circle r="3" fill={color} opacity={intensity > 0 ? 1 : 0.35} />
                  <text y="-5.8" className="fixture-ch">CH{f.channel}</text>
                  <text y="8.6" className="fixture-id">{f.id}</text>
                </g>
              );
            })}
          </svg>
          <div className="legend">
            {CATEGORIES.map((c) => (
              <span key={c}>
                <i style={{ background: CATEGORY_COLORS[c] }} />
                {c} {fixtures.filter((f) => f.category === c).length}
              </span>
            ))}
            <span className="legend-warn">
              <i /> 待确认焦点 {pendingFocus}
            </span>
          </div>
        </section>

        <section className="panel scene-panel">
          <div className="heading">
            <div>
              <p>当前场景</p>
              <h2>{activeCue ? `Cue ${activeCue.number} · ${activeCue.name}` : "未选择"}</h2>
            </div>
            {activeCue && <span className="live-badge">LIVE</span>}
          </div>
          {!activeCue ? (
            <p className="hint">在下方 Cue 列表中点击一个 Cue，设为当前场景。</p>
          ) : (
            <>
              <div className="field-grid single">
                <label>
                  <span>Cue名称</span>
                  <input
                    value={activeCue.name}
                    onChange={(e) => updateCueMeta(activeCue.id, { name: e.target.value })}
                  />
                </label>
                <label>
                  <span>演出备注</span>
                  <input
                    value={activeCue.note}
                    placeholder="排练备注"
                    onChange={(e) => updateCueMeta(activeCue.id, { note: e.target.value })}
                  />
                </label>
              </div>
              <div className="levels">
                {sortedLevels(activeCue).map((l) => {
                  const f = fixtureMap.get(l.fixtureId);
                  if (!f) return null;
                  return (
                    <div className="level-row" key={l.fixtureId}>
                      <span className="dot" style={{ background: CATEGORY_COLORS[f.category] }} />
                      <span className="level-name">
                        {f.id}
                        <em>CH{f.channel} · {f.category}</em>
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={l.intensity}
                        onChange={(e) => setLevel(activeCue.id, f.id, Number(e.target.value))}
                      />
                      <b>{l.intensity}%</b>
                      <button
                        className="mini"
                        title="从该Cue中移除"
                        onClick={() => removeLevel(activeCue.id, f.id)}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
                {activeCue.levels.length === 0 && (
                  <p className="hint">该 Cue 暂无回路，请从下方添加灯具。</p>
                )}
              </div>
              <select
                className="add-level"
                value=""
                onChange={(e) => e.target.value && addLevel(activeCue.id, e.target.value)}
              >
                <option value="">添加灯具到该Cue…</option>
                {fixtures
                  .filter((f) => !activeCue.levels.some((l) => l.fixtureId === f.id))
                  .map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.id} · CH{f.channel} · {f.category}
                    </option>
                  ))}
              </select>
            </>
          )}
        </section>
      </div>

      <div className="board2">
        <section className="panel cue-panel">
          <div className="heading">
            <div>
              <p>触发顺序</p>
              <h2>Cue列表</h2>
            </div>
            <button className="primary" onClick={addCue}>+ 新增Cue</button>
          </div>
          {warning && (
            <div className="warning">
              <span>{warning}</span>
              <button onClick={() => setWarning(null)}>知道了</button>
            </div>
          )}
          {filter !== "全部" && (
            <p className="hint">已按「{filter}」筛选：仅显示含{filter}回路的 Cue，调序已锁定。</p>
          )}
          <div className="cue-list">
            {visibleCues.length === 0 && <p className="hint">当前筛选下没有相关 Cue。</p>}
            {visibleCues.map((cue) => {
              const isActive = cue.id === activeCueId;
              const idx = cues.findIndex((c) => c.id === cue.id);
              const avg = cue.levels.length
                ? Math.round(cue.levels.reduce((s, l) => s + l.intensity, 0) / cue.levels.length)
                : 0;
              const referenced = notes.some((n) => n.cueIds.includes(cue.id));
              return (
                <article
                  key={cue.id}
                  className={isActive ? "cue-row active" : "cue-row"}
                  onClick={() => setActiveCueId(cue.id)}
                >
                  <b className="cue-order">{String(idx + 1).padStart(2, "0")}</b>
                  <div className="cue-main">
                    <h3>
                      Cue {cue.number} · {cue.name}
                      {referenced && <span className="ref-tag">被备注引用</span>}
                    </h3>
                    <p>
                      {cue.levels.length}路 · 平均{avg}%
                      {cue.note ? ` · ${cue.note}` : ""}
                    </p>
                  </div>
                  <div className="cue-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      title="上移（保留各灯通道与亮度）"
                      disabled={filter !== "全部" || idx === 0}
                      onClick={() => moveCue(cue.id, -1)}
                    >
                      ↑
                    </button>
                    <button
                      title="下移（保留各灯通道与亮度）"
                      disabled={filter !== "全部" || idx === cues.length - 1}
                      onClick={() => moveCue(cue.id, 1)}
                    >
                      ↓
                    </button>
                    <button className="danger" onClick={() => removeCue(cue)}>删除</button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="panel fixture-panel">
          <div className="heading">
            <div>
              <p>灯具</p>
              <h2>灯具编辑</h2>
            </div>
            <button onClick={addFixture}>+ 新增灯具</button>
          </div>
          {!selectedFixture ? (
            <p className="hint">在灯位图或下方列表中选择一个灯具进行编辑。</p>
          ) : (
            <>
              <div className="field-grid">
                <label>
                  <span>灯具编号</span>
                  <input
                    key={selectedFixture.id}
                    defaultValue={selectedFixture.id}
                    onBlur={(e) => {
                      if (!renameFixture(selectedFixture.id, e.target.value))
                        e.currentTarget.value = selectedFixture.id;
                    }}
                    onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                  />
                </label>
                <label>
                  <span>通道号</span>
                  <input
                    type="number"
                    value={selectedFixture.channel}
                    onChange={(e) =>
                      updateFixture(selectedFixture.id, { channel: Number(e.target.value) || 0 })
                    }
                  />
                </label>
                <label>
                  <span>类别</span>
                  <select
                    value={selectedFixture.category}
                    onChange={(e) =>
                      updateFixture(selectedFixture.id, { category: e.target.value as Category })
                    }
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>色片</span>
                  <input
                    value={selectedFixture.gel}
                    onChange={(e) => updateFixture(selectedFixture.id, { gel: e.target.value })}
                  />
                </label>
                <label>
                  <span>焦点位置</span>
                  <input
                    value={selectedFixture.focus}
                    onChange={(e) => updateFixture(selectedFixture.id, { focus: e.target.value })}
                  />
                </label>
                <label>
                  <span>亮度预设 (%)</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={selectedFixture.preset}
                    onChange={(e) =>
                      updateFixture(selectedFixture.id, {
                        preset: Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                      })
                    }
                  />
                </label>
              </div>
              <div className="fixture-actions">
                <button
                  className={selectedFixture.focusConfirmed ? "confirm-btn confirmed" : "confirm-btn"}
                  onClick={() =>
                    updateFixture(selectedFixture.id, {
                      focusConfirmed: !selectedFixture.focusConfirmed,
                    })
                  }
                >
                  {selectedFixture.focusConfirmed ? "✓ 焦点已确认" : "确认焦点"}
                </button>
                <button className="danger" onClick={() => removeFixture(selectedFixture.id)}>
                  删除灯具
                </button>
              </div>
            </>
          )}
          <div className="fixture-list">
            {visibleFixtures.map((f) => (
              <button
                key={f.id}
                className={f.id === selectedFixtureId ? "fixture-item active" : "fixture-item"}
                onClick={() => setSelectedFixtureId(f.id)}
              >
                <span className="dot" style={{ background: CATEGORY_COLORS[f.category] }} />
                {f.id} · CH{f.channel}
                {!f.focusConfirmed && <em>待确认</em>}
              </button>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

export default App;
