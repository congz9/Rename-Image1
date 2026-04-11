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
  FolderOpen,
  LayoutGrid,
  List,
  Moon,
  Sun,
  Plus
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
import { cn } from '@/lib/utils';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [startNumber, setStartNumber] = useState<number | ''>(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
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
      
      let nameToUse = baseName.trim() !== '' ? baseName : file.originalName;
      
      // Apply Search & Replace if queries are provided
      if (searchQuery.trim() !== '') {
        nameToUse = nameToUse.split(searchQuery).join(replaceQuery);
      }
      
      const newName = `${prefix}${nameToUse}${suffix}${numberStr}.${file.extension}`;
      return { ...file, newName };
    });
  }, [files, baseName, prefix, suffix, searchQuery, replaceQuery, startNumber]);

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
    <div className={cn(
      "min-h-screen transition-colors duration-300 font-sans selection:bg-blue-500 selection:text-white",
      theme === 'dark' ? "bg-[#0A0A0A] text-white" : "bg-[#F8F9FA] text-[#1A1A1A]"
    )}
    onDragOver={onDragOver}
    onDragLeave={onDragLeave}
    onDrop={onDrop}
    >
      <Toaster position="bottom-right" richColors closeButton />
      
      <AnimatePresence>
        {isDragging && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-blue-500/10 backdrop-blur-sm border-4 border-dashed border-blue-500 m-4 rounded-[2.5rem] flex flex-col items-center justify-center pointer-events-none"
          >
            <div className="bg-white dark:bg-gray-900 p-8 rounded-full shadow-2xl scale-110 animate-bounce">
              <Upload className="w-12 h-12 text-blue-500" />
            </div>
            <p className="mt-6 text-2xl font-bold text-blue-600 dark:text-blue-400">Thả ảnh vào đây để bắt đầu</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Navigation */}
      <nav className={cn(
        "sticky top-0 z-50 expert-glass h-16 flex items-center px-6 md:px-8 justify-between border-b transition-colors",
        theme === 'dark' ? "bg-black/80 border-white/10" : "bg-white/80 border-black/[0.03]"
      )}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
            <ImageIcon className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm tracking-tight uppercase leading-none">Rename Image</span>
            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-widest mt-0.5">Professional Tool</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </Button>
          <Separator orientation="vertical" className="h-6 bg-gray-200 dark:bg-white/10" />
          {files.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={clearAll}
              className="text-xs font-medium text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg"
            >
              Xóa tất cả
            </Button>
          )}
          <Button 
            onClick={downloadAll}
            disabled={files.length === 0 || isProcessing}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 text-xs font-bold uppercase tracking-wider h-10 rounded-full shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
          >
            {isProcessing ? "Đang xử lý..." : "Xuất file ZIP"}
          </Button>
        </div>
      </nav>

      <main className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-0 min-h-[calc(100vh-4rem)]">
        
        {/* Sidebar: Controls */}
        <aside className={cn(
          "lg:col-span-3 border-r p-6 space-y-8 overflow-y-auto lg:h-[calc(100vh-4rem)] sticky top-16 transition-colors",
          theme === 'dark' ? "bg-[#0F0F0F] border-white/5" : "bg-white border-black/[0.03]"
        )}>
          <div className="space-y-1">
            <h2 className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Cấu hình</h2>
            <p className="text-2xl font-bold tracking-tight">Quy tắc đặt tên</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 ml-1">Tên gốc mới</Label>
              <Input 
                placeholder="VD: SC01_SH01_Background" 
                value={baseName}
                onChange={(e) => setBaseName(e.target.value)}
                className="h-12 rounded-xl border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 ml-1">Tiền tố</Label>
                <Input 
                  placeholder="Pre_" 
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  className="h-12 rounded-xl border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 ml-1">Hậu tố</Label>
                <Input 
                  placeholder="_Suf" 
                  value={suffix}
                  onChange={(e) => setSuffix(e.target.value)}
                  className="h-12 rounded-xl border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 ml-1">Tìm chữ</Label>
                <Input 
                  placeholder="VD: Draft" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-12 rounded-xl border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 ml-1">Thay bằng</Label>
                <Input 
                  placeholder="VD: Final" 
                  value={replaceQuery}
                  onChange={(e) => setReplaceQuery(e.target.value)}
                  className="h-12 rounded-xl border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 ml-1">Số bắt đầu (Để trống để tắt)</Label>
              <Input 
                type="number" 
                value={startNumber}
                onChange={(e) => setStartNumber(e.target.value === '' ? '' : parseInt(e.target.value))}
                className="h-12 rounded-xl border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
          </div>

          <div className="pt-4">
            <div className={cn(
              "rounded-2xl p-5 border space-y-3 transition-colors",
              theme === 'dark' ? "bg-white/5 border-white/5" : "bg-gray-50 border-black/[0.03]"
            )}>
              <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest">Xem trước định dạng</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20">
                  <FileText className="w-5 h-5 text-blue-500" />
                </div>
                <p className="text-sm font-mono font-medium truncate text-gray-500 dark:text-gray-400">
                  {prefix}{baseName || 'image'}{suffix}{startNumber !== '' ? `_${startNumber}` : ''}.jpg
                </p>
              </div>
            </div>
          </div>

          <div className="pt-8 space-y-4">
            <div className="flex items-center gap-3 text-xs text-gray-400 font-medium">
              <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              </div>
              <span>Giữ nguyên chất lượng gốc</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-400 font-medium">
              <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              </div>
              <span>Xử lý an toàn tại máy</span>
            </div>
          </div>
        </aside>

        {/* Main Content: Upload & Grid */}
        <div className="lg:col-span-9 p-8 md:p-12 space-y-12">
          
          {/* Action Area */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <motion.div 
              whileHover={{ y: -4, scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "group cursor-pointer rounded-[2.5rem] p-10 text-center space-y-6 border-2 border-dashed transition-all duration-300",
                theme === 'dark' 
                  ? "bg-white/5 border-white/10 hover:border-blue-500/50 hover:bg-blue-500/5" 
                  : "bg-white border-gray-200 hover:border-blue-500/50 hover:bg-blue-50"
              )}
            >
              <input type="file" multiple accept="image/*" onChange={handleFileSelect} className="hidden" ref={fileInputRef} />
              <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-3xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300">
                <Upload className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <p className="text-xl font-bold">Tải ảnh lên</p>
                <p className="text-sm text-gray-400">Kéo thả hoặc nhấn để chọn ảnh</p>
              </div>
            </motion.div>

            <motion.div 
              whileHover={{ y: -4, scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => folderInputRef.current?.click()}
              className={cn(
                "group cursor-pointer rounded-[2.5rem] p-10 text-center space-y-6 border-2 border-dashed transition-all duration-300",
                theme === 'dark' 
                  ? "bg-white/5 border-white/10 hover:border-emerald-500/50 hover:bg-emerald-500/5" 
                  : "bg-white border-gray-200 hover:border-emerald-500/50 hover:bg-emerald-50"
              )}
            >
              <input type="file" {...({ webkitdirectory: "", directory: "" } as any)} onChange={handleFileSelect} className="hidden" ref={folderInputRef} />
              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300">
                <FolderOpen className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <p className="text-xl font-bold">Tải cả thư mục</p>
                <p className="text-sm text-gray-400">Nhập toàn bộ ảnh từ thư mục</p>
              </div>
            </motion.div>
          </div>

          {/* Library Section */}
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold tracking-tight">Thư viện ảnh</h2>
                <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 border-none px-3 py-1 rounded-full text-xs font-bold">
                  {files.length} mục
                </Badge>
              </div>
              
              {files.length > 0 && (
                <div className="flex items-center bg-gray-100 dark:bg-white/5 p-1 rounded-xl border border-black/[0.03] dark:border-white/5">
                  <Button
                    variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className={cn(
                      "rounded-lg h-8 px-3 gap-2 text-xs font-bold transition-all",
                      viewMode === 'grid' ? "bg-white dark:bg-white/10 shadow-sm" : "text-gray-400"
                    )}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    Lưới
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className={cn(
                      "rounded-lg h-8 px-3 gap-2 text-xs font-bold transition-all",
                      viewMode === 'list' ? "bg-white dark:bg-white/10 shadow-sm" : "text-gray-400"
                    )}
                  >
                    <List className="w-3.5 h-3.5" />
                    Danh sách
                  </Button>
                </div>
              )}
            </div>

            {files.length === 0 ? (
              <div className={cn(
                "border-2 border-dashed rounded-[3rem] py-32 text-center space-y-6 transition-colors",
                theme === 'dark' ? "bg-white/2 border-white/5" : "bg-white border-gray-100"
              )}>
                <div className="w-20 h-20 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto border border-black/[0.03] dark:border-white/5">
                  <ImageIcon className="w-10 h-10 text-gray-200 dark:text-gray-700" />
                </div>
                <div className="space-y-1">
                  <p className="text-gray-500 dark:text-gray-400 text-lg font-bold">Chưa có ảnh nào</p>
                  <p className="text-gray-400 text-sm">Bắt đầu bằng cách tải ảnh lên ở phía trên</p>
                </div>
              </div>
            ) : (
              <ScrollArea className="h-[calc(100vh-32rem)] min-h-[500px] pr-4">
                <div className={cn(
                  "grid gap-6",
                  viewMode === 'grid' 
                    ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5" 
                    : "grid-cols-1"
                )}>
                  <AnimatePresence mode="popLayout">
                    {renamedFiles.map((item) => (
                      <motion.div 
                        key={item.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className={cn(
                          "group relative flex rounded-3xl bg-white dark:bg-white/5 border border-black/[0.03] dark:border-white/5 overflow-hidden hover:border-blue-500/30 transition-all duration-300",
                          viewMode === 'grid' ? "flex-col" : "flex-row items-center p-4 gap-6"
                        )}
                      >
                        <div className={cn(
                          "bg-gray-50 dark:bg-black/20 overflow-hidden relative shrink-0",
                          viewMode === 'grid' ? "aspect-square w-full" : "w-24 h-24 rounded-2xl"
                        )}>
                          <img 
                            src={item.preview} 
                            alt={item.originalName} 
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                            <Button 
                              variant="destructive" 
                              size="icon"
                              onClick={() => removeFile(item.id)}
                              className="rounded-full h-10 w-10 bg-white text-red-500 hover:bg-red-50 border-none shadow-2xl scale-90 group-hover:scale-100 transition-transform duration-300"
                            >
                              <X className="w-5 h-5" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className={cn(
                          "flex flex-col justify-center",
                          viewMode === 'grid' ? "p-5 space-y-2" : "flex-1 min-w-0 space-y-1"
                        )}>
                          <div className="space-y-0.5">
                            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest truncate">Tên mới</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate leading-tight" title={item.newName}>
                              {item.newName}
                            </p>
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest truncate">Gốc: {item.originalName}</p>
                          </div>
                        </div>

                        {viewMode === 'list' && (
                          <div className="pr-4 ml-auto">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => removeFile(item.id)}
                              className="rounded-full h-10 w-10 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                            >
                              <Trash2 className="w-5 h-5" />
                            </Button>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </main>

      <footer className={cn(
        "py-16 border-t text-center space-y-4 transition-colors",
        theme === 'dark' ? "bg-[#0A0A0A] border-white/5" : "bg-white border-black/[0.03]"
      )}>
        <div className="flex items-center justify-center gap-3 opacity-40">
          <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
            <ImageIcon className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-sm tracking-tight uppercase">Rename Image</span>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
            Professional Image Workflow Tool
          </p>
          <p className="text-[10px] text-gray-300 dark:text-gray-600 font-medium">
            © 2026 • Thiết kế bởi Chuyên gia AI
          </p>
        </div>
      </footer>
    </div>
  );
}
