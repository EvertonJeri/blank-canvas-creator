import React, { useState, useMemo } from "react";
import { Plus, Trash2, AlertCircle, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  type Person,
  type Job,
  type MealRequest,
  type TimeEntry,
  type MealType,
  type LocationType,
  MEAL_LABELS,
  LOCATIONS,
  getDatesInRange,
  getMealValue,
  calculatePersonBalance,
  type FoodControlEntry,
  type DiscountConfirmation,
  type PaymentConfirmation,
} from "@/lib/types";

interface MealRequestsPageProps {
  people: Person[];
  jobs: Job[];
  requests: MealRequest[];
  timeEntries: TimeEntry[];
  foodControl: FoodControlEntry[];
  confirmations: (DiscountConfirmation | PaymentConfirmation)[];
  setRequests: (requests: MealRequest[]) => void;
  onUpdateRequest: (req: MealRequest) => void;
  onRemoveRequest: (id: string) => void;
  onGenerateEntries: (entries: TimeEntry[]) => void;
}

const MealRequestsPage = ({
  people = [],
  jobs = [],
  requests = [],
  confirmations = [],
  foodControl = [],
  onUpdateRequest,
  onRemoveRequest,
}: MealRequestsPageProps) => {
  // 1. Estados do Formulário Superior (Job e Local)
  const [selectedJob, setSelectedJob] = useState<string>("");
  const [selectedLocation, setSelectedLocation] = useState<LocationType>("Dentro SP");

  // 2. Estados da Adição de Pessoa
  const [personId, setPersonId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [mealList, setMealList] = useState<MealType[]>(["cafe", "almoco", "janta"]);

  const personBalance = useMemo(() => {
    if (!personId || !Array.isArray(people) || !Array.isArray(requests)) return 0;
    return calculatePersonBalance(personId, requests, foodControl || [], confirmations || [], people);
  }, [personId, requests, foodControl, confirmations, people]);

  // 3. Lógica do Botão "Adicionar"
  const handleAdd = () => {
    if (!selectedJob || !personId || !startDate || !endDate) return;

    const newReq: MealRequest = {
      id: Math.random().toString(36).substring(2, 11),
      personId,
      jobId: selectedJob,
      startDate,
      endDate,
      meals: mealList,
      dailyOverrides: {},
      location: selectedLocation,
    };

    onUpdateRequest(newReq);
    setPersonId(""); // Limpa apenas a pessoa para permitir adicionar outra na mesma data/job
  };

  // 4. Filtragem da Lista pelo Job selecionado
  const filteredRequests = useMemo(() => {
    return (requests || []).filter(r => r.jobId === selectedJob);
  }, [requests, selectedJob]);

  // 5. Funções de auxílio (Nomes e Formatação de Data)
  const getName = (id: string) => (people || []).find(p => p.id === id)?.name || "Pessoa não encontrada";
  const formatDate = (dateStr: string) => {
    if (!dateStr || !dateStr.includes("-")) return dateStr || "—";
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* SEÇÃO 1: CONFIGURAÇÃO DO JOB */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-xl border border-border bg-muted/10 shadow-sm">
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Utensils className="h-3 w-3" /> Selecionar Job / Projeto
          </Label>
          <SearchableSelect
            options={(jobs || []).map(j => ({ value: j.id, label: j.name }))}
            value={selectedJob}
            onValueChange={setSelectedJob}
            placeholder="Escolha o projeto ativo..."
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Local das Refeições</Label>
          <Select value={selectedLocation} onValueChange={(v) => setSelectedLocation(v as LocationType)}>
            <SelectTrigger className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LOCATIONS.map(loc => (
                <SelectItem key={loc.value} value={loc.value}>{loc.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* SEÇÃO 2: FORMULÁRIO DE ADIÇÃO (Só aparece com Job selecionado) */}
      {selectedJob && (
        <div className="rounded-2xl border border-border p-6 bg-card shadow-lg space-y-6 transition-all duration-300">
          <h2 className="text-lg font-black text-foreground uppercase tracking-tight">Novos Pedidos para esta montagem</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Funcionário</Label>
              <SearchableSelect
                options={(people || []).map(p => ({ 
                  value: p.id, 
                  label: p.isRegistered ? `${p.name} (CLT)` : p.name 
                }))}
                value={personId}
                onValueChange={setPersonId}
                placeholder="Selecione o funcionário..."
              />
              {personId && personBalance !== 0 && (
                <div className={`mt-2 p-2 rounded border text-xs flex items-center gap-2 ${personBalance < 0 ? 'bg-destructive/10 border-destructive/20 text-destructive' : 'bg-green-500/10 border-green-200 text-green-600'}`}>
                  <AlertCircle className="h-4 w-4" />
                  <span>Saldo Global: R$ {personBalance.toFixed(2)} ({personBalance < 0 ? 'Débito' : 'Crédito'})</span>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Kit de Refeições</Label>
              <div className="flex gap-6 p-2.5 border rounded-lg bg-muted/20">
                {(["cafe", "almoco", "janta"] as MealType[]).map(m => (
                  <label key={m} className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
                    <Checkbox
                      checked={mealList.includes(m)}
                      onCheckedChange={(checked) => {
                        if (checked) setMealList([...mealList, m]);
                        else setMealList(mealList.filter(x => x !== m));
                      }}
                    />
                    <span className="text-sm font-medium">{MEAL_LABELS[m]}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Data de Início</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-10" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Data de Fim</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-10" />
            </div>
            <Button onClick={handleAdd} className="h-10 w-full bg-primary text-primary-foreground font-bold hover:shadow-md transition-all">
              <Plus className="h-4 w-4 mr-2" /> Adicionar na Lista
            </Button>
          </div>
        </div>
      )}

      {/* SEÇÃO 3: LISTA DE SOLICITAÇÕES JÁ FEITAS */}
      {selectedJob && (
        <div className="rounded-2xl border border-border overflow-hidden bg-card shadow-xl">
          <div className="px-6 py-4 bg-muted/30 border-b border-border flex justify-between items-center">
            <h3 className="font-black uppercase text-xs tracking-widest text-muted-foreground">Solicitações Registradas</h3>
            <span className="text-2xs bg-primary/10 text-primary px-2 py-1 rounded-full font-bold">{filteredRequests.length} Registros</span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/10 text-muted-foreground border-b border-border">
                  <th className="px-6 py-3 text-left font-bold text-2xs uppercase">Funcionário</th>
                  <th className="px-6 py-3 text-left font-bold text-2xs uppercase">Período de Montagem</th>
                  <th className="px-6 py-3 text-left font-bold text-2xs uppercase">Kit Refeição</th>
                  <th className="px-6 py-3 text-right font-bold text-2xs uppercase">Custo Est. (R$)</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground italic tracking-wide">
                      Nenhuma pessoa solicitada para este projeto ainda.
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map(req => {
                    // Cálculo de custo simplificado e seguro
                    const range = getDatesInRange(req.startDate, req.endDate);
                    const cost = (range || []).reduce((acc, d) => {
                      const p = people.find(p => p.id === req.personId);
                      const meals = (req.dailyOverrides?.[d] ?? req.meals) as MealType[];
                      return acc + (Array.isArray(meals) ? meals.reduce((acc, m) => acc + getMealValue(m, d, p), 0) : 0);
                    }, 0);

                    return (
                      <tr key={req.id} className="hover:bg-muted/20 transition-colors group">
                        <td className="px-6 py-4">
                          <p className="font-black text-foreground">{getName(req.personId)}</p>
                          <p className="text-[10px] text-muted-foreground uppercase">{req.location || 'Local não definido'}</p>
                        </td>
                        <td className="px-6 py-4 text-xs tabular-nums font-medium text-muted-foreground">
                          {formatDate(req.startDate)} <span className="mx-1 text-muted-foreground/30">→</span> {formatDate(req.endDate)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-1.5 flex-wrap">
                            {(req.meals || []).map(m => (
                              <span key={m} className="px-2 py-0.5 rounded-md border border-border text-[9px] uppercase font-black bg-background text-foreground tracking-tighter shadow-sm">
                                {MEAL_LABELS[m] || m}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right font-black tabular-nums text-foreground">
                          {cost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => onRemoveRequest(req.id)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all rounded-lg"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default MealRequestsPage;
