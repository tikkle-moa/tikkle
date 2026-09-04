import type { ReactNode } from "react";
import { Toaster } from "react-hot-toast";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { queryClient } from "../model/query-client";

interface ProvidersProps {
  children?: ReactNode;
}

const Providers = ({ children }: ProvidersProps) => {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster
        position="top-right"
        gutter={12}
        toastOptions={{
          style: {
            borderRadius: "12px",
            padding: "14px 18px",
            fontSize: "14px",
            fontWeight: 500,
            maxWidth: "380px",
          },
          loading: { duration: Infinity },
          success: { duration: 3000 },
          error: { duration: 4000 },
        }}
      />
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
};

export default Providers;
