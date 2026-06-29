import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import type { createBrowserRouter } from "react-router-dom";
import { AppProviders } from "./components/AppProviders";
import { registerServiceWorker } from "./utils/sw-register";

type RouterInstance = ReturnType<typeof createBrowserRouter>;

function App({ router }: { router: RouterInstance }) {
  useEffect(() => {
    void registerServiceWorker();
  }, []);

  return <AppProviders><RouterProvider router={router} /></AppProviders>;
}

export default App;