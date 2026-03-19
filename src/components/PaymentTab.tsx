import { useState, useMemo, Fragment } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, ChevronDown, ChevronRight, Filter } from "lucide-react";
import {
  type Person,
  type Job,
  type MealRequest,
  type TimeEntry,
  type PaymentConfirmation,
  MEAL_LABELS,
  getDatesInRange,
  getMealValue,
  calculatePersonBalance,
  type FoodControlEntry,
  type DiscountConfirmation,
} from "@/lib/types";


interface PaymentTabProps {
  people: Person[];
  jobs: Job[];
  requests: MealRequest[];
  timeEntries: TimeEntry[];
  foodControl: FoodControlEntry[];
  confirmations: (DiscountConfirmation | PaymentConfirmation)[];
  onUpdateConfirmation: (conf: PaymentConfirmation) => void;
  onRemoveConfirmation?: (id: string) => void;
}

const PaymentTab = ({
  people,
  jobs,
  requests,
  timeEntries,
  foodControl,
  confirmations,
  onUpdateConfirmation,
  onRemoveConfirmation,
}: PaymentTabProps) => {

  const [filterJob, setFilterJob] = useState("all");
  const [expandedRequests, setExpandedRequests] = useState<Set<string>>(new Set());

  const getPersonName = (id: string) => people.find((p) => p.id === id)?.name || "—";
  const getJobName = (id: string) => jobs.find((j) => j.id === id)?.name || "—";

  // Only show requests that have at least one time entry registered
  const registeredRequests = useMemo(() => {
    return requests.filter((req) => {
      const dates = getDatesInRange(req.startDate, req.endDate);
      return dates.some((date) =>
        timeEntries.some((e) => e.personId === req.personId && e.jobId === req.jobId && e.date === date)
      );
    });
  }, [requests, timeEntries]);

  const filteredRequests = filterJob === "all"
    ? registeredRequests
    : registeredRequests.filter((r) => r.jobId === filterJob);

  // Group by job
  const groupedByJob = useMemo(() => {
    const map = new Map<string, typeof filteredRequests>();
    filteredRequests.forEach((req) => {
      const arr = map.get(req.jobId) || [];
      arr.push(req);
      map.set(req.jobId, arr);
    });
    return map;
  }, [filteredRequests]);

  const toggleRequest = (id: string) => {
    setExpandedRequests((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getConfirmation = (id: string) => confirmations.find((c) => 'id' in c && c.id === id) as PaymentConfirmation | undefined;


  const confirmPayment = (id: string, type: "request" | "job", paymentDate: string) => {
    const conf: PaymentConfirmation = { id, type, paymentDate, confirmed: true };
    onUpdateConfirmation(conf);

    // If all requests for this job are now confirmed, maybe confirm the job too?
    // User wants: "quando todos os funcionários estiverem pagos o geral fique como pago e registre o pagamento do último que foi dado como pago"
    if (type === "request") {
      const req = requests.find(r => r.id === id);
      if (req) {
        const jobReqs = registeredRequests.filter(r => r.jobId === req.jobId);
        const otherReqsConfirmed = jobReqs.every(r => r.id === id || getConfirmation(r.id)?.confirmed);
        if (otherReqsConfirmed) {
          onUpdateConfirmation({ id: `job-${req.jobId}`, type: "job", paymentDate, confirmed: true });
        }
      }
    }
  };

  const updatePaymentDate = (id: string, type: "request" | "job", date: string) => {
     onUpdateConfirmation({ id, type, paymentDate: date, confirmed: getConfirmation(id)?.confirmed || false });
  };

  const removeConfirmation = (id: string) => {
    // We don't have a direct remove mutation in the current useDatabase for paymentConfirmations but we can set confirmed to false
    const existing = getConfirmation(id);
    if (existing) {
      onUpdateConfirmation({ ...existing, confirmed: false });
    }
  };

  const calcRequestTotal = (req: MealRequest) => {
    const person = people.find((p) => p.id === req.personId);
    const dates = getDatesInRange(req.startDate, req.endDate);
    let total = 0;
    dates.forEach((date) => {
      const dayMeals = req.dailyOverrides?.[date] ?? req.meals;
      dayMeals.forEach((m) => { total += getMealValue(m, date, person); });
    });
    return total;
  };


  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Registro de pagamentos das solicitações de refeições. Confirme o pagamento por solicitação individual ou por job completo.
      </p>

      {/* Filter */}
      <div className="flex flex-wrap gap-3 items-end p-3 rounded-lg border border-border bg-muted/30">
        <Filter className="h-4 w-4 text-muted-foreground mt-1" />
        <div className="min-w-[200px]">
          <label className="text-2xs uppercase tracking-wider font-medium text-muted-foreground block mb-1.5">
            Filtrar Job
          </label>
          <Select value={filterJob} onValueChange={setFilterJob}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {jobs.map((j) => (
                <SelectItem key={j.id} value={j.id}>{j.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Job groups */}
      {groupedByJob.size === 0 ? (
        <div className="rounded-xl border border-border py-10 text-center text-sm text-muted-foreground shadow-card">
          Nenhuma solicitação registrada no registro de horas ainda.
        </div>
      ) : (
        Array.from(groupedByJob.entries()).map(([jobId, jobReqs]) => {
          const jobTotal = jobReqs.reduce((s, r) => s + calcRequestTotal(r), 0);
          const jobConf = getConfirmation(`job-${jobId}`);
          const allRequestsConfirmed = jobReqs.every((r) => getConfirmation(r.id)?.confirmed);

          return (
            <div key={jobId} className="rounded-xl border border-border overflow-hidden shadow-card">
              {/* Job header */}
              <div className="flex items-center justify-between px-4 py-3 bg-muted/50">
                <div>
                  <span className="font-semibold text-foreground text-sm">{getJobName(jobId)}</span>
                  <span className="ml-3 text-xs text-muted-foreground">{jobReqs.length} solicitação(ões)</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="tabular-nums font-bold text-primary">R$ {jobTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Job-level payment confirmation */}
              <div className="flex items-center gap-3 px-4 py-2 bg-muted/20 border-b border-border">
                <label className="text-2xs uppercase tracking-wider font-medium text-muted-foreground">
                  Pagamento do Job:
                </label>
                <Input
                  type="date"
                  disabled={jobConf?.confirmed}
                  value={jobConf?.paymentDate || ""}
                  onChange={(e) => updatePaymentDate(`job-${jobId}`, "job", e.target.value)}
                  className="h-7 text-xs tabular-nums w-[150px]"
                />
                {jobConf?.confirmed ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-2xs bg-green-500/10 text-green-600 border-green-200">✓ Pago</Badge>
                    <Button size="sm" variant="ghost" className="h-7 text-2xs text-muted-foreground" onClick={() => removeConfirmation(`job-${jobId}`)}>
                      Estornar
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    disabled={!jobConf?.paymentDate}
                    onClick={() => confirmPayment(`job-${jobId}`, "job", jobConf?.paymentDate || "")}
                  >
                    <Check className="h-3 w-3" /> Confirmar Pagamento
                  </Button>
                )}
                {(!jobConf?.confirmed && allRequestsConfirmed) && (
                  <Badge variant="secondary" className="text-2xs bg-blue-500/10 text-blue-600 border-blue-200">✓ Todos Func. Pagos</Badge>
                )}
              </div>

              {/* Individual requests */}
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30">
                    <th className="text-left px-3 py-2 text-2xs uppercase tracking-wider font-medium text-muted-foreground">Pessoa</th>
                    <th className="text-left px-3 py-2 text-2xs uppercase tracking-wider font-medium text-muted-foreground">Estado</th>
                    <th className="text-left px-3 py-2 text-2xs uppercase tracking-wider font-medium text-muted-foreground">Refeições</th>
                    <th className="text-left px-3 py-2 text-2xs uppercase tracking-wider font-medium text-muted-foreground">Período</th>
                    <th className="text-right px-3 py-2 text-2xs uppercase tracking-wider font-medium text-muted-foreground">Dias</th>
                    <th className="text-right px-3 py-2 text-2xs uppercase tracking-wider font-medium text-primary">Valor (R$)</th>
                    <th className="text-center px-3 py-2 text-2xs uppercase tracking-wider font-medium text-muted-foreground">Pagamento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {jobReqs.map((req) => {
                    const person = people.find((p) => p.id === req.personId);
                    const dates = getDatesInRange(req.startDate, req.endDate);
                    const days = dates.length;
                    const total = calcRequestTotal(req);
                    const reqConf = getConfirmation(req.id);
                    const isExpanded = expandedRequests.has(req.id);
                    const isPaid = reqConf?.confirmed || jobConf?.confirmed;

                    return (
                      <Fragment key={req.id}>
                        <tr className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => toggleRequest(req.id)}>
                          <td className="px-3 py-2 font-medium text-foreground flex items-center gap-2">
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            {getPersonName(req.personId)}
                          </td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">{req.location || "—"}</td>
                          <td className="px-3 py-2">
                            <div className="flex gap-1 flex-wrap">
                              {req.meals.map((m) => (
                                <Badge key={m} variant="secondary" className="text-2xs">{MEAL_LABELS[m]}</Badge>
                              ))}
                            </div>
                          </td>
                          <td className="px-3 py-2 tabular-nums text-muted-foreground text-xs">
                            {req.startDate.split("-").reverse().join("/")} — {req.endDate.split("-").reverse().join("/")}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">{days}</td>
                          <td className="px-3 py-2 text-right tabular-nums font-semibold text-primary">{total.toFixed(2)}</td>
                          <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-2 justify-center">
                              <Input
                                type="date"
                                disabled={isPaid}
                                value={reqConf?.paymentDate || jobConf?.paymentDate || ""}
                                onChange={(e) => updatePaymentDate(req.id, "request", e.target.value)}
                                className="h-7 text-xs tabular-nums w-[130px]"
                              />
                              {isPaid ? (
                                <Badge variant="secondary" className="text-2xs bg-green-500/10 text-green-600 border-green-200">✓</Badge>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  disabled={!reqConf?.paymentDate}
                                  onClick={() => confirmPayment(req.id, "request", reqConf?.paymentDate || "")}
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-muted/10">
                            <td colSpan={7} className="px-6 py-4">
                              <div className="rounded-md border border-border overflow-hidden bg-background">
                                <table className="w-full text-xs">
                                  <thead className="bg-muted/50 border-b border-border">
                                    <tr>
                                      <th className="text-left px-3 py-2 font-medium text-muted-foreground uppercase tracking-wider text-2xs">Data</th>
                                      <th className="text-left px-3 py-2 font-medium text-muted-foreground uppercase tracking-wider text-2xs">Café</th>
                                      <th className="text-left px-3 py-2 font-medium text-muted-foreground uppercase tracking-wider text-2xs">Almoço</th>
                                      <th className="text-left px-3 py-2 font-medium text-muted-foreground uppercase tracking-wider text-2xs">Janta</th>
                                      <th className="text-right px-3 py-2 font-medium text-muted-foreground uppercase tracking-wider text-2xs">Total do Dia</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border">
                                    {dates.map((date) => {
                                      const dayMeals = req.dailyOverrides?.[date] ?? req.meals;
                                      const dayTotal = dayMeals.reduce((acc, m) => acc + getMealValue(m, date, person), 0);
                                      return (
                                        <tr key={date} className="hover:bg-muted/30 transition-colors">
                                          <td className="px-3 py-2 tabular-nums text-muted-foreground">{date.split("-").reverse().join("/")}</td>
                                          <td className="px-3 py-2">
                                            {dayMeals.includes("cafe") ? <Badge variant="secondary" className="text-2xs">R$ {getMealValue("cafe", date, person).toFixed(2)}</Badge> : <span className="text-muted-foreground/40">—</span>}
                                          </td>
                                          <td className="px-3 py-2">
                                            {dayMeals.includes("almoco") ? <Badge variant="secondary" className="text-2xs">R$ {getMealValue("almoco", date, person).toFixed(2)}</Badge> : <span className="text-muted-foreground/40">—</span>}
                                          </td>
                                          <td className="px-3 py-2">
                                            {dayMeals.includes("janta") ? <Badge variant="secondary" className="text-2xs">R$ {getMealValue("janta", date, person).toFixed(2)}</Badge> : <span className="text-muted-foreground/40">—</span>}
                                          </td>
                                          <td className="px-3 py-2 text-right font-semibold text-primary tabular-nums">R$ {dayTotal.toFixed(2)}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>

              {/* Job total footer */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-t border-border">
                <span className="text-xs font-semibold uppercase text-muted-foreground">Total do Job</span>
                <span className="tabular-nums font-bold text-primary">R$ {jobTotal.toFixed(2)}</span>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default PaymentTab;
