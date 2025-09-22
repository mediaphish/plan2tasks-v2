import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  Users, Calendar, Settings as SettingsIcon, Inbox as InboxIcon,
  Search, Trash2, X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Plus, RotateCcw, Info, Mail, Tag, Edit
} from "lucide-react";
import { format } from "date-fns";


const APP_VERSION = "2025-09-02 · C4";
/* ───────────── utils (LOCAL DATE ONLY) ───────────── */
function cn(...a){ return a.filter(Boolean).join(" "); }
function uid(){ return Math.random().toString(36).slice(2,10); }
function parseYMDLocal(s){
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s));
  if (!m) return null;
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  return new Date(y, mo-1, d);
}
function fmtYMDLocal(d){
  const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,"0"); const dd=String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${dd}`;
}
function addDaysLocal(base, days){
  return new Date(base.getFullYear(), base.getMonth(), base.getDate()+days);
}
function daysBetweenLocal(a,b){
  const a0=new Date(a.getFullYear(),a.getMonth(),a.getDate());
  const b0=new Date(b.getFullYear(),b.getMonth(),b.getDate());
  return Math.round((b0 - a0)/86400000);
}
function addMonthsLocal(date, months){
  const y=date.getFullYear(), m=date.getMonth(), d=date.getDate();
  const nmo=m+months; const ny=y+Math.floor(nmo/12); const nm=((nmo%12)+12)%12;
  const last=new Date(ny, nm+1, 0).getDate();
  return new Date(ny, nm, Math.min(d,last));
}
function lastDayOfMonthLocal(y,m0){ return new Date(y, m0+1, 0).getDate(); }
function firstWeekdayOfMonthLocal(y,m0,weekday){
  const first=new Date(y,m0,1);
  const shift=(7+weekday-first.getDay())%7;
  return new Date(y,m0,1+shift);
}
function nthWeekdayOfMonthLocal(y,m0,weekday,nth){
  const first=firstWeekdayOfMonthLocal(y,m0,weekday);
  const c=new Date(y,m0, first.getDate()+7*(nth-1));
  return c.getMonth()===m0?c:null;
}
function lastWeekdayOfMonthLocal(y,m0,weekday){
  const lastD=lastDayOfMonthLocal(y,m0);
  const last=new Date(y,m0,lastD);
  const shift=(7+last.getDay()-weekday)%7;
  return new Date(y,m0,lastD-shift);
}

/* display helper */
function to12hDisplay(hhmm){
  if (!hhmm) return "";
  const [h,m] = hhmm.split(":").map(Number);
  const ampm = h>=12 ? "pm" : "am";
  const h12 = h%12 || 12;
  return `${h12}:${String(m).padStart(2,"0")} ${ampm}`;
}

/* Time dropdown (15-min steps) */
const TIME_OPTIONS = (() => {
  const out = [{ value: "", label: "— none —" }];
  for (let h=0; h<24; h++){
    for (let m=0; m<60; m+=15){
      const v = `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
      const h12 = (h%12) || 12;
      const ampm = h>=12 ? "pm" : "am";
      const label = `${h12}:${String(m).padStart(2,"0")} ${ampm}`;
      out.push({ value: v, label });
    }
  }
  return out;
})();

