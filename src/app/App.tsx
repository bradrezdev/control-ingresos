import { RouterProvider } from "react-router";
import { Providers } from "@/app/providers";
import { router } from "@/app/router";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { UpdateBanner } from "@/components/pwa/UpdateBanner";
import { OfflineIndicator } from "@/components/pwa/OfflineIndicator";

export function App(): React.JSX.Element {
  return (
    <Providers>
      <RouterProvider router={router} />
      {/*
        PWA overlays — mounted at the root so they survive route changes
        and z-index above any page content. Each component self-hides
        when its respective condition is not met.
      */}
      <InstallPrompt />
      <UpdateBanner />
      <OfflineIndicator />
    </Providers>
  );
}
