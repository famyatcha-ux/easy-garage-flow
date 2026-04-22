import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

const CATEGORIES = ["Parts Purchase", "Rent", "Salaries", "Fuel", "Other"] as const;

export default function ExpensesPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    category: "Parts Purchase",
    amount: 0,
    notes: "",
  });

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("expenses").select("*").order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addExpense = useMutation({
    mutationFn: async (e: typeof form) => {
      const { error } = await supabase.from("expenses").insert({
        date: e.date,
        category: e.category,
        amount: e.amount,
        notes: e.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      setOpen(false);
      setForm({ date: new Date().toISOString().split("T")[0], category: "Parts Purchase", amount: 0, notes: "" });
      toast({ title: "Expense added" });
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const fmt = (n: number) => `R ${n.toFixed(2)}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Expenses</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Add Expense</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Expense</DialogTitle></DialogHeader>
            <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); addExpense.mutate(form); }}>
              <div><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Amount</Label><Input type="number" min={0} step={0.01} value={form.amount} onChange={(e) => setForm({ ...form, amount: +e.target.value })} /></div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <Button type="submit" className="w-full" disabled={addExpense.isPending}>Add Expense</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <div className="border rounded-lg overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((ex) => (
                <TableRow key={ex.id}>
                  <TableCell className="whitespace-nowrap">{ex.date}</TableCell>
                  <TableCell>{ex.category}</TableCell>
                  <TableCell className="text-right font-medium">{fmt(ex.amount)}</TableCell>
                  <TableCell className="max-w-[300px] truncate">{ex.notes}</TableCell>
                </TableRow>
              ))}
              {expenses.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No expenses yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
