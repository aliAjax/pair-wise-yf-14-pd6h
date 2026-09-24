export type LightType = "面光" | "侧光" | "逆光" | "效果光";

export interface Fixture {
  id: string;
  label: string; // 灯具编号
  channel: number; // 通道号
  gel: string; // 色片
  focus: string; // 焦点位置
  preset: number; // 亮度预设 0-100
  type: LightType;
  x: number; // 灯位图横向坐标（0-100）
  y: number; // 灯位图纵向坐标（舞台 4-102，观众席面光桥 106-122）
  focusConfirmed: boolean; // 焦点是否已确认
}

export interface CueLevel {
  fixtureId: string;
  level: number; // 该灯在此 Cue 中的亮度 0-100
}

export interface Cue {
  id: string;
  name: string;
  scene: string; // 场次/说明
  levels: CueLevel[];
}

export interface VersionNote {
  id: string;
  text: string;
  cueIds: string[]; // 备注引用的 Cue
}

export interface ShowVersion {
  id: string;
  name: string;
  notes: VersionNote[];
}

export const LIGHT_TYPES: LightType[] = ["面光", "侧光", "逆光", "效果光"];

export const TYPE_COLORS: Record<LightType, string> = {
  面光: "#f59e0b",
  侧光: "#06b6d4",
  逆光: "#7c3aed",
  效果光: "#f43f5e",
};

export const initialFixtures: Fixture[] = [
  { id: "f1", label: "FOH-01", channel: 1, gel: "R02 浅粉", focus: "舞台中前区", preset: 80, type: "面光", x: 30, y: 114, focusConfirmed: true },
  { id: "f2", label: "FOH-02", channel: 2, gel: "R02 浅粉", focus: "舞台中前区", preset: 80, type: "面光", x: 50, y: 114, focusConfirmed: true },
  { id: "f3", label: "FOH-03", channel: 3, gel: "L203 琥珀", focus: "观众席门口", preset: 60, type: "面光", x: 70, y: 114, focusConfirmed: false },
  { id: "f4", label: "SL-01", channel: 11, gel: "R80 冷蓝", focus: "左侧翼低位", preset: 65, type: "侧光", x: 7, y: 36, focusConfirmed: true },
  { id: "f5", label: "SL-02", channel: 12, gel: "R80 冷蓝", focus: "右侧翼低位", preset: 65, type: "侧光", x: 93, y: 36, focusConfirmed: true },
  { id: "f6", label: "SL-03", channel: 13, gel: "R80 冷蓝", focus: "左侧翼高位", preset: 65, type: "侧光", x: 7, y: 66, focusConfirmed: true },
  { id: "f7", label: "SL-04", channel: 14, gel: "R80 冷蓝", focus: "右侧翼高位", preset: 65, type: "侧光", x: 93, y: 66, focusConfirmed: false },
  { id: "f8", label: "BL-01", channel: 21, gel: "G105 紫", focus: "天幕前区", preset: 75, type: "逆光", x: 35, y: 12, focusConfirmed: true },
  { id: "f9", label: "BL-02", channel: 22, gel: "G105 紫", focus: "天幕前区", preset: 75, type: "逆光", x: 65, y: 12, focusConfirmed: true },
  { id: "f10", label: "FX-01", channel: 31, gel: "白光", focus: "追光位", preset: 90, type: "效果光", x: 50, y: 30, focusConfirmed: true },
  { id: "f11", label: "FX-02", channel: 32, gel: "R26 红", focus: "舞台后区", preset: 70, type: "效果光", x: 72, y: 52, focusConfirmed: false },
];

export const initialCues: Cue[] = [
  {
    id: "c1",
    name: "Cue 1 · 开场暖场",
    scene: "一幕开场",
    levels: [
      { fixtureId: "f1", level: 80 },
      { fixtureId: "f2", level: 80 },
      { fixtureId: "f3", level: 60 },
    ],
  },
  {
    id: "c2",
    name: "Cue 2 · 冷蓝侧光",
    scene: "二幕开场",
    levels: [
      { fixtureId: "f4", level: 65 },
      { fixtureId: "f5", level: 65 },
      { fixtureId: "f6", level: 65 },
      { fixtureId: "f7", level: 65 },
      { fixtureId: "f8", level: 40 },
    ],
  },
  {
    id: "c3",
    name: "Cue 3 · 追光入场",
    scene: "二幕中",
    levels: [
      { fixtureId: "f10", level: 90 },
      { fixtureId: "f3", level: 50 },
    ],
  },
  {
    id: "c4",
    name: "Cue 4 · 逆光剪影",
    scene: "三幕独白",
    levels: [
      { fixtureId: "f8", level: 85 },
      { fixtureId: "f9", level: 85 },
      { fixtureId: "f5", level: 30 },
    ],
  },
  {
    id: "c5",
    name: "Cue 5 · 暖色谢幕",
    scene: "谢幕",
    levels: [
      { fixtureId: "f1", level: 80 },
      { fixtureId: "f2", level: 80 },
      { fixtureId: "f3", level: 80 },
      { fixtureId: "f4", level: 50 },
      { fixtureId: "f5", level: 50 },
      { fixtureId: "f8", level: 60 },
      { fixtureId: "f9", level: 60 },
      { fixtureId: "f11", level: 70 },
    ],
  },
];

export const initialVersions: ShowVersion[] = [
  {
    id: "vA",
    name: "版本A · 首演",
    notes: [
      { id: "n1", text: "二幕开场色温偏冷，侧光整体再压 5%，首演先保持现状。", cueIds: ["c2"] },
      { id: "n2", text: "追光入场需演员走位确认后再定焦，FOH-03 暂缓升亮。", cueIds: ["c3"] },
    ],
  },
  {
    id: "vB",
    name: "版本B · 巡演",
    notes: [
      { id: "n3", text: "谢幕全台面光 80%，巡演场地顶棚低，统一降 10% 执行。", cueIds: ["c5"] },
      { id: "n4", text: "开场暖场延长 8 秒，观众入场完毕再切冷蓝侧光。", cueIds: ["c1", "c2"] },
    ],
  },
];
