import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { UploadDropzone } from "@/components/feedback/UploadDropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight } from "lucide-react";
import { routePaths } from "@/lib/routePaths";
import { detectAssetType, validateUploadFile } from "@/lib/file";
import { feedbackGateway } from "@/services/feedbackGateway";

export default function UploadPage() {
  const [projectName, setProjectName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
        <div className="mb-8 text-center">
          <h1 className="font-display text-2xl font-bold text-foreground">Start a new project</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Give your project a name and upload the file you'd like reviewed.
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Project name</label>
            <Input
              placeholder="e.g. Homepage Redesign v2"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="h-11"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Upload file</label>
            <UploadDropzone
              onFileSelect={(file) => setSelectedFile(file)}
              onFileClear={() => setSelectedFile(null)}
              onValidationError={setFileError}
            />
            {fileError && <p className="mt-2 text-xs text-destructive">{fileError}</p>}
          </div>

          <Button
            size="lg"
            className="w-full"
            disabled={!projectName.trim() || !selectedFile || isSubmitting || Boolean(fileError)}
            onClick={async () => {
              if (!selectedFile) {
                return;
              }

              const validationMessage = validateUploadFile(selectedFile);
              if (validationMessage) {
                setFileError(validationMessage);
                return;
              }

              setIsSubmitting(true);

              try {
                const assetUrl = await feedbackGateway.uploadAsset(selectedFile);
                const project = await feedbackGateway.createProject({
                  title: projectName.trim(),
                  assetType: detectAssetType(selectedFile),
                  assetUrl,
                });

                navigate(routePaths.editor(project.id), {
                  state: { projectName: projectName.trim() },
                });
              } finally {
                setIsSubmitting(false);
              }
            }}
          >
            {isSubmitting ? "Preparing..." : "Continue to Editor"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
