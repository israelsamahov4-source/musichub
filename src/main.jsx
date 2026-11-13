import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { AuthProvider } from "@/auth/AuthProvider";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { isConfigured } from "@/lib/supabase";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 } },
});

function SetupNotice() {
  return (
    <div className="mx-auto max-w-lg p-8 text-center">
      <h1 className="mb-2 text-xl font-bold">האתר עדיין לא מחובר למסד הנתונים</h1>
      <p className="text-muted-foreground">
        צרו קובץ <code className="ltr">.env.local</code> לפי <code className="ltr">.env.example</code> עם הכתובת והמפתח של פרויקט ה-Supabase, והפעילו מחדש.
      </p>
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      {isConfigured ? (
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <TooltipProvider>
              <AuthProvider>
                <App />
              </AuthProvider>
            </TooltipProvider>
          </BrowserRouter>
          <Toaster />
        </QueryClientProvider>
      ) : (
        <SetupNotice />
      )}
    </ErrorBoundary>
  </StrictMode>,
);
