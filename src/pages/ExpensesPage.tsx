import { useState, useMemo } from "react";
import { MonthSelector } from "@/components/MonthSelector";
import { getMonthRange, getCurrentMonthIndex, getCurrentYear } from "@/lib/monthRange";
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
import { Plus, Pencil, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const CATEGORIES = ["Parts Purchase", "Rent", "Salaries", "Fuel", "Other"] as const;
const CATEGORIES_END = "" as const;

const emptyForm = { date: new Date().toISOString().split("T")[0], category: "Parts Purchase", amount: 0, notes: "" };

export default function ExpensesPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [monthIdx, setMonthIdx] = useState<number>(getCurrentMonthIndex());

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => { const { data, error } = await supabase.from("expenses").select("*").order("date", { ascending: false }); if (error) throw error; return data; },
  });

  const { start, end } = useMemo(() => getMonthRange(getCurrentYear(), monthIdx), [monthIdx]);
  const filtered = useMemo(() => expenses.filter((e) => e.date >= start && e.date <= end), [expenses, start, end]);
  const totalFiltered = useMemo(() => filtered.reduce((s, e) => s + e.amount, 0), [filtered]);

  const saveExpense = useMutation({
    mutationFn: async () => {
      const payload = { date: form.date, category: form.category, amount: form.amount, notes: form.notes || null };
      if (editId) { const { error } = await supabase.from("expenses").update(payload).eq("id", editId); if (error) throw error; }
      else { const { error } = await supabase.from("expenses").insert(payload); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["expenses"] }); closeDialog(); toast({ title: editId ? "Expense updated" : "Expense added" }); },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["expenses"] }); setDeleteId(null); toast({ title: "Expense deleted" }); },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const fmt = (n: number) => `R ${n.toFixed(2)}`;
  const closeDialog = () => { setOpen(false); setEditId(null); setForm({ ...emptyForm, date: new Date().toISOString().split("T")[0] }); };
  const openEdit = (ex: typeof expenses[0]) => { setEditId(ex.id); setForm({ date: ex.date, category: ex.category, amount: ex.amount, notes: ex.notes ?? "" }); setOpen(true); };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Expenses</h2>
        <div className="flex items-center gap-2">
          <MonthSelector value={monthIdx} onChange={setMonthIdx} />
          <Dialog open={open} onOpenChange={(v) => { if (!v) closeDialog(); else setOpen(true); }}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditId(null); setForm({ ...emptyForm, date: new Date().toISOString().split("T")[0] }); }}><Plus className="mr-2 h-4 w-4" />Add Expense</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editId ? "Edit Expense" : "Add Expense"}</DialogTitle></DialogHeader>
              <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); saveExpense.mutate(); }}>
                <div><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
                <div><Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Amount</Label><Input type="number" min={0} step={0.01} value={form.amount} onChange={(e) => setForm({ ...form, amount: +e.target.value })} /></div>
                <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
                <Button type="submit" className="w-full" disabled={saveExpense.isPending}>{editId ? "Update Expense" : "Add Expense"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-3">{filtered.length} expense{filtered.length !== 1 ? "s" : ""} — Total: {fmt(totalFiltered)}</p>
      {isLoading ? <p className="text-muted-foreground">Loading...</p> : (
        <div className="border rounded-lg overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead><TableHead>Category</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Notes</TableHead><TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((ex) => (
                <TableRow key={ex.id}>
                  <TableCell className="whitespace-nowrap">{ex.date}</TableCell>
                  <TableCell>{ex.category}</TableCell>
                  <TableCell className="text-right font-medium">{fmt(ex.amount)}</TableCell>
                  <TableCell className="max-w-[300px] truncate">{ex.notes}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(ex)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(ex.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No expenses in this period</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
