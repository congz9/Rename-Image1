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
  Plus,
  Type,
  Ghost,
  Move,
  Type as TextIcon,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight
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
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';

interface ImageFile {
  id: string;
  file: File;
  preview: string;
  originalName: string;
  extension: string;
}

type WatermarkPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';

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

  // Watermark State
  const [isWatermarkEnabled, setIsWatermarkEnabled] = useState(false);
  const [watermarkType, setWatermarkType] = useState<'text' | 'image'>('text');
  const [watermarkText, setWatermarkText] = useState('');
  const [watermarkColor, setWatermarkColor] = useState('#ffffff');
  const [watermarkFont, setWatermarkFont] = useState('sans-serif');
  const [watermarkImage, setWatermarkImage] = useState<string | null>(null);
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.5);
  const [watermarkPosition, setWatermarkPosition] = useState<WatermarkPosition>('bottom-right');
  const [watermarkX, setWatermarkX] = useState(95); // Default for bottom-right
  const [watermarkY, setWatermarkY] = useState(95); // Default for bottom-right
  const [watermarkSize, setWatermarkSize] = useState(20); // Scale 1-100
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const watermarkInputRef = useRef<HTMLInputElement>(null);

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

  const handleWatermarkImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setWatermarkImage(event.target?.result as string);
        toast.success('Đã tải logo lên.');
      };
      reader.readAsDataURL(file);
    }
  };

  const processImageWithWatermark = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('Canvas context not found');

        ctx.drawImage(img, 0, 0);

        if (isWatermarkEnabled) {
          ctx.globalAlpha = watermarkOpacity;
          
          if (watermarkType === 'text' && watermarkText) {
            const fontSize = Math.floor(canvas.width * (watermarkSize / 400));
            ctx.font = `bold ${fontSize}px ${watermarkFont}`;
            ctx.fillStyle = watermarkColor;
            
            const metrics = ctx.measureText(watermarkText);
            const textWidth = metrics.width;
            const textHeight = fontSize;
            
            // Use percentages for position
            const x = (canvas.width * watermarkX) / 100 - (textWidth / 2);
            const y = (canvas.height * watermarkY) / 100 + (textHeight / 2);
            
            ctx.fillText(watermarkText, x, y);
          } else if (watermarkType === 'image' && watermarkImage) {
            const wmImg = new Image();
            wmImg.onload = () => {
              const scale = watermarkSize / 100;
              const w = canvas.width * scale;
              const h = (wmImg.height / wmImg.width) * w;
              
              // Use percentages for position
              const x = (canvas.width * watermarkX) / 100 - (w / 2);
              const y = (canvas.height * watermarkY) / 100 - (h / 2);
              
              ctx.drawImage(wmImg, x, y, w, h);
              canvas.toBlob((blob) => {
                if (blob) resolve(blob);
                else reject('Blob creation failed');
              }, file.type);
            };
            wmImg.src = watermarkImage;
            return;
          }
        }

        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject('Blob creation failed');
        }, file.type);
      };
      img.onerror = () => reject('Image load failed');
      img.src = URL.createObjectURL(file);
    });
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
      
      for (const item of renamedFiles) {
        if (isWatermarkEnabled) {
          const processedBlob = await processImageWithWatermark(item.file);
          zip.file(item.newName, processedBlob);
        } else {
          zip.file(item.newName, item.file);
        }
      }
      
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
            <p className="text-2xl font-bold tracking-tight uppercase">QUY TẮC</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-blue-500 ml-1">Tên gốc mới</Label>
              <Input 
                placeholder="WaterMark" 
                value={baseName}
                onChange={(e) => setBaseName(e.target.value)}
                className="h-12 rounded-xl border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-blue-500 ml-1">Tiền tố</Label>
                <Input 
                  placeholder="Pre_" 
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  className="h-12 rounded-xl border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-blue-500 ml-1">Hậu tố</Label>
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
                <Label className="text-[11px] font-bold uppercase tracking-wider text-blue-500 ml-1">Tìm chữ</Label>
                <Input 
                  placeholder="VD: Draft" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-12 rounded-xl border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-blue-500 ml-1">Thay bằng</Label>
                <Input 
                  placeholder="VD: Final" 
                  value={replaceQuery}
                  onChange={(e) => setReplaceQuery(e.target.value)}
                  className="h-12 rounded-xl border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-blue-500 ml-1">Số bắt đầu (Để trống để tắt)</Label>
              <Input 
                type="number" 
                value={startNumber}
                onChange={(e) => setStartNumber(e.target.value === '' ? '' : parseInt(e.target.value))}
                className="h-12 rounded-xl border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
          </div>

          <Separator className="bg-gray-100 dark:bg-white/5" />

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold tracking-tight uppercase">WATER MARK</p>
              <Switch 
                checked={isWatermarkEnabled}
                onCheckedChange={setIsWatermarkEnabled}
                className="data-[state=checked]:bg-emerald-500"
              />
            </div>

            {isWatermarkEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-6 overflow-hidden"
              >
                <Tabs value={watermarkType} onValueChange={(v: any) => setWatermarkType(v)} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-gray-100 dark:bg-white/5 p-1 rounded-xl h-10">
                    <TabsTrigger value="text" className="text-[10px] font-bold uppercase">Chữ</TabsTrigger>
                    <TabsTrigger value="image" className="text-[10px] font-bold uppercase">Logo</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="text" className="space-y-4 pt-4">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-[11px] font-bold uppercase tracking-wider text-blue-500 ml-1">Nội dung chữ</Label>
                        <Input 
                          placeholder="WaterMark" 
                          value={watermarkText}
                          onChange={(e) => setWatermarkText(e.target.value)}
                          className="h-12 rounded-xl border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[11px] font-bold uppercase tracking-wider text-blue-500 ml-1">Màu chữ</Label>
                        <div className="flex items-center gap-3">
                          <input 
                            type="color" 
                            value={watermarkColor}
                            onChange={(e) => setWatermarkColor(e.target.value)}
                            className="w-12 h-12 rounded-xl border-0 p-0 overflow-hidden cursor-pointer bg-transparent"
                          />
                          <Input 
                            value={watermarkColor}
                            onChange={(e) => setWatermarkColor(e.target.value)}
                            className="h-12 rounded-xl border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 font-mono text-xs"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[11px] font-bold uppercase tracking-wider text-blue-500 ml-1">Font chữ</Label>
                        <div className="relative">
                          <select
                            value={watermarkFont}
                            onChange={(e) => setWatermarkFont(e.target.value)}
                            className="w-full h-12 px-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none cursor-pointer outline-none"
                            style={{ fontFamily: watermarkFont }}
                          >
                            {[
                              { id: 'sans-serif', label: 'Sans Serif' },
                              { id: 'Inter', label: 'Inter' },
                              { id: 'Roboto', label: 'Roboto' },
                              { id: 'Montserrat', label: 'Montserrat' },
                              { id: 'Playfair Display', label: 'Playfair' },
                              { id: 'Oswald', label: 'Oswald' },
                              { id: 'Open Sans', label: 'Open Sans' },
                              { id: 'JetBrains Mono', label: 'Mono' },
                            ].map((font) => (
                              <option key={font.id} value={font.id} style={{ fontFamily: font.id }}>
                                {font.label}
                              </option>
                            ))}
                          </select>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="image" className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold uppercase tracking-wider text-blue-500 ml-1">Tải logo lên</Label>
                      <div 
                        onClick={() => watermarkInputRef.current?.click()}
                        className="cursor-pointer h-24 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-blue-500/50 transition-all"
                      >
                        <input type="file" accept="image/*" onChange={handleWatermarkImageUpload} className="hidden" ref={watermarkInputRef} />
                        {watermarkImage ? (
                          <img src={watermarkImage} alt="Logo" className="h-16 object-contain" />
                        ) : (
                          <>
                            <ImageIcon className="w-5 h-5 text-gray-400" />
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Chọn file logo</span>
                          </>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label className="text-[11px] font-bold uppercase tracking-wider text-blue-500 ml-1">Kích thước: {watermarkSize}%</Label>
                    </div>
                    <input 
                      type="range"
                      min="1"
                      max="100"
                      value={watermarkSize}
                      onChange={(e) => setWatermarkSize(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-gray-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label className="text-[11px] font-bold uppercase tracking-wider text-blue-500 ml-1">Độ mờ: {Math.round((watermarkOpacity || 0) * 100)}%</Label>
                    </div>
                    <input 
                      type="range"
                      min="0"
                      max="100"
                      value={(watermarkOpacity || 0) * 100}
                      onChange={(e) => setWatermarkOpacity(parseInt(e.target.value) / 100)}
                      className="w-full h-1.5 bg-gray-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex flex-col items-center space-y-3 pt-2">
                      <Label className="text-[11px] font-bold uppercase tracking-wider text-blue-500">Vị trí đóng dấu</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {/* Row 1 */}
                        <Button
                          variant={watermarkPosition === 'top-left' ? 'secondary' : 'outline'}
                          size="sm"
                          className={cn(
                            "w-12 h-12 rounded-lg text-[8px] font-bold leading-tight p-1 transition-all",
                            watermarkPosition === 'top-left' 
                              ? "bg-blue-500/10 text-blue-500 border-blue-500/20" 
                              : "border-gray-200 dark:border-white/10 text-gray-400"
                          )}
                          onClick={() => {
                            setWatermarkPosition('top-left');
                            setWatermarkX(5);
                            setWatermarkY(5);
                          }}
                        >
                          TRÁI<br/>TRÊN
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="w-12 h-12 rounded-lg border-gray-200 dark:border-white/10"
                          onClick={() => setWatermarkY(prev => Math.max(0, prev - 1))}
                        >
                          <ChevronUp className="w-5 h-5" />
                        </Button>
                        <Button
                          variant={watermarkPosition === 'top-right' ? 'secondary' : 'outline'}
                          size="sm"
                          className={cn(
                            "w-12 h-12 rounded-lg text-[8px] font-bold leading-tight p-1 transition-all",
                            watermarkPosition === 'top-right' 
                              ? "bg-blue-500/10 text-blue-500 border-blue-500/20" 
                              : "border-gray-200 dark:border-white/10 text-gray-400"
                          )}
                          onClick={() => {
                            setWatermarkPosition('top-right');
                            setWatermarkX(95);
                            setWatermarkY(5);
                          }}
                        >
                          PHẢI<br/>TRÊN
                        </Button>

                        {/* Row 2 */}
                        <Button
                          variant="outline"
                          size="icon"
                          className="w-12 h-12 rounded-lg border-gray-200 dark:border-white/10"
                          onClick={() => setWatermarkX(prev => Math.max(0, prev - 1))}
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </Button>
                        <Button
                          variant={watermarkPosition === 'center' ? 'secondary' : 'outline'}
                          size="sm"
                          className={cn(
                            "w-12 h-12 rounded-lg text-[8px] font-bold leading-tight p-1 transition-all",
                            watermarkPosition === 'center' 
                              ? "bg-blue-500/10 text-blue-500 border-blue-500/20" 
                              : "border-gray-200 dark:border-white/10 text-gray-400"
                          )}
                          onClick={() => {
                            setWatermarkPosition('center');
                            setWatermarkX(50);
                            setWatermarkY(50);
                          }}
                        >
                          GIỮA
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="w-12 h-12 rounded-lg border-gray-200 dark:border-white/10"
                          onClick={() => setWatermarkX(prev => Math.min(100, prev + 1))}
                        >
                          <ChevronRight className="w-5 h-5" />
                        </Button>

                        {/* Row 3 */}
                        <Button
                          variant={watermarkPosition === 'bottom-left' ? 'secondary' : 'outline'}
                          size="sm"
                          className={cn(
                            "w-12 h-12 rounded-lg text-[8px] font-bold leading-tight p-1 transition-all",
                            watermarkPosition === 'bottom-left' 
                              ? "bg-blue-500/10 text-blue-500 border-blue-500/20" 
                              : "border-gray-200 dark:border-white/10 text-gray-400"
                          )}
                          onClick={() => {
                            setWatermarkPosition('bottom-left');
                            setWatermarkX(5);
                            setWatermarkY(95);
                          }}
                        >
                          TRÁI<br/>DƯỚI
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="w-12 h-12 rounded-lg border-gray-200 dark:border-white/10"
                          onClick={() => setWatermarkY(prev => Math.min(100, prev + 1))}
                        >
                          <ChevronDown className="w-5 h-5" />
                        </Button>
                        <Button
                          variant={watermarkPosition === 'bottom-right' ? 'secondary' : 'outline'}
                          size="sm"
                          className={cn(
                            "w-12 h-12 rounded-lg text-[8px] font-bold leading-tight p-1 transition-all",
                            watermarkPosition === 'bottom-right' 
                              ? "bg-blue-500/10 text-blue-500 border-blue-500/20" 
                              : "border-gray-200 dark:border-white/10 text-gray-400"
                          )}
                          onClick={() => {
                            setWatermarkPosition('bottom-right');
                            setWatermarkX(95);
                            setWatermarkY(95);
                          }}
                        >
                          PHẢI<br/>DƯỚI
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Live Preview Section */}
                  <div className="space-y-2 pt-2">
                    <Label className="text-[11px] font-bold uppercase tracking-wider text-blue-500 ml-1">Xem trước đóng dấu</Label>
                    <div className={cn(
                      "relative w-full overflow-hidden border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 transition-all duration-300",
                      files.length > 0 ? "aspect-auto" : "aspect-video"
                    )}>
                      <img 
                        src={files.length > 0 ? files[0].preview : "https://picsum.photos/seed/preview/800/600"} 
                        className="w-full h-auto block opacity-40 select-none" 
                        alt="Preview" 
                        draggable={false}
                      />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-[8px] uppercase font-bold text-gray-400 opacity-20 tracking-[0.2em]">
                          {files.length > 0 ? "Xem trước trên ảnh thật" : "Khu vực xem trước"}
                        </span>
                      </div>
                      
                      <div 
                        className="absolute transition-all duration-200 flex items-center justify-center"
                        style={{ 
                          opacity: watermarkOpacity,
                          left: `${watermarkX}%`,
                          top: `${watermarkY}%`,
                          transform: 'translate(-50%, -50%)',
                          width: watermarkType === 'image' ? `${watermarkSize}%` : 'auto'
                        }}
                      >
                        {watermarkType === 'text' && watermarkText && (
                          <span 
                            className="font-bold whitespace-nowrap select-none"
                            style={{ 
                              color: watermarkColor, 
                              fontFamily: watermarkFont,
                              fontSize: `calc(${watermarkSize}px * 0.5)`
                            }}
                          >
                            {watermarkText}
                          </span>
                        )}
                        {watermarkType === 'image' && watermarkImage && (
                          <img 
                            src={watermarkImage} 
                            className="w-full h-auto select-none" 
                            alt="Watermark" 
                            draggable={false}
                          />
                        )}
                      </div>
                    </div>
                    <p className="text-[9px] text-gray-400 italic text-center">Dấu sẽ được áp dụng cho toàn bộ {files.length} ảnh khi xuất file.</p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          <Separator className="bg-gray-100 dark:bg-white/5" />

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
                <p className="text-sm text-gray-400">Nhập toàn bộ ảnh từ thư mục</p>
              </div>
            </motion.div>
          </div>

          {/* Library Section */}
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold tracking-tight uppercase">THƯ VIỆN</h2>
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
                            <p className="text-[9px] font-bold text-gray-400 tracking-widest truncate">Gốc: {item.originalName}</p>
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
