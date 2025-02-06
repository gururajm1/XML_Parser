"use client"

import { useState, useCallback } from "react"
import { FileDrop } from "react-file-drop"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import * as React from "react"
import { Check, ChevronDown } from "lucide-react"
import * as LabelPrimitive from '@radix-ui/react-label';
import * as SelectPrimitive from '@radix-ui/react-select';
import * as SwitchPrimitive from '@radix-ui/react-switch';


interface UploadedFile {
  name: string
  size: number
  file: File
}

export default function App() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [parsedData, setParsedData] = useState<any>(null) // State to hold parsed data
  const [greatestKey, setGreatestKey] = useState<string>("") // State to hold the greatest key

  const onDrop = useCallback((files: FileList | any, event: React.DragEvent) => {
    const filesArray = Array.from(files)

    const newFiles = filesArray.map((file) => ({
      name: file.name,
      size: file.size,
      file,
    }))

    setFiles((prev) => [...prev, ...newFiles].slice(0, 5))
  }, [])

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  // Function to handle file upload and parsing
  const handleContinue = async () => {
    if (files.length > 0) {
      const file = files[0].file
      const formData = new FormData()
      formData.append("file", file)

      try {
        const response = await fetch("http://localhost:5000/api/upload-xml", {
          method: "POST",
          body: formData,
        })

        if (response.ok) {
          // Assuming the server sends the parsed data in the response
          const data = await response.json()
          setParsedData(data) // Set the parsed data
          alert("File uploaded and processed successfully.")
          
          // Store parsed data in localStorage with incrementing key
          let currentIndex = localStorage.getItem("index")
          currentIndex = currentIndex ? parseInt(currentIndex) : 0
          localStorage.setItem("index", (currentIndex + 1).toString()) // Increment index
          localStorage.setItem((currentIndex + 1).toString(), JSON.stringify(data)) // Store data

          console.log("File uploaded and processed successfully.", data)
        } else {
          alert("Error processing the file.")
          console.error("Error processing the file.")
        }
      } catch (error) {
        alert("Error uploading the file.")
        console.error("Error uploading the file:", error)
      }
    }
  }

  // Function to get the greatest key from localStorage
  const getGreatestKey = () => {
    let maxKey = -1;
    Object.keys(localStorage).forEach((key) => {
      if (!isNaN(parseInt(key))) {
        const currentKey = parseInt(key)
        if (currentKey > maxKey) {
          maxKey = currentKey
        }
      }
    })
    setGreatestKey(maxKey.toString())
  }

  return (
    <div className="max-w-3xl mx-auto p-6 mt-1">
      <div className="bg-white shadow-lg rounded-xl p-8">
        <div className="flex justify-between items-center mb-6">
          <div className="px-3 py-2 text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-indigo-500"></div>
          <div className="space-x-3">
            <button
              onClick={() => {
                setShowDialog(true);
                getGreatestKey(); // Fetch the greatest key when the dialog is opened
              }}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              View parsed data
            </button>
            <button
              onClick={handleContinue}
              className="px-3 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Submit
            </button>
          </div>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">What have you been working on?</h1>
          <p className="text-sm text-gray-500">Add your documents here, and you can upload and parse XML files</p>
        </div>

        <FileDrop
          onDrop={onDrop}
          onDragEnter={() => setIsDragging(true)}
          onDragLeave={() => setIsDragging(false)}
          className={`border-2 border-dashed rounded-xl p-8 transition-all duration-200 ease-in-out ${isDragging ? "border-indigo-600 bg-indigo-50" : "border-gray-300 hover:border-indigo-400"}`}
        >
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700">Drag and drop a XML file</p>
              <p className="text-xs text-gray-500 mt-1">One file at a time</p>
            </div>
            <div className="mt-2">
              <span className="text-sm text-gray-500">OR</span>
            </div>
            <button className="px-3 py-2 text-sm font-medium text-indigo-600 bg-white border border-indigo-600 rounded-md shadow-sm hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              Browse Files
            </button>
          </div>
        </FileDrop>

        {files.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Uploaded Files</h2>
            <div className="space-y-3">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg group hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-gray-700">{file.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <button
                    className="p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeFile(index)}
                  >
                    <span className="sr-only">Remove file</span>
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
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Dialog for parsed data */}
      <DialogPrimitive.Root open={showDialog} onOpenChange={setShowDialog}>
        <DialogPrimitive.Trigger />
        <DialogPrimitive.Content className="fixed z-50 inset-0 flex items-center justify-center p-4 bg-gray-800 bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6">
            <h2 className="text-xl font-semibold text-gray-900">Parsed Data</h2>
            <div className="mt-4">
              <p className="text-gray-500">Greatest key from localStorage: {greatestKey}</p>
              <pre className="mt-4 text-xs text-gray-600 overflow-auto">{JSON.stringify(parsedData, null, 2)}</pre>
            </div>
            <div className="mt-6 text-right">
              <button
                onClick={() => setShowDialog(false)}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
              >
                Close
              </button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Root>
    </div>
  )
}


// function Check(props: React.SVGProps<SVGSVGElement>) {
//   return (
//     <svg
//       xmlns="http://www.w3.org/2000/svg"
//       width="24"
//       height="24"
//       viewBox="0 0 24 24"
//       fill="none"
//       stroke="currentColor"
//       strokeWidth="2"
//       strokeLinecap="round"
//       strokeLinejoin="round"
//       {...props}
//     >
//       <polyline points="20 6 9 17 4 12" />
//     </svg>
//   )
// }

// function ChevronDown(props: React.SVGProps<SVGSVGElement>) {
//   return (
//     <svg
//       xmlns="http://www.w3.org/2000/svg"
//       width="24"
//       height="24"
//       viewBox="0 0 24 24"
//       fill="none"
//       stroke="currentColor"
//       strokeWidth="2"
//       strokeLinecap="round"
//       strokeLinejoin="round"
//       {...props}
//     >
//       <path d="m6 9 6 6 6-6" />
//     </svg>
//   )
// }

