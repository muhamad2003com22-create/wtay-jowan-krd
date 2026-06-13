import React, { useRef, useState } from 'react';
import { Camera, Upload, Trash2, Check, AlertCircle } from 'lucide-react';

interface ImageUploadProps {
  currentPhotoURL?: string;
  onImageSelected: (base64Data: string) => void;
  onImageRemoved?: () => void;
}

export default function ImageUpload({ currentPhotoURL, onImageSelected, onImageRemoved }: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentPhotoURL || null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const processFile = (file: File) => {
    if (!file) return;

    // Validate type
    if (!file.type.startsWith('image/')) {
      setError('تکایە تەنها وێنە هەڵبژێرە (JPEG / PNG)');
      return;
    }

    // Validate size (limit input file processing to 5MB to prevent memory crashes)
    if (file.size > 5 * 1024 * 1024) {
      setError('قەبارەی وێنەکە نابێت لە ٥ مێگابایت زیاتر بێت');
      return;
    }

    setError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Prepare canvas for resizing/compression (max 120x120 pixels is perfect for avatars)
        const canvas = document.createElement('canvas');
        const MAX_DIM = 120;
        let width = img.width;
        let height = img.height;

        // Calculate crop dimensions to force center center square crop
        let sourceX = 0;
        let sourceY = 0;
        let sourceWidth = width;
        let sourceHeight = height;

        if (width > height) {
          sourceWidth = height;
          sourceX = (width - height) / 2;
        } else {
          sourceHeight = width;
          sourceY = (height - width) / 2;
        }

        canvas.width = MAX_DIM;
        canvas.height = MAX_DIM;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Rounded/circular clipping could be done, but square is easier to display elegantly via CSS rounded-full
          ctx.drawImage(
            img,
            sourceX,
            sourceY,
            sourceWidth,
            sourceHeight,
            0,
            0,
            MAX_DIM,
            MAX_DIM
          );

          // Compress to JPEG with medium-high quality 0.75 for a tiny footprint (~6KB)
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75);
          setPreview(compressedBase64);
          onImageSelected(compressedBase64);
        }
      };
      img.onerror = () => {
        setError('پڕۆسێسکردنی وێنەکە سەرکەوتوو نەبوو.');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const selectFile = () => {
    fileInputRef.current?.click();
  };

  const removeImage = () => {
    setPreview(null);
    if (onImageRemoved) {
      onImageRemoved();
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
        id="avatar-file-input"
      />

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={selectFile}
        className={`relative group w-28 h-28 rounded-full border-2 border-dashed flex items-center justify-center cursor-pointer overflow-hidden transition-all duration-300 ${
          dragOver 
            ? 'border-amber-500 bg-amber-500/10' 
            : 'border-slate-300 hover:border-amber-400 bg-slate-50 hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
        id="avatar-upload-zone"
      >
        {preview ? (
          <>
            <img 
              src={preview} 
              alt="Avatar Preview" 
              className="w-full h-full object-cover rounded-full"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <Camera className="w-6 h-6 text-white" />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1 text-slate-400 text-center px-2">
            <Upload className="w-5 h-5 text-slate-400 group-hover:text-amber-500 transition-colors" />
            <span className="text-[10px] font-medium font-sans">وێنە دابنێ</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={selectFile}
          className="px-3 py-1 text-xs border border-slate-300 rounded-md hover:border-amber-500 hover:text-amber-600 font-sans cursor-pointer transition-colors"
          id="btn-select-photo"
        >
          گۆڕینی وێنە
        </button>
        {preview && (
          <button
            type="button"
            onClick={removeImage}
            className="p-1 text-rose-500 border border-transparent hover:border-rose-200 hover:bg-rose-50 rounded-md cursor-pointer transition-colors"
            title="سڕینەوەی وێنە"
            id="btn-remove-photo"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-rose-500 mt-1 font-sans animate-fade-in" id="upload-error">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
