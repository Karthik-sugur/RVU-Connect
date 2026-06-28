export function showAlert(message) {
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
      marginTop: "0", marginBottom: "24px", color: "#1d1a16", fontSize: "14px", lineHeight: "1.5"
    });

    const btnContainer = document.createElement("div");
    Object.assign(btnContainer.style, {
      display: "flex", justifyContent: "flex-end"
    });

    const okBtn = document.createElement("button");
    okBtn.innerText = "OK";
    Object.assign(okBtn.style, {
      padding: "8px 16px", border: "none", backgroundColor: "#d4af37",
      color: "#1d1a16", borderRadius: "4px", fontWeight: "600", cursor: "pointer", fontSize: "13px"
    });

    btnContainer.append(okBtn);
    modal.append(label, btnContainer);
    overlay.append(modal);
    document.body.append(overlay);
    okBtn.focus();

    const cleanup = () => { document.body.removeChild(overlay); resolve(); };
    okBtn.onclick = cleanup;
    overlay.onkeydown = (e) => {
      if (e.key === "Enter" || e.key === "Escape") cleanup();
    };
  });
}

export function showConfirm(message) {
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
      marginTop: "0", marginBottom: "24px", color: "#1d1a16", fontSize: "14px", lineHeight: "1.5"
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
    okBtn.innerText = "Confirm";
    Object.assign(okBtn.style, {
      padding: "8px 16px", border: "none", backgroundColor: "#d93025",
      color: "#fff", borderRadius: "4px", fontWeight: "600", cursor: "pointer", fontSize: "13px"
    });

    btnContainer.append(cancelBtn, okBtn);
    modal.append(label, btnContainer);
    overlay.append(modal);
    document.body.append(overlay);
    okBtn.focus();

    const cleanup = () => document.body.removeChild(overlay);
    cancelBtn.onclick = () => { cleanup(); resolve(false); };
    okBtn.onclick = () => { cleanup(); resolve(true); };
  });
}

export function showPrompt(message, defaultValue = "") {
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
