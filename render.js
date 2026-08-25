const root = ReactDOM.createRoot(document.getElementById("root"));
try {
  root.render(/*#__PURE__*/React.createElement(TimetableApp, null));
} catch (err) {
  const el = document.getElementById("boot-loading");
  if (el) {
    el.style.color = "#B23A2E";
    el.style.textAlign = "left";
    el.style.padding = "16px";
    el.style.whiteSpace = "pre-wrap";
    el.style.fontFamily = "monospace";
    el.style.fontSize = "12px";
    el.textContent = "RENDER ERROR: " + err.message + "\n\n" + err.stack;
  }
}
