// 完了台帳 tasks/status/<ID>.yaml の parse と検証(純関数)。
// 依存追加を避けるため、許可キーのみの簡易 YAML parser。想定外の行は fail closed。

export type LedgerState = "merged" | "done";
export interface LedgerEntry {
  state: LedgerState;
  evidence?: string;
  recorded?: string;
}
export type Ledger = Map<string, LedgerEntry>;

export class LedgerError extends Error {}

export const LEDGER_DIR = "tasks/status";
const ALLOWED_KEYS = new Set(["state", "evidence", "recorded"]);

export function parseLedgerFile(id: string, text: string): LedgerEntry {
  const obj: Record<string, string> = {};
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const m = /^([a-z]+):\s*(.*)$/.exec(line);
    if (!m) throw new LedgerError(`${id}: 解釈できない行 "${line}"`);
    const [, key, valueRaw] = m;
    if (!ALLOWED_KEYS.has(key)) throw new LedgerError(`${id}: 未知のキー ${key}`);
    if (key in obj) throw new LedgerError(`${id}: キー重複 ${key}`);
    let value = valueRaw.replace(/\s+#.*$/, "").trim();
    if (/^".*"$/.test(value)) value = value.slice(1, -1);
    obj[key] = value;
  }
  if (obj.state !== "merged" && obj.state !== "done") {
    throw new LedgerError(`${id}: state が不正 (${obj.state ?? "なし"})`);
  }
  if (obj.state === "done" && !obj.evidence) throw new LedgerError(`${id}: done には evidence が必須`);
  return { state: obj.state, evidence: obj.evidence, recorded: obj.recorded };
}

/** ファイル名一覧 + 内容取得関数 から台帳を構築。ファイル名は <ID>.yaml で、ID は known に含まれること */
export function buildLedger(
  files: string[],
  read: (file: string) => string,
  known: ReadonlySet<string>,
): Ledger {
  const ledger: Ledger = new Map();
  for (const file of files) {
    const m = /^([^/]+)\.yaml$/.exec(file);
    if (!m) throw new LedgerError(`台帳に想定外のファイル: ${file}`);
    const id = m[1];
    if (!known.has(id)) throw new LedgerError(`台帳に未知の ID: ${id}`);
    ledger.set(id, parseLedgerFile(id, read(file)));
  }
  return ledger;
}

export function formatLedgerFile(e: LedgerEntry): string {
  const lines = [`state: ${e.state}`];
  if (e.evidence) lines.push(`evidence: "${e.evidence.replace(/"/g, "'")}"`);
  if (e.recorded) lines.push(`recorded: ${e.recorded}`);
  return lines.join("\n") + "\n";
}
