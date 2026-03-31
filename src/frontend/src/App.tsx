import { useEffect, useState } from "react";
import { Layout } from "./components/Layout";
import { SplashScreen } from "./components/SplashScreen";
import { Toaster } from "./components/ui/sonner";
import { Accounts } from "./pages/Accounts";
import { CustomerDetail } from "./pages/CustomerDetail";
import { CustomerForm } from "./pages/CustomerForm";
import { CustomerList } from "./pages/CustomerList";
import { Dashboard } from "./pages/Dashboard";
import { DocumentLibrary } from "./pages/DocumentLibrary";
import { QRScanner } from "./pages/QRScanner";
import { Renewals } from "./pages/Renewals";
import { Settings } from "./pages/Settings";

export type Page =
  | { name: "dashboard" }
  | { name: "customers" }
  | { name: "customer-add" }
  | { name: "customer-edit"; tokenId: string }
  | { name: "customer-detail"; tokenId: string }
  | { name: "accounts" }
  | { name: "documents" }
  | { name: "renewals" }
  | { name: "scanner" }
  | { name: "settings" };

export default function App() {
  const [page, setPage] = useState<Page>({ name: "dashboard" });
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem("dsk-dark") !== "false";
  });
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    localStorage.setItem("dsk-dark", darkMode ? "true" : "false");
  }, [darkMode]);

  if (showSplash) {
    return <SplashScreen onDone={() => setShowSplash(false)} />;
  }

  const renderPage = () => {
    switch (page.name) {
      case "dashboard":
        return <Dashboard navigate={setPage} />;
      case "customers":
        return <CustomerList navigate={setPage} />;
      case "customer-add":
        return <CustomerForm navigate={setPage} />;
      case "customer-edit":
        return <CustomerForm navigate={setPage} tokenId={page.tokenId} />;
      case "customer-detail":
        return <CustomerDetail navigate={setPage} tokenId={page.tokenId} />;
      case "accounts":
        return <Accounts navigate={setPage} />;
      case "documents":
        return <DocumentLibrary navigate={setPage} />;
      case "renewals":
        return <Renewals navigate={setPage} />;
      case "scanner":
        return <QRScanner navigate={setPage} />;
      case "settings":
        return (
          <Settings
            navigate={setPage}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
          />
        );
      default:
        return <Dashboard navigate={setPage} />;
    }
  };

  return (
    <div className={darkMode ? "dark" : ""}>
      <div className="min-h-screen bg-background text-foreground">
        <Layout
          currentPage={page.name}
          navigate={setPage}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
        >
          {renderPage()}
        </Layout>
        <Toaster />
      </div>
    </div>
  );
}
