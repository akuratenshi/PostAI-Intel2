import { useState, useEffect } from "react";
import { LandingPage } from "./pages/LandingPage.jsx";
import { AppPage } from "./pages/AppPage.jsx";
import "./styles/global.css";
import { CookieBanner } from "./components/CookieBanner.jsx";

export default function App() {
  const [page, setPage] = useState(() => localStorage.getItem("currentPage") || "landing");
  const [step, setStep] = useState(() => Number(localStorage.getItem("currentStep")) || 0);
  const [uiLang, setUiLang] = useState("ru");
  const [yearly, setYearly] = useState(false);

  useEffect(() => {
    history.replaceState({ page, step }, "");
  }, []);

  const goToApp = () => {
    localStorage.setItem("currentPage", "app");
    localStorage.setItem("currentStep", "0");
    setPage("app");
    setStep(0);
    history.pushState({ page: "app", step: 0 }, "");
  };

  const goToLanding = () => {
    localStorage.setItem("currentPage", "landing");
    localStorage.setItem("currentStep", "0");
    setPage("landing");
    setStep(0);
    history.pushState({ page: "landing", step: 0 }, "");
  };

  const handleStepChange = (newStep) => {
    localStorage.setItem("currentStep", String(newStep));
    setStep(newStep);
    history.pushState({ page: "app", step: newStep }, "");
  };

  useEffect(() => {
    const handlePopState = (event) => {
      const s = event.state || {};
      const newPage = s.page || "landing";
      const newStep = s.step ?? 0;
      localStorage.setItem("currentPage", newPage);
      localStorage.setItem("currentStep", String(newStep));
      setPage(newPage);
      setStep(newStep);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  if (page === "app") {
    return (
  <>
    <CookieBanner />
    {page === "app" ? <AppPage ... /> : <LandingPage ... />}
  </>
);
    return (
      <AppPage
        uiLang={uiLang}
        onBack={goToLanding}
        step={step}
        onStepChange={handleStepChange}
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
