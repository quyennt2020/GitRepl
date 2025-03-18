import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

  const handleDownloadTemplate = () => {
    // Create sample CSV content
    const csvContent = [
      "name,species,image,location,wateringInterval,fertilizingInterval,sunlight,notes",
      "Snake Plant,Sansevieria trifasciata,https://example.com/snake-plant.jpg,Living Room,7,30,low,Tolerates low light",
      "Monstera,Monstera deliciosa,https://example.com/monstera.jpg,Office,5,14,medium,Loves humidity",
      "Peace Lily,Spathiphyllum,https://example.com/peace-lily.jpg,Bedroom,3,21,low,Great air purifier"
    ].join("\n");

    // Create and trigger download
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plant-import-template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Plants from CSV</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-medium">CSV File Requirements:</h3>
            <Alert>
              <AlertDescription>
                <p className="mb-2">Your CSV file should:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Be in CSV format (comma-separated values)</li>
                  <li>Include a header row with the exact column names shown below</li>
                  <li>Have values for all required fields (name, species, wateringInterval)</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="bg-muted p-4 rounded-md space-y-2">
              <p className="font-medium">Required Columns:</p>
              <ul className="text-sm space-y-1">
                <li><code>name</code> - Plant's display name (required)</li>
                <li><code>species</code> - Scientific or common species name (required)</li>
                <li><code>wateringInterval</code> - Days between watering (required, number)</li>
                <li><code>sunlight</code> - Light needs: 'low', 'medium', or 'high'</li>
                <li><code>image</code> - URL to plant image (optional)</li>
                <li><code>location</code> - Where the plant is placed (optional)</li>
                <li><code>fertilizingInterval</code> - Days between fertilizing (optional, number)</li>
                <li><code>notes</code> - Additional care notes (optional)</li>
              </ul>
            </div>

            <div className="flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDownloadTemplate}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </div>
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