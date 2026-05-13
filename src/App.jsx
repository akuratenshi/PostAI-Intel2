import { useState, useEffect } from "react";
import { LandingPage } from "./pages/LandingPage.jsx";
import { AppPage } from "./pages/AppPage.jsx";
import "./styles/global.css";
import { CookieBanner } from "./components/CookieBanner.jsx";
import { useAuth, SignIn } from "@clerk/clerk-react";

export default function App() {
  const { isSignedIn } = useAuth();
const [page,   setPage]   = useState("landing"); // "landing" | "app"
const [uiLang, setUiLangState] = useState(
  localStorage.getItem("ui_lang") ||
  (navigator.language?.startsWith("en") ? "uk" : "en")
);
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
    if (!isSignedIn) {
      return (
        <>
          <CookieBanner />
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "20px",
          }}>
            <div style={{ marginBottom: "24px", textAlign: "center" }}>
              <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: "22px", fontWeight: 700, marginBottom: "8px" }}>
                Войдите чтобы продолжить
              </h2>
              <p style={{ color: "var(--text-dim)", fontSize: "14px" }}>
                Для использования генератора необходима авторизация
              </p>
            </div>
            <SignIn routing="hash" />
            <button
              onClick={goToLanding}
              style={{
                marginTop: "16px",
                background: "none",
                border: "none",
                color: "var(--text-dim)",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              ← Вернуться на главную
            </button>
          </div>
        </>
      );
    }

    return (
      <>
        <CookieBanner />
        <AppPage
          uiLang={uiLang}
          onBack={goToLanding}
          step={step}
          onStepChange={handleStepChange}
        />
      </>
    );
  }

  return (
    <>
      <CookieBanner />
      <LandingPage
        uiLang={uiLang}
        setUiLang={setUiLang}
        yearly={yearly}
        setYearly={setYearly}
        onEnterApp={goToApp}
      />
    </>
  );
}
