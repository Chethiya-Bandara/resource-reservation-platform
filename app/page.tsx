"use client";

import { FormEvent, useMemo, useState } from "react";

type Resource = {
  id: number;
  name: string;
  type: string;
  location: string;
  capacity: number;
  status: "Available" | "In use" | "Maintenance";
  color: string;
};

type Reservation = {
  id: number;
  resource: string;
  title: string;
  requestedBy: string;
  time: string;
  status: "Confirmed" | "Upcoming";
};

const initialResources: Resource[] = [
  { id: 1, name: "Orchid Meeting Room", type: "Meeting room", location: "Level 3", capacity: 12, status: "Available", color: "violet" },
  { id: 2, name: "Focus Room 02", type: "Meeting room", location: "Level 2", capacity: 4, status: "In use", color: "orange" },
  { id: 3, name: "Design Lab", type: "Creative space", location: "Level 4", capacity: 8, status: "Available", color: "blue" },
  { id: 4, name: "Projector Kit A", type: "Equipment", location: "IT Store", capacity: 1, status: "Maintenance", color: "rose" },
];

const initialReservations: Reservation[] = [
  { id: 1, resource: "Focus Room 02", title: "Product sync", requestedBy: "Maya Chen", time: "09:30 - 10:30", status: "Confirmed" },
  { id: 2, resource: "Orchid Meeting Room", title: "Quarterly planning", requestedBy: "Aiden Silva", time: "11:00 - 12:30", status: "Upcoming" },
  { id: 3, resource: "Design Lab", title: "Research workshop", requestedBy: "Nimal Perera", time: "14:00 - 15:30", status: "Upcoming" },
];

export default function Home() {
  const [activePage, setActivePage] = useState("Overview");
  const [resources, setResources] = useState(initialResources);
  const [reservations, setReservations] = useState(initialReservations);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");

  const filteredResources = useMemo(
    () => resources.filter((resource) => resource.name.toLowerCase().includes(query.toLowerCase()) || resource.type.toLowerCase().includes(query.toLowerCase())),
    [query, resources],
  );

  function reserve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const resource = String(values.get("resource"));
    const title = String(values.get("title"));
    const requestedBy = String(values.get("requestedBy"));
    const start = String(values.get("start"));
    const end = String(values.get("end"));
    setReservations((current) => [{ id: Date.now(), resource, title, requestedBy, time: `${start} - ${end}`, status: "Confirmed" }, ...current]);
    setResources((current) => current.map((item) => item.name === resource ? { ...item, status: "In use" } : item));
    setNotice(`Reservation confirmed for ${resource}.`);
    setIsFormOpen(false);
  }

  const availableCount = resources.filter((item) => item.status === "Available").length;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">R</span><span>Reserve<span className="brand-accent">ly</span></span></div>
        <div className="workspace"><span className="workspace-dot" /> Acme Workspace <span className="chevron">⌄</span></div>
        <nav>
          {["Overview", "Resources", "Reservations"].map((item) => <button key={item} className={`nav-item ${activePage === item ? "active" : ""}`} onClick={() => setActivePage(item)}><span>{item === "Overview" ? "▦" : item === "Resources" ? "▧" : "◷"}</span>{item}</button>)}
        </nav>
        <div className="sidebar-bottom"><button className="nav-item"><span>⚙</span>Settings</button><div className="profile"><span className="avatar">MS</span><span><b>Meera Silva</b><small>Workspace admin</small></span><span>⋮</span></div></div>
      </aside>

      <section className="content">
        <header className="topbar"><div><p className="eyebrow">Tuesday, October 13</p><h1>{activePage === "Overview" ? "Good morning, Meera" : activePage}</h1></div><div className="top-actions"><button className="icon-button" aria-label="Notifications">♧<i /></button><button className="primary-button" onClick={() => setIsFormOpen(true)}><span>＋</span> New reservation</button></div></header>
        {notice && <div className="notice">✓ {notice}<button onClick={() => setNotice("")}>×</button></div>}

        {activePage === "Overview" && <>
          <section className="stat-grid">
            <Stat icon="▧" label="Total resources" value={resources.length.toString()} detail="Across 3 locations" tone="purple" />
            <Stat icon="○" label="Available now" value={availableCount.toString()} detail="Ready to reserve" tone="green" />
            <Stat icon="◷" label="Today's reservations" value={reservations.length.toString()} detail="2 still upcoming" tone="blue" />
            <Stat icon="↗" label="Utilization" value="68%" detail="↑ 8% from last week" tone="orange" />
          </section>
          <section className="section-heading"><div><h2>Resource availability</h2><p>Find a space or piece of equipment for today.</p></div><button className="text-button" onClick={() => setActivePage("Resources")}>View all resources →</button></section>
          <div className="resource-grid">{resources.slice(0, 3).map((resource) => <ResourceCard key={resource.id} resource={resource} onReserve={() => { setIsFormOpen(true); }} />)}</div>
          <section className="section-heading schedule-heading"><div><h2>Today&apos;s schedule</h2><p>October 13, 2026</p></div><button className="date-picker">‹ <b>Today</b> › <span>▣</span></button></section>
          <Schedule reservations={reservations} />
        </>}

        {activePage === "Resources" && <><section className="list-toolbar"><div><h2>All resources</h2><p>Manage shared spaces and equipment.</p></div><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search resources" /></section><div className="resource-grid full-grid">{filteredResources.map((resource) => <ResourceCard key={resource.id} resource={resource} onReserve={() => setIsFormOpen(true)} />)}</div></>}
        {activePage === "Reservations" && <><section className="list-toolbar"><div><h2>Reservations</h2><p>All bookings scheduled for today.</p></div><button className="secondary-button" onClick={() => setIsFormOpen(true)}>New reservation</button></section><Schedule reservations={reservations} expanded /></>}
      </section>

      {isFormOpen && <div className="modal-backdrop" role="presentation"><form className="modal" onSubmit={reserve}><div className="modal-header"><div><p className="eyebrow">Create booking</p><h2>New reservation</h2></div><button type="button" className="close-button" onClick={() => setIsFormOpen(false)}>×</button></div><label>Resource<select name="resource" required>{resources.filter((item) => item.status !== "Maintenance").map((item) => <option key={item.id}>{item.name}</option>)}</select></label><label>Reservation title<input name="title" placeholder="e.g. Sprint planning" required /></label><div className="form-row"><label>Requested by<input name="requestedBy" placeholder="Your name" required /></label><label>Team<input name="team" placeholder="Optional" /></label></div><div className="form-row"><label>Start time<input name="start" type="time" defaultValue="10:00" required /></label><label>End time<input name="end" type="time" defaultValue="11:00" required /></label></div><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setIsFormOpen(false)}>Cancel</button><button className="primary-button">Confirm reservation</button></div></form></div>}
    </main>
  );
}

