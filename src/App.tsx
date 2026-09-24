import { useMemo, useState } from "react";
import "./styles.css";
import {
  initialCues,
  initialFixtures,
  initialVersions,
  LIGHT_TYPES,
  TYPE_COLORS,
} from "./stageData";
import type { Cue, Fixture, LightType, ShowVersion } from "./stageData";

type Filter = LightType | "全部";

const FILTERS: Filter[] = ["全部", ...LIGHT_TYPES];
const ch = (n: number) => `CH${String(n).padStart(3, "0")}`;
const uid = (prefix: string) => `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`;

function App() {
  const [showName, setShowName] = useState("原创话剧《夜航》");
  const [fixtures, setFixtures] = useState<Fixture[]>(initialFixtures);
  const [cues, setCues] = useState<Cue[]>(initialCues);
  const [versions, setVersions] = useState<ShowVersion[]>(initialVersions);
  const [activeVersionId, setActiveVersionId] = useState(initialVersions[0].id);
  const [currentCueId, setCurrentCueId] = useState(initialCues[0].id);
  const [filter, setFilter] = useState<Filter>("全部");
  const [selectedFixtureId, setSelectedFixtureId] = useState(initialFixtures[0].id);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteCueIds, setNoteCueIds] = useState<string[]>([]);

  const fixtureById = useMemo(() => new Map(fixtures.map((f) => [f.id, f])), [fixtures]);

  // 筛选：只保留相关灯位与包含该类型灯具的 Cue
  const visibleFixtures =
    filter === "全部" ? fixtures : fixtures.filter((f) => f.type === filter);
  const visibleCues =
    filter === "全部"
      ? cues
      : cues.filter((c) => c.levels.some((l) => fixtureById.get(l.fixtureId)?.type === filter));

  const currentCue = cues.find((c) => c.id === currentCueId) ?? cues[0];
  const activeVersion = versions.find((v) => v.id === activeVersionId) ?? versions[0];
  const selectedFixture = fixtures.find((f) => f.id === selectedFixtureId);
  const unconfirmedCount = fixtures.filter((f) => !f.focusConfirmed).length;

  // 某条 Cue 被哪些版本备注引用
  const cueRefs = (cueId: string) =>
    versions.flatMap((v) =>
      v.notes.filter((n) => n.cueIds.includes(cueId)).map((n) => ({ versionName: v.name, note: n }))
    );

  /* ---------- 灯具 ---------- */
  const updateFixture = (id: string, patch: Partial<Fixture>) =>
    setFixtures((fs) => fs.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  const addFixture = () => {
    const nextChannel = Math.max(0, ...fixtures.map((f) => f.channel)) + 1;
    const fixture: Fixture = {
      id: uid("f"),
      label: `NEW-${String(nextChannel).padStart(2, "0")}`,
      channel: nextChannel,
      gel: "白光",
      focus: "待定",
      preset: 50,
      type: filter === "全部" ? "面光" : filter,
      x: 50,
      y: 50,
      focusConfirmed: false,
    };
    setFixtures((fs) => [...fs, fixture]);
    setSelectedFixtureId(fixture.id);
  };

  const removeFixture = (id: string) => {
    setFixtures((fs) => fs.filter((f) => f.id !== id));
    // 同步从所有 Cue 中撤下该灯的通道记录
    setCues((cs) =>
      cs.map((c) => ({ ...c, levels: c.levels.filter((l) => l.fixtureId !== id) }))
    );
    if (selectedFixtureId === id) {
      setSelectedFixtureId(fixtures.find((f) => f.id !== id)?.id ?? "");
    }
  };

  /* ---------- Cue ---------- */
  const updateCue = (id: string, patch: Partial<Cue>) =>
    setCues((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  // 调序：整条 Cue（含各灯通道与亮度）随对象一起移动
  const moveCue = (id: string, dir: -1 | 1) =>
    setCues((cs) => {
      const i = cs.findIndex((c) => c.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= cs.length) return cs;
      const next = [...cs];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const setCueLevel = (cueId: string, fixtureId: string, level: number) =>
    setCues((cs) =>
      cs.map((c) => {
        if (c.id !== cueId) return c;
        const exists = c.levels.some((l) => l.fixtureId === fixtureId);
        return {
          ...c,
          levels: exists
            ? c.levels.map((l) => (l.fixtureId === fixtureId ? { ...l, level } : l))
            : [...c.levels, { fixtureId, level }],
        };
      })
    );

  const removeCueLevel = (cueId: string, fixtureId: string) =>
    setCues((cs) =>
      cs.map((c) =>
        c.id === cueId ? { ...c, levels: c.levels.filter((l) => l.fixtureId !== fixtureId) } : c
      )
    );

  const addCue = () => {
    const cue: Cue = { id: uid("c"), name: `Cue ${cues.length + 1} · 新场景`, scene: "未命名场次", levels: [] };
    setCues((cs) => [...cs, cue]);
    setCurrentCueId(cue.id);
  };

  // 解除所有版本备注对该 Cue 的引用
  const dereferenceCue = (cueId: string) =>
    setVersions((vs) =>
      vs.map((v) => ({
        ...v,
        notes: v.notes.map((n) => ({ ...n, cueIds: n.cueIds.filter((id) => id !== cueId) })),
      }))
    );

  const deleteCue = (cueId: string) => {
    if (cueRefs(cueId).length > 0) return; // 仍有引用时不允许移除
    const rest = cues.filter((c) => c.id !== cueId);
    setCues(rest);
    setPendingDeleteId(null);
    if (currentCueId === cueId) setCurrentCueId(rest[0]?.id ?? "");
  };

  /* ---------- 版本备注 ---------- */
  const addNote = () => {
    const text = noteDraft.trim();
    if (!text) return;
    setVersions((vs) =>
      vs.map((v) =>
        v.id === activeVersionId
          ? { ...v, notes: [...v.notes, { id: uid("n"), text, cueIds: noteCueIds }] }
          : v
      )
    );
    setNoteDraft("");
    setNoteCueIds([]);
  };

  const removeNote = (noteId: string) =>
    setVersions((vs) =>
      vs.map((v) => ({ ...v, notes: v.notes.filter((n) => n.id !== noteId) }))
    );

  const jumpToCue = (cueId: string) => {
    setFilter("全部");
    setCurrentCueId(cueId);
  };

  /* ---------- 展示辅助 ---------- */
  const summarizeCue = (cue: Cue) => {
    const parts = cue.levels
      .map((l) => {
        const f = fixtureById.get(l.fixtureId);
        if (!f || (filter !== "全部" && f.type !== filter)) return null;
        return `${ch(f.channel)} ${l.level}%`;
      })
      .filter((s): s is string => s !== null);
    if (parts.length === 0) return filter === "全部" ? "未设置通道" : `无${filter}通道`;
    const head = parts.slice(0, 4).join(" · ");
    return parts.length > 4 ? `${head} 等${parts.length}路` : head;
  };

  const sceneFixtures = (
    filter === "全部" ? fixtures : fixtures.filter((f) => f.type === filter)
  )
    .slice()
    .sort((a, b) => a.channel - b.channel);

  return (
    <main className="app">
      <section className="hero">
        <p>hxyfront-62002 · 剧场灯光 · 排练模式</p>
        <h1>剧场灯光Cue表管理</h1>
        <label className="show-name">
          <span>演出名称</span>
          <input value={showName} onChange={(e) => setShowName(e.target.value)} />
        </label>
        <span className="hero-sub">
          灯位、Cue 与演出版本备注已联动：修改灯具或 Cue 会同步更新舞台灯位图与当前场景预览。
        </span>
      </section>

      <section className="metrics">
        <article>
          <small>灯具数量</small>
          <strong>{fixtures.length}</strong>
        </article>
        <article>
          <small>Cue数量</small>
          <strong>{cues.length}</strong>
        </article>
        <article>
          <small>当前场景</small>
          <strong className="metric-text">{currentCue ? currentCue.name : "—"}</strong>
        </article>
        <article className={unconfirmedCount > 0 ? "warn" : ""}>
          <small>待确认焦点</small>
          <strong>{unconfirmedCount}</strong>
        </article>
      </section>

      <div className="board">
        {/* 左列：筛选 + 版本备注 */}
        <div className="col-side">
          <aside className="panel">
            <h2>灯光类型筛选</h2>
            <div className="chips">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  className={filter === f ? "active" : ""}
                  onClick={() => setFilter(f)}
                >
                  {f}
                  {f !== "全部" && <em>{fixtures.filter((x) => x.type === f).length}</em>}
                </button>
              ))}
            </div>
            <p className="hint">
              {filter === "全部"
                ? "当前显示全部灯位与 Cue。"
                : `已按「${filter}」筛选：灯位图与 Cue 列表仅显示相关项。`}
            </p>
          </aside>

          <section className="panel">
            <div className="heading">
              <div>
                <p>演出版本</p>
                <h2>版本备注</h2>
              </div>
            </div>
            <div className="tabs">
              {versions.map((v) => (
                <button
                  key={v.id}
                  className={v.id === activeVersionId ? "active" : ""}
                  onClick={() => setActiveVersionId(v.id)}
                >
                  {v.name}
                </button>
              ))}
            </div>
            <div className="notes">
              {activeVersion.notes.length === 0 && <p className="empty">该版本暂无备注</p>}
              {activeVersion.notes.map((n) => (
                <article key={n.id}>
                  <p>{n.text}</p>
                  <div className="note-refs">
                    {n.cueIds.map((id) => {
                      const cue = cues.find((c) => c.id === id);
                      return cue ? (
                        <button key={id} className="ref-chip" onClick={() => jumpToCue(id)}>
                          {cue.name}
                        </button>
                      ) : null;
                    })}
                    <button className="icon danger-text" title="删除备注" onClick={() => removeNote(n.id)}>
                      ×
                    </button>
                  </div>
                </article>
              ))}
            </div>
            <div className="note-form">
              <textarea
                value={noteDraft}
                placeholder="记录排练调整，可勾选关联相关 Cue…"
                onChange={(e) => setNoteDraft(e.target.value)}
              />
              <div className="note-cue-picker">
                {cues.map((c) => (
                  <label key={c.id} className="check">
                    <input
                      type="checkbox"
                      checked={noteCueIds.includes(c.id)}
                      onChange={(e) =>
                        setNoteCueIds((ids) =>
                          e.target.checked ? [...ids, c.id] : ids.filter((id) => id !== c.id)
                        )
                      }
                    />
                    <span>{c.name}</span>
                  </label>
                ))}
              </div>
              <button className="primary" onClick={addNote} disabled={!noteDraft.trim()}>
                添加备注到{activeVersion.name}
              </button>
            </div>
          </section>
        </div>

        {/* 中列：灯位图 + 当前场景 */}
        <div className="col-center">
          <section className="panel">
            <div className="heading">
              <div>
                <p>舞台平面</p>
                <h2>灯位图</h2>
              </div>
              {filter !== "全部" && <span className="tag">仅显示{filter}</span>}
            </div>
            <svg viewBox="0 0 100 126" className="stage-plot" role="img" aria-label="舞台灯位图">
              <rect x="2" y="4" width="96" height="98" rx="2" className="stage-floor" />
              <line x1="2" y1="104" x2="98" y2="104" className="proscenium" />
              <text x="50" y="10" className="zone-label">天幕 · 舞台后区</text>
              <text x="50" y="99.5" className="zone-label">台口 · 舞台前区</text>
              <rect x="2" y="106" width="96" height="16" rx="2" className="auditorium" />
              <text x="50" y="119" className="zone-label">观众席 · 面光桥</text>
              {visibleFixtures.map((f) => {
                const level = currentCue?.levels.find((l) => l.fixtureId === f.id)?.level ?? 0;
                const color = TYPE_COLORS[f.type];
                return (
                  <g
                    key={f.id}
                    transform={`translate(${f.x} ${f.y})`}
                    className="fixture-node"
                    onClick={() => setSelectedFixtureId(f.id)}
                  >
                    {level > 0 && (
                      <circle r={4 + (level / 100) * 5} fill={color} opacity={0.15 + (level / 100) * 0.3} />
                    )}
                    <circle
                      r="3"
                      fill={level > 0 ? color : "#1e293b"}
                      stroke={color}
                      strokeWidth="1.1"
                    />
                    {!f.focusConfirmed && (
                      <circle r="4.6" fill="none" stroke="#fb7185" strokeWidth="0.7" strokeDasharray="1.6 1.4" />
                    )}
                    {selectedFixtureId === f.id && (
                      <circle r="6.2" fill="none" stroke="#f8fafc" strokeWidth="0.6" />
                    )}
                    <text y="9.5" className="fixture-label">
                      {f.label}
                      {level > 0 ? ` ${level}%` : ""}
                    </text>
                  </g>
                );
              })}
            </svg>
            <div className="legend">
              {LIGHT_TYPES.map((t) => (
                <span key={t}>
                  <i style={{ background: TYPE_COLORS[t] }} />
                  {t}
                </span>
              ))}
              <span>
                <i className="dash" />
                虚线圈 = 焦点待确认
              </span>
            </div>
          </section>

          <section className="panel">
            <div className="heading">
              <div>
                <p>当前场景预览</p>
                <h2>{currentCue ? currentCue.name : "暂无 Cue"}</h2>
              </div>
              {filter !== "全部" && <span className="tag">仅显示{filter}通道</span>}
            </div>
            {currentCue ? (
              <>
                <div className="cue-meta-edit">
                  <label>
                    <span>Cue名称</span>
                    <input
                      value={currentCue.name}
                      onChange={(e) => updateCue(currentCue.id, { name: e.target.value })}
                    />
                  </label>
                  <label>
                    <span>场次/说明</span>
                    <input
                      value={currentCue.scene}
                      onChange={(e) => updateCue(currentCue.id, { scene: e.target.value })}
                    />
                  </label>
                </div>
                <div className="levels">
                  {sceneFixtures.map((f) => {
                    const lv = currentCue.levels.find((l) => l.fixtureId === f.id);
                    return (
                      <div className="level-row" key={f.id}>
                        <button className="level-name" onClick={() => setSelectedFixtureId(f.id)}>
                          <i style={{ background: TYPE_COLORS[f.type] }} />
                          {f.label}
                          <em>{ch(f.channel)}</em>
                        </button>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={lv?.level ?? 0}
                          onChange={(e) => setCueLevel(currentCue.id, f.id, Number(e.target.value))}
                        />
                        <span className={lv ? "level-val" : "level-val off"}>
                          {lv ? `${lv.level}%` : "未加入"}
                        </span>
                        {lv ? (
                          <button
                            className="icon"
                            title="从该 Cue 移除"
                            onClick={() => removeCueLevel(currentCue.id, f.id)}
                          >
                            ×
                          </button>
                        ) : (
                          <button
                            className="icon"
                            title={`按预设 ${f.preset}% 加入`}
                            onClick={() => setCueLevel(currentCue.id, f.id, f.preset)}
                          >
                            ＋
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="hint">拖动亮度即写入该 Cue，灯位图光晕同步变化；「＋」按灯具亮度预设加入。</p>
              </>
            ) : (
              <p className="empty">还没有 Cue，请在右侧「新增Cue」。</p>
            )}
          </section>
        </div>

        {/* 右列：Cue 列表 + 灯具编辑 */}
        <div className="col-right">
          <section className="panel">
            <div className="heading">
              <div>
                <p>触发顺序</p>
                <h2>Cue列表</h2>
              </div>
              <button className="primary" onClick={addCue}>
                新增Cue
              </button>
            </div>
            <div className="cue-list">
              {visibleCues.length === 0 && (
                <p className="empty">
                  {filter === "全部" ? "暂无 Cue，点击「新增Cue」创建。" : `没有包含「${filter}」灯具的 Cue。`}
                </p>
              )}
              {visibleCues.map((c) => {
                const order = cues.findIndex((x) => x.id === c.id) + 1;
                const refs = cueRefs(c.id);
                const isPending = pendingDeleteId === c.id;
                return (
                  <article
                    key={c.id}
                    className={`cue-item${c.id === currentCue?.id ? " current" : ""}`}
                  >
                    <div className="cue-row" onClick={() => setCurrentCueId(c.id)}>
                      <b>{String(order).padStart(2, "0")}</b>
                      <div className="cue-info">
                        <h3>
                          {c.name}
                          {refs.length > 0 && <span className="ref-badge">备注引用 {refs.length}</span>}
                        </h3>
                        <p>
                          {c.scene} · {summarizeCue(c)}
                        </p>
                      </div>
                      <div className="cue-actions" onClick={(e) => e.stopPropagation()}>
                        <button title="上移" disabled={order === 1} onClick={() => moveCue(c.id, -1)}>
                          ↑
                        </button>
                        <button
                          title="下移"
                          disabled={order === cues.length}
                          onClick={() => moveCue(c.id, 1)}
                        >
                          ↓
                        </button>
                        <button
                          className="danger"
                          onClick={() => setPendingDeleteId(isPending ? null : c.id)}
                        >
                          移除
                        </button>
                      </div>
                    </div>
                    {isPending && (
                      <div className="ref-warning">
                        {refs.length > 0 ? (
                          <>
                            <p>该 Cue 被以下演出版本备注引用，需先解除引用才能移除：</p>
                            <ul>
                              {refs.map((r) => (
                                <li key={r.note.id}>
                                  <b>{r.versionName}</b>：{r.note.text}
                                </li>
                              ))}
                            </ul>
                            <div className="row-actions">
                              <button className="primary" onClick={() => dereferenceCue(c.id)}>
                                解除全部引用
                              </button>
                              <button onClick={() => setPendingDeleteId(null)}>取消</button>
                            </div>
                          </>
                        ) : (
                          <>
                            <p>无备注引用，可安全移除（该 Cue 的各灯通道与亮度记录将一并删除）。</p>
                            <div className="row-actions">
                              <button className="danger" onClick={() => deleteCue(c.id)}>
                                确认移除
                              </button>
                              <button onClick={() => setPendingDeleteId(null)}>取消</button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>

          <section className="panel">
            <div className="heading">
              <div>
                <p>灯位与属性</p>
                <h2>灯具编辑</h2>
              </div>
              <button className="primary" onClick={addFixture}>
                新增灯具
              </button>
            </div>
            <div className="fixture-list">
              {visibleFixtures.map((f) => (
                <button
                  key={f.id}
                  className={f.id === selectedFixtureId ? "sel" : ""}
                  onClick={() => setSelectedFixtureId(f.id)}
                >
                  <i style={{ background: TYPE_COLORS[f.type] }} />
                  {f.label}
                  {!f.focusConfirmed && <em>待确认</em>}
                </button>
              ))}
            </div>
            {selectedFixture ? (
              <div className="field-grid">
                <label>
                  <span>灯具编号</span>
                  <input
                    value={selectedFixture.label}
                    onChange={(e) => updateFixture(selectedFixture.id, { label: e.target.value })}
                  />
                </label>
                <label>
                  <span>通道号</span>
                  <input
                    type="number"
                    min={0}
                    value={selectedFixture.channel}
                    onChange={(e) =>
                      updateFixture(selectedFixture.id, { channel: Number(e.target.value) || 0 })
                    }
                  />
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
                  <span>亮度预设 {selectedFixture.preset}%</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={selectedFixture.preset}
                    onChange={(e) =>
                      updateFixture(selectedFixture.id, { preset: Number(e.target.value) })
                    }
                  />
                </label>
                <label>
                  <span>灯光类型</span>
                  <select
                    value={selectedFixture.type}
                    onChange={(e) =>
                      updateFixture(selectedFixture.id, { type: e.target.value as LightType })
                    }
                  >
                    {LIGHT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>灯位横向 X（{selectedFixture.x}）</span>
                  <input
                    type="range"
                    min={4}
                    max={96}
                    value={selectedFixture.x}
                    onChange={(e) => updateFixture(selectedFixture.id, { x: Number(e.target.value) })}
                  />
                </label>
                <label>
                  <span>灯位纵向 Y（{selectedFixture.y}）</span>
                  <input
                    type="range"
                    min={6}
                    max={120}
                    value={selectedFixture.y}
                    onChange={(e) => updateFixture(selectedFixture.id, { y: Number(e.target.value) })}
                  />
                </label>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={selectedFixture.focusConfirmed}
                    onChange={(e) =>
                      updateFixture(selectedFixture.id, { focusConfirmed: e.target.checked })
                    }
                  />
                  <span>焦点已确认（未确认计入「待确认焦点」）</span>
                </label>
                <button className="danger" onClick={() => removeFixture(selectedFixture.id)}>
                  删除灯具（同步撤出所有 Cue）
                </button>
              </div>
            ) : (
              <p className="empty">请选择或新增灯具。</p>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

export default App;
