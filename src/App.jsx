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

  // При первой загрузке записываем начальное состояние в историю
  useEffect(() => {
    history.replaceState({ page: page }, "");
  }, []);

  const goToApp = () => {
    localStorage.setItem("currentPage", "app");
    setPage("app");
    history.pushState({ page: "app" }, "");
  };

  const goToLanding = () => {
    localStorage.setItem("currentPage", "landing");
    setPage("landing");
    history.pushState({ page: "landing" }, "");
  };

  // Слушаем кнопки "Назад" и "Вперёд"
  useEffect(() => {
    const handlePopState = (event) => {
      const newPage = event.state?.page || "landing";
      localStorage.setItem("currentPage", newPage);
      setPage(newPage);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

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
