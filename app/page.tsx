"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import {
  LoginScreen,
  MaintenanceForm,
  ReservationForm,
  ResourceCard,
  ResourceForm,
  Schedule,
  Stat,
} from "@/app/components/reservation-ui";
import {
  mapDashboard,
  resourceTypeLabels,
  type Reservation,
  type MaintenanceSchedule,
  type Resource,
  type User,
} from "@/lib/reservation-types";
import {
  formatWorkspaceTime,
  parseWorkspaceDateTime,
  toWorkspaceDateInputValue,
} from "@/lib/workspace-time";

async function requestJson(url: string, options?: RequestInit) {
  const response = await fetch(url, options);
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "The request could not be completed.");
  return result;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [activePage, setActivePage] = useState("Overview");
  const [resources, setResources] = useState<Resource[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [todayReservations, setTodayReservations] = useState<Reservation[]>([]);
  const [maintenanceSchedules, setMaintenanceSchedules] = useState<MaintenanceSchedule[]>([]);
  const [isReservationFormOpen, setReservationFormOpen] = useState(false);
  const [isResourceFormOpen, setResourceFormOpen] = useState(false);
  const [maintenanceResource, setMaintenanceResource] = useState<Resource | null>(null);
  const [editingMaintenance, setEditingMaintenance] = useState<MaintenanceSchedule | null>(null);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [selectedResourceId, setSelectedResourceId] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [bookingError, setBookingError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function loadDashboard() {
    const result = await requestJson("/api/dashboard", { cache: "no-store" });
    const dashboard = mapDashboard(result);
    setResources(dashboard.resources);
    setReservations(dashboard.reservations);
    setTodayReservations(dashboard.todayReservations);
    setMaintenanceSchedules(dashboard.maintenanceSchedules);
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
          const result = await requestJson("/api/auth/me", { cache: "no-store" });
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

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setLoading(true);
    setError("");
    try {
      const result = await requestJson("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.get("email"), password: values.get("password") }),
      });
      setUser(result.user);
      await loadDashboard();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Could not sign in.");
    } finally {
      setLoading(false);
    }
  }
  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setLoading(true);
    setError("");
    try {
      const result = await requestJson("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.get("name"),
          email: values.get("email"),
          password: values.get("password"),
          role: values.get("role"),
        }),
      });
      setUser(result.user);
      await loadDashboard();
    } catch (registerError) {
      setError(registerError instanceof Error ? registerError.message : "Could not register.");
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
    const startTime = `${values.get("date")}T${values.get("start")}:00`;
    const endTime = `${values.get("date")}T${values.get("end")}:00`;
    if (parseWorkspaceDateTime(startTime) < new Date()) {
      setBookingError("Reservations cannot be made for past dates and times.");
      return;
    }
    setSubmitting(true);
    setError("");
    setBookingError("");
    const payload = {
      resourceId: values.get("resourceId"),
      title: values.get("title"),
      startTime,
      endTime,
    };
    try {
      const result = await requestJson(
        editingReservation ? `/api/reservations/${editingReservation.id}` : "/api/reservations",
        {
          method: editingReservation ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editingReservation ? { action: "UPDATE", ...payload } : payload),
        },
      );
      await loadDashboard();
      setNotice(
        editingReservation
          ? "Reservation updated."
          : `Reservation confirmed for ${result.reservation.resource.name}.`,
      );
      setReservationFormOpen(false);
      setEditingReservation(null);
    } catch (reservationError) {
      setBookingError(
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
      await requestJson(`/api/reservations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CANCEL" }),
      });
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
      const result = await requestJson("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.get("name"),
          type: values.get("type"),
          location: values.get("location"),
          capacity: Number(values.get("capacity")),
        }),
      });
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
      const result = await requestJson(`/api/resources/${resourceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
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
  async function submitMaintenance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!maintenanceResource) return;
    const values = new FormData(event.currentTarget);
    setSubmitting(true);
    try {
      await requestJson(
        editingMaintenance ? `/api/maintenance/${editingMaintenance.id}` : "/api/maintenance",
        {
          method: editingMaintenance ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resourceId: maintenanceResource.id,
            startTime: `${values.get("date")}T${values.get("start")}:00`,
            endTime: `${values.get("date")}T${values.get("end")}:00`,
          }),
        },
      );
      await loadDashboard();
      setMaintenanceResource(null);
      setEditingMaintenance(null);
      setNotice("Maintenance scheduled.");
    } catch (maintenanceError) {
      setError(
        maintenanceError instanceof Error
          ? maintenanceError.message
          : "Could not schedule maintenance.",
      );
    } finally {
      setSubmitting(false);
    }
  }
  async function deleteMaintenance(id: string) {
    try {
      await requestJson(`/api/maintenance/${id}`, { method: "DELETE" });
      await loadDashboard();
      setNotice("Maintenance deleted.");
    } catch (maintenanceError) {
      setError(
        maintenanceError instanceof Error
          ? maintenanceError.message
          : "Could not delete maintenance.",
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
          resourceTypeLabels[item.type].toLowerCase().includes(query.toLowerCase()),
      ),
    [query, resources],
  );
  const openReservation = (resourceId = "") => {
    setEditingReservation(null);
    setSelectedResourceId(
      resourceId || resources.find((item) => item.displayStatus !== "Maintenance")?.id || "",
    );
    setBookingDate(toWorkspaceDateInputValue());
    setError("");
    setBookingError("");
    setReservationFormOpen(true);
  };
  const openEdit = (reservation: Reservation) => {
    setEditingReservation(reservation);
    setSelectedResourceId(reservation.resource.id);
    setBookingDate(toWorkspaceDateInputValue(reservation.startTime));
    setError("");
    setBookingError("");
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
  if (!user)
    return <LoginScreen loading={loading} error={error} onLogin={login} onRegister={register} />;
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
          <span className="workspace-dot" /> Workspace
        </div>
        <nav>
          {[
            "Overview",
            "Resources",
            "Reservations",
            ...(isAdmin ? ["Maintenance Schedules"] : []),
          ].map((item) => (
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
                  onScheduleMaintenance={(id) =>
                    setMaintenanceResource(resources.find((resource) => resource.id === id) ?? null)
                  }
                />
              ))}
            </div>
          </>
        ) : activePage === "Maintenance Schedules" ? (
          <>
            <section className="list-toolbar">
              <div>
                <h2>Maintenance Schedules</h2>
                <p>Upcoming maintenance for all resources.</p>
              </div>
            </section>
            <div className="schedule-card">
              {maintenanceSchedules.length ? (
                maintenanceSchedules.map((item) => (
                  <div className="schedule-row" key={item.id}>
                    <b>
                      {toWorkspaceDateInputValue(item.startTime)}
                      <br />
                      {formatWorkspaceTime(item.startTime)} - {formatWorkspaceTime(item.endTime)}
                    </b>
                    <span>
                      <strong>Maintenance</strong>
                      <small>{item.resource.name}</small>
                    </span>
                    <span>{item.resource.location}</span>
                    <button
                      className="row-action"
                      onClick={() => {
                        setMaintenanceResource(
                          resources.find((resource) => resource.id === item.resource.id) ?? null,
                        );
                        setEditingMaintenance(item);
                      }}
                    >
                      Update
                    </button>
                    <button className="row-action" onClick={() => deleteMaintenance(item.id)}>
                      Delete
                    </button>
                  </div>
                ))
              ) : (
                <p className="empty-state">No upcoming maintenance is scheduled.</p>
              )}
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
          error={bookingError}
          onSubmit={submitReservation}
          onClose={() => {
            setReservationFormOpen(false);
            setEditingReservation(null);
            setBookingError("");
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
      {maintenanceResource && (
        <MaintenanceForm
          resource={maintenanceResource}
          date={toWorkspaceDateInputValue()}
          submitting={submitting}
          error={error}
          onSubmit={submitMaintenance}
          onClose={() => setMaintenanceResource(null)}
          schedule={editingMaintenance ?? undefined}
        />
      )}
    </main>
  );
}
