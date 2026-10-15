"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type User = { id: string; name: string; role: "ADMIN" | "MEMBER" };
type ApiResource = {
  id: string;
  name: string;
  type: string;
  location: string;
  capacity: number;
  status: "AVAILABLE" | "MAINTENANCE";
};
type ApiReservation = {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  resource: ApiResource;
  user: User;
};
type Resource = ApiResource & {
  displayStatus: "Available" | "In use" | "Maintenance";
  color: string;
};
type Reservation = ApiReservation & { time: string; displayStatus: "Confirmed" | "Upcoming" };

const colors: Record<string, string> = {
  "Orchid Meeting Room": "violet",
  "Focus Room 02": "orange",
  "Design Lab": "blue",
  "Projector Kit A": "rose",
};
const today = () => new Date().toISOString().slice(0, 10);
const time = (value: string) =>
  new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit", hour12: false }).format(
    new Date(value),
  );
const date = (value: string) => new Date(value).toISOString().slice(0, 10);

function mapDashboard(data: {
  resources: ApiResource[];
  reservations: ApiReservation[];
  todayReservations: ApiReservation[];
}) {
  const now = new Date();
  const activeResourceIds = new Set(
    data.todayReservations
      .filter((item) => new Date(item.startTime) <= now && new Date(item.endTime) > now)
      .map((item) => item.resource.id),
  );
  const toReservation = (reservation: ApiReservation): Reservation => ({
    ...reservation,
    time: `${time(reservation.startTime)} - ${time(reservation.endTime)}`,
    displayStatus: new Date(reservation.startTime) > now ? "Upcoming" : "Confirmed",
  });
  return {
    resources: data.resources.map((resource): Resource => ({
      ...resource,
      color: colors[resource.name] ?? "blue",
      displayStatus:
        resource.status === "MAINTENANCE"
          ? "Maintenance"
          : activeResourceIds.has(resource.id)
            ? "In use"
            : "Available",
    })),
    reservations: data.reservations.map(toReservation),
    todayReservations: data.todayReservations.map(toReservation),
  };
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [activePage, setActivePage] = useState("Overview");
  const [resources, setResources] = useState<Resource[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [todayReservations, setTodayReservations] = useState<Reservation[]>([]);
  const [isReservationFormOpen, setReservationFormOpen] = useState(false);
  const [isResourceFormOpen, setResourceFormOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [selectedResourceId, setSelectedResourceId] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function loadDashboard() {
    const response = await fetch("/api/dashboard", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Could not load reservation data.");
    const dashboard = mapDashboard(result);
    setResources(dashboard.resources);
    setReservations(dashboard.reservations);
    setTodayReservations(dashboard.todayReservations);
    setSelectedResourceId(
      (current) =>
        current ||
        dashboard.resources.find((item) => item.displayStatus !== "Maintenance")?.id ||
        "",
    );
  }

  useEffect(() => {
    const initializeTimer = window.setTimeout(() => {
      void (async () => {
        try {
          const response = await fetch("/api/auth/me", { cache: "no-store" });
          const result = await response.json();
          if (result.user) {
            setUser(result.user);
            await loadDashboard();
          }
        } catch {
          setError("Could not connect to the reservation service.");
        } finally {
          setSessionReady(true);
        }
      })();
    }, 0);
    return () => window.clearTimeout(initializeTimer);
  }, []);

  async function login(role: "ADMIN" | "USER") {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not sign in.");
      setUser(result.user);
      await loadDashboard();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Could not sign in.");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setResources([]);
    setReservations([]);
    setTodayReservations([]);
    setActivePage("Overview");
    setNotice("");
  }

  async function submitReservation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        resourceId: values.get("resourceId"),
        title: values.get("title"),
        startTime: `${values.get("date")}T${values.get("start")}:00`,
        endTime: `${values.get("date")}T${values.get("end")}:00`,
      };
      const response = await fetch(
        editingReservation ? `/api/reservations/${editingReservation.id}` : "/api/reservations",
        {
          method: editingReservation ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editingReservation ? { action: "UPDATE", ...payload } : payload),
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not create the reservation.");
      await loadDashboard();
      setNotice(
        editingReservation
          ? "Reservation updated."
          : `Reservation confirmed for ${result.reservation.resource.name}.`,
      );
      setReservationFormOpen(false);
      setEditingReservation(null);
    } catch (reservationError) {
      setError(
        reservationError instanceof Error
          ? reservationError.message
          : "Could not create the reservation.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelReservation(id: string) {
    setError("");
    try {
      const response = await fetch(`/api/reservations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CANCEL" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not cancel the reservation.");
      await loadDashboard();
      setNotice("Reservation cancelled.");
    } catch (cancelError) {
      setError(
        cancelError instanceof Error ? cancelError.message : "Could not cancel the reservation.",
      );
    }
  }

  async function submitResource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.get("name"),
          type: values.get("type"),
          location: values.get("location"),
          capacity: Number(values.get("capacity")),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not add the resource.");
      await loadDashboard();
      setNotice(`${result.resource.name} was added.`);
      setResourceFormOpen(false);
    } catch (resourceError) {
      setError(
        resourceError instanceof Error ? resourceError.message : "Could not add the resource.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function updateRoomStatus(resourceId: string, status: "AVAILABLE" | "MAINTENANCE") {
    setError("");
    try {
      const response = await fetch(`/api/resources/${resourceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not update the room status.");
      await loadDashboard();
      setNotice(
        `${result.resource.name} is now ${status === "AVAILABLE" ? "available" : "under maintenance"}.`,
      );
    } catch (statusError) {
      setError(
        statusError instanceof Error ? statusError.message : "Could not update the room status.",
      );
    }
  }

  const isAdmin = user?.role === "ADMIN";
  const availableCount = resources.filter((item) => item.displayStatus === "Available").length;
  const filteredResources = useMemo(
    () =>
      resources.filter(
        (item) =>
          item.name.toLowerCase().includes(query.toLowerCase()) ||
          item.type.toLowerCase().includes(query.toLowerCase()),
      ),
    [query, resources],
  );
  const openReservation = (resourceId = "") => {
    setEditingReservation(null);
    setSelectedResourceId(
      resourceId || resources.find((item) => item.displayStatus !== "Maintenance")?.id || "",
    );
    setBookingDate(today());
    setError("");
    setReservationFormOpen(true);
  };
  const openEdit = (reservation: Reservation) => {
    setEditingReservation(reservation);
    setSelectedResourceId(reservation.resource.id);
    setBookingDate(date(reservation.startTime));
    setError("");
    setReservationFormOpen(true);
  };

  if (!sessionReady)
    return (
      <main className="app-shell">
        <section className="content">
          <p>Loading…</p>
        </section>
      </main>
    );
  if (!user) return <LoginScreen loading={loading} error={error} onLogin={login} />;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">R</span>
          <span>
            Reserve<span className="brand-accent">ly</span>
          </span>
        </div>
        <div className="workspace">
          <span className="workspace-dot" /> Acme Workspace
        </div>
        <nav>
          {["Overview", "Resources", "Reservations"].map((item) => (
            <button
              key={item}
              className={`nav-item ${activePage === item ? "active" : ""}`}
              onClick={() => setActivePage(item)}
            >
              <span>{item === "Overview" ? "▦" : item === "Resources" ? "▧" : "◷"}</span>
              {item}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="profile">
            <span className="avatar">
              {user.name
                .split(" ")
                .map((part) => part[0])
                .join("")}
            </span>
            <span>
              <b>{user.name}</b>
              <small>{isAdmin ? "Admin" : "User"}</small>
            </span>
          </div>
        </div>
      </aside>
      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Reservation workspace</p>
            <h1>
              {activePage === "Overview" ? `Welcome, ${user.name.split(" ")[0]}` : activePage}
            </h1>
          </div>
          <div className="top-actions">
            <button className="secondary-button" onClick={logout}>
              Logout
            </button>
            <button className="primary-button" onClick={() => openReservation()}>
              <span>＋</span> New reservation
            </button>
          </div>
        </header>
        {notice && (
          <div className="notice">
            ✓ {notice}
            <button onClick={() => setNotice("")}>×</button>
          </div>
        )}
        {error && (
          <div className="notice">
            ! {error}
            <button onClick={() => setError("")}>×</button>
          </div>
        )}
        {activePage === "Overview" ? (
          <>
            <section className="stat-grid">
              <Stat
                icon="▧"
                label="Total resources"
                value={resources.length.toString()}
                detail="Available to your workspace"
                tone="purple"
              />
              <Stat
                icon="○"
                label="Available now"
                value={availableCount.toString()}
                detail="Ready to reserve"
                tone="green"
              />
              <Stat
                icon="◷"
                label="Today's reservations"
                value={todayReservations.length.toString()}
                detail="Across all users"
                tone="blue"
              />
              <Stat
                icon="↗"
                label="Utilization"
                value={
                  resources.length
                    ? `${Math.round(((resources.length - availableCount) / resources.length) * 100)}%`
                    : "0%"
                }
                detail="Based on current bookings"
                tone="orange"
              />
            </section>
            <section className="section-heading">
              <div>
                <h2>Resource availability</h2>
                <p>Find a space or piece of equipment.</p>
              </div>
              <button className="text-button" onClick={() => setActivePage("Resources")}>
                View all resources →
              </button>
            </section>
            <div className="resource-grid">
              {resources.slice(0, 3).map((resource) => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  onReserve={() => openReservation(resource.id)}
                />
              ))}
            </div>
            <section className="section-heading schedule-heading">
              <div>
                <h2>Today&apos;s confirmed bookings</h2>
                <p>All resources and users</p>
              </div>
            </section>
            <Schedule
              reservations={todayReservations}
              user={user}
              onCancel={cancelReservation}
              onEdit={openEdit}
            />
          </>
        ) : activePage === "Resources" ? (
          <>
            <section className="list-toolbar">
              <div>
                <h2>All resources</h2>
                <p>Shared spaces and equipment.</p>
              </div>
              <div>
                {isAdmin && (
                  <button
                    className="secondary-button"
                    onClick={() => {
                      setError("");
                      setResourceFormOpen(true);
                    }}
                  >
                    Add resource
                  </button>
                )}{" "}
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search resources"
                />
              </div>
            </section>
            <div className="resource-grid full-grid">
              {filteredResources.map((resource) => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  onReserve={() => openReservation(resource.id)}
                  canManageStatus={isAdmin}
                  onStatusChange={updateRoomStatus}
                />
              ))}
            </div>
          </>
        ) : (
          <>
            <section className="list-toolbar">
              <div>
                <h2>{isAdmin ? "All reservations" : "My reservations"}</h2>
                <p>
                  {isAdmin
                    ? "Manage bookings across the workspace."
                    : "You can only manage your own bookings."}
                </p>
              </div>
              <button className="secondary-button" onClick={() => openReservation()}>
                New reservation
              </button>
            </section>
            <Schedule
              reservations={reservations}
              user={user}
              onCancel={cancelReservation}
              onEdit={openEdit}
            />
          </>
        )}
      </section>
      {isReservationFormOpen && (
        <ReservationForm
          resources={resources}
          editingReservation={editingReservation}
          selectedResourceId={selectedResourceId}
          bookingDate={bookingDate}
          submitting={submitting}
          error={error}
          onSubmit={submitReservation}
          onClose={() => {
            setReservationFormOpen(false);
            setEditingReservation(null);
          }}
          onResourceChange={setSelectedResourceId}
        />
      )}
      {isResourceFormOpen && (
        <ResourceForm
          submitting={submitting}
          error={error}
          onSubmit={submitResource}
          onClose={() => setResourceFormOpen(false)}
        />
      )}
    </main>
  );
}

function LoginScreen({
  loading,
  error,
  onLogin,
}: {
  loading: boolean;
  error: string;
  onLogin: (role: "ADMIN" | "USER") => void;
}) {
  return (
    <main className="app-shell">
      <section className="content">
        <section className="modal" style={{ margin: "10vh auto", maxWidth: 460 }}>
          <p className="eyebrow">Reservely prototype</p>
          <h1>Sign in</h1>
          <p>Choose a demo account to test the role permissions.</p>
          {error && <p className="form-error">{error}</p>}
          <div className="modal-actions">
            <button className="secondary-button" disabled={loading} onClick={() => onLogin("USER")}>
              Continue as user
            </button>
            <button className="primary-button" disabled={loading} onClick={() => onLogin("ADMIN")}>
              Continue as admin
            </button>
          </div>
        </section>
      </section>
    </main>
  );
}
function ReservationForm({
  resources,
  editingReservation,
  selectedResourceId,
  bookingDate,
  submitting,
  error,
  onSubmit,
  onClose,
  onResourceChange,
}: {
  resources: Resource[];
  editingReservation: Reservation | null;
  selectedResourceId: string;
  bookingDate: string;
  submitting: boolean;
  error: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  onResourceChange: (id: string) => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <form className="modal" onSubmit={onSubmit}>
        <div className="modal-header">
          <div>
            <p className="eyebrow">{editingReservation ? "Manage booking" : "Create booking"}</p>
            <h2>{editingReservation ? "Edit reservation" : "New reservation"}</h2>
          </div>
          <button type="button" className="close-button" onClick={onClose}>
            ×
          </button>
        </div>
        {error && <p className="form-error">{error}</p>}
        <label>
          Resource
          <select
            name="resourceId"
            value={selectedResourceId}
            onChange={(event) => onResourceChange(event.target.value)}
            required
          >
            {resources
              .filter((item) => item.displayStatus !== "Maintenance")
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
          </select>
        </label>
        <label>
          Reservation title
          <input
            name="title"
            defaultValue={editingReservation?.title}
            placeholder="e.g. Sprint planning"
            required
          />
        </label>
        <div className="form-row">
          <label>
            Date
            <input name="date" type="date" defaultValue={bookingDate} required />
          </label>
          <label>
            Start time
            <input
              name="start"
              type="time"
              defaultValue={editingReservation ? time(editingReservation.startTime) : "10:00"}
              required
            />
          </label>
        </div>
        <div className="form-row">
          <label>
            End time
            <input
              name="end"
              type="time"
              defaultValue={editingReservation ? time(editingReservation.endTime) : "11:00"}
              required
            />
          </label>
        </div>
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-button" disabled={submitting}>
            {submitting ? "Saving…" : editingReservation ? "Save changes" : "Confirm reservation"}
          </button>
        </div>
      </form>
    </div>
  );
}
function ResourceForm({
  submitting,
  error,
  onSubmit,
  onClose,
}: {
  submitting: boolean;
  error: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <form className="modal" onSubmit={onSubmit}>
        <div className="modal-header">
          <div>
            <p className="eyebrow">Admin tools</p>
            <h2>Add resource</h2>
          </div>
          <button type="button" className="close-button" onClick={onClose}>
            ×
          </button>
        </div>
        {error && <p className="form-error">{error}</p>}
        <label>
          Name
          <input name="name" placeholder="e.g. Boardroom A" required />
        </label>
        <div className="form-row">
          <label>
            Type
            <input name="type" placeholder="Meeting room" required />
          </label>
          <label>
            Capacity
            <input name="capacity" type="number" min="1" defaultValue="1" required />
          </label>
        </div>
        <label>
          Location
          <input name="location" placeholder="e.g. Level 5" required />
        </label>
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-button" disabled={submitting}>
            {submitting ? "Saving…" : "Add resource"}
          </button>
        </div>
      </form>
    </div>
  );
}
function Stat({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: string;
  label: string;
  value: string;
  detail: string;
  tone: string;
}) {
  return (
    <article className="stat-card">
      <span className={`stat-icon ${tone}`}>{icon}</span>
      <p>{label}</p>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}
function ResourceCard({
  resource,
  onReserve,
  canManageStatus = false,
  onStatusChange,
}: {
  resource: Resource;
  onReserve: () => void;
  canManageStatus?: boolean;
  onStatusChange?: (id: string, status: "AVAILABLE" | "MAINTENANCE") => void;
}) {
  return (
    <article className="resource-card">
      <div className={`resource-visual ${resource.color}`}>
        <span>
          {resource.type === "Equipment" ? "▰" : resource.type === "Creative space" ? "✦" : "▥"}
        </span>
      </div>
      <div className="resource-copy">
        <div>
          <span className={`status ${resource.displayStatus.toLowerCase().replace(" ", "-")}`}>
            {resource.displayStatus}
          </span>
          <h3>{resource.name}</h3>
          <p>
            {resource.type} · {resource.location}
          </p>
        </div>
        <div className="card-footer">
          <span>
            ♙ {resource.capacity} {resource.capacity === 1 ? "item" : "people"}
          </span>
          {canManageStatus && resource.type === "Meeting room" && (
            <select
              aria-label={`Status for ${resource.name}`}
              value={resource.status}
              onChange={(event) =>
                onStatusChange?.(resource.id, event.target.value as "AVAILABLE" | "MAINTENANCE")
              }
            >
              <option value="AVAILABLE">Available</option>
              <option value="MAINTENANCE">Maintenance</option>
            </select>
          )}
          <button disabled={resource.displayStatus === "Maintenance"} onClick={onReserve}>
            {resource.displayStatus === "Maintenance" ? "Unavailable" : "Reserve"} →
          </button>
        </div>
      </div>
    </article>
  );
}
function Schedule({
  reservations,
  user,
  onCancel,
  onEdit,
}: {
  reservations: Reservation[];
  user: User;
  onCancel: (id: string) => void;
  onEdit: (reservation: Reservation) => void;
}) {
  return (
    <div className="schedule-card">
      <div className="schedule-head">
        <span>Time</span>
        <span>Reservation</span>
        <span>Resource</span>
        <span>Status</span>
      </div>
      {reservations.length ? (
        reservations.map((item) => (
          <div className="schedule-row" key={item.id}>
            <b>{item.time}</b>
            <span>
              <strong>{item.title}</strong>
              <small>{item.user.name}</small>
            </span>
            <span>{item.resource.name}</span>
            <span className={`status ${item.displayStatus.toLowerCase()}`}>
              {item.displayStatus}
            </span>
            {(user.role === "ADMIN" || item.user.id === user.id) && (
              <>
                <button className="row-action" onClick={() => onEdit(item)}>
                  Edit
                </button>
                <button className="row-action" onClick={() => onCancel(item.id)}>
                  Cancel
                </button>
              </>
            )}
          </div>
        ))
      ) : (
        <p className="empty-state">No reservations yet. Create one to get started.</p>
      )}
    </div>
  );
}
