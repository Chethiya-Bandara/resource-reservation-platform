import type { FormEvent } from "react";
import { useState } from "react";

import { formatWorkspaceTime, toWorkspaceDateInputValue } from "@/lib/workspace-time";
import {
  resourceTypeLabels,
  type Reservation,
  type Resource,
  type User,
} from "@/lib/reservation-types";

export function LoginScreen({
  loading,
  error,
  onLogin,
  onRegister,
}: {
  loading: boolean;
  error: string;
  onLogin: (event: FormEvent<HTMLFormElement>) => void;
  onRegister: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [mode, setMode] = useState<"start" | "login" | "register">("start");
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-emblem">R</div>
        <section className="auth-panel">
          <p className="eyebrow">RESERVELY</p>
          <h1>
            {mode === "start"
              ? "Welcome to Reservely"
              : mode === "login"
                ? "Sign in"
                : "Create an account"}
          </h1>
          {error && <p className="form-error">{error}</p>}
          {mode === "start" ? (
            <div className="modal-actions">
              <button className="secondary-button" onClick={() => setMode("login")}>
                Login
              </button>
              <button className="primary-button" onClick={() => setMode("register")}>
                Register
              </button>
            </div>
          ) : mode === "login" ? (
            <>
              <p>Sign in with your account.</p>
              <form onSubmit={onLogin}>
                <label>
                  Email
                  <input name="email" type="email" required />
                </label>
                <label>
                  Password
                  <input name="password" type="password" minLength={8} required />
                </label>
                <div className="modal-actions">
                  <button className="primary-button" disabled={loading}>
                    Sign in
                  </button>
                </div>
              </form>
              <p>
                New here?{" "}
                <button className="text-button" onClick={() => setMode("register")}>
                  Register
                </button>
              </p>
            </>
          ) : (
            <>
              <form onSubmit={onRegister}>
                <label>
                  Name
                  <input name="name" required />
                </label>
                <label>
                  Email
                  <input name="email" type="email" required />
                </label>
                <label>
                  Password
                  <input name="password" type="password" minLength={8} required />
                </label>
                <label>
                  Account type
                  <select name="role">
                    <option value="MEMBER">User</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </label>
                <div className="modal-actions">
                  <button className="secondary-button" disabled={loading}>
                    Register
                  </button>
                </div>
              </form>
              <p>
                Already have an account?{" "}
                <button className="text-button" onClick={() => setMode("login")}>
                  Login
                </button>
              </p>
            </>
          )}
        </section>
      </section>
    </main>
  );
}

export function ReservationForm({
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
              defaultValue={
                editingReservation ? formatWorkspaceTime(editingReservation.startTime) : "10:00"
              }
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
              defaultValue={
                editingReservation ? formatWorkspaceTime(editingReservation.endTime) : "11:00"
              }
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

export function ResourceForm({
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
            <select name="type" defaultValue="MEETING_ROOM">
              {Object.entries(resourceTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
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

export function Stat({
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

export function ResourceCard({
  resource,
  onReserve,
  canManageStatus = false,
  onStatusChange,
  onScheduleMaintenance,
}: {
  resource: Resource;
  onReserve: () => void;
  canManageStatus?: boolean;
  onStatusChange?: (id: string, status: "AVAILABLE" | "MAINTENANCE") => void;
  onScheduleMaintenance?: (id: string) => void;
}) {
  const icon = resource.type === "EQUIPMENT" ? "▰" : resource.type === "CREATIVE_SPACE" ? "✦" : "▥";
  return (
    <article className="resource-card">
      <div className={`resource-visual ${resource.color}`}>
        <span>{icon}</span>
      </div>
      <div className="resource-copy">
        <div>
          <span className={`status ${resource.displayStatus.toLowerCase().replace(" ", "-")}`}>
            {resource.displayStatus}
          </span>
          <div className="resource-title">
            <h3>{resource.name}</h3>
            <span>
              ♙ {resource.capacity} {resource.capacity === 1 ? "item" : "people"}
            </span>
          </div>
          <p>
            {resourceTypeLabels[resource.type]} · {resource.location}
          </p>
        </div>
        <div className="card-footer">
          {canManageStatus && (
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
          {canManageStatus && (
            <button onClick={() => onScheduleMaintenance?.(resource.id)}>
              Schedule maintenance
            </button>
          )}
          <button disabled={resource.displayStatus === "Maintenance"} onClick={onReserve}>
            {resource.displayStatus === "Maintenance" ? "Unavailable" : "Reserve"} →
          </button>
        </div>
      </div>
    </article>
  );
}

export function MaintenanceForm({
  resource,
  date,
  submitting,
  error,
  onSubmit,
  onClose,
  schedule,
}: {
  resource: Resource;
  date: string;
  submitting: boolean;
  error: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  schedule?: { startTime: string; endTime: string };
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <form className="modal" onSubmit={onSubmit}>
        <div className="modal-header">
          <div>
            <p className="eyebrow">Admin tools</p>
            <h2>{schedule ? "Edit maintenance" : "Schedule maintenance"}</h2>
          </div>
          <button type="button" className="close-button" onClick={onClose}>
            ×
          </button>
        </div>
        {error && <p className="form-error">{error}</p>}
        <p>{resource.name}</p>
        <label>
          Date
          <input
            name="date"
            type="date"
            defaultValue={schedule ? toWorkspaceDateInputValue(schedule.startTime) : date}
            required
          />
        </label>
        <div className="form-row">
          <label>
            Start time
            <input
              name="start"
              type="time"
              defaultValue={schedule ? formatWorkspaceTime(schedule.startTime) : "09:00"}
              required
            />
          </label>
          <label>
            End time
            <input
              name="end"
              type="time"
              defaultValue={schedule ? formatWorkspaceTime(schedule.endTime) : "10:00"}
              required
            />
          </label>
        </div>
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-button" disabled={submitting}>
            {submitting ? "Saving…" : schedule ? "Save changes" : "Schedule maintenance"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function Schedule({
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
        <span>Date & time</span>
        <span>Reservation</span>
        <span>Resource</span>
        <span>Status</span>
      </div>
      {reservations.length ? (
        reservations.map((item) => (
          <div className="schedule-row" key={item.id}>
            <b>
              {toWorkspaceDateInputValue(item.startTime)}
              <br />
              {item.time}
            </b>
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
