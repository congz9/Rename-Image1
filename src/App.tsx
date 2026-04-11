import React, { useState, useCallback, useMemo, useRef } from 'react';
import { 
  Upload, 
  Image as ImageIcon, 
  Download, 
  Trash2, 
  Settings, 
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  FolderOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { toast, Toaster } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface ImageFile {
  id: string;
  file: File;
  preview: string;
  originalName: string;
  extension: string;
}

export default function App() {
  const [files, setFiles] = useState<ImageFile[]>([]);
  const [baseName, setBaseName] = useState('');
  const [prefix, setPrefix] = useState('');
  const [suffix, setSuffix] = useState('');
  const [startNumber, setStartNumber] = useState<number | ''>(1);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files) as File[];
    handleFiles(droppedFiles);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (newFiles: File[]) => {
    const imageFiles = newFiles.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      toast.error('Vui lòng chỉ chọn các tệp hình ảnh.');
      return;
    }

    const newImageFiles: ImageFile[] = imageFiles.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      preview: URL.createObjectURL(file),
      originalName: file.name.split('.').slice(0, -1).join('.'),
      extension: file.name.split('.').pop() || '',
    }));

    setFiles(prev => [...prev, ...newImageFiles]);
    toast.success(`Đã thêm ${imageFiles.length} ảnh.`);
  };

  const removeFile = (id: string) => {
    setFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove) URL.revokeObjectURL(fileToRemove.preview);
      return prev.filter(f => f.id !== id);
    });
  };

  const clearAll = () => {
    files.forEach(f => URL.revokeObjectURL(f.preview));
    setFiles([]);
    toast.info('Đã xóa tất cả ảnh.');
  };

  const renamedFiles = useMemo(() => {
    return files.map((file, index) => {
      const showNumber = startNumber !== '';
      const numberStr = showNumber ? `_${Number(startNumber) + index}` : '';
      const nameToUse = baseName.trim() !== '' ? baseName : file.originalName;
      const newName = `${prefix}${nameToUse}${suffix}${numberStr}.${file.extension}`;
      return { ...file, newName };
    });
  }, [files, baseName, prefix, suffix, startNumber]);

  const downloadAll = async () => {
    if (files.length === 0) {
      toast.error("Vui lòng tải ảnh lên trước");
      return;
    }

    setIsProcessing(true);
    const toastId = toast.loading("Đang chuẩn bị tệp...");
    
    try {
      toast.loading("Đang đổi tên và đóng gói...", { id: toastId });
      const zip = new JSZip();
      
      renamedFiles.forEach(item => {
        zip.file(item.newName, item.file);
      });
      
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'anh_da_doi_ten.zip');
      toast.success('Tải xuống sẵn sàng!', { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error('Có lỗi xảy ra khi tạo tệp nén.', { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans selection:bg-black selection:text-white">
      <Toaster position="bottom-right" richColors closeButton />
      
      {/* Top Navigation */}
      <nav className="sticky top-0 z-50 expert-glass border-b border-black/[0.03] h-14 flex items-center px-6 md:px-8 justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-[#1A1A1A] rounded-md flex items-center justify-center">
            <ImageIcon className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm tracking-tight uppercase">Rename Image</span>
        </div>
        <div className="flex items-center gap-3">
          {files.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={clearAll}
              className="text-xs font-medium text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg"
            >
              Xóa tất cả
            </Button>
          )}
          <Button 
            onClick={downloadAll}
            disabled={files.length === 0 || isProcessing}
            size="sm"
            className="btn-primary px-5 text-xs font-bold uppercase tracking-wider h-9"
          >
            {isProcessing ? "Đang xử lý..." : "Xuất file ZIP"}
          </Button>
        </div>
      </nav>

      <main className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-0 min-h-[calc(100vh-3.5rem)]">
        
        {/* Sidebar: Controls */}
        <aside className="lg:col-span-3 border-r border-black/[0.03] bg-white p-6 space-y-8 overflow-y-auto lg:h-[calc(100vh-3.5rem)] sticky top-14">
          <div className="space-y-1">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Cấu hình</h2>
            <p className="text-xl font-bold tracking-tight">Quy tắc đặt tên</p>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 ml-1">Tên gốc mới</Label>
              <Input 
                placeholder="VD: SC1_SH1_Background1" 
                value={baseName}
                onChange={(e) => setBaseName(e.target.value)}
                className="input-expert text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 ml-1">Tiền tố</Label>
                <Input 
                  placeholder="Pre_" 
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  className="input-expert text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 ml-1">Hậu tố</Label>
                <Input 
                  placeholder="_Suf" 
                  value={suffix}
                  onChange={(e) => setSuffix(e.target.value)}
                  className="input-expert text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 ml-1">Số bắt đầu (Để trống để tắt)</Label>
              <Input 
                type="number" 
                value={startNumber}
                onChange={(e) => setStartNumber(e.target.value === '' ? '' : parseInt(e.target.value))}
                className="input-expert text-sm"
              />
            </div>
          </div>

          <div className="pt-4">
            <div className="bg-[#F8F9FA] rounded-2xl p-5 border border-black/[0.03] space-y-3">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Xem trước định dạng</p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-black/[0.05] shadow-sm">
                  <FileText className="w-4 h-4 text-blue-500" />
                </div>
                <p className="text-[13px] font-mono font-medium truncate text-gray-700">
                  {prefix}{baseName || 'image'}{suffix}{startNumber !== '' ? `_${startNumber}` : ''}.jpg
                </p>
              </div>
            </div>
          </div>

          <div className="pt-8 space-y-4">
            <div className="flex items-center gap-2 text-[11px] text-gray-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Giữ nguyên chất lượng gốc</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-gray-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Xử lý an toàn tại máy</span>
            </div>
          </div>
        </aside>

        {/* Main Content: Upload & Grid */}
        <div className="lg:col-span-9 p-8 md:p-12 space-y-10">
          
          {/* Action Area */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div 
              whileHover={{ y: -2 }}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              className="cursor-pointer bg-white expert-shadow rounded-3xl p-8 text-center space-y-4 border border-black/[0.03] hover:border-black/10 transition-all"
            >
              <input type="file" multiple accept="image/*" onChange={handleFileSelect} className="hidden" ref={fileInputRef} />
              <div className="w-12 h-12 bg-gray-50 text-gray-900 rounded-2xl flex items-center justify-center mx-auto border border-black/[0.05]">
                <Upload className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-bold">Tải ảnh lên</p>
                <p className="text-xs text-gray-400">Kéo thả hoặc nhấn để chọn</p>
              </div>
            </motion.div>

            <motion.div 
              whileHover={{ y: -2 }}
              onClick={() => folderInputRef.current?.click()}
              className="cursor-pointer bg-white expert-shadow rounded-3xl p-8 text-center space-y-4 border border-black/[0.03] hover:border-black/10 transition-all"
            >
              <input type="file" {...({ webkitdirectory: "", directory: "" } as any)} onChange={handleFileSelect} className="hidden" ref={folderInputRef} />
              <div className="w-12 h-12 bg-gray-50 text-gray-900 rounded-2xl flex items-center justify-center mx-auto border border-black/[0.05]">
                <FolderOpen className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-bold">Tải cả thư mục</p>
                <p className="text-xs text-gray-400">Nhập toàn bộ ảnh từ thư mục</p>
              </div>
            </motion.div>
          </div>

          {/* Library Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold tracking-tight">Thư viện</h2>
                <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md uppercase tracking-wider">
                  {files.length} mục
                </span>
              </div>
            </div>

            {files.length === 0 ? (
              <div className="bg-white border border-dashed border-gray-200 rounded-[2rem] py-32 text-center space-y-4">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto border border-black/[0.03]">
                  <ImageIcon className="w-8 h-8 text-gray-200" />
                </div>
                <p className="text-gray-400 text-sm font-medium">Chưa có ảnh nào được tải lên</p>
              </div>
            ) : (
              <ScrollArea className="h-[calc(100vh-28rem)] min-h-[400px]">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-5">
                  <AnimatePresence mode="popLayout">
                    {renamedFiles.map((item) => (
                      <motion.div 
                        key={item.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="group relative flex flex-col rounded-2xl bg-white expert-shadow border border-black/[0.03] overflow-hidden hover:border-black/20 transition-all"
                      >
                        <div className="aspect-square w-full bg-gray-50 overflow-hidden relative">
                          <img 
                            src={item.preview} 
                            alt={item.originalName} 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                            <Button 
                              variant="destructive" 
                              size="icon"
                              onClick={() => removeFile(item.id)}
                              className="rounded-full h-8 w-8 bg-white text-red-500 hover:bg-red-50 border-none shadow-xl"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="p-3 space-y-1">
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest truncate">Gốc: {item.originalName}</p>
                          <p className="text-[12px] font-bold text-gray-900 truncate leading-tight" title={item.newName}>
                            {item.newName}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </main>

      <footer className="py-12 border-t border-black/[0.03] bg-white text-center space-y-3">
        <div className="flex items-center justify-center gap-2 opacity-30">
          <div className="w-5 h-5 bg-black rounded flex items-center justify-center">
            <ImageIcon className="w-3 h-3 text-white" />
          </div>
          <span className="font-bold text-xs tracking-tight uppercase">Rename Image</span>
        </div>
        <p className="text-[11px] text-gray-400 font-medium">
          Công cụ xử lý ảnh chuyên nghiệp • 2026
        </p>
      </footer>
    </div>
  );
}
