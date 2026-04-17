import { Outlet } from "react-router-dom";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";

function MainLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto flex w-full min-w-0 max-w-7xl flex-1 flex-col gap-6 px-3 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-4 md:px-6">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

export default MainLayout;
