import { useState } from "react";
import { LandingPage } from "./pages/LandingPage.jsx";
import { AppPage }     from "./pages/AppPage.jsx";
import "./styles/global.css";

export default function App() {
  const [page,   setPage]   = useState("landing"); // "landing" | "app"
  const [uiLang, setUiLang] = useState("ru");
  const [yearly, setYearly] = useState(false);

  if (page === "app") {
    return (
      <AppPage
        uiLang={uiLang}
        onBack={() => setPage("landing")}
      />
    );
  }

  return (
    <LandingPage
      uiLang={uiLang}
      setUiLang={setUiLang}
      yearly={yearly}
      setYearly={setYearly}
      onEnterApp={() => setPage("app")}
    />
  );
}
