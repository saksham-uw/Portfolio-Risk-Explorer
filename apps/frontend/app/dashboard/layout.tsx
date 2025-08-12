import { SidebarProvider } from "@/components/ui/sidebar";
import "@/app/globals.css";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>{children}</SidebarProvider>
  );
}
