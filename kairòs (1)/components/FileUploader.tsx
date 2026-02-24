import React, { useRef } from 'react';
import { Paperclip, X, FileText, Image as ImageIcon, Plus } from 'lucide-react';
import { UploadedFile } from '../types';

interface FileUploaderProps {
  uploadedFiles: UploadedFile[];
  onFileUpload: (files: UploadedFile[]) => void;
  onFileRemove: (index: number) => void;
  compact?: boolean;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ uploadedFiles = [], onFileUpload, onFileRemove, compact = false }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles: UploadedFile[] = [];

    // Process all selected files
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const base64Data = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                resolve(base64String.split(',')[1]);
            };
            reader.readAsDataURL(file);
        });

        newFiles.push({
            name: file.name,
            mimeType: file.type,
            data: base64Data
        });
    }
    
    // Add new files to existing ones
    onFileUpload([...uploadedFiles, ...newFiles]);
    
    // Reset input so same files can be selected again if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col gap-2">
        <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            multiple // Enable multiple file selection
            accept="application/pdf,image/png,image/jpeg,image/webp"
        />

        {/* File List */}
        {uploadedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-1">
                {uploadedFiles.map((file, index) => {
                    const isImage = file.mimeType.startsWith('image/');
                    return (
                        <div key={index} className={`flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-lg px-2 py-1.5 animate-in fade-in zoom-in duration-200 ${compact ? 'text-xs' : 'text-sm'}`}>
                            {isImage ? <ImageIcon size={14} className="text-indigo-500" /> : <FileText size={14} className="text-indigo-500" />}
                            <span className="truncate font-medium text-indigo-900 max-w-[100px]">{file.name}</span>
                            <button 
                                type="button"
                                onClick={() => onFileRemove(index)}
                                className="p-0.5 hover:bg-white rounded-full text-indigo-400 hover:text-red-500 transition-colors"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    );
                })}
            </div>
        )}

        {/* Upload Button */}
        <button 
            type="button"
            onClick={triggerUpload}
            className="flex items-center gap-1.5 text-slate-500 hover:text-indigo-600 transition-colors px-2 py-1 rounded-lg hover:bg-slate-100 text-xs font-bold uppercase tracking-wide w-fit border border-dashed border-transparent hover:border-indigo-200"
            title="Allega uno o più file"
        >
            {uploadedFiles.length > 0 ? <Plus size={14} /> : <Paperclip size={14} />}
            <span className="">{uploadedFiles.length > 0 ? 'Aggiungi altro' : 'Allega File'}</span>
        </button>
    </div>
  );
};