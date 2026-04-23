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
import { Plus, Truck, DollarSign, AlertCircle, Pencil } from "lucide-react";

const TX_TYPES = ["Purchase", "Payment"] as const;

const emptySupplierForm = {
  supplier_name: "", contact_person: "", phone_number: "", email: "", account_number: "",
  bank_name: "", account_holder_name: "", branch_code: "", account_type: "Cheque",
  payment_terms: "", credit_limit: "", notes: "",
};

const emptyTxForm = {
  supplier_id: "", date: new Date().toISOString().split("T")[0], type: "Purchase" as string,
  amount: 0, reference: "", job_id: "",
};

export default function SuppliersPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [supplierEditId, setSupplierEditId] = useState<string | null>(null);
  const [txOpen, setTxOpen] = useState(false);
  const [txEditId, setTxEditId] = useState<string | null>(null);
  const [supplierForm, setSupplierForm] = useState({ ...emptySupplierForm });
  const [txForm, setTxForm] = useState({ ...emptyTxForm });

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

  const closeSupplierDialog = () => {
    setSupplierOpen(false);
    setSupplierEditId(null);
    setSupplierForm({ ...emptySupplierForm });
  };

  const closeTxDialog = () => {
    setTxOpen(false);
    setTxEditId(null);
    setTxForm({ ...emptyTxForm, date: new Date().toISOString().split("T")[0] });
  };

  const saveSupplier = useMutation({
    mutationFn: async () => {
      const payload = {
        ...supplierForm,
        credit_limit: supplierForm.credit_limit ? Number(supplierForm.credit_limit) : null,
      };
      if (supplierEditId) {
        const { error } = await supabase.from("suppliers").update(payload as any).eq("id", supplierEditId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("suppliers").insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      closeSupplierDialog();
      toast({ title: supplierEditId ? "Supplier updated" : "Supplier added" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const saveTx = useMutation({
    mutationFn: async () => {
      const payload: any = {
        supplier_id: txForm.supplier_id,
        date: txForm.date,
        type: txForm.type,
        amount: txForm.amount,
        reference: txForm.reference || null,
        job_id: txForm.job_id || null,
      };
      if (txEditId) {
        const { error } = await supabase.from("supplier_transactions").update(payload).eq("id", txEditId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("supplier_transactions").insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supplier_transactions"] });
      closeTxDialog();
      toast({ title: txEditId ? "Transaction updated" : "Transaction recorded" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openEditSupplier = (s: any) => {
    setSupplierEditId(s.id);
    setSupplierForm({
      supplier_name: s.supplier_name ?? "",
      contact_person: s.contact_person ?? "",
      phone_number: s.phone_number ?? "",
      email: s.email ?? "",
      account_number: s.account_number ?? "",
      bank_name: s.bank_name ?? "",
      account_holder_name: s.account_holder_name ?? "",
      branch_code: s.branch_code ?? "",
      account_type: s.account_type ?? "Cheque",
      payment_terms: s.payment_terms ?? "",
      credit_limit: s.credit_limit != null ? String(s.credit_limit) : "",
      notes: s.notes ?? "",
    });
    setSupplierOpen(true);
  };

  const openEditTx = (tx: any) => {
    setTxEditId(tx.id);
    setTxForm({
      supplier_id: tx.supplier_id,
      date: tx.date,
      type: tx.type,
      amount: tx.amount,
      reference: tx.reference ?? "",
      job_id: tx.job_id ?? "",
    });
    setTxOpen(true);
  };

  const fmt = (n: number) => `R ${n.toFixed(2)}`;

  const supplierBalances = suppliers.map((s) => {
    const sTx = transactions.filter((t) => t.supplier_id === s.id);
    const totalPurchases = sTx.filter((t) => t.type === "Purchase").reduce((sum, t) => sum + t.amount, 0);
    const totalPayments = sTx.filter((t) => t.type === "Payment").reduce((sum, t) => sum + t.amount, 0);
    return { ...s, totalPurchases, totalPayments, outstanding: totalPurchases - totalPayments };
  });

  const totalOwed = supplierBalances.reduce((sum, s) => sum + s.outstanding, 0);

  const supplierFormFields = (
    <div className="grid gap-3">
      <div><Label>Supplier Name *</Label><Input value={supplierForm.supplier_name} onChange={(e) => setSupplierForm({ ...supplierForm, supplier_name: e.target.value })} /></div>
      <div><Label>Contact Person</Label><Input value={supplierForm.contact_person} onChange={(e) => setSupplierForm({ ...supplierForm, contact_person: e.target.value })} /></div>
      <div><Label>Phone Number</Label><Input value={supplierForm.phone_number} onChange={(e) => setSupplierForm({ ...supplierForm, phone_number: e.target.value })} /></div>
      <div><Label>Email</Label><Input type="email" value={supplierForm.email} onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })} /></div>
      <div className="border-t pt-3 mt-1">
        <p className="text-sm font-semibold mb-2">Bank Details</p>
        <div className="grid gap-3">
          <div><Label>Bank Name</Label><Input value={supplierForm.bank_name} onChange={(e) => setSupplierForm({ ...supplierForm, bank_name: e.target.value })} /></div>
          <div><Label>Account Holder Name</Label><Input value={supplierForm.account_holder_name} onChange={(e) => setSupplierForm({ ...supplierForm, account_holder_name: e.target.value })} /></div>
          <div><Label>Account Number</Label><Input value={supplierForm.account_number} onChange={(e) => setSupplierForm({ ...supplierForm, account_number: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Branch Code</Label><Input value={supplierForm.branch_code} onChange={(e) => setSupplierForm({ ...supplierForm, branch_code: e.target.value })} /></div>
            <div>
              <Label>Account Type</Label>
              <Select value={supplierForm.account_type} onValueChange={(v) => setSupplierForm({ ...supplierForm, account_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                  <SelectItem value="Savings">Savings</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>
      <div className="border-t pt-3 mt-1">
        <p className="text-sm font-semibold mb-2">Additional</p>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Payment Terms</Label><Input value={supplierForm.payment_terms} onChange={(e) => setSupplierForm({ ...supplierForm, payment_terms: e.target.value })} placeholder="e.g. 30 days" /></div>
          <div><Label>Credit Limit</Label><Input type="number" value={supplierForm.credit_limit} onChange={(e) => setSupplierForm({ ...supplierForm, credit_limit: e.target.value })} /></div>
        </div>
      </div>
      <div><Label>Notes</Label><Textarea value={supplierForm.notes} onChange={(e) => setSupplierForm({ ...supplierForm, notes: e.target.value })} /></div>
      <Button onClick={() => saveSupplier.mutate()} disabled={!supplierForm.supplier_name}>{supplierEditId ? "Update Supplier" : "Save"}</Button>
    </div>
  );

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Suppliers</h2>

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

        <TabsContent value="suppliers">
          <div className="flex justify-end mb-4">
            <Dialog open={supplierOpen} onOpenChange={(v) => { if (!v) closeSupplierDialog(); else setSupplierOpen(true); }}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => { setSupplierEditId(null); setSupplierForm({ ...emptySupplierForm }); }}>
                  <Plus className="h-4 w-4 mr-1" /> Add Supplier
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader><DialogTitle>{supplierEditId ? "Edit Supplier" : "Add Supplier"}</DialogTitle></DialogHeader>
                {supplierFormFields}
              </DialogContent>
            </Dialog>
          </div>

          {loadingSuppliers ? <p>Loading…</p> : (
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Bank</TableHead>
                    <TableHead>Terms</TableHead>
                    <TableHead className="text-right">Purchases</TableHead>
                    <TableHead className="text-right">Payments</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplierBalances.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="font-medium">{s.supplier_name}</div>
                        {s.phone_number && <div className="text-xs text-muted-foreground">{s.phone_number}</div>}
                      </TableCell>
                      <TableCell>
                        <div>{s.contact_person}</div>
                        {s.email && <div className="text-xs text-muted-foreground">{s.email}</div>}
                      </TableCell>
                      <TableCell>
                        {s.bank_name ? (
                          <div className="text-xs">
                            <div>{s.bank_name}</div>
                            <div className="text-muted-foreground">{s.account_number} ({s.account_type})</div>
                          </div>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>
                      <TableCell className="text-xs">{s.payment_terms || "—"}</TableCell>
                      <TableCell className="text-right">{fmt(s.totalPurchases)}</TableCell>
                      <TableCell className="text-right">{fmt(s.totalPayments)}</TableCell>
                      <TableCell className={`text-right font-medium ${s.outstanding > 0 ? "text-destructive" : "text-primary"}`}>{fmt(s.outstanding)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => openEditSupplier(s)}><Pencil className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {supplierBalances.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No suppliers yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="transactions">
          <div className="flex justify-end mb-4">
            <Dialog open={txOpen} onOpenChange={(v) => { if (!v) closeTxDialog(); else setTxOpen(true); }}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => { setTxEditId(null); setTxForm({ ...emptyTxForm, date: new Date().toISOString().split("T")[0] }); }}>
                  <Plus className="h-4 w-4 mr-1" /> Add Transaction
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{txEditId ? "Edit Transaction" : "Record Transaction"}</DialogTitle></DialogHeader>
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
                          <SelectItem key={j.id} value={j.id}>{j.bookings?.customer_name} – {j.bookings?.vehicle}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={() => saveTx.mutate()} disabled={!txForm.supplier_id || txForm.amount <= 0}>{txEditId ? "Update Transaction" : "Save"}</Button>
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
                    <TableHead>Actions</TableHead>
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
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => openEditTx(tx)}><Pencil className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {transactions.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No transactions yet</TableCell></TableRow>
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
