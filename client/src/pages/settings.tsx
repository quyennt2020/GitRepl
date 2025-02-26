import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Download, Upload, ArrowLeft, Settings as SettingsIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from 'date-fns'

export default function Settings() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const { mutate: importData, isPending: isImporting } = useMutation({
    mutationFn: async () => {
      if (!selectedFile) return;

      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to import data');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Data imported successfully",
        description: data.message,
      });
      setSelectedFile(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      setSelectedFile(file);
    } else {
      toast({
        title: "Invalid file type",
        description: "Please select an Excel (.xlsx) file",
        variant: "destructive",
      });
      event.target.value = '';
    }
  };

  const handleDownloadBackup = async () => {
    try {
      const response = await fetch('/api/backup');
      if (!response.ok) {
        throw new Error('Failed to download backup');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `plant_care_backup_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Backup downloaded successfully",
        description: "Your plant care data has been exported to Excel"
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "Failed to download backup",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-16">
      <div className="flex items-center gap-4 p-4 border-b bg-background sticky top-0 z-10">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="font-semibold flex items-center gap-2">
          <SettingsIcon className="h-5 w-5" />
          Settings
        </h1>
      </div>

      <ScrollArea className="h-[calc(100vh-4rem)]">
        <div className="p-4 space-y-4">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Database Management</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Backup your plant care data to Excel or restore from a previous backup.
            </p>
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium mb-2">Backup Data</h3>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={handleDownloadBackup}>
                        <Download className="mr-2 h-4 w-4" />
                        Download Backup
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Export all your plant care data to an Excel file</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-medium mb-2">Import Data</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Import data from a backup file (.xlsx format)
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept=".xlsx"
                    onChange={handleFileSelect}
                    className="max-w-sm"
                  />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={() => importData()}
                          disabled={!selectedFile || isImporting}
                        >
                          {isImporting ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="mr-2 h-4 w-4" />
                          )}
                          Import Data
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Import plant care data from an Excel backup file</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                {selectedFile && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Selected file: {selectedFile.name}
                  </p>
                )}
              </div>
            </div>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}