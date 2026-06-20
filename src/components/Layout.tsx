import { NavLink, Outlet } from "react-router-dom";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/pos", label: "POS" },
  { to: "/products", label: "Products" },
  { to: "/orders", label: "Orders" },
];

interface LayoutProps {
  displayName: string;
  onLogout: () => void;
}

export default function Layout({ displayName, onLogout }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-card px-6 py-3 flex items-center gap-6">
        <span className="font-bold text-lg">ShopPOS</span>
        <nav className="flex gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{displayName}</span>
          <Button variant="outline" size="sm" onClick={onLogout}>
            <LogOut className="size-4" />
            Logout
          </Button>
        </div>
      </header>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
