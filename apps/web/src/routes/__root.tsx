import { Toaster } from "@/components/ui/sonner";

import Loader from "@/components/loader";
import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useRouterState,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import type { ConvexReactClient } from "convex/react";
import { ConvexProvider } from "convex/react";
import appCss from "../index.css?url";

export interface RouterAppContext {
  queryClient: QueryClient;
  convexClient: ConvexReactClient;
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
        <div className="flex justify-center items-center min-h-screen bg-background">
          <div className="space-y-4 text-center">
            <h1 className="text-2xl font-bold text-red-500">
              Something went wrong
            </h1>
            <p className="text-muted-foreground">{error.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground"
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
            <div className="h-svh">{isFetching ? <Loader /> : <Outlet />}</div>
            <Toaster richColors />
            <TanStackRouterDevtools position="bottom-left" />
          </ConvexProvider>
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  );
}
