import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as React from "react";

interface ParsedDataPopupProps {
  showDialog: boolean;
  setShowDialog: (open: boolean) => void;
  parsedData: any;
}

export default function ParsedDataPopup({ showDialog, setShowDialog, parsedData }: ParsedDataPopupProps) {
  return (
    <DialogPrimitive.Root open={showDialog} onOpenChange={setShowDialog}>
      <DialogPrimitive.Trigger />
      <DialogPrimitive.Content className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white p-6 rounded-lg shadow-lg w-full sm:w-2/3 md:w-1/2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Parsed Data</h2>
            <button onClick={() => setShowDialog(false)} className="text-gray-400 hover:text-gray-500">
              <span className="sr-only">Close</span>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div className="overflow-auto max-h-96">
            {parsedData ? (
              <div className="space-y-3">
                {Object.entries(parsedData).map(([key, value], index) => {
                  return (
                    <div key={index}>
                      <p className="text-sm font-medium text-gray-700">{key}:</p>
                      {typeof value === 'string' && value.startsWith("{") ? (
                        <pre className="text-sm text-gray-600 whitespace-pre-wrap break-all">{JSON.stringify(JSON.parse(value), null, 4)}</pre>
                      ) : typeof value === 'string' && value.startsWith("[") ? (
                        <pre className="text-sm text-gray-600 whitespace-pre-wrap break-all">{JSON.stringify(JSON.parse(value), null, 4)}</pre>
                      ) : (
                        <p className="text-sm text-gray-600">{value}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p>No parsed data available</p>
            )}
          </div>

          <div className="mt-4 flex justify-between items-center">
            <button
              className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onClick={() => setShowDialog(false)}
            >
              Close
            </button>
          </div>
        </div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Root>
  );
}