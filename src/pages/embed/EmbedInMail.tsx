import { useState } from "react";
import { InMailInbox } from "@/components/inmail/InMailInbox";

// Standalone page for embedding InMail functionality
// Requires user authentication to display user-specific InMail messages
export default function EmbedInMail() {
  return (
    <div className="h-screen w-full bg-background p-6">
      <div className="h-full max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Internal Messages</h1>
        </div>
        <div className="h-[calc(100vh-120px)] overflow-y-auto">
          <InMailInbox />
        </div>
      </div>
    </div>
  );
}
