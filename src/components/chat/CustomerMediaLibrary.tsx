import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, Search, FileText, Image as ImageIcon, Video, Music, File } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface MediaItem {
  id: string;
  filename: string;
  url: string;
  type: string;
  size: number;
  created_at: string;
  message_id: string;
}

interface CustomerMediaLibraryProps {
  customerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CustomerMediaLibrary = ({ customerId, open, onOpenChange }: CustomerMediaLibraryProps) => {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [filteredMedia, setFilteredMedia] = useState<MediaItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("all");

  useEffect(() => {
    if (open) {
      fetchMedia();
    }
  }, [open, customerId]);

  useEffect(() => {
    filterMedia();
  }, [searchQuery, selectedType, media]);

  const fetchMedia = async () => {
    setLoading(true);
    try {
      // Fetch all message attachments for this customer
      const { data, error } = await supabase
        .from('message_attachments')
        .select(`
          id,
          filename,
          url,
          type,
          size,
          created_at,
          message_id,
          messages!inner(customer_id)
        `)
        .eq('messages.customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setMedia(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load media",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterMedia = () => {
    let filtered = [...media];

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.filename.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by type
    if (selectedType !== "all") {
      filtered = filtered.filter(item => {
        if (selectedType === "image") return item.type.startsWith("image/");
        if (selectedType === "video") return item.type.startsWith("video/");
        if (selectedType === "audio") return item.type.startsWith("audio/");
        if (selectedType === "document") return item.type.startsWith("application/");
        return true;
      });
    }

    setFilteredMedia(filtered);
  };

  const downloadFile = async (item: MediaItem) => {
    try {
      const response = await fetch(item.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Downloaded",
        description: `${item.filename} has been downloaded`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download file",
        variant: "destructive",
      });
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <ImageIcon className="w-4 h-4" />;
    if (type.startsWith("video/")) return <Video className="w-4 h-4" />;
    if (type.startsWith("audio/")) return <Music className="w-4 h-4" />;
    if (type.startsWith("application/")) return <FileText className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh]">
        <DialogHeader>
          <DialogTitle>Customer Media Library</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex flex-col h-full">
          {/* Search and filters */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-1">
              {["all", "image", "video", "audio", "document"].map((type) => (
                <Button
                  key={type}
                  variant={selectedType === type ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedType(type)}
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>

          {/* Media grid */}
          <ScrollArea className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : filteredMedia.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No media found
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-2">
                {filteredMedia.map((item) => (
                  <div
                    key={item.id}
                    className="border rounded-lg p-3 space-y-2 hover:bg-accent transition-colors"
                  >
                    {/* Preview */}
                    <div className="aspect-square bg-muted rounded flex items-center justify-center overflow-hidden">
                      {item.type.startsWith("image/") ? (
                        <img
                          src={item.url}
                          alt={item.filename}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-muted-foreground">
                          {getFileIcon(item.type)}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="space-y-1">
                      <p className="text-xs font-medium truncate" title={item.filename}>
                        {item.filename}
                      </p>
                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span>{formatFileSize(item.size)}</span>
                        <span>{format(new Date(item.created_at), 'MMM d')}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => downloadFile(item)}
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};