import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useUpload } from "@/hooks";
import { FileSpec } from "@chainlit/react-client";
import { Paperclip } from "lucide-react";
import { useCallback } from "react";
import { useDropzone } from "react-dropzone";


interface UploadButtonProps {
  disabled?: boolean;
  fileSpec: FileSpec;
  onFileUpload: (files: File[]) => void;
  onFileUploadError: (error: string) => void;
}


export const UploadButton = ({
  disabled = false,
  fileSpec,
  onFileUpload,
  onFileUploadError
}: UploadButtonProps) => {
  const upload = useUpload({
    spec: fileSpec,
    onResolved: (payloads: File[]) => onFileUpload(payloads),
    onError: onFileUploadError,
    options: { noDrag: true }
  });

  if (!upload) return null;
  const { getRootProps, getInputProps } = upload;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-block">
            <input
              id="upload-button-input"
              className="hidden"
              {...getInputProps()}
            />
            <Button
              id={disabled ? "upload-button-loading" : "upload-button"}
              variant="ghost"
              size="icon"
              className="hover:bg-muted"
              disabled={disabled}
              {...getRootProps()}
            >
              <Paperclip className="!size-5" />
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>Attach files</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default UploadButton;