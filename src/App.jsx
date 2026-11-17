import { useState, useEffect } from "react";
import { useAuth, SignIn } from "@clerk/clerk-react";
import { LandingPage } from "./pages/LandingPage.jsx";
import { AppPage } from "./pages/AppPage.jsx";
import { CookieBanner } from "./components/CookieBanner.jsx";
import "./styles/global.css";

export default function App() {
  const { isLoaded, isSignedIn, userId } = useAuth();

  const [page, setPage] = useState(
    () => localStorage.getItem("currentPage") || "landing"
  );

  const [step, setStep] = useState(() => {
    const saved = Number(localStorage.getItem("currentStep"));
    return [0, 1, 2].includes(saved) ? saved : 0;
  });

  const [uiLang, setUiLangState] = useState(
    () =>
      localStorage.getItem("ui_lang") ||
      (navigator.language?.startsWith("uk") ? "uk" : "en")
  );

  const [yearly, setYearly] = useState(false);

  const setUiLang = (lang) => {
    localStorage.setItem("ui_lang", lang);
    setUiLangState(lang);
  };

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
    if (![0, 1, 2].includes(newStep)) return;

    localStorage.setItem("currentStep", String(newStep));
    setStep(newStep);

    history.pushState({ page: "app", step: newStep }, "");
  };

  useEffect(() => {
    const handlePopState = (event) => {
      const state = event.state || {};
      const newPage = state.page === "app" ? "app" : "landing";
      const newStep = [0, 1, 2].includes(state.step)
        ? state.step
        : 0;

      localStorage.setItem("currentPage", newPage);
      localStorage.setItem("currentStep", String(newStep));

      setPage(newPage);
      setStep(newStep);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  if (page === "app") {
    if (!isLoaded) {
      return (
        <div
          role="status"
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-dim)",
          }}
        >
          Загрузка…
        </div>
      );
    }

    if (!isSignedIn) {
      return (
        <>
          <CookieBanner />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "100vh",
              padding: "20px",
            }}
          >
            <div
              style={{
                marginBottom: "24px",
                textAlign: "center",
              }}
            >
              <h2
                style={{
                  fontFamily: "'Syne',sans-serif",
                  fontSize: "22px",
                  fontWeight: 700,
                  marginBottom: "8px",
                }}
              >
                Войдите, чтобы продолжить
              </h2>

              <p
                style={{
                  color: "var(--text-dim)",
                  fontSize: "14px",
                }}
              >
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
          key={userId}
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
