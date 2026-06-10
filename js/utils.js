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
  btnContainer.appendChild(okBtn);
  modal.append(label, btnContainer);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  okBtn.focus();
  const cleanup = () => { if (document.body.contains(overlay)) document.body.removeChild(overlay); };
  okBtn.onclick = cleanup;
  okBtn.onkeydown = (e) => { if (e.key === "Enter" || e.key === "Escape") cleanup(); };
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
      <label style="display:block;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8a7a6a;margin-bottom:8px;font-family:inherit;">${label}</label>
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
      <label>${label}</label>
      <select data-filter="${name}">
        ${options.map((option) => `<option ${option === value ? "selected" : ""}>${option}</option>`).join("")}
      </select>
    </div>
  `;
}

export function inputField(name, label, value, type = "text") {
  return `
    <div class="field">
      <label>${label}</label>
      <input data-input="${name}" type="${type}" value="${value}" />
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

export function escapeHtml(str) {
  if (typeof str !== "string") return str == null ? "" : String(str);
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
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
  if (invalid) return `${invalid[1]} must end with @rvu.edu.in.`;
  return "";
}

