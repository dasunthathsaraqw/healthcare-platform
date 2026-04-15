"use client";

export function LoadingState() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center rounded-2xl border border-blue-100 bg-white shadow-sm">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
        <p className="text-sm font-medium text-slate-600">Loading consultation session...</p>
      </div>
    </div>
  );
}

export function EmptyState() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center rounded-2xl border border-blue-100 bg-white shadow-sm p-8">
      <div className="max-w-md text-center">
        <h2 className="text-xl font-semibold text-slate-900">No Session Found</h2>
        <p className="mt-2 text-sm text-slate-600">
          There is no telemedicine session available for this appointment yet.
        </p>
      </div>
    </div>
  );
}

export function UnauthorizedState() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center rounded-2xl border border-red-100 bg-white shadow-sm p-8">
      <div className="max-w-md text-center">
        <h2 className="text-xl font-semibold text-red-700">Unauthorized Access</h2>
        <p className="mt-2 text-sm text-slate-600">
          You do not have permission to access this consultation session.
        </p>
      </div>
    </div>
  );
}

export function ErrorState({ message }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center rounded-2xl border border-red-100 bg-white shadow-sm p-8">
      <div className="max-w-md text-center">
        <h2 className="text-xl font-semibold text-slate-900">Something Went Wrong</h2>
        <p className="mt-2 text-sm text-slate-600">{message || "Failed to load telemedicine session."}</p>
      </div>
    </div>
  );
}
