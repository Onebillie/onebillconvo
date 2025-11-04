import { PersistentHeader } from "@/components/PersistentHeader";
import { OneBillFileUpload } from "@/components/onebill/OneBillFileUpload";
import { FileUp } from "lucide-react";

const OneBillUpload = () => {
  return (
    <div className="flex flex-col h-screen">
      <PersistentHeader />
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto p-6 max-w-6xl">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <FileUp className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">OneBill Document Upload</h1>
            </div>
            <p className="text-muted-foreground">
              Upload meter readings, electricity bills, or gas bills for automatic processing
            </p>
          </div>
          
          <OneBillFileUpload />
        </div>
      </div>
    </div>
  );
};

export default OneBillUpload;
