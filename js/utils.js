import { icons, state } from './state.js';
import { isAllowedRvuEmail } from './auth.js';

export async function promptUser(message, defaultValue = "") {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    Object.assign(overlay.style, {
      position: "fixed", top: "0", left: "0", width: "100%", height: "100%",
      backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center",
      justifyContent: "center", zIndex: "10000"
    });

    const modal = document.createElement("div");
    Object.assign(modal.style, {
      backgroundColor: "#fff", padding: "24px", borderRadius: "8px", width: "300px",
      maxWidth: "90%", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", fontFamily: "inherit"
    });

    const label = document.createElement("p");
    label.innerText = message;
    Object.assign(label.style, {
      marginTop: "0", marginBottom: "16px", fontWeight: "600", color: "#1d1a16", fontSize: "14px"
    });

    const input = document.createElement("input");
    input.type = "text";
    input.value = defaultValue;
    Object.assign(input.style, {
      width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px",
      boxSizing: "border-box", marginBottom: "24px", fontSize: "14px"
    });

    const btnContainer = document.createElement("div");
    Object.assign(btnContainer.style, {
      display: "flex", justifyContent: "flex-end", gap: "12px"
    });

    const cancelBtn = document.createElement("button");
    cancelBtn.innerText = "Cancel";
    Object.assign(cancelBtn.style, {
      padding: "8px 16px", border: "1px solid #ccc", backgroundColor: "transparent",
      borderRadius: "4px", cursor: "pointer", fontSize: "13px"
    });

    const okBtn = document.createElement("button");
    okBtn.innerText = "OK";
    Object.assign(okBtn.style, {
      padding: "8px 16px", border: "none", backgroundColor: "#d4af37",
      color: "#1d1a16", borderRadius: "4px", fontWeight: "600", cursor: "pointer", fontSize: "13px"
    });

    btnContainer.append(cancelBtn, okBtn);
    modal.append(label, input, btnContainer);
    overlay.append(modal);
    document.body.append(overlay);
    input.focus();

    const cleanup = () => document.body.removeChild(overlay);
    cancelBtn.onclick = () => { cleanup(); resolve(null); };
    okBtn.onclick = () => { cleanup(); resolve(input.value); };
    input.onkeydown = (e) => {
      if (e.key === "Enter") okBtn.onclick();
      if (e.key === "Escape") cancelBtn.onclick();
    };
  });
}

window.alert = function(message) {
  const overlay = document.createElement("div");
  Object.assign(overlay.style, {
    position: "fixed", top: "0", left: "0", width: "100%", height: "100%",
    backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center",
    justifyContent: "center", zIndex: "10000"
  });
  const modal = document.createElement("div");
  Object.assign(modal.style, {
    backgroundColor: "#fff", padding: "24px", borderRadius: "8px", width: "300px",
    maxWidth: "90%", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", fontFamily: "inherit"
  });
  const label = document.createElement("p");
  label.innerText = message;
  Object.assign(label.style, {
    marginTop: "0", marginBottom: "24px", fontWeight: "600", color: "#1d1a16", fontSize: "14px"
  });
  const btnContainer = document.createElement("div");
  Object.assign(btnContainer.style, { display: "flex", justifyContent: "flex-end" });
  const okBtn = document.createElement("button");
  okBtn.innerText = "OK";
  Object.assign(okBtn.style, {
    padding: "8px 16px", border: "none", backgroundColor: "#d4af37",
    color: "#1d1a16", borderRadius: "4px", fontWeight: "600", cursor: "pointer", fontSize: "13px"
  });
  overlay.setAttribute("role", "alertdialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Notice");
  btnContainer.appendChild(okBtn);
  modal.append(label, btnContainer);
  overlay.appendChild(modal);
  const previouslyFocused = document.activeElement;
  document.body.appendChild(overlay);
  okBtn.focus();

  // Escape must work from anywhere in the dialog, not only while the button has focus.
  const onKeyDown = (e) => {
    if (e.key === "Escape" || e.key === "Enter") { e.preventDefault(); cleanup(); }
    if (e.key === "Tab") { e.preventDefault(); okBtn.focus(); }
  };
  const cleanup = () => {
    document.removeEventListener("keydown", onKeyDown, true);
    if (document.body.contains(overlay)) document.body.removeChild(overlay);
    if (previouslyFocused && typeof previouslyFocused.focus === "function") previouslyFocused.focus();
  };
  document.addEventListener("keydown", onKeyDown, true);
  okBtn.onclick = cleanup;
  overlay.onclick = (e) => { if (e.target === overlay) cleanup(); };
};

export function replaceCollection(target, values) {
  target.splice(0, target.length, ...values);
}

export function icon(name) {
  return icons[name] || "";
}

export function multiSelectField(name, label, options, selectedValues = []) {
  return `
    <div class="field" style="margin-bottom: 16px;">
      <label style="display:block;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#756552;margin-bottom:8px;font-family:inherit;">${label}</label>
      <div style="max-height: 150px; overflow-y: auto; border: 1.5px solid #c8b89a; padding: 12px;">
        ${options.map((opt) => `
          <label style="display:flex;align-items:center;gap:12px;font-size:14px;margin-bottom:12px;cursor:pointer;color:#1a1a1a;">
            <input type="checkbox" name="${name}" value="${escapeHtml(opt.id)}" ${selectedValues.includes(opt.id) ? "checked" : ""} style="cursor:pointer;width:18px;height:18px;accent-color:#D7AC54;" data-multi-select="${name}" />
            ${escapeHtml(opt.name)}
          </label>
        `).join("")}
      </div>
    </div>
  `;
}

