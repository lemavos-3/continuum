import type { Language } from "@/contexts/LanguageContext";

export type LangDict = Record<string, string>;
export type Module = Record<Language, LangDict>;

import * as insights from "./insights";
import * as billing from "./billing";
import * as entity from "./entity";
import * as editor from "./editor";
import * as time from "./time";
import * as graph from "./graph";
import * as misc from "./misc";

const modules: Module[] = [
  insights.dict,
  billing.dict,
  entity.dict,
  editor.dict,
  time.dict,
  graph.dict,
  misc.dict,
];

export function mergeModules(lang: Language): LangDict {
  const out: LangDict = {};
  for (const m of modules) Object.assign(out, m[lang] ?? {});
  return out;
}
