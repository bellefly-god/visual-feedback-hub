import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { UploadDropzone } from "@/components/feedback/UploadDropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight } from "lucide-react";

export default function UploadPage() {
  const [projectName, setProjectName] = useState("");
  const [hasFile, setHasFile] = useState(false);
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
            <UploadDropzone onFileSelect={() => setHasFile(true)} />
          </div>

          <Button
            size="lg"
            className="w-full"
            disabled={!projectName.trim() || !hasFile}
            onClick={() => navigate("/editor")}
          >
            Continue to Editor
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
