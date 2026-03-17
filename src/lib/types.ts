export interface Person {
  id: string;
  name: string;
  isRegistered?: boolean; // CLT registrado - já recebe almoço seg-sex
}

export interface TimeEntry {
  id: string;
  personId: string;
  jobId: string;
  date: string; // YYYY-MM-DD
  entry1: string; // HH:mm
  exit1: string;
  entry2: string;
  exit2: string;
  entry3: string; // dinner period (optional)
  exit3: string;
}

export type MealType = "cafe" | "almoco" | "janta";

export type BrazilState =
  | "AC" | "AL" | "AP" | "AM" | "BA" | "CE" | "DF" | "ES" | "GO"
  | "MA" | "MG" | "MS" | "MT" | "PA" | "PB" | "PE" | "PI" | "PR"
  | "RJ" | "RN" | "RO" | "RR" | "RS" | "SC" | "SE" | "SP" | "TO";

export type SPRegion = "capital" | "interior";

export interface MealRequest {
  id: string;
  personId: string;
  jobId: string;
  meals: MealType[];
  startDate: string;
  endDate: string;
  state?: BrazilState;
  spRegion?: SPRegion;
}

export interface FoodControlEntry {
  personId: string;
  jobId: string;
  date: string;
  requestedCafe: boolean;
  requestedAlmoco: boolean;
  requestedJanta: boolean;
  usedCafe: boolean;
  usedAlmoco: boolean;
  usedJanta: boolean;
}

export interface DiscountConfirmation {
  personId: string;
  confirmed: boolean;
}

export interface Job {
  id: string;
  name: string;
}

export const BRAZIL_STATES: { value: BrazilState; label: string }[] = [
  { value: "AC", label: "Acre" }, { value: "AL", label: "Alagoas" },
  { value: "AP", label: "Amapá" }, { value: "AM", label: "Amazonas" },
  { value: "BA", label: "Bahia" }, { value: "CE", label: "Ceará" },
  { value: "DF", label: "Distrito Federal" }, { value: "ES", label: "Espírito Santo" },
  { value: "GO", label: "Goiás" }, { value: "MA", label: "Maranhão" },
  { value: "MG", label: "Minas Gerais" }, { value: "MS", label: "Mato Grosso do Sul" },
  { value: "MT", label: "Mato Grosso" }, { value: "PA", label: "Pará" },
  { value: "PB", label: "Paraíba" }, { value: "PE", label: "Pernambuco" },
  { value: "PI", label: "Piauí" }, { value: "PR", label: "Paraná" },
  { value: "RJ", label: "Rio de Janeiro" }, { value: "RN", label: "Rio Grande do Norte" },
  { value: "RO", label: "Rondônia" }, { value: "RR", label: "Roraima" },
  { value: "RS", label: "Rio Grande do Sul" }, { value: "SC", label: "Santa Catarina" },
  { value: "SE", label: "Sergipe" }, { value: "SP", label: "São Paulo" },
  { value: "TO", label: "Tocantins" },
];

export const SAMPLE_PEOPLE: Person[] = [
  { id: "1", name: "Carlos Silva", isRegistered: false },
  { id: "2", name: "Ana Santos", isRegistered: true },
  { id: "3", name: "Roberto Lima", isRegistered: false },
  { id: "4", name: "Maria Oliveira", isRegistered: true },
  { id: "5", name: "João Ferreira", isRegistered: false },
];

export const SAMPLE_JOBS: Job[] = [
  { id: "j1", name: "JOB-001 - Montagem Estrutural" },
  { id: "j2", name: "JOB-002 - Montagem Elétrica" },
  { id: "j3", name: "JOB-003 - Montagem Mecânica" },
];

export const MEAL_LABELS: Record<MealType, string> = {
  cafe: "Café da Manhã",
  almoco: "Almoço",
  janta: "Janta",
};

export const MEAL_VALUES: Record<MealType, number> = {
  cafe: 15.0,
  almoco: 32.0,
  janta: 32.0,
};

export function calcTimeDiffMinutes(start: string, end: string): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

export function calcTotalMinutes(entry: TimeEntry): number {
  const p1 = calcTimeDiffMinutes(entry.entry1, entry.exit1);
  const p2 = calcTimeDiffMinutes(entry.entry2, entry.exit2);
  const p3 = calcTimeDiffMinutes(entry.entry3, entry.exit3);
  return Math.max(0, p1) + Math.max(0, p2) + Math.max(0, p3);
}

export function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function getDatesInRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const current = new Date(start + "T12:00:00");
  const last = new Date(end + "T12:00:00");
  while (current <= last) {
    dates.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

export function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr + "T12:00:00");
  return d.getDay() === 0 || d.getDay() === 6;
}

export function getFirstEntryTime(entry: TimeEntry): string | null {
  if (entry.entry1) return entry.entry1;
  if (entry.entry2) return entry.entry2;
  if (entry.entry3) return entry.entry3;
  return null;
}

export function getLastExitTime(entry: TimeEntry): string | null {
  if (entry.exit3) return entry.exit3;
  if (entry.exit2) return entry.exit2;
  if (entry.exit1) return entry.exit1;
  return null;
}

// Determine used meals based on work hours
export function determineMealsUsed(entry: TimeEntry): { cafe: boolean; almoco: boolean; janta: boolean } {
  const firstEntry = getFirstEntryTime(entry);
  const lastExit = getLastExitTime(entry);
  if (!firstEntry || !lastExit) return { cafe: false, almoco: false, janta: false };

  const [eh] = firstEntry.split(":").map(Number);
  const [lh, lm] = lastExit.split(":").map(Number);
  const lastExitMinutes = lh * 60 + lm;

  return {
    cafe: eh <= 8, // entered at or before 8am = used breakfast
    almoco: lastExitMinutes > 12 * 60, // left after 12:00 = used lunch
    janta: lastExitMinutes > 19 * 60, // left after 19:00 = used dinner
  };
}
