import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function ImportPlantsDialog() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === "text/csv") {
      setFile(selectedFile);
    } else {
      toast({
        title: "Invalid file type",
        description: "Please select a CSV file",
        variant: "destructive",
      });
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/plants/import", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to import plants");
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || "Failed to import plants");
      }

      toast({
        title: "Import successful",
        description: `Successfully imported ${result.data.success} plants`,
      });

      // Refresh the plants list
      queryClient.invalidateQueries({ queryKey: ["/api/plants"] });
      setFile(null);
    } catch (error) {
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Failed to import plants",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-2" />
          Import Plants
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Plants from CSV</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Upload a CSV file with plant data. The file should have the following columns:
            </p>
            <pre className="text-xs bg-muted p-2 rounded-md">
              name,species,image,location,wateringInterval,fertilizingInterval,sunlight,notes
            </pre>
          </div>
          <div className="space-y-2">
            <Input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            {file && (
              <p className="text-sm text-muted-foreground">
                Selected file: {file.name}
              </p>
            )}
          </div>
          <Button
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="w-full"
          >
            {isUploading ? "Importing..." : "Import Plants"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}