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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Truck, DollarSign, AlertCircle } from "lucide-react";

const TX_TYPES = ["Purchase", "Payment"] as const;

export default function SuppliersPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [txOpen, setTxOpen] = useState(false);
  const [supplierForm, setSupplierForm] = useState({
    supplier_name: "",
    contact_person: "",
    phone_number: "",
    email: "",
    account_number: "",
    bank_name: "",
    account_holder_name: "",
    branch_code: "",
    account_type: "Cheque",
    payment_terms: "",
    credit_limit: "",
    notes: "",
  });
  const [txForm, setTxForm] = useState({
    supplier_id: "",
    date: new Date().toISOString().split("T")[0],
    type: "Purchase" as string,
    amount: 0,
    reference: "",
    job_id: "",
  });

  const { data: suppliers = [], isLoading: loadingSuppliers } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("*").order("supplier_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: transactions = [], isLoading: loadingTx } = useQuery({
    queryKey: ["supplier_transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplier_transactions")
        .select("*, suppliers(supplier_name)")
        .order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("jobs").select("*, bookings(customer_name, vehicle)");
      if (error) throw error;
      return data;
    },
  });

  const addSupplier = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("suppliers").insert([supplierForm]);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      setSupplierOpen(false);
      setSupplierForm({ supplier_name: "", contact_person: "", phone_number: "", email: "", account_number: "", notes: "" });
      toast({ title: "Supplier added" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const addTransaction = useMutation({
    mutationFn: async () => {
      const payload: any = {
        supplier_id: txForm.supplier_id,
        date: txForm.date,
        type: txForm.type,
        amount: txForm.amount,
        reference: txForm.reference || null,
        job_id: txForm.job_id || null,
      };
      const { error } = await supabase.from("supplier_transactions").insert([payload]);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supplier_transactions"] });
      setTxOpen(false);
      setTxForm({ supplier_id: "", date: new Date().toISOString().split("T")[0], type: "Purchase", amount: 0, reference: "", job_id: "" });
      toast({ title: "Transaction recorded" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const fmt = (n: number) => `R ${n.toFixed(2)}`;

  // Calculate per-supplier balances
  const supplierBalances = suppliers.map((s) => {
    const sTx = transactions.filter((t) => t.supplier_id === s.id);
    const totalPurchases = sTx.filter((t) => t.type === "Purchase").reduce((sum, t) => sum + t.amount, 0);
    const totalPayments = sTx.filter((t) => t.type === "Payment").reduce((sum, t) => sum + t.amount, 0);
    return { ...s, totalPurchases, totalPayments, outstanding: totalPurchases - totalPayments };
  });

  const totalOwed = supplierBalances.reduce((sum, s) => sum + s.outstanding, 0);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Suppliers</h2>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Suppliers</CardTitle>
            <Truck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{suppliers.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Owed</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-destructive">{fmt(totalOwed)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Transactions</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{transactions.length}</div></CardContent>
        </Card>
      </div>

      <Tabs defaultValue="suppliers">
        <TabsList>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>

        {/* Suppliers Tab */}
        <TabsContent value="suppliers">
          <div className="flex justify-end mb-4">
            <Dialog open={supplierOpen} onOpenChange={setSupplierOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Supplier</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Supplier</DialogTitle></DialogHeader>
                <div className="grid gap-3">
                  <div><Label>Supplier Name *</Label><Input value={supplierForm.supplier_name} onChange={(e) => setSupplierForm({ ...supplierForm, supplier_name: e.target.value })} /></div>
                  <div><Label>Contact Person</Label><Input value={supplierForm.contact_person} onChange={(e) => setSupplierForm({ ...supplierForm, contact_person: e.target.value })} /></div>
                  <div><Label>Phone Number</Label><Input value={supplierForm.phone_number} onChange={(e) => setSupplierForm({ ...supplierForm, phone_number: e.target.value })} /></div>
                  <div><Label>Email</Label><Input type="email" value={supplierForm.email} onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })} /></div>
                  <div><Label>Account Number</Label><Input value={supplierForm.account_number} onChange={(e) => setSupplierForm({ ...supplierForm, account_number: e.target.value })} /></div>
                  <div><Label>Notes</Label><Textarea value={supplierForm.notes} onChange={(e) => setSupplierForm({ ...supplierForm, notes: e.target.value })} /></div>
                  <Button onClick={() => addSupplier.mutate()} disabled={!supplierForm.supplier_name}>Save</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {loadingSuppliers ? <p>Loading…</p> : (
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier Name</TableHead>
                    <TableHead>Contact Person</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Purchases</TableHead>
                    <TableHead className="text-right">Payments</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplierBalances.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.supplier_name}</TableCell>
                      <TableCell>{s.contact_person}</TableCell>
                      <TableCell>{s.phone_number}</TableCell>
                      <TableCell>{s.email}</TableCell>
                      <TableCell className="text-right">{fmt(s.totalPurchases)}</TableCell>
                      <TableCell className="text-right">{fmt(s.totalPayments)}</TableCell>
                      <TableCell className={`text-right font-medium ${s.outstanding > 0 ? "text-destructive" : "text-primary"}`}>{fmt(s.outstanding)}</TableCell>
                    </TableRow>
                  ))}
                  {supplierBalances.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No suppliers yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions">
          <div className="flex justify-end mb-4">
            <Dialog open={txOpen} onOpenChange={setTxOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Transaction</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Record Transaction</DialogTitle></DialogHeader>
                <div className="grid gap-3">
                  <div>
                    <Label>Supplier *</Label>
                    <Select value={txForm.supplier_id} onValueChange={(v) => setTxForm({ ...txForm, supplier_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                      <SelectContent>
                        {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.supplier_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Date</Label><Input type="date" value={txForm.date} onChange={(e) => setTxForm({ ...txForm, date: e.target.value })} /></div>
                  <div>
                    <Label>Type *</Label>
                    <Select value={txForm.type} onValueChange={(v) => setTxForm({ ...txForm, type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TX_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Amount *</Label><Input type="number" value={txForm.amount} onChange={(e) => setTxForm({ ...txForm, amount: +e.target.value })} /></div>
                  <div><Label>Reference</Label><Input value={txForm.reference} onChange={(e) => setTxForm({ ...txForm, reference: e.target.value })} placeholder="Invoice # or note" /></div>
                  <div>
                    <Label>Linked Job (optional)</Label>
                    <Select value={txForm.job_id} onValueChange={(v) => setTxForm({ ...txForm, job_id: v })}>
                      <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        {jobs.map((j: any) => (
                          <SelectItem key={j.id} value={j.id}>
                            {j.bookings?.customer_name} – {j.bookings?.vehicle}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={() => addTransaction.mutate()} disabled={!txForm.supplier_id || txForm.amount <= 0}>Save</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {loadingTx ? <p>Loading…</p> : (
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx: any) => (
                    <TableRow key={tx.id}>
                      <TableCell>{tx.date}</TableCell>
                      <TableCell>{tx.suppliers?.supplier_name}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tx.type === "Purchase" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                          {tx.type}
                        </span>
                      </TableCell>
                      <TableCell>{tx.reference}</TableCell>
                      <TableCell className="text-right font-medium">{fmt(tx.amount)}</TableCell>
                    </TableRow>
                  ))}
                  {transactions.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No transactions yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
