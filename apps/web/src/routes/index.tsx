import { SimpleAuth } from "@/components/auth/simple-auth";
import { ProgressDisplay } from "@/components/gamification/progress-display";
import { ModernTaskList } from "@/components/tasks/modern-task-list";
import { TaskCreationResponsive } from "@/components/ai-input/task-creation-responsive";
import { TaskCreationDrawer } from "@/components/ai-input/task-creation-drawer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@ai-tasked/backend";
import { useConvexMutation } from "@convex-dev/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Calendar, Settings, Sparkles, Trophy, Menu } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  const [userId, setUserId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Check for existing user in localStorage
  useEffect(() => {
    const storedUserId = localStorage.getItem("ai-tasked-user-id");
    if (storedUserId) {
      setUserId(storedUserId);
    }
  }, []);

  const handleAuthSuccess = (newUserId: string) => {
    setUserId(newUserId);
    localStorage.setItem("ai-tasked-user-id", newUserId);
  };

  const handleSignOut = () => {
    setUserId(null);
    localStorage.removeItem("ai-tasked-user-id");
  };

  const handleTaskUpdate = () => {
    setRefreshKey((prev) => prev + 1);
  };

  // Seed achievements on first load
  const seedAchievements = useConvexMutation(api.gamification.seedAchievements);
  useEffect(() => {
    if (userId) {
      seedAchievements({});
    }
  }, [userId, seedAchievements]);

  if (!userId) {
    return <SimpleAuth onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Mobile-First Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-blue-500" />
              <h1 className="text-xl sm:text-2xl font-bold">AI-Tasked</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="sm:hidden">
                <Menu className="h-5 w-5" />
              </Button>
              <Button variant="outline" onClick={handleSignOut} className="hidden sm:flex">
                Sign Out
              </Button>
              <Button variant="outline" size="icon" onClick={handleSignOut} className="sm:hidden">
                👤
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Mobile Responsive */}
      <main className="container mx-auto px-4 py-4 max-w-7xl">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 sm:gap-6">
          {/* Main Task Area - Takes full width on mobile, 3/4 on desktop */}
          <div className="xl:col-span-3 space-y-4 sm:space-y-6">
            {/* Welcome Message - Mobile Optimized */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold mb-2">
                Bienvenue sur AI-Tasked ! ✨
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground mb-4">
                Créez vos tâches en parlant avec l'IA. Cliquez sur le bouton + en bas à droite pour commencer.
              </p>
            </div>

            {/* Modern Task List */}
            <ModernTaskList
              key={refreshKey}
              userId={userId}
              onTaskUpdate={handleTaskUpdate}
            />
          </div>

          {/* Sidebar - Hidden on mobile, shown on xl+ screens */}
          <div className="hidden xl:block space-y-4 sm:space-y-6">
            {/* Progress Display - Compact Mobile Version */}
            <div className="sticky top-24">
              <ProgressDisplay userId={userId} />

              {/* Quick Stats - Mobile Compact */}
              <Card className="mt-4">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Actions rapides
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start text-sm"
                    disabled
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Google Calendar
                    <span className="ml-auto text-xs text-muted-foreground">
                      Bientôt
                    </span>
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-sm"
                    disabled
                  >
                    <Trophy className="h-4 w-4 mr-2" />
                    Succès
                    <span className="ml-auto text-xs text-muted-foreground">
                      Bientôt
                    </span>
                  </Button>
                </CardContent>
              </Card>

              {/* Tips - Compact */}
              <Card className="mt-4">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">💡 Conseils</CardTitle>
                </CardHeader>
                <CardContent className="text-xs sm:text-sm space-y-1">
                  <p>• Utilisez la voix pour créer des tâches</p>
                  <p>• Essayez : "Planifier mon weekend"</p>
                  <p>• Complétez des tâches pour gagner de l'XP</p>
                  <p>• Créez des habitudes pour des bonus</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Mobile Progress - Shown only on mobile */}
        <div className="xl:hidden mt-6">
          <ProgressDisplay userId={userId} />
        </div>
      </main>

      {/* Task Creation Drawer */}
      <TaskCreationDrawer
        userId={userId}
        onTasksCreated={handleTaskUpdate}
      />
    </div>
  );
}