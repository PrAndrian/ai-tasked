import { Toaster } from "@/components/ui/sonner";

import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useRouterState,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import Header from "../components/header";
import appCss from "../index.css?url";
import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ConvexClient } from "convex/browser";
import { ConvexProvider } from "convex/react";
import Loader from "@/components/loader";

export interface RouterAppContext {
  queryClient: QueryClient;
  convexClient: ConvexClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "AI-Tasked",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  errorComponent: ({ error }) => (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-red-500">Something went wrong</h1>
            <p className="text-muted-foreground">{error.message}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
            >
              Reload Page
            </button>
          </div>
        </div>
        <Scripts />
      </body>
    </html>
  ),
  component: RootDocument,
});

function RootDocument() {
  const isFetching = useRouterState({ select: (s) => s.isLoading });
  const { queryClient, convexClient } = Route.useRouteContext();

  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          <ConvexProvider client={convexClient}>
            <div className="grid h-svh grid-rows-[auto_1fr]">
              <Header />
              {isFetching ? <Loader /> : <Outlet />}
            </div>
            <Toaster richColors />
            <TanStackRouterDevtools position="bottom-left" />
          </ConvexProvider>
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  );
}
