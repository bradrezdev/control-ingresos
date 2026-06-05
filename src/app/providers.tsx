import type { ReactNode } from "react";
import { BootstrapProvider } from "./BootstrapProvider";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps): React.JSX.Element {
  return <BootstrapProvider>{children}</BootstrapProvider>;
}
