"use client";

import { JitsiMeeting } from "@jitsi/react-sdk";

export default function JitsiConsultationMeeting({ roomId, displayName }) {
  if (!roomId) {
    return (
      <div className="flex h-[420px] w-full items-center justify-center p-8 text-center md:h-[560px]">
        <p className="text-sm text-slate-300">Room is not ready yet.</p>
      </div>
    );
  }

  return (
    <div className="h-[420px] w-full md:h-[560px]">
      <JitsiMeeting
        roomName={roomId}
        getIFrameRef={(iframeRef) => {
          iframeRef.style.height = "100%";
          iframeRef.style.width = "100%";
          iframeRef.style.border = "0";
        }}
        userInfo={{ displayName: displayName || "Healthcare User" }}
        configOverwrite={{
          startWithAudioMuted: false,
          startWithVideoMuted: false,
        }}
      />
    </div>
  );
}
