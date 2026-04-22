import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown, AlertCircle, Wrench } from "lucide-react";

export default function DashboardPage() {
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

  const { data: bookings = [] } = useQuery({
    queryKey: ["bookings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bookings").select("*");
      if (error) throw error;
      return data;
    },
  });

  const fmt = (n: number) => `R ${n.toFixed(2)}`;

  // Total income = sum of all job totals (labour + parts selling price)
  const totalIncome = jobs.reduce((sum, j) => {
    return sum + j.labour_charge + j.parts_cost * (1 + j.markup_percentage / 100);
  }, 0);

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalPaid = payments.reduce((sum, p) => sum + p.amount_paid, 0);
  const outstanding = totalIncome - totalPaid;
  const netProfit = totalPaid - totalExpenses;
  const activeJobs = bookings.filter((b) => b.status === "Booked" || b.status === "In Progress").length;

  const cards = [
    { title: "Total Income", value: fmt(totalIncome), icon: DollarSign, color: "text-primary" },
    { title: "Total Expenses", value: fmt(totalExpenses), icon: TrendingDown, color: "text-destructive" },
    { title: "Net Profit", value: fmt(netProfit), icon: TrendingUp, color: netProfit >= 0 ? "text-primary" : "text-destructive" },
    { title: "Outstanding", value: fmt(outstanding), icon: AlertCircle, color: "text-muted-foreground" },
    { title: "Active Jobs", value: String(activeJobs), icon: Wrench, color: "text-primary" },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>
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
