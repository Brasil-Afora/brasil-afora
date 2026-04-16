"use client";

import {
  isServer,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

interface QueryProviderProps {
  children: React.ReactNode;
}

const makeQueryClient = (): QueryClient => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        refetchOnWindowFocus: false,
      },
    },
  });
};

let browserQueryClient: QueryClient | undefined;

const getQueryClient = (): QueryClient => {
  if (isServer) {
    return makeQueryClient();
  }

  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }

  return browserQueryClient;
};

export const QueryProvider = ({ children }: QueryProviderProps) => {
  return (
    <QueryClientProvider client={getQueryClient()}>
      {children}
    </QueryClientProvider>
  );
};