function TimeSelect({ value, onChange }){
  return (
    <select
      value={value || ""}
      onChange={(e)=>onChange(e.target.value)}
      className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm h-10"
    >
      {TIME_OPTIONS.map(opt=>(
        <option key={opt.value || "none"} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

/* ───────── Error boundary ───────── */
class ErrorBoundary extends React.Component{
  constructor(p){ super(p); this.state={error:null}; }
  static getDerivedStateFromError(e){ return {error:e}; }
  componentDidCatch(e, info){ console.error("UI crash:", e, info); }
  render(){
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-red-50 p-4 sm:p-6">
          <div className="mx-auto max-w-3xl rounded-xl border border-red-200 bg-white p-4">
            <div className="text-red-700 font-bold mb-2">Something went wrong in the UI</div>
            <pre className="bg-red-100 p-3 text-xs text-red-900 overflow-auto rounded">
              {String(this.state.error?.message || this.state.error)}
            </pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ───────── App shell ───────── */
export default function App(){
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}

function MainApp(){
  const usp = typeof window!=="undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const urlPE = usp.get("plannerEmail");
  const urlView = (usp.get("view")||"").toLowerCase();
  const urlUser = usp.get("user") || "";
  const validViews = new Set(["users","plan","settings","inbox"]);

  const storedPE = (typeof window!=="undefined" ? localStorage.getItem("plannerEmail") : "") || "";
  const plannerEmail = (urlPE || storedPE || "bartpaden@gmail.com");
  if (urlPE) { try { localStorage.setItem("plannerEmail", urlPE); } catch {} }
  const [view,setView]=useState(validViews.has(urlView) ? urlView : "users");
  const [selectedUserEmail,setSelectedUserEmail]=useState(urlUser || "");
  const [prefs,setPrefs]=useState({});
  const [inboxOpen,setInboxOpen]=useState(false); // legacy; not used anymore
  const [inboxBadge,setInboxBadge]=useState(0);
  const [inviteOpen,setInviteOpen]=useState(false);
  const [toasts,setToasts]=useState([]);

  // Load prefs, but do NOT override URL-driven view
  useEffect(()=>{ (async ()=>{
    try{
      const qs=new URLSearchParams({ plannerEmail });
      const r=await fetch(`/api/prefs/get?${qs.toString()}`);
      if (r.ok){ const j=await r.json(); const p=j.prefs||j;
        setPrefs(p||{});
        if (!validViews.has(urlView)) setView((p&&p.default_view) || "users");
      }
    }catch(e){/* noop */}
  })(); },[plannerEmail]);

  async function loadBadge(){
    try{
      const qs=new URLSearchParams({ plannerEmail, status:"new" });
      const r=await fetch(`/api/inbox?${qs.toString()}`); const j=await r.json();
      console.log('Badge API response:', j);
      console.log('Setting badge to:', j.count);
      setInboxBadge((j.count||0));
    }catch(e){console.error('Badge error:', e);}
  }
  useEffect(()=>{ if (prefs.show_inbox_badge) loadBadge(); },[plannerEmail,prefs.show_inbox_badge]);

  function toast(type, text){ const id=uid(); setToasts(t=>[...t,{ id,type,text }]); setTimeout(()=>dismissToast(id), 5000); }
  function dismissToast(id){ setToasts(t=>t.filter(x=>x.id!==id)); }

  return (
    <div className="min-h-screen bg-gray-100 pb-6">
      <Toasts items={toasts} dismiss={dismissToast} />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-6 sm:mb-6 flex flex-wrap items-center justify-between gap-4 pt-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <img src="/brand/plan2tasks-logo-horizontal.svg" alt="Plan2Tasks" className="h-6 sm:h-8" />
            <nav className="ml-1 sm:ml-4 flex gap-1 sm:gap-2">
              <NavBtn active={view==="users"} onClick={()=>{ setView("users"); updateQueryView("users"); }} icon={<Users className="h-4 w-4" />}><span className="hidden sm:inline">Users</span></NavBtn>
              <NavBtn active={view==="plan"} onClick={()=>{ setView("plan"); updateQueryView("plan"); }} icon={<Calendar className="h-4 w-4" />}><span className="hidden sm:inline">Plan</span></NavBtn>
              <NavBtn active={view==="settings"} onClick={()=>{ setView("settings"); updateQueryView("settings"); }} icon={<SettingsIcon className="h-4 w-4" />}><span className="hidden sm:inline">Settings</span></NavBtn>
            </nav>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button 
              onClick={()=>setInviteOpen(true)} 
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 whitespace-nowrap"
            >
              <Mail className="h-4 w-4" /> <span className="hidden sm:inline">Invite User</span>
            </button>
            {/* NOW: routes to internal Inbox view (no modal, no external page) */}
            <a
              href="/index.html?view=inbox"
              id="navInbox"
              onClick={(e)=>{ e.preventDefault(); setView("inbox"); updateQueryView("inbox"); }}
              className="relative rounded-xl border border-gray-300 bg-white px-2.5 py-2 text-xs sm:text-sm hover:bg-gray-50 whitespace-nowrap"
            >
              <InboxIcon className="inline h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Inbox</span>
              {prefs.show_inbox_badge && inboxBadge>0 && (
                <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                  {inboxBadge} New
                </span>
              )}
            </a>
            <span className="rounded-xl border border-gray-300 bg-white px-2.5 py-2 text-xs sm:text-sm whitespace-nowrap">
              <span className="hidden sm:inline">Signed in:&nbsp;</span><b className="truncate inline-block max-w-[160px] align-bottom">{plannerEmail}</b>
            </span>
          </div>
        </div>

        {view==="users" && (
          <UsersView
            plannerEmail={plannerEmail}
            onToast={(t,m)=>toast(t,m)}
            onManage={(email)=>{ 
              setSelectedUserEmail(email);
              setView("plan"); 
              updateQueryUser(email);
            }}
          />
        )}

        {view==="plan" && (
          <PlanView
            plannerEmail={plannerEmail}
            selectedUserEmailProp={selectedUserEmail}
            urlUser={urlUser}
            onToast={(t,m)=>toast(t,m)}
            onUserChange={(email)=>updateQueryUser(email)}
          />
        )}

        {view==="settings" && (
          <SettingsView
            plannerEmail={plannerEmail}
            prefs={prefs}
            onChange={(p)=>setPrefs(p)}
            onToast={(t,m)=>toast(t,m)}
          />
        )}

        {view==="inbox" && (
          <InboxViewIntegrated
            plannerEmail={plannerEmail}
            onToast={(t,m)=>toast(t,m)}
            onBadgeRefresh={loadBadge}
          />
        )}

        {/* Legacy modal kept inert; no UI path sets inboxOpen=true */}
        {inboxOpen && (
          <InboxDrawer
            plannerEmail={plannerEmail}
            onClose={()=>setInboxOpen(false)}
          />
        )}

        {/* Global Invite Modal */}
        {inviteOpen && (
          <SendInviteModal
            plannerEmail={plannerEmail}
            onClose={()=>setInviteOpen(false)}
            onToast={(t,m)=>toast(t,m)}
          />
        )}
      </div>
      
      {/* Footer */}
      <footer className="mt-8 border-t border-gray-200 py-4 text-center text-xs text-gray-500">
        <div className="flex items-center justify-center gap-4">
          <span>Version {APP_VERSION}</span>
          <span>•</span>
          <span>© 2025 Plan2Tasks</span>
        </div>
      </footer>
    </div>
  );
}

function updateQueryView(next){
  try{
    const url = new URL(window.location.href);
    url.searchParams.set("view", next);
    window.history.replaceState({}, "", url.toString());
  }catch{/* noop */}
}

function updateQueryUser(userEmail){
  try{
    const url = new URL(window.location.href);
    if (userEmail) {
      url.searchParams.set("user", userEmail);
    } else {
      url.searchParams.delete("user");
    }
    url.searchParams.set("view", "plan");
    window.history.replaceState({}, "", url.toString());
  }catch{/* noop */}
}

/* ───────── nav & toasts ───────── */
function NavBtn({ active, onClick, icon, children }){
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs sm:text-sm",
        active ? "border-gray-800 bg-gray-900 text-white" : "border-gray-300 bg-white hover:bg-gray-50"
      )}
    >
      {icon} {children}
    </button>
  );
}
function Toasts({ items, dismiss }){
  return (
    <div className="fixed bottom-2 left-0 right-0 z-50 flex justify-center">
      <div className="flex max-w-[90vw] flex-col gap-2">
        {items.map(t=>(
          <div key={t.id} className={cn(
            "relative rounded-xl border px-3 py-2 text-sm shadow-sm",
            t.type==="ok" ? "border-green-300 bg-green-50 text-green-800" :
            t.type==="warn" ? "border-yellow-300 bg-yellow-50 text-yellow-800" :
            "border-red-300 bg-red-50 text-red-800"
          )}>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{t.type==="ok"?"Success":t.type==="warn"?"Heads up":"Error"}</span>
              <span className="opacity-70">{t.text}</span>
            </div>
            <button onClick={()=>dismiss(t.id)} className="absolute right-1 top-1 text-xs text-gray-500 hover:text-gray-800">×</button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────── Inbox: integrated view (no iframe, no new header) ───────── */
function InboxViewIntegrated({ plannerEmail, onToast, onBadgeRefresh }){
  const [users,setUsers]=useState([]);
  const [selectedUser,setSelectedUser]=useState("");
  const [rows,setRows]=useState([]);
  const [status,setStatus]=useState("new"); // "new" | "assigned" | "archived"
  const [loading,setLoading]=useState(false);

  // Deep-link support: when landing on inbox view, prefer NEW; if empty, auto-load ASSIGNED
  useEffect(()=>{ (async ()=>{
    await loadUsers();
    await loadInbox("new", { fallbackToAssigned: true });
  })(); /* eslint-disable-next-line */},[]);

  async function fetchJSON(url){
    const sep = url.includes("?") ? "&" : "?";
    const noCacheUrl = `${url}${sep}t=${Date.now()}`;
    const r = await fetch(noCacheUrl, { cache: "no-store" });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json().catch(()=> ({}));
  }

  async function loadUsers(){
    try{
      const url = `/api/users?op=list&plannerEmail=${encodeURIComponent(plannerEmail)}&status=all`;
      const body = await fetchJSON(url);
      const list = body?.users || body?.data || [];
      setUsers(list);
      // Do not auto-select; dropdown serves both NEW (assign target) and ASSIGNED (context)
    }catch{/* noop */}
  }

  function mapBundle(b){
    return {
      id: b.id || b.inboxId,
      title: b.title,
      startDate: b.start_date || b.startDate,
      timezone: b.timezone,
      assignedEmail: b.assigned_user_email || b.assigned_user || null
    };
  }

  function preselectIfUniformAssigned(bundles, viewStatus){
    if (viewStatus !== "assigned") return;
    const emails = (bundles||[])
      .map(b => (b.assigned_user_email || b.assigned_user || "").toString().trim())
      .filter(Boolean).map(e=>e.toLowerCase());
    if (emails.length===0) return;
    const uniq = Array.from(new Set(emails));
    if (uniq.length===1) {
      const email = uniq[0];
      const found = (users||[]).find(u => String(u.email||"").toLowerCase()===email);
      if (found) setSelectedUser(found.email);
    }
  }

  async function loadInbox(nextStatus="new", { fallbackToAssigned=false } = {}){
    setLoading(true);
    setRows([]);
    setStatus(nextStatus);
    try{
      const url = `/api/inbox?plannerEmail=${encodeURIComponent(plannerEmail)}&status=${encodeURIComponent(nextStatus)}`;
      const body = await fetchJSON(url);
      const bundles = body?.bundles || body?.data || body || [];
      if (nextStatus==="new" && fallbackToAssigned && (!Array.isArray(bundles) || bundles.length===0)){
        setLoading(false);
        return loadInbox("assigned", { fallbackToAssigned:false });
      }
      setRows(Array.isArray(bundles) ? bundles.map(mapBundle) : []);
      preselectIfUniformAssigned(bundles, nextStatus);
    }catch(e){
      onToast?.("error", "Failed to load inbox");
    }
    setLoading(false);
  }

  async function assignBundle(inboxId){
    const userEmail = selectedUser;
    if (!userEmail) return; // require selection; no extra UI
    try{
      await fetch("/api/inbox/assign",{
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ plannerEmail, inboxId, userEmail })
      });
      // After assignment, reload NEW; if empty, fall back to ASSIGNED
      loadInbox("new", { fallbackToAssigned:true });
      // Refresh badge count after assignment
      onBadgeRefresh?.();
      onToast?.("ok","Assigned");
    }catch{
      onToast?.("error","Assign failed");
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-base sm:text-lg font-semibold">Inbox — New Bundles</div>
        <div className="flex items-center gap-3">
          <label htmlFor="inboxUserSelect" className="text-sm">Assign to:</label>
          <select
            id="inboxUserSelect"
            value={selectedUser || ""}
            onChange={(e)=>setSelectedUser(e.target.value)}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Select…</option>
            {users.map(u=>(
              <option key={u.email} value={u.email}>{u.email}</option>
            ))}
          </select>

          <button onClick={()=>loadInbox("new")} className="rounded-xl border px-2.5 py-1.5 text-sm hover:bg-gray-50">Load NEW</button>
          <button onClick={()=>loadInbox("assigned")} className="rounded-xl border px-2.5 py-1.5 text-sm hover:bg-gray-50">Load ASSIGNED</button>
          <button onClick={()=>loadInbox("archived")} className="rounded-xl border px-2.5 py-1.5 text-sm hover:bg-gray-50">Load ARCHIVED</button>
          <button onClick={()=>loadInbox("new", { fallbackToAssigned:true })} className="rounded-xl border px-2.5 py-1.5 text-sm hover:bg-gray-50">Refresh</button>
        </div>
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-500">
              <th className="py-1.5 px-2">Title</th>
              <th className="py-1.5 px-2">Start Date</th>
              <th className="py-1.5 px-2">Timezone</th>
              <th className="py-1.5 px-2">Inbox ID</th>
              <th className="py-1.5 px-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} className="py-4 text-center text-gray-500">Loading {status.toUpperCase()}…</td></tr>
            )}
            {!loading && rows.length===0 && (
              <tr><td colSpan={5} className="py-4 text-center text-gray-500">No bundles.</td></tr>
            )}
            {!loading && rows.map(b=>(
              <tr key={b.id} className="border-t align-top">
                <td className="py-1.5 px-2">{b.title}</td>
                <td className="py-1.5 px-2">{b.startDate || ""}</td>
                <td className="py-1.5 px-2">{b.timezone || ""}</td>
                <td className="py-1.5 px-2"><code className="text-xs">{b.id}</code></td>
                <td className="py-1.5 px-2">
                  <div className="flex gap-1.5">
                    <a
                      href={`/review.html?inboxId=${encodeURIComponent(b.id)}`}
                      className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-50"
                    >Review</a>
                    <button
                      disabled={status!=="new"}
                      onClick={()=>assignBundle(b.id)}
                      className={cn("rounded-lg border px-2 py-1 text-xs", status==="assigned" ? "opacity-60 cursor-not-allowed" : "hover:bg-gray-50")}
                    >
                      Assign
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ───────── Inbox Drawer (legacy; not used) ───────── */
function InboxDrawer({ plannerEmail, onClose }){
  const [query,setQuery]=useState("");
  const [items,setItems]=useState([]);
  const [loading,setLoading]=useState(false);
  const [sel,setSel]=useState({});

  async function search(){
    setLoading(true);
    try{
      const r=await fetch(`/api/inbox/search?q=${encodeURIComponent(query)}&plannerEmail=${encodeURIComponent(plannerEmail)}`);
      const j=await r.json();
      setItems(j.results||[]);
      const m={}; for (const r of (j.results||[])) m[r.id]=false; setSel(m);
    }catch(e){/* noop */}
    setLoading(false);
  }
  useEffect(()=>{ if (query.trim().length===0) setItems([]); },[query]);

  return (
    <div className="fixed inset-0 z-50 bg-black/10 p-2 sm:p-4">
      <div className="mx-auto max-w-2xl rounded-xl border bg-white p-3 sm:p-4 shadow-lg">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-semibold">Inbox</div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100" aria-label="Close"><X className="h-4 w-4" /></button>
        </div>

        <div className="mb-2 flex gap-2">
          <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search..." className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm" />
          <button onClick={search} className="rounded-xl border px-2 py-1 text-sm hover:bg-gray-50"><Search className="h-4 w-4" /></button>
        </div>

        <div className="max-h-[50vh] overflow-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-500">
                <th className="py-1.5 px-2">Pick</th>
                <th className="py-1.5 px-2">Title</th>
                <th className="py-1.5 px-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {items.map(r=>(
                <tr key={r.id} className="border-t">
                  <td className="py-1.5 px-2"><input type="checkbox" checked={!!sel[r.id]} onChange={()=>setSel(s=>({ ...s, [r.id]: !s[r.id] }))} /></td>
                  <td className="py-1.5 px-2">{r.title}</td>
                  <td className="py-1.5 px-2 text-gray-500">{r.notes||"—"}</td>
                </tr>
              ))}
              {(!items||items.length===0) && (
                <tr><td colSpan={3} className="py-4 text-center text-gray-500">{loading?"Searching…":"No results"}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="text-xs text-gray-500">Search your inbox items to add to a plan.</div>
          <button onClick={onClose} className="rounded-xl bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-black">Done</button>
        </div>
      </div>
    </div>
  );
}

/* ───────── Modal + Calendar (LOCAL) ───────── */
function Modal({ title, onClose, children }){
  useEffect(()=>{
    function onKey(e){ if (e.key==="Escape") onClose?.(); }
    document.addEventListener("keydown", onKey);
    return ()=>document.removeEventListener("keydown", onKey);
  },[onClose]);
  return (
    <div className="fixed inset-0 z-50 bg-black/10 p-2 sm:p-4">
      <div className="mx-auto max-w-lg rounded-xl border bg-white p-3 sm:p-4 shadow-lg">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-semibold">{title}</div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100" aria-label="Close"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
function CalendarGridFree({ initialDate, selectedDate, onPick }){
  const init = parseYMDLocal(initialDate) || new Date();
  const sel = parseYMDLocal(selectedDate) || init;
  const [vm,setVm]=useState(()=>new Date(sel.getFullYear(), sel.getMonth(), 1));

  function same(d1,d2){ return d2 && d1.getFullYear()===d2.getFullYear() && d1.getMonth()===d2.getMonth() && d1.getDate()===d2.getDate(); }

  const weeks = useMemo(()=>{
    const out=[];
    const firstDow=new Date(vm.getFullYear(), vm.getMonth(), 1).getDay();
    const start=new Date(vm.getFullYear(), vm.getMonth(), 1-firstDow);
    let cur = new Date(start);
    for (let r=0;r<6;r++){
      const row=[];
      for (let c=0;c<7;c++){ row.push(new Date(cur)); cur = addDaysLocal(cur,1); }
      out.push(row);
    }
    return out;
  },[vm]);

  const monthLabel = (d)=> format(d, "LLLL yyyy");

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button className="rounded-lg border px-2 py-1 text-xs" onClick={()=>setVm(v=>new Date(v.getFullYear()-1, v.getMonth(), 1))} title="Prev year"><ChevronsLeft className="h-3 w-3" /></button>
          <button className="rounded-lg border px-2 py-1 text-xs" onClick={()=>setVm(v=>new Date(v.getFullYear(), v.getMonth()-1, 1))} title="Prev month"><ChevronLeft className="h-3 w-3" /></button>
          <div className="px-2 text-sm font-semibold">{monthLabel(vm)}</div>
          <button className="rounded-lg border px-2 py-1 text-xs" onClick={()=>setVm(v=>new Date(v.getFullYear(), v.getMonth()+1, 1))} title="Next month"><ChevronRight className="h-3 w-4" /></button>
          <button className="rounded-lg border px-2 py-1 text-xs" onClick={()=>setVm(v=>new Date(v.getFullYear()+1, v.getMonth(), 1))} title="Next year"><ChevronsRight className="h-3 w-3" /></button>
        </div>
        <button className="rounded-lg border px-2 py-1 text-xs" onClick={()=>setVm(new Date(init.getFullYear(), init.getMonth(), 1))}>Jump to current</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-gray-500 mb-1">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=><div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {weeks.map((row,ri)=>row.map((c,ci)=>(
          <button key={`${ri}-${ci}`} type="button"
            onClick={()=>onPick?.(fmtYMDLocal(c))}
            className={cn(
              "rounded-lg border px-2 py-2 text-sm",
              c.getMonth()===vm.getMonth() ? "bg-white hover:bg-gray-50" : "bg-gray-50 text-gray-400",
              same(c, parseYMDLocal(selectedDate)||new Date(0)) ? "border-gray-800 ring-1 ring-gray-700" : "border-gray-300"
            )}
          >
            {c.getDate()}
          </button>
        )))}
      </div>
    </div>
  );
}

/* ───────── Plan view ───────── */
function PlanView({ plannerEmail, selectedUserEmailProp, urlUser, onToast, onUserChange }){
  const [users,setUsers]=useState([]);
  const [selectedUserEmail,setSelectedUserEmail]=useState("");
  const [plan,setPlan]=useState({ title:"Weekly Plan", description:"", startDate: format(new Date(),"yyyy-MM-dd"), timezone:"America/Chicago" });
  const [tasks,setTasks]=useState([]);
  const [replaceMode,setReplaceMode]=useState(false);
  const [msg,setMsg]=useState("");
  const [planDateOpen,setPlanDateOpen]=useState(false);
  const [histReloadKey,setHistReloadKey]=useState(0);
  const [activeTab,setActiveTab]=useState("plan");
  const [newBundleCount,setNewBundleCount]=useState(0);
  const [taskMode,setTaskMode]=useState("manual");
  const [planningMode,setPlanningMode]=useState("ai-assisted"); // "full-ai", "ai-assisted", "manual"

  useEffect(()=>{ 
    if (urlUser) {
      setSelectedUserEmail(urlUser);
    } else if (selectedUserEmailProp) {
      setSelectedUserEmail(selectedUserEmailProp);
    }
  },[urlUser, selectedUserEmailProp]);

  useEffect(()=>{ (async ()=>{
    const qs=new URLSearchParams({ op:"list", plannerEmail, status:"all" });
    const r=await fetch(`/api/users?${qs.toString()}`); const j=await r.json();
    const arr = (j.users||[]).map(u => ({ ...u, email: u.email || u.userEmail || u.user_email || "" }));
    setUsers(arr);
    if (!selectedUserEmail) {
      const fromUrl = urlUser && arr.find(a=>a.email===urlUser)?.email;
      const fromProp = selectedUserEmailProp && arr.find(a=>a.email===selectedUserEmailProp)?.email;
      const connected = arr.find(u=>u.status==="connected")?.email;
      const fallback = arr[0]?.email || "";
      const newUser = fromUrl || fromProp || connected || fallback || "";
      setSelectedUserEmail(newUser);
      if (newUser && !urlUser) {
        onUserChange?.(newUser);
      }
    }
  })(); },[plannerEmail]);

  useEffect(()=>{ setTasks([]); setMsg(""); },[selectedUserEmail]);

  async function loadNewBundleCount(){
    if (!selectedUserEmail) { setNewBundleCount(0); return; }
    try{
      const qs = new URLSearchParams({ plannerEmail, status: "assigned" });
      const r = await fetch(`/api/inbox?${qs.toString()}`);
      const j = await r.json();
      
      const userBundles = (j.bundles || []).filter(b => 
        (b.assigned_user_email || b.assigned_user) === selectedUserEmail
      );
      
      const newCount = userBundles.filter(b => !b.reviewed_at).length;
      setNewBundleCount(newCount);
    }catch(e){
      setNewBundleCount(0);
    }
  }

  useEffect(()=>{ loadNewBundleCount(); },[selectedUserEmail, plannerEmail]);
  
  // Reload bundle count when switching to Assigned tab
  useEffect(()=>{ 
    if (activeTab === "assigned") {
      loadNewBundleCount(); 
    }
  },[activeTab]);

  async function markBundleAsReviewed(inboxId){
    try{
      const r = await fetch('/api/inbox/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plannerEmail, inboxId })
      });
      const j = await r.json();
      if (!r.ok || j.error) {
        console.error('Failed to mark bundle as reviewed:', j.error);
      }
    }catch(e){
      console.error('Failed to mark bundle as reviewed:', e);
    }
  }

  const planDateText = format(parseYMDLocal(plan.startDate)||new Date(),"EEE MMM d, yyyy");

  const applyPrefill = useCallback(({ plan: rp, tasks: rt, mode })=>{
    try{
      setPlan(p=>({
        ...p,
        title: rp?.title ?? p.title,
        startDate: rp?.startDate ?? p.startDate,
        timezone: rp?.timezone ?? p.timezone
      }));
      setReplaceMode(mode === "replace");
      if (Array.isArray(rt)) {
        setTasks(rt.map(t=>({ id: uid(), ...t })));
        setMsg(`Restored ${rt.length} task(s) from history`);
        onToast?.("ok", `Restored ${rt.length} task(s)`);
      }
    }catch(e){ console.error("applyPrefill error", e); }
  },[onToast]);

  return (
    <div>
      {/* Folder Tabs Navigation - Floating on Gray Background */}
      <div className="flex items-center justify-between px-4">
        <div className="flex">
          <button
            onClick={() => setActiveTab("plan")}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg border transition-colors ${
              activeTab === "plan"
                ? "bg-white text-gray-900 border-gray-300 border-b-white -mt-1"
                : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            Plan
          </button>
          <button
            onClick={() => setActiveTab("assigned")}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg border transition-colors relative ${
              activeTab === "assigned"
                ? "bg-white text-gray-900 border-gray-300 border-b-white -mt-1"
                : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            Assigned
            {newBundleCount > 0 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                {newBundleCount} New
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("notes")}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg border transition-colors ${
              activeTab === "notes"
                ? "bg-white text-gray-900 border-gray-300 border-b-white -mt-1"
                : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            User Notes
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg border transition-colors ${
              activeTab === "history"
                ? "bg-white text-gray-900 border-gray-300 border-b-white -mt-1"
                : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            Templates & History
          </button>
        </div>
        
        {/* User Selection - Floating on Gray Background */}
        <div className="flex items-center gap-2 pb-2">
          <label className="text-sm font-medium text-gray-700">User:</label>
          <select
            value={selectedUserEmail || ""}
            onChange={(e)=>{
              const newUser = e.target.value;
              setSelectedUserEmail(newUser);
              onUserChange?.(newUser);
            }}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm min-w-[200px] bg-white"
            title={selectedUserEmail || "— Choose user —"}
          >
            <option value="">— Choose user —</option>
            {users.map(u=>(<option key={u.email} value={u.email} title={u.email}>
              {u.email}
            </option>))}
          </select>
        </div>
      </div>

      {/* Plan Tab Content */}
      {activeTab === "plan" && (
        <>
            {/* AI Decision Interface */}
            <AIPlanningDecision
              selectedUserEmail={selectedUserEmail}
              onModeSelect={(mode) => setPlanningMode(mode)}
              planningMode={planningMode}
            />

          {/* Plan Setup Section - Only show for AI-Assisted and Manual modes */}
          {planningMode !== "full-ai" && (
            <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm mt-6">
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-semibold">1</div>
                  <div className="text-base sm:text-lg font-semibold">Plan Setup</div>
                </div>
                <div className="text-sm text-gray-600 ml-8">Configure your plan details and settings</div>
                {!!msg && <div className="mt-2 ml-8 text-xs text-gray-600">{msg}</div>}
              </div>

              <div className="ml-8 space-y-4">
                {/* Plan Details */}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <label className="block">
                    <div className="mb-1 text-sm font-medium">Plan Name</div>
                    <input value={plan.title} onChange={(e)=>setPlan({...plan, title:e.target.value})} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm" placeholder="e.g., Week of Sep 1" />
                  </label>
                  <label className="block md:col-span-2">
                    <div className="mb-1 text-sm font-medium">Plan Description</div>
                    <input value={plan.description} onChange={(e)=>setPlan({...plan, description:e.target.value})} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm" placeholder="Brief description of this plan template" />
                  </label>
                  <label className="block">
                    <div className="mb-1 text-sm font-medium">Timezone</div>
                    <select value={plan.timezone} onChange={(e)=>setPlan({...plan, timezone:e.target.value})} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm">
                      {TIMEZONES.map(tz=><option key={tz} value={tz}>{tz}</option>)}
                    </select>
                  </label>
                  <div className="block">
                    <div className="mb-1 text-sm font-medium">Plan start date</div>
                    <button type="button" onClick={()=>setPlanDateOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50 whitespace-nowrap w-full justify-start">
                      <Calendar className="h-4 w-4" /> {planDateText}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Full AI Planning Interface */}
          {planningMode === "full-ai" && (
            <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm mt-6">
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-sm font-semibold">💬</div>
                  <div className="text-base sm:text-lg font-semibold">AI Planning Assistant</div>
                </div>
                <div className="text-sm text-gray-600 ml-8">Let's create your plan through conversation. I'll research, analyze, and build your complete plan.</div>
              </div>

              <div className="ml-8">
                <ConversationalAI
                  userEmail={selectedUserEmail}
                  plannerEmail={plannerEmail}
                  onPlanGenerated={(generatedPlan) => {
                    setPlan(generatedPlan.plan);
                    setTasks(generatedPlan.tasks);
                    onToast?.("ok", "AI has generated your complete plan!");
                  }}
                  onToast={onToast}
                />
              </div>
            </div>
          )}

      {planDateOpen && (
        <Modal title="Choose Plan Start Date" onClose={()=>setPlanDateOpen(false)}>
          <CalendarGridFree
            initialDate={plan.startDate}
            selectedDate={plan.startDate}
            onPick={(ymd)=>{ setPlan({...plan, startDate: ymd}); setPlanDateOpen(false); }}
          />
        </Modal>
      )}

      {/* Tasks Section - Different behavior based on planning mode */}
      {planningMode === "ai-assisted" && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm mt-6">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-sm font-semibold">2</div>
              <div className="text-base sm:text-lg font-semibold">Add Tasks with AI Assistance</div>
            </div>
            <div className="text-sm text-gray-600 ml-8">Create tasks manually with AI providing smart suggestions and recommendations.</div>
          </div>

          <div className="ml-8">
            <AIAssistedTaskEditor
              planStartDate={plan.startDate}
              userEmail={selectedUserEmail}
              plannerEmail={plannerEmail}
              onAdd={(items)=>{
                setTasks(prev=>[...prev, ...items.map(t=>({ id: uid(), ...t }))]);
                onToast?.("ok", `Added ${items.length} task${items.length>1?"s":""} to plan`);
              }}
              onToast={onToast}
            />
          </div>
        </div>
      )}

      {planningMode === "manual" && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm mt-6">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-sm font-semibold">2</div>
              <div className="text-base sm:text-lg font-semibold">Add Tasks</div>
            </div>
            <div className="text-sm text-gray-600 ml-8">Create tasks for your plan. Add multiple tasks to build a complete schedule.</div>
          </div>

          <div className="ml-8">
            <TaskEditor
              planStartDate={plan.startDate}
              onAdd={(items)=>{
                setTasks(prev=>[...prev, ...items.map(t=>({ id: uid(), ...t }))]);
                onToast?.("ok", `Added ${items.length} task${items.length>1?"s":""} to plan`);
              }}
            />
          </div>
        </div>
      )}

      {/* Deliver Section */}
      {tasks.length>0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm mt-6">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-sm font-semibold">3</div>
              <div className="text-base sm:text-lg font-semibold">Deliver to User</div>
            </div>
            <div className="text-sm text-gray-600 ml-8">Review your plan and deliver tasks to the selected user's Google Tasks.</div>
          </div>

          {/* Plan Details - Editable */}
          <div className="ml-8 mb-6 p-4 bg-gray-50 rounded-xl">
            <div className="text-sm font-medium text-gray-700 mb-3">Plan Details</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <label className="block">
                  <span className="font-medium text-gray-600">Plan Name:</span>
                  <input
                    value={plan.title}
                    onChange={(e) => setPlan({...plan, title: e.target.value})}
                    className="w-full mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="Enter plan name"
                  />
                </label>
              </div>
              <div>
                <label className="block">
                  <span className="font-medium text-gray-600">Start Date:</span>
                  <button
                    type="button"
                    onClick={() => setPlanDateOpen(true)}
                    className="w-full mt-1 inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50 justify-start"
                  >
                    <Calendar className="h-4 w-4" /> {planDateText}
                  </button>
                </label>
              </div>
              <div className="md:col-span-2">
                <label className="block">
                  <span className="font-medium text-gray-600">Description:</span>
                  <textarea
                    value={plan.description}
                    onChange={(e) => setPlan({...plan, description: e.target.value})}
                    className="w-full mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="Enter plan description"
                    rows="2"
                  />
                </label>
              </div>
              <div>
                <label className="block">
                  <span className="font-medium text-gray-600">Timezone:</span>
                  <select
                    value={plan.timezone}
                    onChange={(e) => setPlan({...plan, timezone: e.target.value})}
                    className="w-full mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                  </select>
                </label>
              </div>
            </div>
          </div>

          <div className="ml-8">
            <ComposerPreview
              plannerEmail={plannerEmail}
              selectedUserEmail={selectedUserEmail}
              plan={plan}
              tasks={tasks}
              setTasks={setTasks}
              replaceMode={replaceMode}
              setReplaceMode={setReplaceMode}
              msg={msg}
              setMsg={setMsg}
              onToast={onToast}
              onPushed={()=>{ /* can reload history */ }}
            />
          </div>
        </div>
      )}
        </>
      )}

      {/* Assigned Tab Content */}
      {activeTab === "assigned" && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm -mt-1 border-t-0">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-sm font-semibold">📦</div>
            <div className="text-base sm:text-lg font-semibold">Assigned Bundles</div>
          </div>
          <div className="text-sm text-gray-600 ml-8">Review and work with bundles assigned to this user.</div>
        </div>

        <div className="ml-8">
          <AssignedBundlesPanel 
            plannerEmail={plannerEmail} 
            userEmail={selectedUserEmail} 
            onToast={onToast}
            onReviewBundle={async (bundle) => {
              try {
                // First, fetch the full bundle data including tasks
                const qs = new URLSearchParams({ inboxId: bundle.id });
                const r = await fetch(`/api/inbox/get?${qs.toString()}`);
                const j = await r.json();
                
                if (!r.ok || j.error) {
                  onToast?.("error", `Failed to load bundle: ${j.error}`);
                  return;
                }
                
                const fullBundle = j.bundle;
                const bundleTasks = (fullBundle.tasks || []).map(t => ({
                  id: uid(),
                  title: t.title,
                  dayOffset: t.day_offset || 0,
                  time: t.time || '',
                  durationMins: t.duration_mins || null,
                  notes: t.notes || ''
                }));
                
                // Replace current tasks and plan details
                setTasks(bundleTasks);
                setPlan({
                  title: fullBundle.title || "Bundle Plan",
                  startDate: fullBundle.start_date || format(new Date(), "yyyy-MM-dd"),
                  timezone: fullBundle.timezone || "America/Chicago"
                });
                
                // Mark bundle as reviewed
                await markBundleAsReviewed(bundle.id);
                
                // Switch to Plan tab to show the loaded bundle
                setActiveTab("plan");
                
                // Show toast message
                onToast?.("ok", `Loaded bundle "${fullBundle.title}" into plan. Current tasks replaced.`);
              } catch (e) {
                console.error('Review error:', e);
                onToast?.("error", `Failed to load bundle: ${e.message}`);
              }
            }}
          />
        </div>
      </div>
      )}

      {/* User Notes Tab Content */}
      {activeTab === "notes" && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm -mt-1 border-t-0">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-semibold">📝</div>
              <div className="text-base sm:text-lg font-semibold">User Notes</div>
            </div>
            <div className="text-sm text-gray-600 ml-8">
              {selectedUserEmail ? (
                <>AI context and rules for <strong>{selectedUserEmail}</strong></>
              ) : (
                "Select a user to view and edit their notes"
              )}
            </div>
          </div>

          <div className="ml-8">
            {selectedUserEmail ? (
              <UserNotesManager
                userEmail={selectedUserEmail}
                plannerEmail={plannerEmail}
                onToast={onToast}
              />
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">👤</div>
                <div className="font-semibold mb-1">No User Selected</div>
                <div className="text-sm">Choose a user from the dropdown above to view and edit their notes</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* History Tab Content */}
      {activeTab === "history" && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm -mt-1 border-t-0">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-sm font-semibold">📋</div>
              <div className="text-base sm:text-lg font-semibold">Plan History</div>
            </div>
            <div className="text-sm text-gray-600 ml-8">View and restore previously delivered plans for this user.</div>
          </div>

          <div className="ml-8">
            <HistoryPanel plannerEmail={plannerEmail} userEmail={selectedUserEmail} reloadKey={0} onPrefill={applyPrefill} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────── Task editor ───────── */
function TaskEditor({ planStartDate, onAdd }){
  const [title,setTitle]=useState("");
  const [notes,setNotes]=useState("");
  const [taskDate,setTaskDate]=useState(planStartDate);
  const [taskDateOpen,setTaskDateOpen]=useState(false);
  const [time,setTime]=useState("");
  const [dur,setDur]=useState(60);

  const [repeat,setRepeat]=useState("none");    // none | daily | weekly | monthly | custom
  const [interval,setInterval]=useState(1);     // every N units (1 = every day/week/month)
  const [endMode,setEndMode]=useState("count"); // "horizon" | "until" | "count"
  const [count,setCount]=useState(4);
  const [untilDate,setUntilDate]=useState("");
  const [untilOpen,setUntilOpen]=useState(false);
  const [horizonMonths,setHorizonMonths]=useState(6);
  const [weeklyDays,setWeeklyDays]=useState([false,true,false,true,false,false,false]);
  const [monthlyMode,setMonthlyMode]=useState("dom"); // dom | dow

  useEffect(()=>{ if (!taskDate) setTaskDate(planStartDate); },[planStartDate]);

  function generate(){
    const name=title.trim(); if (!name) return;
    const planStart=parseYMDLocal(planStartDate)||new Date();
    const base=parseYMDLocal(taskDate)||planStart;
    const baseObj={ title:name, time: time || undefined, durationMins: Number(dur)||undefined, notes: notes || undefined };

    const added=[];
    function push(d){ const off=daysBetweenLocal(planStart, d); added.push({ ...baseObj, dayOffset: off }); }

    const step=Math.max(1, Number(interval)||1);

    if (repeat==="none"){ push(base); }

    if (repeat==="daily"){
      if (endMode==="count"){
        const n=Math.max(1, Number(count)||1);
        for (let i=0;i<n;i++){ push(addDaysLocal(base, i*step)); }
      } else if (endMode==="until"){
        const until=parseYMDLocal(untilDate)||addMonthsLocal(base, 1);
        let i=0; while (i<2000){ const d=addDaysLocal(base, i*step); if (d>until) break; push(d); i++; }
      } else {
        const end=addMonthsLocal(base, Math.max(1, Number(horizonMonths)||6));
        let i=0; for(;;){ const d=addDaysLocal(base, i*step); if (d>end) break; push(d); if(++i>2000) break; }
      }
    }

    if (repeat==="weekly"){
      const checked=weeklyDays.map((v,i)=>v?i:null).filter(v=>v!==null);
      if (checked.length===0) { alert("Pick at least one weekday."); return; }
      const baseDow=base.getDay();
      const baseStartOfWeek=addDaysLocal(base, -baseDow);
      const emitWeek=(weekIndex)=>{
        for(const dow of checked){
          const d=addDaysLocal(baseStartOfWeek, dow + weekIndex*7*step);
          if (d>=base) push(d);
        }
      };
      if (endMode==="count"){
        const n=Math.max(1, Number(count)||1);
        let week=0; while (added.length<n){ emitWeek(week); week++; }
        if (added.length>n) added.length=n;
      } else if (endMode==="until"){
        const until=parseYMDLocal(untilDate)||addMonthsLocal(base, 3);
        let week=0;
        while (week<520){
          emitWeek(week);
          const lastOff=added.length? (added[added.length-1].dayOffset||0) : 0;
          const lastDate = addDaysLocal(planStart, lastOff);
          if (lastDate>until) break;
          week++;
        }
      } else {
        const end=addMonthsLocal(base, Math.max(1, Number(horizonMonths)||6));
        let week=0;
        while (week<520){
          emitWeek(week);
          const lastOff=added.length? (added[added.length-1].dayOffset||0) : 0;
          const lastDate = addDaysLocal(planStart, lastOff);
          if (lastDate>end) break;
          week++;
        }
      }
    }

    if (repeat==="monthly"){
      const by=base.getFullYear(), bm=base.getMonth(), bd=base.getDate(), bw=base.getDay();
      const firstSame=firstWeekdayOfMonthLocal(by,bm,bw);
      const nth=Math.floor((base.getDate()-firstSame.getDate())/7)+1;
      const lastSame=lastWeekdayOfMonthLocal(by,bm,bw);
      const isLast=(base.getDate()===lastSame.getDate());
      const compute=(y,m0)=> monthlyMode==="dom"
        ? new Date(y,m0, Math.min(bd, lastDayOfMonthLocal(y,m0)))
        : (isLast ? lastWeekdayOfMonthLocal(y,m0,bw) : (nthWeekdayOfMonthLocal(y,m0,bw, Math.max(1,nth)) || lastWeekdayOfMonthLocal(y,m0,bw)));
      if (endMode==="count"){
        const n=Math.max(1, Number(count)||1);
        for (let i=0;i<n;i++){ const t=addMonthsLocal(base, i*step); push(compute(t.getFullYear(), t.getMonth())); }
      } else if (endMode==="until"){
        const until=parseYMDLocal(untilDate)||addMonthsLocal(base, 6);
        let i=0; while (i<240){ const t=addMonthsLocal(base, i*step); const d=compute(t.getFullYear(), t.getMonth()); if (d>until) break; push(d); i++; }
      } else {
        const end=addMonthsLocal(base, Math.max(1, Number(horizonMonths)||6));
        let i=0; while (i<240){ const t=addMonthsLocal(base, i*step); const d=compute(t.getFullYear(), t.getMonth()); if (d>end) break; push(d); i++; }
      }
    }

    if (repeat==="custom"){
      // Custom repeat uses weekly logic with selected days
      const checked=weeklyDays.map((v,i)=>v?i:null).filter(v=>v!==null);
      if (checked.length===0) { alert("Pick at least one weekday for custom repeat."); return; }

      const baseDow=base.getDay();
      const baseStartOfWeek=addDaysLocal(base, -baseDow);
      const emitWeek=(weekIndex)=>{
        for(const dow of checked){
          const d=addDaysLocal(baseStartOfWeek, dow + weekIndex*7*step);
          if (d>=base) push(d);
        }
      };

      if (endMode==="count"){
        const n=Math.max(1, Number(count)||1);
        let week=0; let total=0;
        while (total<n){
          emitWeek(week);
          total += checked.length;
          week++;
        }
      } else if (endMode==="until"){
        const until=parseYMDLocal(untilDate)||addMonthsLocal(base, 1);
        let week=0;
        while (week<2000){
          let anyAdded=false;
          for(const dow of checked){
            const d=addDaysLocal(baseStartOfWeek, dow + week*7*step);
            if (d>until) return;
            if (d>=base) { push(d); anyAdded=true; }
          }
          if (!anyAdded) break;
          week++;
        }
      } else {
        const end=addMonthsLocal(base, Math.max(1, Number(horizonMonths)||6));
        let week=0;
        while (week<2000){
          let anyAdded=false;
          for(const dow of checked){
            const d=addDaysLocal(baseStartOfWeek, dow + week*7*step);
            if (d>end) return;
            if (d>=base) { push(d); anyAdded=true; }
          }
          if (!anyAdded) break;
          week++;
        }
      }
    }

    if (added.length===0) return;
    onAdd(added);
    setTitle(""); setNotes("");
  }

  const taskDateText = format(parseYMDLocal(taskDate||planStartDate)||new Date(),"EEE MMM d, yyyy");

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-2 sm:p-3">
      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-2 sm:gap-3">
        <label className="block">
          <div className="mb-1 text-sm font-medium">Task title</div>
          <input value={title} onChange={(e)=>setTitle(e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm" placeholder='e.g., "Workout" or "Read 20 pages"' />
        </label>

        <label className="block">
          <div className="mb-1 text-sm font-medium">Notes (optional)</div>
          <input value={notes} onChange={(e)=>setNotes(e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm" />
        </label>
      </div>

      <div className="mt-2 grid grid-cols-1 sm:grid-cols-[repeat(3,minmax(0,1fr))] gap-2 sm:gap-3">
        <div className="block min-w-0">
          <div className="mb-1 text-sm font-medium">Task date</div>
          <button type="button" onClick={()=>setTaskDateOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50 whitespace-nowrap overflow-hidden h-10">
            <Calendar className="h-4 w-4 shrink-0" /> <span className="truncate">{taskDateText}</span>
          </button>
        </div>

        <label className="block min-w-0">
          <div className="mb-1 text-sm font-medium">Time (optional)</div>
          <TimeSelect value={time} onChange={setTime} />
        </label>

        <label className="block min-w-0">
          <div className="mb-1 text-sm font-medium">Duration (mins)</div>
          <input type="number" min={15} step={15} value={dur} onChange={(e)=>setDur(e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm h-10" />
        </label>
      </div>

      {taskDateOpen && (
        <Modal title="Choose Task Date" onClose={()=>setTaskDateOpen(false)}>
          <CalendarGridFree
            initialDate={taskDate || planStartDate}
            selectedDate={taskDate || planStartDate}
            onPick={(ymd)=>{ setTaskDate(ymd); setTaskDateOpen(false); }}
          />
        </Modal>
      )}

      {/* Recurrence */}
      <div className="mt-2 rounded-xl border border-gray-200 bg-white p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3">
          <div className="text-sm font-medium">Repeat</div>
          <select value={repeat} onChange={(e)=>setRepeat(e.target.value)} className="rounded-xl border border-gray-300 px-3 py-2 text-sm">
            <option value="none">Doesn't repeat</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        {/* Progressive disclosure - only show options when repeat is selected */}
        {repeat !== "none" && (
          <div className="space-y-3">
            {/* Daily options */}
            {repeat === "daily" && (
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <span className="text-sm">Every</span>
                <input type="number" min={1} value={interval} onChange={(e)=>setInterval(e.target.value)} className="w-16 rounded-xl border border-gray-300 px-2 py-1 text-sm" />
                <span className="text-sm">day(s)</span>
              </div>
            )}

            {/* Weekly options */}
            {repeat === "weekly" && (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <span className="text-sm">Every</span>
                  <input type="number" min={1} value={interval} onChange={(e)=>setInterval(e.target.value)} className="w-16 rounded-xl border border-gray-300 px-2 py-1 text-sm" />
                  <span className="text-sm">week(s) on:</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d,i)=>(
                    <button key={d} type="button" className={pill(weeklyDays[i])} onClick={()=>setWeeklyDays(v=>{const n=[...v]; n[i]=!n[i]; return n;})}>{d}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Monthly options */}
            {repeat === "monthly" && (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <span className="text-sm">Every</span>
                  <input type="number" min={1} value={interval} onChange={(e)=>setInterval(e.target.value)} className="w-16 rounded-xl border border-gray-300 px-2 py-1 text-sm" />
                  <span className="text-sm">month(s)</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <span className="text-sm">Pattern:</span>
                  <select value={monthlyMode} onChange={(e)=>setMonthlyMode(e.target.value)} className="rounded-xl border border-gray-300 px-2 py-1 text-sm">
                    <option value="dom">Same day of month</option>
                    <option value="dow">Same weekday pattern</option>
                  </select>
                </div>
              </div>
            )}

            {/* Custom options - "daily on Monday, Wednesday, Friday" */}
            {repeat === "custom" && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <span className="text-sm">Every</span>
                  <input type="number" min={1} value={interval} onChange={(e)=>setInterval(e.target.value)} className="w-16 rounded-xl border border-gray-300 px-2 py-1 text-sm" />
                  <span className="text-sm">week(s) on:</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d,i)=>(
                    <button key={d} type="button" className={pill(weeklyDays[i])} onClick={()=>setWeeklyDays(v=>{const n=[...v]; n[i]=!n[i]; return n;})}>{d}</button>
                  ))}
                </div>
              </div>
            )}

            {/* End conditions - show for all repeat types except none */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-3 border-t border-gray-100">
              <div className="text-sm font-medium">Ends</div>
              <select
                value={endMode}
                onChange={(e)=>setEndMode(e.target.value)}
                className="rounded-xl border border-gray-300 px-2 py-1 text-sm"
              >
                <option value="horizon">No end date</option>
                <option value="until">On date</option>
                <option value="count">After</option>
              </select>

              {endMode==="count" && (
                <>
                  <input
                    type="number"
                    min={1}
                    value={count}
                    onChange={(e)=>setCount(e.target.value)}
                    className="w-16 rounded-xl border border-gray-300 px-2 py-1 text-sm"
                  />
                  <span className="text-sm">occurrence(s)</span>
                </>
              )}

              {endMode==="until" && (
                <>
                  <span className="text-sm">Date</span>
                  <UntilDatePicker value={untilDate} setValue={setUntilDate} planStartDate={planStartDate} />
                </>
              )}

              {endMode==="horizon" && (
                <>
                  <span className="text-sm">Planning window (months)</span>
                  <input
                    type="number"
                    min={1}
                    value={horizonMonths}
                    onChange={(e)=>setHorizonMonths(e.target.value)}
                    className="w-16 rounded-xl border border-gray-300 px-2 py-1 text-sm"
                  />
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <button onClick={generate} className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-3 sm:px-4 py-2 text-sm font-semibold text-white hover:bg-black">
          <Plus className="h-4 w-4" /> Add to Plan
        </button>
        <div className="text-[11px] sm:text-xs text-gray-500 flex items-center gap-2">
          <Info className="h-3.5 w-3.5" /> Times are optional; recurrence supported above.
        </div>
      </div>
    </div>
  );
}

function UntilDatePicker({ value, setValue, planStartDate }){
  const [open,setOpen]=useState(false);
  const label = value ? format(parseYMDLocal(value)||new Date(),"MMM d, yyyy") : "Pick date";
  return (
    <>
      <button type="button" onClick={()=>setOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50">
        <Calendar className="h-4 w-4" />
        {label}
      </button>
      {open && (
        <Modal title="Choose Until Date" onClose={()=>setOpen(false)}>
          <CalendarGridFree
            initialDate={value || planStartDate}
            selectedDate={value || planStartDate}
            onPick={(ymd)=>{ setValue(ymd); setOpen(false); }}
          />
        </Modal>
      )}
    </>
  );
}

function pill(on){ return cn("rounded-full border px-2 py-1 text-xs sm:text-sm", on?"border-gray-800 bg-gray-900 text-white":"border-gray-300 bg-white hover:bg-gray-50"); }

/* ───────── Preview / Deliver ───────── */
function ComposerPreview({ plannerEmail, selectedUserEmail, plan, tasks, setTasks, replaceMode, setReplaceMode, msg, setMsg, onToast, onPushed }){
  const total=tasks.length;
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [editTaskData, setEditTaskData] = useState({});

  function editTask(task) {
    setEditingTask(task);
    setEditTaskData({
      title: task.title,
      dayOffset: task.dayOffset || 0,
      time: task.time || '',
      durationMins: task.durationMins || 60,
      notes: task.notes || ''
    });
  }

  function saveEditedTask() {
    if (!editingTask) return;
    
    setTasks(prev => prev.map(t => 
      t.id === editingTask.id 
        ? { ...t, ...editTaskData }
        : t
    ));
    
    setEditingTask(null);
    setEditTaskData({});
    onToast?.("ok", "Task updated successfully");
  }

  function cancelEdit() {
    setEditingTask(null);
    setEditTaskData({});
  }

  async function pushNow(){
    if (!selectedUserEmail) { setMsg("Choose a user first."); onToast?.("warn","Choose a user first"); return; }
    if (!plan.title?.trim()) { setMsg("Title is required."); onToast?.("warn","Title is required"); return; }
    if (!plan.startDate) { setMsg("Plan start date is required."); onToast?.("warn","Plan start date is required"); return; }
    if (!total) { setMsg("Add at least one task."); onToast?.("warn","Add at least one task"); return; }
    setMsg("Pushing…");
    try {
      const resp = await fetch("/api/push", {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          plannerEmail,
          userEmail: selectedUserEmail,
          listTitle: plan.title,
          timezone: plan.timezone,
          startDate: plan.startDate,
          mode: replaceMode ? "replace" : "append",
          items: tasks.map(t=>({ title:t.title, dayOffset:t.dayOffset, time:t.time, durationMins:t.durationMins, notes:t.notes }))
        })
      });
      const j = await resp.json();
      if (!resp.ok || j.error) throw new Error(j.error || "Push failed");

      try{
        const snap = await fetch("/api/history/snapshot",{
          method:"POST", headers:{ "Content-Type":"application/json" },
          body: JSON.stringify({
            plannerEmail,
            userEmail: selectedUserEmail,
            listTitle: plan.title,
            startDate: plan.startDate,
            timezone: plan.timezone,
            mode: replaceMode ? "replace" : "append",
            items: tasks.map(t=>({ title:t.title, dayOffset:t.dayOffset, time:t.time, durationMins:t.durationMins, notes:t.notes }))
          })
        });
        const sj = await snap.json();
        if (!snap.ok || sj.error) {
          onToast?.("warn", "Pushed, but could not save to History");
        }
      } catch (_e) {
        onToast?.("warn", "Pushed, but could not save to History");
      }

      const created = j.created || total;
      setMsg(`Success — ${created} task(s) created`);
      onToast?.("ok", `Pushed ${created} task${created>1?"s":""}`);
      
      // Save as template if checkbox is checked
      if (saveAsTemplate) {
        try {
          const templateResponse = await fetch('/api/templates/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              plannerEmail,
              name: plan.title,
              description: plan.description || `Template created from plan: ${plan.title}`,
              tasks: tasks
            })
          });
          
          const templateResult = await templateResponse.json();
          
          if (templateResult.ok) {
            onToast?.("ok", `Template "${plan.title}" saved to your library`);
          } else {
            throw new Error(templateResult.error || 'Template save failed');
          }
        } catch (e) {
          onToast?.("warn", `Tasks delivered successfully, but template save failed: ${e.message}`);
        }
      }
      
      setTasks([]);
      onPushed?.(created);
    } catch (e) {
      const m = String(e.message||e);
      setMsg("Error: "+m);
      onToast?.("error", m);
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-gray-200 p-3 sm:p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-sm font-semibold">Preview & Deliver</div>
        <label className="inline-flex items-center gap-2 text-xs whitespace-nowrap">
          <input type="checkbox" checked={replaceMode} onChange={(e)=>setReplaceMode(e.target.checked)} />
          Replace existing list
        </label>
      </div>

      {!!msg && <div className="mb-2 text-xs sm:text-sm text-gray-500">{msg}</div>}

      {total===0 ? (
        <div className="text-sm text-gray-500">No tasks yet.</div>
      ) : (
        <>
          <div className="mb-3 rounded-lg border overflow-x-auto">
            <table className="w-full min-w-[640px] text-xs sm:text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-gray-500">
                  <th className="py-1.5 px-2">Title</th>
                  <th className="py-1.5 px-2">Offset</th>
                  <th className="py-1.5 px-2">Time</th>
                  <th className="py-1.5 px-2">Dur</th>
                  <th className="py-1.5 px-2">Notes</th>
                  <th className="py-1.5 px-2 text-right w-40 sm:w-48">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(t=>(
                  <tr key={t.id} className="border-t">
                    <td className="py-1.5 px-2">{t.title}</td>
                    <td className="py-1.5 px-2">{String(t.dayOffset||0)}</td>
                    <td className="py-1.5 px-2">{t.time?to12hDisplay(t.time):"—"}</td>
                    <td className="py-1.5 px-2">{t.durationMins||"—"}</td>
                    <td className="py-1.5 px-2 text-gray-500 truncate max-w-[200px]">{t.notes||"—"}</td>
                    <td className="py-1.5 px-2">
                      <div className="flex flex-nowrap items-center justify-end gap-1.5 whitespace-nowrap">
                        <button onClick={()=>editTask(t)} className="inline-flex items-center rounded-lg border p-1.5 hover:bg-gray-50" title="Edit">
                          <Edit className="h-3.5 w-3.5" />
                          <span className="sr-only">Edit</span>
                        </button>
                        <button onClick={()=>setTasks(prev=>prev.filter(x=>x.id!==t.id))} className="inline-flex items-center rounded-lg border p-1.5 hover:bg-gray-50" title="Remove">
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="sr-only">Remove</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Task Editing Interface */}
          {editingTask && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <Edit className="h-4 w-4 text-blue-600" />
                  <div className="font-semibold text-blue-800">Edit Task</div>
                </div>
                <div className="text-sm text-blue-600">Modify the task details below</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Task Title</label>
                  <input
                    value={editTaskData.title}
                    onChange={(e) => setEditTaskData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                    placeholder="Enter task title"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Day Offset</label>
                  <input
                    type="number"
                    min="0"
                    value={editTaskData.dayOffset}
                    onChange={(e) => setEditTaskData(prev => ({ ...prev, dayOffset: parseInt(e.target.value) || 0 }))}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Time (optional)</label>
                  <TimeSelect 
                    value={editTaskData.time} 
                    onChange={(time) => setEditTaskData(prev => ({ ...prev, time }))} 
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Duration (minutes)</label>
                  <input
                    type="number"
                    min="15"
                    step="15"
                    value={editTaskData.durationMins}
                    onChange={(e) => setEditTaskData(prev => ({ ...prev, durationMins: parseInt(e.target.value) || 60 }))}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                    placeholder="60"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Notes (optional)</label>
                <textarea
                  value={editTaskData.notes}
                  onChange={(e) => setEditTaskData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm h-20 resize-none"
                  placeholder="Add any notes for this task"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={saveEditedTask}
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700"
                >
                  Save Changes
                </button>
                <button
                  onClick={cancelEdit}
                  className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-4">
            <label className="inline-flex items-center gap-2 text-sm">
              <input 
                type="checkbox" 
                checked={saveAsTemplate} 
                onChange={(e)=>setSaveAsTemplate(e.target.checked)} 
                className="rounded border-gray-300"
              />
              <span>
                Save as Template
                {saveAsTemplate && (
                  <span className="ml-1 text-xs text-gray-500">
                    (will save "{plan.title}" to your template library)
                  </span>
                )}
              </span>
            </label>
            <button onClick={pushNow} className="rounded-xl bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-black">
              Deliver to {selectedUserEmail || 'User'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ───────── Templates & History ───────── */
function HistoryPanel({ plannerEmail, userEmail, reloadKey, onPrefill }){
  const [rows,setRows]=useState([]);
  const [templates,setTemplates]=useState([]);
  const [page,setPage]=useState(1);
  const [pageSize,setPageSize]=useState(25);
  const [total,setTotal]=useState(0);
  const [templateTotal,setTemplateTotal]=useState(0);
  const [loading,setLoading]=useState(false);
  const [filter,setFilter]=useState('all'); // 'all', 'history', 'templates'
  const [searchQuery,setSearchQuery]=useState('');

  async function load(){
    if (!userEmail) { setRows([]); setTemplates([]); setTotal(0); setTemplateTotal(0); return; }
    setLoading(true);
    try{
      // Load history
      const historyR=await fetch(`/api/history/list`, {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ plannerEmail, userEmail, status: "active", page })
      });
      const historyJ=await historyR.json();
      setRows(historyJ.rows||[]);
      setTotal(historyJ.total||0);

      // Load templates
      const templateR=await fetch(`/api/templates/list?plannerEmail=${encodeURIComponent(plannerEmail)}&page=${page}&pageSize=${pageSize}`);
      const templateJ=await templateR.json();
      setTemplates(templateJ.templates||[]);
      setTemplateTotal(templateJ.total||0);
    }catch(e){/* noop */}
    setLoading(false);
  }
  useEffect(()=>{ load(); },[plannerEmail,userEmail,page,pageSize,reloadKey]);

  // Combine and filter data
  const allItems = [
    ...rows.map(r => ({ ...r, isTemplate: false })),
    ...templates.map(t => ({ ...t, isTemplate: true, startDate: 'Template' }))
  ].sort((a, b) => new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0));

  // Apply search filter
  const searchFilteredItems = searchQuery ? allItems.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
  ) : allItems;

  const filteredItems = filter === 'all' ? searchFilteredItems : 
                       filter === 'history' ? searchFilteredItems.filter(item => !item.isTemplate) :
                       searchFilteredItems.filter(item => item.isTemplate);

  const totalItems = filter === 'all' ? (total + templateTotal) :
                     filter === 'history' ? total : templateTotal;

  return (
    <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-3 sm:p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm font-semibold">Templates & History</div>
        <div className="text-xs text-gray-500">{filteredItems.length} of {totalItems} item(s)</div>
      </div>

      {/* Search and Controls */}
      <div className="mb-4 space-y-3">
        {/* Search Box */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search templates and history..."
            value={searchQuery}
            onChange={(e)=>setSearchQuery(e.target.value)}
            className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        {/* Filter Controls and Page Size */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-2">
            <button 
              onClick={()=>setFilter('all')} 
              className={`px-3 py-1 text-xs rounded-lg border ${filter === 'all' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
            >
              All ({total + templateTotal})
            </button>
            <button 
              onClick={()=>setFilter('history')} 
              className={`px-3 py-1 text-xs rounded-lg border ${filter === 'history' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
            >
              History ({total})
            </button>
            <button 
              onClick={()=>setFilter('templates')} 
              className={`px-3 py-1 text-xs rounded-lg border ${filter === 'templates' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
            >
              Templates ({templateTotal})
            </button>
          </div>

          {/* Page Size Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Show:</span>
            <select 
              value={pageSize} 
              onChange={(e)=>setPageSize(Number(e.target.value))}
              className="rounded-lg border border-gray-300 px-2 py-1 text-xs"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-500">
              <th className="py-1.5 px-2">Title</th>
              <th className="py-1.5 px-2">Type</th>
              <th className="py-1.5 px-2">Start</th>
              <th className="py-1.5 px-2">Items</th>
              <th className="py-1.5 px-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map(item=>(
              <tr key={`${item.isTemplate ? 'template' : 'history'}-${item.id}`} className="border-t">
                <td className="py-1.5 px-2">
                  <div className="flex items-center gap-2">
                    {item.title}
                    {item.isTemplate && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        Template
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-1.5 px-2">
                  {item.isTemplate ? (
                    <span className="text-blue-600 text-xs">Template</span>
                  ) : (
                    <span className="text-gray-600 text-xs">History</span>
                  )}
                </td>
                <td className="py-1.5 px-2">{item.startDate}</td>
                <td className="py-1.5 px-2">{item.itemsCount||"—"}</td>
                <td className="py-1.5 px-2">
                  <div className="flex justify-end">
                    {item.isTemplate ? (
                      <button 
                        onClick={()=>onPrefill?.({ 
                          plan:{ title:item.title, description:item.description, startDate:format(new Date(),"yyyy-MM-dd"), timezone:"America/Chicago" }, 
                          tasks:item.tasks, 
                          mode:"append" 
                        })} 
                        className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-50 text-blue-600 border-blue-200"
                      >
                        Use Template
                      </button>
                    ) : (
                      <button 
                        onClick={()=>onPrefill?.({ 
                          plan:{ title:item.title, startDate:item.startDate, timezone:item.timezone }, 
                          tasks:item.tasks, 
                          mode:item.mode 
                        })} 
                        className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-50"
                      >
                        Restore
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredItems.length === 0 && (
              <tr><td colSpan={5} className="py-6 text-center text-gray-500">
                {filter === 'all' ? 'No history or templates yet' :
                 filter === 'history' ? 'No history yet' : 'No templates yet'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-2 flex items-center justify-end gap-2">
        <button onClick={()=>setPage(p=>Math.max(1,p-1))} className="rounded-lg border px-2 py-1 text-xs"><ChevronLeft className="h-3 w-3" /></button>
        <div className="text-xs">Page {page}</div>
        <button onClick={()=>setPage(p=>p+1)} className="rounded-lg border px-2 py-1 text-xs"><ChevronRight className="h-3 w-3" /></button>
      </div>
    </div>
  );
}

/* ───────── Assigned Bundles Panel ───────── */
function AssignedBundlesPanel({ plannerEmail, userEmail, onToast, onReviewBundle }){
  const [bundles,setBundles]=useState([]);
  const [loading,setLoading]=useState(false);

  async function load(){
    if (!userEmail) { setBundles([]); return; }
    setLoading(true);
    try{
      const qs=new URLSearchParams({ plannerEmail, status:"assigned" });
      const r=await fetch(`/api/inbox?${qs.toString()}`);
      const j=await r.json();
      
      // Filter bundles assigned to the current user
      const userBundles = (j.bundles||[]).filter(b => 
        (b.assigned_user_email || b.assigned_user) === userEmail
      );
      setBundles(userBundles);
    }catch(e){
      console.error('Failed to load assigned bundles:', e);
      onToast?.("error", "Failed to load assigned bundles");
    }
    setLoading(false);
  }

  async function archiveBundle(inboxId){
    try{
      const r=await fetch('/api/inbox/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plannerEmail, inboxId })
      });
      const j=await r.json();
      if (r.ok && !j.error) {
        onToast?.("ok", "Bundle archived");
        load(); // Reload the list
      } else {
        throw new Error(j.error || "Archive failed");
      }
    }catch(e){
      console.error('Archive failed:', e);
      onToast?.("error", "Failed to archive bundle");
    }
  }

  useEffect(()=>{ load(); },[plannerEmail, userEmail]);

  if (!userEmail) {
    return (
      <div className="text-sm text-gray-500 py-4 text-center">
        Select a user to view their assigned bundles
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-3 sm:p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold">Assigned Bundles</div>
          {bundles.filter(b => !b.reviewed_at).length > 0 && (
            <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 border border-red-200">
              {bundles.filter(b => !b.reviewed_at).length} new
            </span>
          )}
        </div>
        <div className="text-xs text-gray-500">{bundles.length} bundle(s)</div>
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-500">
              <th className="py-1.5 px-2">Title</th>
              <th className="py-1.5 px-2">Start Date</th>
              <th className="py-1.5 px-2">Timezone</th>
              <th className="py-1.5 px-2">Tasks</th>
              <th className="py-1.5 px-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="py-6 text-center text-gray-500">Loading...</td></tr>
            ) : bundles.length === 0 ? (
              <tr><td colSpan={5} className="py-6 text-center text-gray-500">No assigned bundles</td></tr>
            ) : bundles.map(b=>{
              const isNew = !b.reviewed_at;
              return (
                <tr key={b.id} className={`border-t ${isNew ? 'bg-blue-50' : ''}`}>
                  <td className="py-1.5 px-2">
                    <div className="flex items-center gap-2">
                      {b.title || "Untitled Bundle"}
                      {isNew && (
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-600">
                          New
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-1.5 px-2">{b.start_date || b.startDate || "—"}</td>
                  <td className="py-1.5 px-2">{b.timezone || "—"}</td>
                  <td className="py-1.5 px-2">{b.tasks?.length || 0}</td>
                  <td className="py-1.5 px-2">
                    <div className="flex justify-end gap-1">
                    <button 
                      onClick={()=>onReviewBundle?.(b)}
                      className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-50"
                    >
                      Review
                    </button>
                      <button 
                        onClick={()=>archiveBundle(b.id)}
                        className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-50 text-gray-600"
                      >
                        Archive
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-2 text-xs text-gray-500">
        Click "Review" to edit tasks before pushing to Google Tasks, or "Archive" to remove from assigned list.
      </div>
    </div>
  );
}

/* ───────── Users view — Active/Archived/Deleted ───────── */
function UsersView({ plannerEmail, onToast, onManage }){
  const [rows,setRows]=useState([]);
  const [filter,setFilter]=useState("");
  const [groups,setGroups]=useState({});
  const [bundleCounts,setBundleCounts]=useState({});

  // Tabs: active | archived | deleted
  const [tab,setTab]=useState("active");

  // Category modal state
  const [catOpen,setCatOpen]=useState(false);
  const [catUserEmail,setCatUserEmail]=useState("");
  const [catAssigned,setCatAssigned]=useState([]);

  // Derived global categories (union) for the planner
  const allCats = useMemo(()=>{
    const set = new Map();
    const eat = (arr)=> (arr||[]).forEach(g=>{
      const s=String(g||"").trim();
      if (!s) return;
      const k=s.toLowerCase();
      if (!set.has(k)) set.set(k, s);
    });
    for (const r of rows) eat(groups[r.email] ?? r.groups);
    return Array.from(set.values()).sort((a,b)=>a.localeCompare(b));
  },[rows, groups]);

  useEffect(()=>{ load(); },[plannerEmail, tab]);

  async function load(){
    const qs=new URLSearchParams({ plannerEmail, status: tab });
    const r=await fetch(`/api/users?${qs.toString()}`); const j=await r.json();
    const arr = (j.users||[]).map(u => ({ ...u, email: u.email || u.userEmail || u.user_email || "" }));
    setRows(arr);
    
    // Load bundle counts for each user
    loadBundleCounts(arr);
  }

  async function loadBundleCounts(users){
    const counts = {};
    for (const user of users) {
      try {
        const qs = new URLSearchParams({ plannerEmail, status: "assigned" });
        const r = await fetch(`/api/inbox?${qs.toString()}`);
        const j = await r.json();
        
        // Filter bundles assigned to this user
        const userBundles = (j.bundles || []).filter(b => 
          (b.assigned_user_email || b.assigned_user) === user.email
        );
        
        const newCount = userBundles.filter(b => !b.reviewed_at).length;
        const totalCount = userBundles.length;
        
        counts[user.email] = { new: newCount, total: totalCount };
      } catch (e) {
        counts[user.email] = { new: 0, total: 0 };
      }
    }
    setBundleCounts(counts);
  }

  async function saveGroups(email, nextList){
    try{
      const body={ plannerEmail, userEmail: email, groups: nextList };
      const r=await fetch("/api/users",{ method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(body) });
      const j=await r.json();
      if (!r.ok || j.error) throw new Error(j.error||"Save failed");
      onToast?.("ok", `Categories saved for ${email}`);
    }catch(e){ onToast?.("error", String(e.message||e)); }
  }

  function openCats(email){
    const list = groups[email] ?? rows.find(x=>x.email===email)?.groups ?? [];
    setCatUserEmail(email);
    setCatAssigned(list);
    setCatOpen(true);
  }

  async function doArchive(email, archived){
    try{
      const r = await fetch("/api/users/archive",{
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ plannerEmail, userEmail: email, archived })
      });
      const j = await r.json();
      if (!r.ok || j.error) throw new Error(j.error || "Archive failed");

      // Immediate UI update
      setRows(prev => prev.filter(x => x.email !== email));
      onToast?.("ok", `${archived ? "User archived" : "User restored"}: ${email}`);

      // Gentle background refresh
      setTimeout(()=>{ load(); }, 400);
    } catch(e){
      onToast?.("error", String(e.message||e));
    }
  }

  // Soft delete (to status=deleted); allowed only in "archived" tab
  async function doSoftDelete(email){
    try{
      const r = await fetch("/api/users/remove",{
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ plannerEmail, userEmail: email })
      });
      const j = await r.json();
      if (!r.ok || j.error) throw new Error(j.error || "Delete failed");
      setRows(prev => prev.filter(x => x.email !== email));
      onToast?.("ok", `User moved to Deleted: ${email}`);
      setTimeout(()=>{ load(); }, 400);
    } catch(e){
      onToast?.("error", String(e.message||e));
    }
  }

  // NEW: Cancel invite (invite-only pending rows)
  async function doCancelInvite(email){
    try{
      const r = await fetch("/api/invite/remove",{
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ plannerEmail, userEmail: email })
      });
      const j = await r.json();
      if (!r.ok || j.error) throw new Error(j.error || "Cancel invite failed");
      setRows(prev => prev.filter(x => x.email !== email));
      onToast?.("ok", `Invite canceled: ${email}`);
      setTimeout(()=>{ load(); }, 400);
    } catch (e){
      onToast?.("error", String(e.message||e));
    }
  }

  // Permanent purge; allowed only in "deleted" tab
  async function doPurge(email){
    if (!confirm(`Permanently delete ${email}? This cannot be undone.`)) return;
    try{
      const r = await fetch("/api/users/purge",{
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ plannerEmail, userEmail: email })
      });
      const j = await r.json();
      if (!r.ok || j.error) throw new Error(j.error || "Purge failed");
      setRows(prev => prev.filter(x => x.email !== email));
      onToast?.("ok", `Permanently deleted: ${email}`);
      setTimeout(()=>{ load(); }, 400);
    } catch(e){
      onToast?.("error", String(e.message||e));
    }
  }

  function onCatsSaved(email, nextList){
    setGroups(prev=>({ ...prev, [email]: nextList }));
    saveGroups(email, nextList);
  }

  const visible = rows.filter(r=>!filter || (r.email||"").toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold">Users</div>
          {/* Active / Archived / Deleted toggle */}
          <div className="ml-2 inline-flex rounded-xl border overflow-hidden">
            <button
              onClick={()=>setTab("active")}
              className={cn("px-2.5 py-1 text-xs", tab==="active" ? "bg-gray-900 text-white" : "bg-white hover:bg-gray-50")}
            >
              Active
            </button>
            <button
              onClick={()=>setTab("archived")}
              className={cn("px-2.5 py-1 text-xs border-l", tab==="archived" ? "bg-gray-900 text-white" : "bg-white hover:bg-gray-50")}
            >
              Archived
            </button>
            <button
              onClick={()=>setTab("deleted")}
              className={cn("px-2.5 py-1 text-xs border-l", tab==="deleted" ? "bg-gray-900 text-white" : "bg-white hover:bg-gray-50")}
            >
              Deleted
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input value={filter} onChange={(e)=>setFilter(e.target.value)} placeholder="Search…" className="rounded-xl border border-gray-300 px-2 py-1 text-sm" />
          <button onClick={load} className="rounded-xl border px-2 py-1 text-sm hover:bg-gray-50"><RotateCcw className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-500">
              <th className="py-1.5 px-2">Email</th>
              <th className="py-1.5 px-2">Status</th>
              <th className="py-1.5 px-2">Categories</th>
              <th className="py-1.5 px-2 text-right w-[24rem]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(r=>{
              const list = (groups[r.email] ?? r.groups ?? []).slice().sort((a,b)=>a.localeCompare(b));
              const pills = list.slice(0,2);
              const count = list.length;
              const isArchived = (r.status||"").toLowerCase()==="archived";
              const isDeleted = (r.status||"").toLowerCase()==="deleted";
              const isPendingInvite = !isArchived && !isDeleted && ((r.status||"").toLowerCase()==="pending") && (r.__source==="invite");

              const bundleInfo = bundleCounts[r.email] || { new: 0, total: 0 };
              return (
                <tr key={r.email} className={`border-t align-top ${bundleInfo.new > 0 ? 'bg-blue-50' : ''}`}>
                  <td className="py-1.5 px-2">{r.email || "Unknown"}</td>
                  <td className="py-1.5 px-2">
                    <span className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-xs border",
                      isDeleted ? "border-red-300 text-red-700 bg-red-50" :
                      isArchived ? "border-gray-300 text-gray-600 bg-gray-50" :
                      (r.status==="connected" ? "border-emerald-300 text-emerald-800 bg-emerald-50" : "border-gray-300 text-gray-700 bg-white")
                    )}>
                      {r.status||"—"}
                    </span>
                  </td>
                  <td className="py-1.5 px-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {pills.map(g=>(
                        <span key={g} className="inline-flex max-w-[140px] items-center gap-1 rounded-full border px-2 py-0.5 text-xs" title={g}>
                          <span className="truncate">{g}</span>
                        </span>
                      ))}
                      <button
                        onClick={()=>openCats(r.email)}
                        className="relative inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-xs hover:bg-gray-50 disabled:opacity-40"
                        aria-label={count===0 ? "Add categories" : "Edit categories"}
                        title={count===0 ? "Add categories" : "Edit categories"}
                        disabled={isDeleted}
                      >
                        <Tag className="h-3.5 w-3.5" />
                        {count===0 ? (
                          <span className="absolute -top-1 -right-1 inline-flex h-4 w-4 items-center justify-center rounded-full border bg-white text-[10px] font-bold">+</span>
                        ) : (
                          <span className="absolute -top-1 -right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-gray-900 px-1 text-[10px] font-bold text-white">{count}</span>
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="py-1.5 px-2">
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      {!isArchived && !isDeleted && (
                        <>
                          <button
                            onClick={()=>onManage?.(r.email)}
                            className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-50 relative"
                            title="Open Plan view for this user"
                          >
                            Plan
                            {bundleInfo.new > 0 && (
                              <span className="absolute -top-1 -right-1 inline-flex items-center justify-center rounded-full bg-red-600 text-white text-[10px] font-bold w-4 h-4">
                                {bundleInfo.new}
                              </span>
                            )}
                          </button>

                          {/* NEW: Cancel invite for pending invite-only rows */}
                          {isPendingInvite && (
                            <button
                              onClick={()=>doCancelInvite(r.email)}
                              className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-50"
                              title="Cancel pending invite"
                            >
                              Cancel invite
                            </button>
                          )}

                          <button
                            onClick={()=>doArchive(r.email, true)}
                            className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-50"
                            title="Archive this user connection"
                          >
                            Archive user
                          </button>
                        </>
                      )}

                      {isArchived && (
                        <>
                          <button
                            onClick={()=>doArchive(r.email, false)}
                            className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-50"
                            title="Restore user from archive"
                          >
                            Restore user
                          </button>
                          <button
                            onClick={()=>doSoftDelete(r.email)}
                            className="rounded-lg border px-2 py-1 text-xs hover:bg-red-50 text-red-700 border-red-300"
                            title="Move to Deleted (soft delete)"
                          >
                            Delete user
                          </button>
                        </>
                      )}

                      {isDeleted && (
                        <>
                          <button
                            onClick={()=>doArchive(r.email, false)}
                            className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-50"
                            title="Restore user (undelete)"
                          >
                            Restore user
                          </button>
                          <button
                            onClick={()=>doPurge(r.email)}
                            className="rounded-lg border px-2 py-1 text-xs hover:bg-red-50 text-red-700 border-red-300"
                            title="Permanently delete this user connection"
                          >
                            Permanently delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {visible.length===0 && (
              <tr><td colSpan={4} className="py-6 text-center text-gray-500">No users</td></tr>
            )}
          </tbody>
        </table>
      </div>


      {catOpen && (
        <CategoriesModal
          userEmail={catUserEmail}
          assigned={catAssigned}
          allCats={allCats}
          onClose={()=>setCatOpen(false)}
          onSave={(next)=>{ onCatsSaved(catUserEmail, next); setCatOpen(false); }}
          onToast={onToast}
        />
      )}
    </div>
  );
}

/* Categories Modal */
function CategoriesModal({ userEmail, assigned, allCats, onSave, onClose, onToast }){
  const [local,setLocal]=useState(()=>dedupeCaseInsensitive(assigned||[]));
  const [search,setSearch]=useState("");
  const [dirty,setDirty]=useState(false);

  useEffect(()=>{
    setLocal(dedupeCaseInsensitive(assigned||[]));
    setDirty(false);
    setSearch("");
  },[assigned]);

  const norm = (s)=> String(s||"")
    .normalize("NFD").replace(/\p{Diacritic}/gu,"")
    .toLowerCase().trim();

  const filtered = useMemo(()=>{
    const q = norm(search);
    const map = new Map();
    for (const c of allCats) map.set(norm(c), c);
    for (const c of local) if (!map.has(norm(c))) map.set(norm(c), c);
    let arr = Array.from(map.values());

    const selSet = new Set(local.map(x=>norm(x)));
    const score = (c)=>{
      const n = norm(c);
      let s = 0;
      if (selSet.has(n)) s -= 3;
      if (q){
        if (n.startsWith(q)) s -= 2;
        else if (n.includes(q)) s -= 1;
        else s += 5;
      }
      return s;
    };
    arr.sort((a,b)=>{
      const sa=score(a), sb=score(b);
      if (sa!==sb) return sa-sb;
      return a.localeCompare(b);
    });
    if (q){
      const matches = arr.filter(c=>norm(c).includes(q));
      const rest = arr.filter(c=>!norm(c).includes(q));
      return [...matches, ...rest];
    }
    return arr;
  },[allCats, local, search]);

  function toggle(c){
    const key = c.toLowerCase();
    const set = new Map(local.map(v=>[v.toLowerCase(), v]));
    if (set.has(key)) set.delete(key); else set.set(key, c);
    const next = Array.from(set.values()).sort((a,b)=>a.localeCompare(b));
    setLocal(next);
    setDirty(true);
  }

  function addFromQuery(){
    const raw = search.trim();
    if (!raw){ onToast?.("warn","Type a category name"); return; }
    const exists = local.some(x=>x.toLowerCase()===raw.toLowerCase()) || allCats.some(x=>x.toLowerCase()===raw.toLowerCase());
    if (exists){ onToast?.("warn","Category already exists"); return; }
    const next = dedupeCaseInsensitive([...local, raw]).sort((a,b)=>a.localeCompare(b));
    setLocal(next);
    setDirty(true);
    onToast?.("ok","Category added");
  }

  function doSave(){ onSave?.(local); }
  function maybeClose(){
    if (!dirty) return onClose?.();
    if (confirm("Discard unsaved changes?")) onClose?.();
  }

  const canQuickAdd = !!search.trim()
    && !allCats.some(x=>x.toLowerCase()===search.trim().toLowerCase())
    && !local.some(x=>x.toLowerCase()===search.trim().toLowerCase());

  return (
    <Modal title={`Categories`} onClose={maybeClose}>
      <div className="text-xs text-gray-500 mb-2">User: <b className="text-gray-700">{userEmail}</b></div>

      <div className="mb-2 flex items-center gap-2">
        <div className="relative w-full">
          <input
            value={search}
            onChange={(e)=>setSearch(e.target.value)}
            placeholder="Search categories (partial match)…"
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm pr-8"
            onKeyDown={(e)=>{ if (e.key==="Enter" && canQuickAdd) { e.preventDefault(); addFromQuery(); } }}
          />
          {search && (
            <button
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
              onClick={()=>setSearch("")}
              aria-label="Clear search"
            >×</button>
          )}
        </div>
        {canQuickAdd && (
          <button onClick={addFromQuery} className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50 whitespace-nowrap">Add “{search.trim()}”</button>
        )}
      </div>

      <div className="mb-3 max-h-[40vh] overflow-auto rounded-xl border p-2">
        {filtered.length===0 ? (
          <div className="p-2 text-sm text-gray-500">No categories yet.</div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {filtered.map(c=>{
              const checked = local.some(x=>x.toLowerCase()===c.toLowerCase());
              return (
                <button
                  key={c}
                  type="button"
                  title={c}
                  onClick={()=>toggle(c)}
                  className={cn(
                    "max-w-[180px] truncate rounded-full border px-2.5 py-1 text-xs",
                    checked ? "border-gray-800 bg-gray-900 text-white" : "border-gray-300 bg-white hover:bg-gray-50"
                  )}
                >
                  {c}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2">
        <button onClick={maybeClose} className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50">Cancel</button>
        <button onClick={doSave} className="rounded-xl bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-black">Save</button>
      </div>
    </Modal>
  );
}

function dedupeCaseInsensitive(arr){
  const m=new Map();
  for (const s of (arr||[])){
    const v=String(s||"").trim();
    if (!v) continue;
    const k=v.toLowerCase();
    if (!m.has(k)) m.set(k, v);
  }
  return Array.from(m.values());
}

/* ───────── Invite modal ───────── */
function SendInviteModal({ plannerEmail, onClose, onToast }){
  const [email,setEmail]=useState("");
  const [previewUrl,setPreviewUrl]=useState("");
  const [previewRaw,setPreviewRaw]=useState("");
  const [loading,setLoading]=useState(false);

  function extractFirstUrl(text){
    const m = String(text||"").match(/https?:\/\/[^\s"'<>]+/);
    return m ? m[0] : "";
  }
  async function parseMaybeJson(resp){
    const ctype = resp.headers.get("content-type") || "";
    const txt = await resp.text();
    if (ctype.includes("application/json")) {
      try { return { kind:"json", json: JSON.parse(txt), txt }; }
      catch { /* fall through */ }
    }
    return { kind:"text", txt };
  }
  async function doPreview(){
    setLoading(true);
    setPreviewUrl(""); setPreviewRaw("");
    try{
      const qs = new URLSearchParams({ plannerEmail, userEmail: email });
      const resp = await fetch(`/api/invite/preview?${qs.toString()}`);
      const parsed = await parseMaybeJson(resp);

      if (!resp.ok) {
        if (parsed.kind==="json") onToast?.("error", `Preview failed: ${parsed.json?.error || JSON.stringify(parsed.json)}`);
        else onToast?.("error", `Preview failed: ${parsed.txt.slice(0,120)}`);
        setLoading(false); return;
      }
      if (parsed.kind==="json") {
        const j = parsed.json;
        const url = j.url || j.inviteUrl || j.href || "";
        if (url) { setPreviewUrl(url); onToast?.("ok","Preview generated"); }
        else { setPreviewRaw(JSON.stringify(j)); onToast?.("warn","Preview returned JSON but no URL field"); }
      } else {
        const url = extractFirstUrl(parsed.txt);
        if (url) { setPreviewUrl(url); onToast?.("ok","Preview URL detected"); }
        else { setPreviewRaw(parsed.txt); onToast?.("warn","Preview returned non-JSON content"); }
      }
    }catch(e){ onToast?.("error", String(e.message||e)); }
    setLoading(false);
  }
  async function doSend(){
    setLoading(true);
    try{
      const resp = await fetch("/api/invite/send",{
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ plannerEmail, userEmail: email })
      });
      const parsed = await parseMaybeJson(resp);
      if (!resp.ok) {
        if (parsed.kind==="json") onToast?.("error", `Invite failed: ${parsed.json?.error || JSON.stringify(parsed.json)}`);
        else onToast?.("error", `Invite failed: ${parsed.txt.slice(0,120)}`);
        setLoading(false); return;
      }
      onToast?.("ok", `Invite sent to ${email}`);
      onClose?.();
    }catch(e){ onToast?.("error", String(e.message||e)); }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/10 p-2 sm:p-4">
      <div className="mx-auto max-w-lg rounded-xl border bg-white p-3 sm:p-4 shadow-lg">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-semibold">Send Invite</div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100" aria-label="Close"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-3">
          <label className="block">
            <div className="mb-1 text-sm font-medium">User email</div>
            <input
              type="email"
              value={email}
              onChange={(e)=>setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
            />
          </label>

          <div className="flex gap-2">
            <button disabled={!email || loading} onClick={doPreview} className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50">Preview</button>
            <button disabled={!email || loading} onClick={doSend} className="rounded-xl bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-50">Send Invite</button>
          </div>

          {!!previewUrl && (
            <div className="rounded-lg border bg-gray-50 p-2 text-xs break-all">
              <div className="mb-1 font-semibold text-gray-700">Preview URL</div>
              <div className="text-gray-700">{previewUrl}</div>
            </div>
          )}

          {!!previewRaw && !previewUrl && (
            <div className="rounded-lg border bg-yellow-50 p-2 text-xs break-all">
              <div className="mb-1 font-semibold text-yellow-800">Preview (non-JSON response)</div>
              <div className="text-yellow-900">{previewRaw.slice(0,800)}</div>
            </div>
          )}

          <div className="text-[11px] text-gray-500">
            Invite CTA opens Google OAuth and returns a “Connected” confirmation (no route back to app for users).
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────── Settings ───────── */
function SettingsView({ plannerEmail, prefs, onChange, onToast }){
  const [local,setLocal]=useState(()=>{
    return {
      default_view: prefs.default_view || "users",
      default_timezone: prefs.default_timezone || "America/Chicago",
      default_push_mode: prefs.default_push_mode || "append",
      auto_archive_after_assign: !!prefs.auto_archive_after_assign,
      show_inbox_badge: !!prefs.show_inbox_badge,
    };
  });
  const [saving,setSaving]=useState(false);

  useEffect(()=>{ setLocal({
    default_view: prefs.default_view || "users",
    default_timezone: prefs.default_timezone || "America/Chicago",
    default_push_mode: prefs.default_push_mode || "append",
    auto_archive_after_assign: !!prefs.auto_archive_after_assign,
    show_inbox_badge: !!prefs.show_inbox_badge,
  }); },[prefs]);

  async function save(){
    setSaving(true);
    try{
      const body={ plannerEmail, prefs: local };
      const r=await fetch("/api/prefs/set",{ method:"POST", headers:{"Content-Type":"application/json" }, body: JSON.stringify(body) });
      const j=await r.json();
      if (!r.ok || j.error) throw new Error(j.error||"Save failed");
      onChange?.(local);
      onToast?.("ok","Settings saved");
    }catch(e){
      onToast?.("error", String(e.message||e));
    }
    setSaving(false);
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
      <div className="mb-3 text-sm font-semibold">Settings</div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <div className="mb-1 text-sm font-medium">Default view</div>
          <select value={local.default_view} onChange={(e)=>setLocal({...local, default_view:e.target.value})} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm">
            <option value="users">Users</option>
            <option value="plan">Plan</option>
          </select>
        </label>

        <label className="block">
          <div className="mb-1 text-sm font-medium">Default timezone</div>
          <select value={local.default_timezone} onChange={(e)=>setLocal({...local, default_timezone:e.target.value})} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm">
            {TIMEZONES.map(tz=><option key={tz} value={tz}>{tz}</option>)}
          </select>
        </label>

        <label className="block">
          <div className="mb-1 text-sm font-medium">Default push mode</div>
          <select value={local.default_push_mode} onChange={(e)=>setLocal({...local, default_push_mode:e.target.value})} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm">
            <option value="append">Append</option>
            <option value="replace">Replace</option>
          </select>
        </label>

        <label className="block">
          <div className="mb-1 text-sm font-medium">Auto-archive after assign</div>
          <input type="checkbox" checked={!!local.auto_archive_after_assign} onChange={(e)=>setLocal({...local, auto_archive_after_assign:(e.target.checked)})} />
        </label>

        <label className="block">
          <div className="mb-1 text-sm font-medium">Show inbox badge</div>
          <input type="checkbox" checked={!!local.show_inbox_badge} onChange={(e)=>setLocal({...local, show_inbox_badge:(e.target.checked)})} />
        </label>
      </div>

      <div className="mt-3">
        <button onClick={save} disabled={saving} className="rounded-xl bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-50">
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

/* ───────── User Notes Manager ───────── */
function UserNotesManager({ userEmail, plannerEmail, onToast }){
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Load user notes on mount
  useEffect(() => {
    loadUserNotes();
  }, [userEmail, plannerEmail]);

  async function loadUserNotes() {
    setIsLoading(true);
    try {
      const qs = new URLSearchParams({ userEmail, plannerEmail });
      const r = await fetch(`/api/user-notes/get?${qs.toString()}`);
      const j = await r.json();
      if (j.ok) {
        setNotes(j.notes || "");
        setLastUpdated(j.updatedAt);
      }
    } catch (e) {
      console.error('Load user notes error:', e);
      onToast?.("error", "Failed to load user notes");
    } finally {
      setIsLoading(false);
    }
  }

  async function saveUserNotes() {
    setIsSaving(true);
    try {
      const resp = await fetch("/api/user-notes/set", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail,
          plannerEmail,
          notes: notes.trim()
        })
      });

      const j = await resp.json();
      if (j.ok) {
        setLastUpdated(new Date().toISOString());
        onToast?.("ok", "User notes saved successfully");
      } else {
        throw new Error(j.error || "Save failed");
      }
    } catch (e) {
      console.error('Save user notes error:', e);
      onToast?.("error", `Failed to save user notes: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full mx-auto mb-2"></div>
        <div className="text-sm text-gray-600">Loading user notes...</div>
      </div>
    );
  }

  return (
    <>
      {lastUpdated && (
        <div className="text-xs text-gray-500 mb-4">
          Last updated: {new Date(lastUpdated).toLocaleString()}
        </div>
      )}
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes & Context
          </label>
          <div className="text-xs text-gray-500 mb-2">
            These notes are automatically considered by AI in all planning sessions for this user.
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm resize-none h-32"
            placeholder="Enter user preferences, constraints, goals, or any context that should guide AI planning for this user..."
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {notes.length} characters
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadUserNotes}
              disabled={isSaving}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Reload
            </button>
            <button
              onClick={saveUserNotes}
              disabled={isSaving || !notes.trim()}
              className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "Saving..." : "Save Notes"}
            </button>
          </div>
        </div>
    </>
  );
}

/* ───────── AI Planning Decision ───────── */
function AIPlanningDecision({ selectedUserEmail, onModeSelect, planningMode }){

  if (!selectedUserEmail) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm -mt-1">
        <div className="text-center py-8">
          <div className="text-gray-500 mb-2">👤</div>
          <div className="font-semibold text-gray-700 mb-1">Choose a User First</div>
          <div className="text-sm text-gray-500">Select a user to begin planning</div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm -mt-1">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-sm font-semibold">🤖</div>
          <div className="text-base sm:text-lg font-semibold">How would you like to create this plan?</div>
        </div>
        <div className="text-sm text-gray-600 ml-8">Choose your planning approach for <strong>{selectedUserEmail}</strong></div>
      </div>

             <div className="ml-8 space-y-3">
               {/* Planning Mode Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Full AI Option */}
                 <button
                   onClick={() => onModeSelect("full-ai")}
                   className={`p-4 rounded-xl border-2 text-left transition-all ${
                     planningMode === "full-ai"
                       ? "border-blue-500 bg-blue-50"
                       : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                   }`}
                 >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs">💬</div>
              <div className="font-semibold text-sm">Full AI Planning</div>
            </div>
            <div className="text-xs text-gray-600">
              Conversational AI creates your entire plan through research and dialogue
            </div>
          </button>

          {/* AI-Assisted Manual Option */}
                 <button
                   onClick={() => onModeSelect("ai-assisted")}
                   className={`p-4 rounded-xl border-2 text-left transition-all ${
                     planningMode === "ai-assisted"
                       ? "border-blue-500 bg-blue-50"
                       : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                   }`}
                 >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xs">🤝</div>
              <div className="font-semibold text-sm">AI-Assisted Manual</div>
            </div>
            <div className="text-xs text-gray-600">
              You create tasks manually with smart AI suggestions and recommendations
            </div>
          </button>

          {/* Pure Manual Option */}
          <button
            onClick={() => onModeSelect("manual")}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              planningMode === "manual"
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-xs">✏️</div>
              <div className="font-semibold text-sm">Pure Manual</div>
            </div>
            <div className="text-xs text-gray-600">
              Traditional task creation without AI assistance
            </div>
          </button>
        </div>

        {/* Mode Description */}
        {planningMode === "full-ai" && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm font-medium text-blue-800 mb-1">Full AI Planning</div>
            <div className="text-xs text-blue-600">
              AI will research, analyze user notes, and create a complete plan through conversation. 
              You'll review and refine the final plan before delivery.
            </div>
          </div>
        )}

        {planningMode === "ai-assisted" && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-sm font-medium text-green-800 mb-1">AI-Assisted Manual</div>
            <div className="text-xs text-green-600">
              Create tasks manually with AI providing smart suggestions, gap analysis, and best practice recommendations.
            </div>
          </div>
        )}

        {planningMode === "manual" && (
          <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="text-sm font-medium text-gray-800 mb-1">Pure Manual</div>
            <div className="text-xs text-gray-600">
              Complete control over task creation without AI assistance. Perfect when you prefer full manual control.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────── Conversational AI ───────── */
function ConversationalAI({ userEmail, plannerEmail, onPlanGenerated, onToast }){
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userNotes, setUserNotes] = useState("");
  const [currentStep, setCurrentStep] = useState("welcome");
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // Check if user has scrolled up
  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom);
      setUserHasScrolled(!isNearBottom);
    }
  };

  // Scroll to bottom function
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowScrollButton(false);
    setUserHasScrolled(false);
  };

  // Auto-scroll to new messages (like this chat)
  useEffect(() => {
    if (!userHasScrolled) {
      scrollToBottom();
    }
  }, [messages, isLoading]);

  // Load user notes on mount
  useEffect(() => {
    if (userEmail && plannerEmail) {
      loadUserNotes();
    }
  }, [userEmail, plannerEmail]);

  async function loadUserNotes() {
    try {
      const qs = new URLSearchParams({ userEmail, plannerEmail });
      const r = await fetch(`/api/user-notes/get?${qs.toString()}`);
      const j = await r.json();
      if (j.ok && j.notes) {
        setUserNotes(j.notes);
      }
    } catch (e) {
      console.error('Load user notes error:', e);
    }
  }

  // Initialize conversation
  useEffect(() => {
    if (currentStep === "welcome" && userEmail) {
      const welcomeMessage = {
        id: Date.now(),
        type: "ai",
        content: `Hi! I'm your AI planning assistant. I'm here to help you create a comprehensive plan for ${userEmail}. 

I can research best practices, analyze user preferences, and build a complete plan through our conversation. 

What type of plan would you like to create? For example: "Create a workout plan" or "Build a study schedule" or "Design a project timeline".`
      };
      setMessages([welcomeMessage]);
    }
  }, [currentStep, userEmail]);

  async function sendMessage() {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: "user",
      content: inputMessage.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      // Call AI API for conversational response
      const resp = await fetch("/api/ai/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail,
          plannerEmail,
          planTitle: "AI Generated Plan",
          planDescription: "",
          startDate: new Date().toISOString().split('T')[0],
          timezone: "America/Chicago",
          userPrompt: inputMessage.trim(),
          userNotes,
          conversational: true,
          conversationHistory: messages
        })
      });

      const j = await resp.json();
      if (!resp.ok || j.error) {
        throw new Error(j.error || "AI conversation failed");
      }

      const aiMessage = {
        id: Date.now() + 1,
        type: "ai",
        content: j.response || "I understand. Let me help you with that."
      };

      setMessages(prev => [...prev, aiMessage]);

      // If AI generated a complete plan
      if (j.tasks && Array.isArray(j.tasks)) {
        setCurrentStep("plan-ready");
        onPlanGenerated({
          plan: {
            title: j.planTitle || "AI Generated Plan",
            description: j.planDescription || "",
            startDate: j.startDate || new Date().toISOString().split('T')[0],
            timezone: j.timezone || "America/Chicago"
          },
          tasks: j.tasks
        });
      }

    } catch (e) {
      console.error('AI conversation error:', e);
      onToast?.("error", `AI conversation failed: ${e.message}`);
      
      const errorMessage = {
        id: Date.now() + 1,
        type: "ai",
        content: "I'm sorry, I encountered an error. Could you please try again?"
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyPress(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  if (currentStep === "plan-ready") {
    return (
      <div className="rounded-xl border border-gray-200 bg-green-50 p-4">
        <div className="text-center py-8">
          <div className="text-green-600 mb-2">✅</div>
          <div className="font-semibold text-green-800 mb-1">Plan Generated Successfully!</div>
          <div className="text-sm text-green-600 mb-3">
            Your AI-generated plan is ready for review and delivery.
          </div>
          <button
            onClick={() => setCurrentStep("welcome")}
            className="px-4 py-2 text-sm font-medium text-green-700 border border-green-300 rounded-xl hover:bg-green-100"
          >
            Start New Conversation
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      {/* Chat Messages */}
      <div 
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="h-96 overflow-y-auto p-4 space-y-4 relative"
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.type === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <div className="text-sm whitespace-pre-wrap">{message.content}</div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="animate-spin w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full"></div>
                <span className="text-sm">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Scroll target */}
        <div ref={messagesEndRef} />
        
        {/* Floating scroll button */}
        {showScrollButton && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-4 right-4 bg-blue-600 text-white rounded-full p-2 shadow-lg hover:bg-blue-700 transition-colors"
            title="Scroll to bottom"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message here... (Press Enter to send, Shift+Enter for new line)"
            className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm resize-none h-20"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────── AI-Assisted Task Editor ───────── */
function AIAssistedTaskEditor({ planStartDate, userEmail, plannerEmail, onAdd, onToast }){
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDayOffset, setTaskDayOffset] = useState(0);
  const [taskTime, setTaskTime] = useState("");
  const [taskDuration, setTaskDuration] = useState("");
  const [taskNotes, setTaskNotes] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [userNotes, setUserNotes] = useState("");

  // Load user notes on mount
  useEffect(() => {
    if (userEmail && plannerEmail) {
      loadUserNotes();
    }
  }, [userEmail, plannerEmail]);

  async function loadUserNotes() {
    try {
      const qs = new URLSearchParams({ userEmail, plannerEmail });
      const r = await fetch(`/api/user-notes/get?${qs.toString()}`);
      const j = await r.json();
      if (j.ok && j.notes) {
        setUserNotes(j.notes);
      }
    } catch (e) {
      console.error('Load user notes error:', e);
    }
  }

  async function getAISuggestions() {
    if (!taskTitle.trim()) return;
    
    setIsLoadingSuggestions(true);
    try {
      const resp = await fetch("/api/ai/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail,
          plannerEmail,
          planTitle: "AI Suggestions",
          planDescription: "",
          startDate: planStartDate,
          timezone: "America/Chicago",
          userPrompt: `Suggest improvements for this task: "${taskTitle}". Consider user notes: "${userNotes}". Provide 3-5 specific suggestions.`,
          userNotes,
          suggestionsOnly: true
        })
      });

      const j = await resp.json();
      if (j.ok && j.suggestions) {
        setAiSuggestions(j.suggestions);
      }
    } catch (e) {
      console.error('AI suggestions error:', e);
      onToast?.("error", "Failed to get AI suggestions");
    } finally {
      setIsLoadingSuggestions(false);
    }
  }

  function addTask() {
    if (!taskTitle.trim()) {
      onToast?.("error", "Task title is required");
      return;
    }

    const newTask = {
      title: taskTitle.trim(),
      dayOffset: parseInt(taskDayOffset) || 0,
      time: taskTime || null,
      durationMins: taskDuration ? parseInt(taskDuration) : null,
      notes: taskNotes.trim() || null
    };

    onAdd([newTask]);
    
    // Reset form
    setTaskTitle("");
    setTaskDayOffset(0);
    setTaskTime("");
    setTaskDuration("");
    setTaskNotes("");
    setAiSuggestions([]);
  }

  function applySuggestion(suggestion) {
    setTaskTitle(suggestion.title || taskTitle);
    setTaskNotes(suggestion.notes || taskNotes);
    if (suggestion.time) setTaskTime(suggestion.time);
    if (suggestion.duration) setTaskDuration(suggestion.duration);
  }

  return (
    <div className="space-y-4">
      {/* AI Assistance Indicator */}
      <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
        <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xs">🤖</div>
        <div className="text-sm text-green-700">
          <strong>AI Assistant Active:</strong> I'll provide smart suggestions as you create tasks
        </div>
      </div>

      {/* Task Form */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="block md:col-span-2">
          <div className="mb-1 text-sm font-medium">Task Title *</div>
          <div className="flex gap-2">
            <input
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm"
              placeholder="e.g., Morning workout"
            />
            <button
              onClick={getAISuggestions}
              disabled={!taskTitle.trim() || isLoadingSuggestions}
              className="px-3 py-2 text-sm font-medium text-green-700 border border-green-300 rounded-xl hover:bg-green-50 disabled:opacity-50"
            >
              {isLoadingSuggestions ? "..." : "Get AI Help"}
            </button>
          </div>
        </label>

        <label className="block">
          <div className="mb-1 text-sm font-medium">Day (from start)</div>
          <input
            type="number"
            value={taskDayOffset}
            onChange={(e) => setTaskDayOffset(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
            placeholder="0"
            min="0"
          />
        </label>

        <label className="block">
          <div className="mb-1 text-sm font-medium">Time (optional)</div>
          <input
            type="time"
            value={taskTime}
            onChange={(e) => setTaskTime(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <div className="mb-1 text-sm font-medium">Duration (minutes)</div>
          <input
            type="number"
            value={taskDuration}
            onChange={(e) => setTaskDuration(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
            placeholder="60"
            min="15"
          />
        </label>

        <label className="block md:col-span-2">
          <div className="mb-1 text-sm font-medium">Notes (optional)</div>
          <textarea
            value={taskNotes}
            onChange={(e) => setTaskNotes(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
            placeholder="Additional details or context..."
            rows="2"
          />
        </label>
      </div>

      {/* AI Suggestions */}
      {aiSuggestions.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs">💡</div>
            <div className="text-sm font-medium text-blue-800">AI Suggestions</div>
          </div>
          <div className="space-y-2">
            {aiSuggestions.map((suggestion, idx) => (
              <div key={idx} className="flex items-start gap-2 p-2 bg-white border border-blue-200 rounded-lg">
                <div className="flex-1 text-sm text-gray-700">{suggestion}</div>
                <button
                  onClick={() => applySuggestion({ title: suggestion })}
                  className="px-2 py-1 text-xs font-medium text-blue-700 border border-blue-300 rounded hover:bg-blue-50"
                >
                  Apply
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Task Button */}
      <div className="flex justify-end">
        <button
          onClick={addTask}
          className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 font-medium"
        >
          Add Task with AI Assistance
        </button>
      </div>
    </div>
  );
}

/* ───────── AI Task Generator ───────── */
function AITaskGenerator({ userEmail, plannerEmail, planTitle, planDescription, planStartDate, planTimezone, onAdd, onToast }){
  const [userNotes, setUserNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState("welcome");
  const [userPrompt, setUserPrompt] = useState("");
  const [generatedTasks, setGeneratedTasks] = useState([]);
  const [showPreview, setShowPreview] = useState(false);

  // Load user notes on mount
  useEffect(() => {
    if (userEmail && plannerEmail) {
      loadUserNotes();
    }
  }, [userEmail, plannerEmail]);

  async function loadUserNotes() {
    try {
      const qs = new URLSearchParams({ userEmail, plannerEmail });
      const r = await fetch(`/api/user-notes/get?${qs.toString()}`);
      const j = await r.json();
      if (j.ok && j.notes) {
        setUserNotes(j.notes);
      }
    } catch (e) {
      console.error('Load user notes error:', e);
    }
  }

  async function generateTasks() {
    if (!userPrompt.trim()) {
      onToast?.("warn", "Please describe what tasks you want to create");
      return;
    }

    setIsLoading(true);
    try {
      const resp = await fetch("/api/ai/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail,
          plannerEmail,
          planTitle,
          planDescription,
          startDate: planStartDate,
          timezone: planTimezone,
          userPrompt: userPrompt.trim(),
          userNotes
        })
      });

      const j = await resp.json();
      if (!resp.ok || j.error) {
        throw new Error(j.error || "AI generation failed");
      }

      setGeneratedTasks(j.tasks || []);
      setShowPreview(true);
      setCurrentStep("preview");
      
    } catch (e) {
      console.error('AI generation error:', e);
      onToast?.("error", `AI generation failed: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  }

  function addTasksToPlan() {
    if (generatedTasks.length > 0) {
      onAdd(generatedTasks);
      setCurrentStep("complete");
      onToast?.("ok", `Added ${generatedTasks.length} AI-generated tasks to plan`);
    }
  }

  function resetGenerator() {
    setCurrentStep("welcome");
    setUserPrompt("");
    setGeneratedTasks([]);
    setShowPreview(false);
  }

  if (currentStep === "welcome") {
    return (
      <div className="rounded-xl border border-gray-200 bg-blue-50 p-4">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-semibold">🤖</div>
            <div className="text-base font-semibold">AI Task Generator</div>
          </div>
          <div className="text-sm text-gray-600">
            Hi! Let's create a plan for <strong>{userEmail}</strong>. What should we call this plan?
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Plan Name</label>
            <input 
              value={planTitle} 
              readOnly
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm bg-gray-50"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Describe the tasks you want to create</label>
            <textarea
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              placeholder="e.g., Create a workout plan for someone who wants to get in shape, or Generate a study schedule for exam preparation..."
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm h-20 resize-none"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={generateTasks}
              disabled={isLoading || !userPrompt.trim()}
              className="flex-1 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? "Generating..." : "Generate Tasks"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === "preview" && showPreview) {
    return (
      <div className="rounded-xl border border-gray-200 bg-green-50 p-4">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-sm font-semibold">✅</div>
            <div className="text-base font-semibold">Generated Tasks</div>
          </div>
          <div className="text-sm text-gray-600">
            Review the tasks below. You can add them to your plan or generate new ones.
          </div>
        </div>

        <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
          {generatedTasks.map((task, i) => (
            <div key={i} className="flex items-center gap-2 p-2 bg-white rounded-lg border">
              <div className="flex-1">
                <div className="font-medium text-sm">{task.title}</div>
                <div className="text-xs text-gray-500">
                  Day {task.dayOffset} • {task.time || 'No time'} • {task.durationMins || 60} min
                  {task.notes && ` • ${task.notes}`}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={addTasksToPlan}
            className="flex-1 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
          >
            Add {generatedTasks.length} Tasks to Plan
          </button>
          <button
            onClick={resetGenerator}
            className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50"
          >
            Generate New
          </button>
        </div>
      </div>
    );
  }

  if (currentStep === "complete") {
    return (
      <div className="rounded-xl border border-gray-200 bg-green-50 p-4">
        <div className="text-center">
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-lg mx-auto mb-2">✓</div>
          <div className="font-semibold text-green-800 mb-1">Tasks Added Successfully!</div>
          <div className="text-sm text-green-600 mb-3">
            {generatedTasks.length} AI-generated tasks have been added to your plan.
          </div>
          <button
            onClick={resetGenerator}
            className="px-4 py-2 text-sm font-medium text-green-700 border border-green-300 rounded-xl hover:bg-green-100"
          >
            Generate More Tasks
          </button>
        </div>
      </div>
    );
  }

  return null;
}

/* ───────── Timezones ───────── */
const TIMEZONES = [
  "America/Chicago","America/New_York","America/Denver","America/Los_Angeles",
  "UTC","Europe/London","Europe/Berlin","Asia/Tokyo","Australia/Sydney"
];
