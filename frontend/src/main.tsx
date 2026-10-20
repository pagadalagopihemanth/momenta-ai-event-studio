import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "@fontsource-variable/manrope";
import "./styles.css";
import "./momenta.css";
import { AIProvider } from "./components/AIContext";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AIProvider>
      <App />
    </AIProvider>
  </React.StrictMode>,
);
