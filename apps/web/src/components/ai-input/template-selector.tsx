import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Template {
  title: string;
  icon: string;
  prompt: string;
}

interface TemplateSelectorProps {
  templates: Template[];
  onSelect: (template: string) => void;
  language: "en-US" | "fr-FR";
  className?: string;
}

export function TemplateSelector({ templates, onSelect, language, className }: TemplateSelectorProps) {
  return (
    <Card className={cn("border-dashed border-2 border-muted-foreground/25", className)}>
      <CardContent className="p-4">
        <div className="text-center mb-3">
          <h4 className="text-sm font-medium text-muted-foreground">
            {language === "fr-FR" ? "Modèles rapides" : "Quick Templates"}
          </h4>
          <p className="text-xs text-muted-foreground mt-1">
            {language === "fr-FR" 
              ? "Cliquez sur un modèle pour commencer" 
              : "Click on a template to get started"
            }
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {templates.map((template, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              className="justify-start h-auto p-3 text-left hover:bg-blue-50 hover:border-blue-200 dark:hover:bg-blue-950/20 transition-all duration-200"
              onClick={() => onSelect(template.title)}
            >
              <span className="mr-2 text-base">{template.icon}</span>
              <span className="text-xs flex-1">{template.title}</span>
            </Button>
          ))}
        </div>
        
        <div className="text-center mt-3 pt-3 border-t border-dashed border-muted-foreground/25">
          <p className="text-xs text-muted-foreground">
            {language === "fr-FR" 
              ? "Ou tapez/parlez librement ci-dessous" 
              : "Or type/speak freely below"
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
}