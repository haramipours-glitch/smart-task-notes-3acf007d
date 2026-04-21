import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2, ShieldAlert, Phone } from "lucide-react";
import { SOSDialog } from "@/components/SOSDialog";

export default function CrisisView() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", phone: "", relationship: "" });

  useEffect(() => { if (user) load(); }, [user]);

  async function load() {
    const [{ data: c }, { data: e }] = await Promise.all([
      supabase.from("safe_contacts").select("*").eq("user_id", user!.id).order("created_at"),
      supabase.from("crisis_events").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(10),
    ]);
    setContacts(c || []); setEvents(e || []);
  }

  async function addContact() {
    if (!form.name || !form.phone) return;
    const { error } = await supabase.from("safe_contacts").insert({ user_id: user!.id, ...form });
    if (error) toast.error(error.message);
    else { setForm({ name: "", phone: "", relationship: "" }); load(); }
  }

  async function delContact(id: string) {
    await supabase.from("safe_contacts").delete().eq("id", id);
    load();
  }

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2"><ShieldAlert className="w-7 h-7 text-rose-500" /> مدیریت بحران</h1>
        <p className="text-muted-foreground text-sm">ابزار سریع برای لحظه‌های فشار + شماره‌های اعتماد.</p>
      </div>

      <Card className="bg-destructive/5 border-destructive/20">
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <div className="font-medium">دکمه SOS</div>
            <div className="text-xs text-muted-foreground mt-1">تنفس هدایت‌شده + ارجاع اضطراری</div>
          </div>
          <SOSDialog trigger={<Button variant="destructive" size="lg">SOS</Button>} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">شماره‌های اعتماد</CardTitle>
          <CardDescription>فقط در حالت بحران نمایش داده می‌شوند</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {contacts.map((c) => (
            <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div>
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-muted-foreground">{c.phone} {c.relationship && `· ${c.relationship}`}</div>
              </div>
              <div className="flex gap-1">
                <a href={`tel:${c.phone}`}><Button size="icon" variant="ghost"><Phone className="w-4 h-4" /></Button></a>
                <Button size="icon" variant="ghost" onClick={() => delContact(c.id)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
          ))}
          <div className="grid grid-cols-3 gap-2">
            <Input placeholder="نام" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="شماره" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input placeholder="نسبت (اختیاری)" value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} />
          </div>
          <Button variant="outline" size="sm" onClick={addContact}><Plus className="w-3 h-3 ml-1" /> افزودن</Button>
        </CardContent>
      </Card>

      <Card className="bg-muted/30">
        <CardContent className="p-5 text-xs leading-relaxed text-muted-foreground">
          <strong className="text-foreground">یادآوری بالینی:</strong> این اپ ابزار خودمدیریتی مبتنی بر شواهد است. جایگزین روان‌درمانی، تشخیص یا دارودرمانی نیست. در صورت علائم شدید یا پایدار، به متخصص مراجعه کن.
        </CardContent>
      </Card>

      {events.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">لاگ رویدادها</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {events.map((e) => (
              <div key={e.id} className="flex justify-between text-xs text-muted-foreground border-b border-border/50 pb-1">
                <span>{e.trigger_type} → {e.outcome || "—"}</span>
                <span>{new Date(e.created_at).toLocaleString("fa-IR")}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
