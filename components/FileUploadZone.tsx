"use client"

import { useState, useCallback } from "react"
import { Upload, File, X, CheckCircle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface FileUploadProps {
  onUpload: (file: File) => void
  loading: boolean
  accept?: string
  maxSize?: number
}

export default function FileUploadZone({ onUpload, loading, accept = ".pdf,.txt,.doc,.docx", maxSize = 10 }: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [previewFile, setPreviewFile] = useState<File | null>(null)

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      const file = files[0]
      setPreviewFile(file)
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      setPreviewFile(files[0])
    }
  }

  const handleUpload = () => {
    if (previewFile) {
      onUpload(previewFile)
      setPreviewFile(null)
    }
  }

  const clearFile = () => {
    setPreviewFile(null)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {!previewFile ? (
          <motion.div
            key="upload-zone"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
              isDragOver
                ? "border-[#0F172A] bg-[#F1F5F9] scale-105"
                : "border-[#CBD5E1] hover:border-[#0F172A] hover:bg-[#F8FAFC]"
            }`}
          >
            <label className="cursor-pointer">
              <input
                type="file"
                onChange={handleFileSelect}
                accept={accept}
                className="hidden"
                disabled={loading}
              />
              <motion.div
                animate={isDragOver ? { scale: 1.1 } : { scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                <Upload className="w-12 h-12 mx-auto mb-4 text-[#64748B]" />
                <p className="text-base font-medium text-[#0F172A] mb-1">
                  {loading ? "Uploading..." : isDragOver ? "Drop file here" : "Click to upload or drag & drop"}
                </p>
                <p className="text-sm text-[#64748B]">PDF, TXT, or DOCX • Max {maxSize}MB</p>
              </motion.div>
            </label>
          </motion.div>
        ) : (
          <motion.div
            key="file-preview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="border-2 border-[#0F172A] rounded-lg p-6 bg-[#F8FAFC]"
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <File className="w-10 h-10 text-[#0F172A]" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-[#0F172A] truncate">{previewFile.name}</h4>
                <p className="text-xs text-[#64748B] mt-1">{formatFileSize(previewFile.size)}</p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleUpload}
                    disabled={loading}
                    className="flex items-center gap-1 px-4 py-2 bg-[#0F172A] text-white rounded-lg text-sm font-medium hover:bg-[#1e293b] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                        />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Upload
                      </>
                    )}
                  </button>
                  <button
                    onClick={clearFile}
                    disabled={loading}
                    className="px-4 py-2 border border-[#CBD5E1] text-[#334155] rounded-lg text-sm font-medium hover:bg-[#F1F5F9] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
              <button
                onClick={clearFile}
                disabled={loading}
                className="flex-shrink-0 p-1 hover:bg-[#E2E8F0] rounded-full transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5 text-[#64748B]" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
