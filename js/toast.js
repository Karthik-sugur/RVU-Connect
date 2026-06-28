window.addEventListener("rvu-toast", (e) => {
  const { message, type } = e.detail;
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerText = message;
  toast.style.position = "fixed";
  toast.style.bottom = "20px";
  toast.style.left = "50%";
  toast.style.transform = "translateX(-50%)";
  toast.style.padding = "12px 24px";
  toast.style.borderRadius = "8px";
  toast.style.backgroundColor = type === "error" ? "#e53e3e" : "#38a169";
  toast.style.color = "#fff";
  toast.style.fontWeight = "bold";
  toast.style.zIndex = "9999";
  toast.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
  toast.style.fontFamily = "'Inter', sans-serif";
  toast.style.fontSize = "14px";
  toast.style.opacity = "0";
  toast.style.transition = "opacity 0.3s ease";
  
  document.body.appendChild(toast);
  
  // Fade in
  setTimeout(() => { toast.style.opacity = "1"; }, 10);
  
  // Fade out and remove
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
});
