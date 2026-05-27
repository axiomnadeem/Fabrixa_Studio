import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Image as ImageIcon, Upload, X, Shirt, Wand2, Copy } from "lucide-react";
import { toast } from "sonner";
import { CoinCostBadge } from "@/components/fabrixa/CoinCostBadge";
import { useRunGated } from "@/lib/fabrixa/runGated";

interface GeneratedDesign {
  id: string;
  url: string;
  prompt: string;
}

interface AIStudioPanelProps {
  balance: number;
  onResult: (url: string, meta: any, action: "apply_3d" | "edit_2d") => void;
}

export function AIStudioPanel({ balance, onResult }: AIStudioPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState<GeneratedDesign[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const runGated = useRunGated();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setReferenceImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && !referenceImage) {
      toast.error("Please provide a prompt or upload an image.");
      return;
    }

    await runGated("GENERATE_PATTERN", async () => {
      setIsGenerating(true);
      try {
        // Replace this fetch with your actual AI generation endpoint logic.
        // It must send both the `prompt` and `referenceImage` (if exists).
        const res = await fetch("/api/ai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, referenceImage, task: "pattern" }),
        });

        if (!res.ok) throw new Error("Generation failed");
        
        const data = await res.json();
        const newDesign: GeneratedDesign = {
          id: Date.now().toString(),
          url: data.url, // URL returned from your AI provider
          prompt: prompt || "Image Variation",
        };

        setHistory((prev) => [newDesign, ...prev]);
        toast.success("Design generated!");
        
        // Clear inputs after successful generation
        setPrompt("");
        setReferenceImage(null);
      } catch (error) {
        console.error(error);
        toast.error("Failed to generate design. Please try again.");
      } finally {
        setIsGenerating(false);
      }
    });
  };

  return (
    <div className="flex h-full flex-col gap-6 p-4 sm:p-6 lg:flex-row">
      {/* Left Column: Generation Controls */}
      <div className="flex w-full flex-col gap-4 lg:w-[400px] shrink-0">
        <div>
          <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2 mb-1">
            <Sparkles className="h-5 w-5 text-primary" /> AI Studio
          </h2>
          <p className="text-sm text-muted-foreground">Describe your pattern or upload an image to guide the AI.</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-panel/40 p-4 backdrop-blur-xl shadow-lg space-y-4">
          {/* Text Prompt */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Prompt</Label>
            <Textarea
              placeholder="e.g., seamless floral pattern with gold and navy blue, hyper-realistic, intricate details..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[100px] resize-none bg-background/50 backdrop-blur-sm"
            />
          </div>

          {/* Image Upload for Prompt */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reference Image (Optional)</Label>
            {referenceImage ? (
              <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/10">
                <img src={referenceImage} alt="Reference" className="h-full w-full object-cover" />
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute right-2 top-2 h-7 w-7 rounded-full"
                  onClick={() => setReferenceImage(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/25 bg-background/30 py-6 hover:bg-muted/50 transition"
              >
                <Upload className="mb-2 h-6 w-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Click to upload reference image</span>
              </div>
            )}
            <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
          </div>

          <Button 
            className="w-full bg-gradient-to-r from-primary to-accent shadow-md hover:opacity-90" 
            onClick={handleGenerate} 
            disabled={isGenerating || (!prompt && !referenceImage)}
          >
            {isGenerating ? "Generating..." : "Generate Design"}
            <CoinCostBadge feature="GENERATE_PATTERN" />
          </Button>
        </div>
      </div>

      {/* Right Column: Generation History Grid */}
      <div className="flex-1 rounded-2xl border border-white/10 bg-panel/20 backdrop-blur-xl shadow-inner p-4 overflow-hidden flex flex-col">
        <h3 className="text-sm font-semibold mb-4 text-muted-foreground flex items-center gap-2">
          <ImageIcon className="h-4 w-4" /> Your Generations
        </h3>
        
        {history.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center opacity-50">
            <ImageIcon className="mb-3 h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Generated designs will appear here.</p>
          </div>
        ) : (
          <ScrollArea className="flex-1 pr-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 pb-4">
              {history.map((design) => (
                <div key={design.id} className="group relative overflow-hidden rounded-xl border border-white/10 bg-background/50 shadow-sm transition-all hover:shadow-md">
                  <div className="aspect-square w-full overflow-hidden bg-muted">
                    <img src={design.url} alt={design.prompt} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                  </div>
                  <div className="p-3 space-y-2 bg-panel/80 backdrop-blur-md">
                    <p className="line-clamp-2 text-xs text-muted-foreground" title={design.prompt}>
                      "{design.prompt}"
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <Button 
                        size="sm" 
                        variant="secondary" 
                        className="flex-1 h-8 text-[10px] px-2"
                        onClick={() => setReferenceImage(design.url)}
                        title="Use as Image Prompt"
                      >
                        <Copy className="h-3 w-3 mr-1" /> Use as Ref
                      </Button>
                      <Button 
                        size="sm" 
                        className="flex-1 h-8 text-[10px] px-2 bg-primary/20 text-primary hover:bg-primary/30"
                        onClick={() => onResult(design.url, { task: "pattern", prompt: design.prompt, model: "ai" }, "apply_3d")}
                      >
                        <Shirt className="h-3 w-3 mr-1" /> To 3D
                      </Button>
                      <Button 
                        size="sm" 
                        variant="default"
                        className="flex-1 h-8 text-[10px] px-2"
                        onClick={() => onResult(design.url, { task: "pattern", prompt: design.prompt, model: "ai" }, "edit_2d")}
                      >
                        <Wand2 className="h-3 w-3 mr-1" /> To 2D
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}