import { useState, useMemo } from "react";
import { MonthSelector } from "@/components/MonthSelector";
import { getMonthRange, getCurrentMonthIndex, getCurrentYear } from "@/lib/monthRange";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, TrendingDown, AlertCircle, Wrench } from "lucide-react";

function inRange(dateStr: string, start: string, end: string) {
  return dateStr >= start && dateStr <= end;
}

function inRange(dateStr: string, start: string, end: string) {
  return dateStr >= start && dateStr <= end;
}

export default function DashboardPage() {
  const [monthIdx, setMonthIdx] = useState<number>(getCurrentMonthIndex());
  const { start, end } = useMemo(() => getMonthRange(getCurrentYear(), monthIdx), [monthIdx]);

  const { data: jobs = [] } = useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("jobs").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["payments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("payments").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("expenses").select("*");
      if (error) throw error;
      return data;
    },
  });

  const fmt = (n: number) => `R ${n.toFixed(2)}`;

  const filteredJobs = useMemo(() => jobs.filter((j) => inRange(j.date, start, end)), [jobs, start, end]);
  const filteredPayments = useMemo(() => payments.filter((p) => inRange(p.date, start, end)), [payments, start, end]);
  const filteredExpenses = useMemo(() => expenses.filter((e) => inRange(e.date, start, end)), [expenses, start, end]);

  const totalIncome = filteredJobs.reduce(
    (sum, j) => sum + j.labour_charge + j.parts_cost * (1 + j.markup_percentage / 100),
    0
  );
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalPaid = filteredPayments.reduce((sum, p) => sum + p.amount_paid, 0);
  const outstanding = totalIncome - totalPaid;
  const netProfit = totalPaid - totalExpenses;
  const jobCount = filteredJobs.length;

  const cards = [
    { title: "Total Income", value: fmt(totalIncome), icon: DollarSign, color: "text-primary" },
    { title: "Total Expenses", value: fmt(totalExpenses), icon: TrendingDown, color: "text-destructive" },
    { title: "Net Profit", value: fmt(netProfit), icon: TrendingUp, color: netProfit >= 0 ? "text-primary" : "text-destructive" },
    { title: "Outstanding", value: fmt(outstanding), icon: AlertCircle, color: "text-muted-foreground" },
    { title: "Jobs", value: String(jobCount), icon: Wrench, color: "text-primary" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <MonthSelector value={monthIdx} onChange={setMonthIdx} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {cards.map((c) => (
          <Card key={c.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.title}</CardTitle>
              <c.icon className={`h-4 w-4 ${c.color}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