function Stat({ icon, label, value, detail, tone }: { icon: string; label: string; value: string; detail: string; tone: string }) { return <article className="stat-card"><span className={`stat-icon ${tone}`}>{icon}</span><p>{label}</p><strong>{value}</strong><small>{detail}</small></article>; }
function ResourceCard({ resource, onReserve }: { resource: Resource; onReserve: () => void }) { return <article className="resource-card"><div className={`resource-visual ${resource.color}`}><span>{resource.type === "Equipment" ? "▰" : resource.type === "Creative space" ? "✦" : "▥"}</span></div><div className="resource-copy"><div><span className={`status ${resource.status.toLowerCase().replace(" ", "-")}`}>{resource.status}</span><h3>{resource.name}</h3><p>{resource.type} · {resource.location}</p></div><div className="card-footer"><span>♙ {resource.capacity} {resource.capacity === 1 ? "item" : "people"}</span><button disabled={resource.status === "Maintenance"} onClick={onReserve}>{resource.status === "Maintenance" ? "Unavailable" : "Reserve"} →</button></div></div></article>; }
function Schedule({ reservations, expanded = false }: { reservations: Reservation[]; expanded?: boolean }) { return <div className="schedule-card"><div className="schedule-head"><span>Time</span><span>Reservation</span><span>Resource</span><span>Status</span></div>{reservations.map((item) => <div className="schedule-row" key={item.id}><b>{item.time}</b><span><strong>{item.title}</strong><small>{item.requestedBy}</small></span><span>{item.resource}</span><span className={`status ${item.status.toLowerCase()}`}>{item.status}</span>{expanded && <button className="row-action">Manage</button>}</div>)}</div>; }
