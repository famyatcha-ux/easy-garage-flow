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
import type { TablesInsert } from "@/integrations/supabase/types";
import { Plus } from "lucide-react";

const STATUSES = ["Booked", "In Progress", "Completed", "Collected"] as const;

export default function BookingsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<TablesInsert<"bookings">>({
    customer_name: "",
    vehicle: "",
    contact_number: "",
    registration: "",
    problem_description: "",
    date: new Date().toISOString().split("T")[0],
  });

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addBooking = useMutation({
    mutationFn: async (b: TablesInsert<"bookings">) => {
      const { error } = await supabase.from("bookings").insert(b);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      setOpen(false);
      setForm({ customer_name: "", vehicle: "", contact_number: "", registration: "", problem_description: "", date: new Date().toISOString().split("T")[0] });
      toast({ title: "Booking added" });
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Bookings</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />New Booking</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Booking</DialogTitle></DialogHeader>
            <form
              className="space-y-3"
              onSubmit={(e) => { e.preventDefault(); addBooking.mutate(form); }}
            >
              <div><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
              <div><Label>Customer Name *</Label><Input required value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></div>
              <div><Label>Contact Number</Label><Input value={form.contact_number ?? ""} onChange={(e) => setForm({ ...form, contact_number: e.target.value })} /></div>
              <div><Label>Vehicle (Make/Model) *</Label><Input required value={form.vehicle} onChange={(e) => setForm({ ...form, vehicle: e.target.value })} /></div>
              <div><Label>Registration</Label><Input value={form.registration ?? ""} onChange={(e) => setForm({ ...form, registration: e.target.value })} /></div>
              <div><Label>Problem Description</Label><Textarea value={form.problem_description ?? ""} onChange={(e) => setForm({ ...form, problem_description: e.target.value })} /></div>
              <Button type="submit" className="w-full" disabled={addBooking.isPending}>Add Booking</Button>
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
                <TableHead>Customer</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Reg</TableHead>
                <TableHead>Problem</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="whitespace-nowrap">{b.date}</TableCell>
                  <TableCell>{b.customer_name}</TableCell>
                  <TableCell>{b.contact_number}</TableCell>
                  <TableCell>{b.vehicle}</TableCell>
                  <TableCell>{b.registration}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{b.problem_description}</TableCell>
                  <TableCell>
                    <Select value={b.status} onValueChange={(v) => updateStatus.mutate({ id: b.id, status: v })}>
                      <SelectTrigger className="w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
              {bookings.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No bookings yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
