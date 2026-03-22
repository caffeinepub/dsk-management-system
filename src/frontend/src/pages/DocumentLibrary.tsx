import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ExternalLink,
  FileText,
  Loader2,
  Plus,
  Share2,
  Trash2,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import type { Page } from "../App";
import { ExternalBlob } from "../backend";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Skeleton } from "../components/ui/skeleton";
import { useActor } from "../hooks/useActor";

interface Props {
  navigate: (p: Page) => void;
}

export function DocumentLibrary({ navigate: _ }: Props) {
  const { actor } = useActor();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: items, isLoading } = useQuery({
    queryKey: ["doc-library"],
    queryFn: () => actor!.listDocumentLibraryItems(),
    enabled: !!actor,
  });

  const [serviceName, setServiceName] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const addMut = useMutation({
    mutationFn: async () => {
      if (!file || !actor) throw new Error("No file selected");
      setUploading(true);
      const bytes = new Uint8Array(await file.arrayBuffer());
      const blob = ExternalBlob.fromBytes(bytes);
      await actor.addDocumentLibraryItem({
        serviceName,
        description: description || undefined,
        blob,
      });
      setUploading(false);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["doc-library"] });
      toast.success("Document uploaded");
      setServiceName("");
      setDescription("");
      setFile(null);
    },
    onError: (e) => {
      setUploading(false);
      toast.error(`Upload failed: ${String(e)}`);
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => actor!.deleteDocumentLibraryItem(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["doc-library"] });
      toast.success("Deleted");
    },
  });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-white">Document Library</h1>
      <p className="text-slate-400 text-sm">
        Store and share requirement PDFs for each service.
      </p>

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-base">
            Upload Document
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addMut.mutate();
            }}
            className="space-y-3"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-sm text-slate-300 mb-1">Service Name *</p>
                <Input
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  required
                  placeholder="e.g. Land Conversion Docs"
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
              <div>
                <p className="text-sm text-slate-300 mb-1">Description</p>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description"
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
            </div>
            <div>
              <p className="text-sm text-slate-300 mb-1">PDF File *</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 bg-slate-700 border border-dashed border-slate-500 rounded-md text-slate-400 hover:border-amber-500 hover:text-amber-400 cursor-pointer text-sm transition-colors w-full"
              >
                <Upload className="h-4 w-4" />
                <span>{file ? file.name : "Click to select PDF"}</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <Button
              type="submit"
              disabled={addMut.isPending || uploading || !file}
              className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold"
            >
              {addMut.isPending || uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Uploading...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  Upload Document
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : (items ?? []).length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          No documents uploaded yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(items ?? []).map((item) => (
            <Card
              key={item.id}
              className="bg-slate-800 border-slate-700 hover:border-slate-500 transition-colors"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="bg-amber-500/10 rounded-lg p-2">
                    <FileText className="h-6 w-6 text-amber-400" />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-slate-500 hover:text-red-400"
                    onClick={() => {
                      if (confirm("Delete?")) deleteMut.mutate(item.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="mt-3">
                  <div className="text-white font-medium text-sm">
                    {item.serviceName}
                  </div>
                  {item.description && (
                    <div className="text-slate-400 text-xs mt-0.5">
                      {item.description}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-700 flex-1 h-8"
                    onClick={() =>
                      window.open(item.blob.getDirectURL(), "_blank")
                    }
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-1" />
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-green-700 text-green-400 hover:bg-green-900/30 flex-1 h-8"
                    onClick={() => {
                      const msg = `Here is the document requirement list for ${item.serviceName}: ${item.blob.getDirectURL()}`;
                      window.open(
                        `https://wa.me/?text=${encodeURIComponent(msg)}`,
                        "_blank",
                      );
                    }}
                  >
                    <Share2 className="h-3.5 w-3.5 mr-1" />
                    Share
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