export function selectField(name, label, options, value) {
  return `
    <div class="field">
      <label>${escapeHtml(label)}</label>
      <select data-filter="${escapeHtml(name)}">
        ${options.map((option) => `<option value="${escapeHtml(option)}" ${option === value ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}
      </select>
    </div>
  `;
}

// Reusable dropdown for modal forms.
// Preserves the exact inline styles used across Create Event / Announcement / Edit Profile.
// opts: array of { value, label } objects OR plain strings (value === label).
// selected: the currently selected value.
export function modalSelectField(id, labelText, opts, selected) {
  const options = opts.map((o) => {
    const val = typeof o === "string" ? o : o.value;
    const txt = typeof o === "string" ? o : o.label;
    return `<option value="${escapeHtml(val)}" ${val === selected ? "selected" : ""}>${escapeHtml(txt)}</option>`;
  }).join("");
  return `
    <div style="margin-bottom:20px;">
      <label style="display:block;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#756552;margin-bottom:8px;font-family:inherit;">${labelText}</label>
      <select id="${id}" style="width:100%;border:1.5px solid #c8b89a;background:transparent;padding:10px 12px;font-size:14px;font-family:inherit;color:#1a1a1a;outline:none;">
        ${options}
      </select>
    </div>
  `;
}

export function inputField(name, label, value, type = "text") {
  return `
    <div class="field">
      <label>${escapeHtml(label)}</label>
      <input data-input="${escapeHtml(name)}" type="${escapeHtml(type)}" value="${escapeHtml(value || "")}" />
    </div>
  `;
}

export function clubInputField(name, label, value, placeholder = "", type = "text") {
  return `
    <div class="field">
      <label>${label}</label>
      <input data-club-input="${name}" type="${type}" value="${escapeHtml(value || "")}" placeholder="${escapeHtml(placeholder)}" />
    </div>
  `;
}

export function clubSelectField(name, label, options, value) {
  return `
    <div class="field">
      <label>${label}</label>
      <select data-club-input="${name}">
        ${options.map((option) => `<option ${option === value ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}
      </select>
    </div>
  `;
}

export function clubTextArea(name, label, value) {
  return `
    <div class="field">
      <label>${label}</label>
      <textarea data-club-input="${name}">${escapeHtml(value || "")}</textarea>
    </div>
  `;
}

export function unique(values) {
  return [...new Set(values)];
}

/** Coerce a Firestore Timestamp, ISO string or Date into a Date, or null. */
export function toDate(value) {
  if (!value) return null;
  const date = value?.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(date?.getTime?.()) ? null : date;
}

/** Relative time from createdAt. Compute at render — never store a formatted string. */
export function formatRelativeTime(value, fallback = "") {
  const date = toDate(value);
  if (!date) return fallback;
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 45) return "Just now";
  if (seconds < 90) return "A minute ago";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? "An hour ago" : `${hours} hours ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) {
    const weeks = Math.round(days / 7);
    return weeks === 1 ? "Last week" : `${weeks} weeks ago`;
  }
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/** Display an event's date as e.g. "Mon, 20 Aug 2026" instead of a raw ISO string. */
export function formatEventDate(value) {
  const raw = String(value == null ? "" : value).trim();
  if (!raw) return "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw; // already a display string
  const date = new Date(`${raw}T12:00:00`);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

/** Short month + day pair for the event card poster block. */
export function eventDateParts(value) {
  const raw = String(value == null ? "" : value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const date = new Date(`${raw}T12:00:00`);
    if (!Number.isNaN(date.getTime())) {
      return {
        month: date.toLocaleDateString(undefined, { month: "short" }),
        day: String(date.getDate()).padStart(2, "0"),
      };
    }
  }
  // Loose display dates such as "May 22".
  const loose = raw.match(/^([A-Za-z]{3,})\s+(\d{1,2})$/);
  if (loose) return { month: loose[1].slice(0, 3), day: loose[2].padStart(2, "0") };
  return { month: raw.slice(0, 3), day: "" };
}

/**
 * Escape for text AND attribute contexts. Quotes must be escaped — this is interpolated into
 * double-quoted attributes everywhere, and leaving them intact allows attribute breakout.
 *
 * Keep self-contained: this module is in an import cycle, so escapeHtml can run before the
 * module body finishes. A module-level lookup table here throws at boot. Do not refactor.
 */
export function escapeHtml(str) {
  if (typeof str !== "string") return str == null ? "" : String(str);
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Allow only http(s) URLs through into href/src, so javascript:/data: cannot execute. */
export function safeUrl(value) {
  const raw = String(value == null ? "" : value).trim();
  if (!raw) return "";
  if (!/^https?:\/\//i.test(raw)) return "";
  return escapeHtml(raw);
}

export function validateClubDraft() {
  const required = [
    ["name", "Club name"],
    ["category", "Category"],
    ["school", "School"],
    ["description", "Description"],
    ["founderName", "Founder name"],
    ["founderEmail", "Founder RVU email"],
    ["facultyAdvisorName", "Faculty advisor name"],
    ["facultyAdvisorEmail", "Faculty advisor RVU email"],
    ["currentPresidentName", "Current president name"],
    ["currentPresidentEmail", "Current president RVU email"],
  ];
  const missing = required.find(([key]) => !String(state.clubDraft[key] || "").trim());
  if (missing) return `${missing[1]} is required.`;
  const emails = [
    ["founderEmail", "Founder email"],
    ["facultyAdvisorEmail", "Faculty advisor email"],
    ["currentPresidentEmail", "Current president email"],
  ];
  const invalid = emails.find(([key]) => !isAllowedRvuEmail(state.clubDraft[key]));
  if (invalid) return `${invalid[1]} must be a valid email.`;
  return "";
}

