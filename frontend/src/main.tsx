import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "@fontsource-variable/manrope";
import "./styles.css";
import "./momenta.css";
import { AIProvider } from "./components/AIContext";
import { PublicDemoNotice } from "./components/PublicDemoNotice";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AIProvider>
      <PublicDemoNotice />
      <App />
    </AIProvider>
  </React.StrictMode>,
);
