import { useState, useEffect } from "react";
import { LandingPage } from "./pages/LandingPage.jsx";
import { AppPage } from "./pages/AppPage.jsx";
import "./styles/global.css";

export default function App() {
  const [page, setPage] = useState(() => {
    return localStorage.getItem("currentPage") || "landing";
  });
  const [uiLang, setUiLang] = useState("ru");
  const [yearly, setYearly] = useState(false);

  const goToApp = () => {
    localStorage.setItem("currentPage", "app");
    setPage("app");
  };

  const goToLanding = () => {
    localStorage.setItem("currentPage", "landing");
    setPage("landing");
  };

  if (page === "app") {
    return (
      <AppPage
        uiLang={uiLang}
        onBack={goToLanding}
      />
    );
  }

  return (
    <LandingPage
      uiLang={uiLang}
      setUiLang={setUiLang}
      yearly={yearly}
      setYearly={setYearly}
      onEnterApp={goToApp}
    />
  );
}
