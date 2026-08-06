import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { WorkshopApp } from "@/workshop/WorkshopApp";
import "@/workshop/workshop.css";

createRoot(document.getElementById("workshop-root")!).render(
  <StrictMode><WorkshopApp /></StrictMode>,
);
