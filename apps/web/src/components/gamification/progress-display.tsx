import { useConvexQuery } from "@convex-dev/react-query";
import { api } from "@ai-tasked/backend";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Trophy, 
  Zap, 
  Flame, 
  Star, 
  TrendingUp,
  Crown
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProgressDisplayProps {
  userId: string;
}

export function ProgressDisplay({ userId }: ProgressDisplayProps) {
  const queryResult = useConvexQuery(
    api.gamification.getUserProgress,
    { userId: userId as any }
  );
  
  const progress = queryResult?.data;
  const isLoading = queryResult?.isLoading || false;

  if (isLoading || !progress) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-2 bg-muted rounded" />
            <div className="grid grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate XP progress to next level
  const currentLevelXP = Math.pow(progress.currentLevel - 1, 2) * 100;
  const nextLevelXP = Math.pow(progress.currentLevel, 2) * 100;
  const xpForNextLevel = nextLevelXP - progress.totalXp;
  const xpProgress = ((progress.totalXp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;

  // Character stage names
  const stageNames = {
    1: "Seed 🌱",
    2: "Sprout 🌿", 
    3: "Sapling 🌳",
    4: "Tree 🌲",
    5: "Ancient Tree 🌴"
  };

  return (
    <div className="space-y-4">
      {/* Level and XP Progress */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            Level {progress.currentLevel}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>{progress.totalXp} XP</span>
              <span>{xpForNextLevel} XP to next level</span>
            </div>
            <Progress value={xpProgress} className="h-3" />
          </div>

          {/* Character Display */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="font-medium">
                {stageNames[progress.characterStage as keyof typeof stageNames] || "Unknown"}
              </p>
              <p className="text-sm text-muted-foreground">
                {progress.characterType === "plant" ? "Plant Growth" : "Character"}
              </p>
            </div>
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl"
              style={{ backgroundColor: progress.characterCustomization.color }}
            >
              {progress.characterStage === 1 && "🌱"}
              {progress.characterStage === 2 && "🌿"}
              {progress.characterStage === 3 && "🌳"}
              {progress.characterStage === 4 && "🌲"}
              {progress.characterStage >= 5 && "🌴"}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Current Streak */}
        <Card>
          <CardContent className="p-4 text-center">
            <Flame className="h-6 w-6 mx-auto mb-2 text-orange-500" />
            <p className="text-2xl font-bold">{progress.currentStreak}</p>
            <p className="text-sm text-muted-foreground">Day Streak</p>
          </CardContent>
        </Card>

        {/* Longest Streak */}
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-6 w-6 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold">{progress.longestStreak}</p>
            <p className="text-sm text-muted-foreground">Best Streak</p>
          </CardContent>
        </Card>

        {/* Tasks Completed */}
        <Card>
          <CardContent className="p-4 text-center">
            <Trophy className="h-6 w-6 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold">{progress.tasksCompleted}</p>
            <p className="text-sm text-muted-foreground">Tasks Done</p>
          </CardContent>
        </Card>

        {/* Perfect Days */}
        <Card>
          <CardContent className="p-4 text-center">
            <Star className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
            <p className="text-2xl font-bold">{progress.perfectDays}</p>
            <p className="text-sm text-muted-foreground">Perfect Days</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Achievements */}
      {progress.unlockedAchievements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {progress.unlockedAchievements.slice(-5).map((achievementId) => (
                <Badge key={achievementId} variant="secondary" className="flex items-center gap-1">
                  <Trophy className="h-3 w-3" />
                  Achievement #{achievementId.slice(-4)}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}