"use client";

export default function JitsiMeetingCard({
  joinUrl,
  hasJoined,
  onJoin,
  onEnd,
  isEnding,
  isEnded,
}) {
  return (
    <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm md:p-6">
      <h2 className="text-lg font-semibold text-slate-900">Video Consultation</h2>

      <div className="mt-4 overflow-hidden rounded-xl border border-blue-100 bg-slate-950">
        {hasJoined && joinUrl ? (
          <iframe
            title="Telemedicine Meeting"
            src={joinUrl}
            allow="camera; microphone; fullscreen; display-capture"
            className="h-[420px] w-full md:h-[560px]"
          />
        ) : (
          <div className="flex h-[420px] w-full items-center justify-center p-8 text-center md:h-[560px]">
            <div>
              <p className="text-base font-medium text-white">Ready to start consultation?</p>
              <p className="mt-2 text-sm text-slate-300">
                Click "Join Consultation" to launch the secure Jitsi meeting.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onJoin}
          disabled={hasJoined || isEnded}
          className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
        >
          {hasJoined ? "Consultation Joined" : "Join Consultation"}
        </button>

        <button
          type="button"
          onClick={onEnd}
          disabled={isEnding || isEnded}
          className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-300"
        >
          {isEnded ? "Consultation Ended" : isEnding ? "Ending..." : "End Consultation"}
        </button>
      </div>
    </div>
  );
}
