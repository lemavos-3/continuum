import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Force dark mode globally — design system is monochrome dark only.
if (typeof document !== "undefined") {
  document.documentElement.classList.add("dark");
  document.documentElement.style.colorScheme = "dark";
}

createRoot(document.getElementById("root")!).render(<App />);
