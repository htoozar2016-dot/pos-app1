import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Layout from "@/components/Layout";
import type { LoginResponse } from "@/lib/api";
import LoginPage from "@/pages/LoginPage";
import POSPage from "@/pages/POSPage";
import ProductsPage from "@/pages/ProductsPage";
import OrdersPage from "@/pages/OrdersPage";

const SESSION_KEY = "shoppos.user";

function readStoredUser(): LoginResponse | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as LoginResponse) : null;
  } catch {
    return null;
  }
}

export default function App() {
  const [user, setUser] = useState<LoginResponse | null>(() => readStoredUser());

  useEffect(() => {
    if (user) {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(SESSION_KEY);
    }
  }, [user]);

  if (!user) {
    return (
      <>
        <LoginPage onLogin={setUser} />
        <Toaster richColors />
      </>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout displayName={user.displayName} onLogout={() => setUser(null)} />}>
          <Route index element={<Navigate to="/pos" replace />} />
          <Route path="/pos" element={<POSPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/orders" element={<OrdersPage />} />
        </Route>
      </Routes>
      <Toaster richColors />
    </BrowserRouter>
  );
}
