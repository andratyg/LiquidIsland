import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystemStore, systemStore } from '../../store/useSystemStore';
import { playGlassPop, playWaterDrop, playToggleClick } from '../../utils/sfx';
import {
  compressImage,
  convertImageFormat,
  triggerFileDownload,
  formatFileSize,
  DEFAULT_BEACH_SVG,
} from '../../utils/imageConverter';
import { ShelfFileItem } from '../../types/liquid';
import {
  FolderDown,
  Upload,
  X,
  Zap,
  ArrowLeftRight,
  Check,
  Sparkles,
  FileText,
  Copy,
  ExternalLink,
  Globe,
  FileCode,
  FolderOpen,
  Download,
} from 'lucide-react';

interface ShelfSlideProps {
  onDropJellyBounce?: () => void;
}

export const ShelfSlide: React.FC<ShelfSlideProps> = ({ onDropJellyBounce }) => {
  const shelfFiles = useSystemStore((s) => s.shelfFiles ?? []);
  const [isDragOver, setIsDragOver] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [catchNotification, setCatchNotification] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const notificationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Trigger transient Companion Catch Flash Notification
  const triggerCatchAlert = useCallback((label: string) => {
    setCatchNotification(`Caught ${label}!`);
    if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
    notificationTimerRef.current = setTimeout(() => {
      setCatchNotification(null);
    }, 2200);
  }, []);

  // Handle local File Object dropping / browsing
  const handleProcessFiles = useCallback(
    (files: FileList | File[]) => {
      if (!files || files.length === 0) return;

      playGlassPop();
      onDropJellyBounce?.();

      Array.from(files).forEach((file) => {
        const isImage = file.type.startsWith('image/');
        const isText =
          file.type.startsWith('text/') ||
          /\.(txt|md|json|js|ts|tsx|jsx|rs|py|html|css|xml|yaml|yml|sh|bat)$/i.test(file.name);

        if (isImage) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const resultUrl = (e.target?.result as string) || DEFAULT_BEACH_SVG;
            const newFile: ShelfFileItem = {
              id: `shelf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              name: file.name,
              size: file.size,
              formattedSize: formatFileSize(file.size),
              type: file.type || 'image/png',
              previewUrl: resultUrl,
              timestamp: 'Just now',
              isCompressed: false,
              originalSize: file.size,
              originalFormattedSize: formatFileSize(file.size),
            };
            systemStore.addShelfFile(newFile);
            triggerCatchAlert(file.name);
          };
          reader.readAsDataURL(file);
        } else if (isText && file.size < 500_000) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const textContent = (e.target?.result as string) || '';
            const newFile: ShelfFileItem = {
              id: `shelf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              name: file.name,
              size: file.size,
              formattedSize: formatFileSize(file.size),
              type: file.type || 'text/plain',
              previewUrl: '',
              content: textContent,
              timestamp: 'Just now',
              isCompressed: false,
              originalSize: file.size,
              originalFormattedSize: formatFileSize(file.size),
            };
            systemStore.addShelfFile(newFile);
            triggerCatchAlert(file.name);
          };
          reader.readAsText(file);
        } else {
          const newFile: ShelfFileItem = {
            id: `shelf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            name: file.name,
            size: file.size,
            formattedSize: formatFileSize(file.size),
            type: file.type || 'application/octet-stream',
            previewUrl: '',
            timestamp: 'Just now',
            isCompressed: false,
            originalSize: file.size,
            originalFormattedSize: formatFileSize(file.size),
          };
          systemStore.addShelfFile(newFile);
          triggerCatchAlert(file.name);
        }
      });
    },
    [onDropJellyBounce, triggerCatchAlert]
  );

  // Drag over handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  // Universal Drop Handler (Files, Web Images, Links, Text/Code)
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      if (!e.dataTransfer) return;

      // 1. Local Files from OS Explorer
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleProcessFiles(e.dataTransfer.files);
        return;
      }

      // 2. Dragged Web Image from Browser (via text/html)
      const htmlData = e.dataTransfer.getData('text/html');
      if (htmlData) {
        const imgMatch = htmlData.match(/<img[^>]+src=["']([^"']+)["']/i);
        if (imgMatch && imgMatch[1]) {
          const imgSrc = imgMatch[1];
          playGlassPop();
          onDropJellyBounce?.();

          let imgName = 'Web Image';
          try {
            const parsed = new URL(imgSrc);
            const pathSegments = parsed.pathname.split('/').filter(Boolean);
            if (pathSegments.length > 0) {
              const last = pathSegments[pathSegments.length - 1];
              if (last.includes('.')) {
                imgName = decodeURIComponent(last);
              }
            }
          } catch {
            // fallback
          }
          if (imgName === 'Web Image') {
            imgName = `web-photo-${Date.now().toString(36)}.png`;
          }

          const newFile: ShelfFileItem = {
            id: `web-img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            name: imgName,
            size: 0,
            formattedSize: 'Web Photo',
            type: 'image/web',
            previewUrl: imgSrc,
            timestamp: 'Just now',
            isCompressed: false,
            content: imgSrc,
          };
          systemStore.addShelfFile(newFile);
          triggerCatchAlert(imgName);
          return;
        }
      }

      // 3. Dragged Link / URL (via text/uri-list or http plaintext)
      const uriList = e.dataTransfer.getData('text/uri-list');
      const plainText = e.dataTransfer.getData('text/plain')?.trim();
      const targetUrl =
        (uriList && uriList.trim()) ||
        (plainText && /^https?:\/\//i.test(plainText) ? plainText : null);

      if (targetUrl) {
        playGlassPop();
        onDropJellyBounce?.();

        let host = 'Web Link';
        try {
          const parsed = new URL(targetUrl);
          host =
            parsed.hostname +
            (parsed.pathname.length > 1 ? parsed.pathname.slice(0, 22) : '');
        } catch {
          host = targetUrl.slice(0, 28);
        }

        const newFile: ShelfFileItem = {
          id: `link-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: host,
          size: targetUrl.length,
          formattedSize: 'Web Link',
          type: 'url',
          previewUrl: '',
          timestamp: 'Just now',
          isCompressed: false,
          content: targetUrl,
        };
        systemStore.addShelfFile(newFile);
        triggerCatchAlert(host);
        return;
      }

      // 4. Dragged Text / Code Selection
      if (plainText && plainText.length > 0) {
        playGlassPop();
        onDropJellyBounce?.();

        const firstLine = plainText.split('\n')[0].trim();
        const title =
          firstLine.length > 28
            ? `${firstLine.substring(0, 28)}...`
            : firstLine || 'Text Snippet';
        const isCodeLike = /[{};=()=>]|const |let |function |def |import |class /.test(
          plainText
        );

        const newFile: ShelfFileItem = {
          id: `text-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: title,
          size: plainText.length,
          formattedSize: `${plainText.length} chars`,
          type: isCodeLike ? 'text/code' : 'text/plain',
          previewUrl: '',
          timestamp: 'Just now',
          isCompressed: false,
          content: plainText,
        };
        systemStore.addShelfFile(newFile);
        triggerCatchAlert(title);
        return;
      }
    },
    [handleProcessFiles, onDropJellyBounce, triggerCatchAlert]
  );

  // Click-to-browse trigger
  const handleBrowseClick = useCallback(() => {
    playToggleClick();
    fileInputRef.current?.click();
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleProcessFiles(e.target.files);
      }
      e.target.value = '';
    },
    [handleProcessFiles]
  );

  // Paste from Clipboard Action
  const handlePasteClipboard = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      playGlassPop();
      try {
        const text = await navigator.clipboard.readText();
        if (!text || text.trim().length === 0) return;

        onDropJellyBounce?.();
        const trimmed = text.trim();

        // Check if URL
        if (/^https?:\/\//i.test(trimmed)) {
          let host = 'Web Link';
          try {
            const parsed = new URL(trimmed);
            host =
              parsed.hostname +
              (parsed.pathname.length > 1 ? parsed.pathname.slice(0, 22) : '');
          } catch {
            host = trimmed.slice(0, 28);
          }

          const newFile: ShelfFileItem = {
            id: `link-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            name: host,
            size: trimmed.length,
            formattedSize: 'Web Link',
            type: 'url',
            previewUrl: '',
            timestamp: 'Just now',
            isCompressed: false,
            content: trimmed,
          };
          systemStore.addShelfFile(newFile);
          triggerCatchAlert(host);
          return;
        }

        // Text / Code Snippet
        const firstLine = trimmed.split('\n')[0].trim();
        const title =
          firstLine.length > 28
            ? `${firstLine.substring(0, 28)}...`
            : firstLine || 'Clipboard Snippet';
        const isCodeLike = /[{};=()=>]|const |let |function |def |import |class /.test(
          trimmed
        );

        const newFile: ShelfFileItem = {
          id: `text-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: title,
          size: trimmed.length,
          formattedSize: `${trimmed.length} chars`,
          type: isCodeLike ? 'text/code' : 'text/plain',
          previewUrl: '',
          timestamp: 'Just now',
          isCompressed: false,
          content: trimmed,
        };
        systemStore.addShelfFile(newFile);
        triggerCatchAlert(title);
      } catch (err) {
        console.warn('Clipboard read error:', err);
      }
    },
    [onDropJellyBounce, triggerCatchAlert]
  );

  // Quick Test Action: "Simulate Drop beach.jpg"
  const handleSimulateDrop = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      playGlassPop();
      onDropJellyBounce?.();

      const simulatedItem: ShelfFileItem = {
        id: `beach-${Date.now()}`,
        name: 'beach.jpg',
        size: 2516582, // 2.4 MB
        formattedSize: '2.4 MB',
        type: 'image/jpeg',
        previewUrl: DEFAULT_BEACH_SVG,
        timestamp: 'Just now',
        isCompressed: false,
        originalSize: 2516582,
        originalFormattedSize: '2.4 MB',
      };
      systemStore.addShelfFile(simulatedItem);
      triggerCatchAlert('beach.jpg');
    },
    [onDropJellyBounce, triggerCatchAlert]
  );

  // Quick Test Action: "Simulate Drop Text Snippet"
  const handleSimulateTextDrop = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      playGlassPop();
      onDropJellyBounce?.();

      const snippet = `const app = "LiquidIsland";\nconsole.log("Ready:", app);`;
      const simulatedItem: ShelfFileItem = {
        id: `snippet-${Date.now()}`,
        name: 'app-init.ts snippet',
        size: snippet.length,
        formattedSize: `${snippet.length} chars`,
        type: 'text/code',
        previewUrl: '',
        timestamp: 'Just now',
        isCompressed: false,
        content: snippet,
      };
      systemStore.addShelfFile(simulatedItem);
      triggerCatchAlert('app-init.ts');
    },
    [onDropJellyBounce, triggerCatchAlert]
  );

  // 1-Click Copy Text / URL / Path
  const handleCopyText = useCallback((text: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    playGlassPop();
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  }, []);

  // 1-Click Open Web URL
  const handleOpenUrl = useCallback((url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    playToggleClick();
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  // Reveal local file in Windows File Explorer
  const handleRevealInExplorer = useCallback(async (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    playToggleClick();
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('open_file_in_explorer', { path });
    } catch (err) {
      console.warn('Reveal in Explorer failed:', err);
    }
  }, []);

  // Open file with Windows default app
  const handleOpenFileDefault = useCallback(async (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    playToggleClick();
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('open_file_default', { path });
    } catch (err) {
      console.warn('Open file default failed:', err);
    }
  }, []);

  // Direct download / save file
  const handleDownload = useCallback((file: ShelfFileItem, e: React.MouseEvent) => {
    e.stopPropagation();
    playToggleClick();
    if (file.previewUrl) {
      triggerFileDownload(file.previewUrl, file.name);
    } else if (file.content) {
      const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      triggerFileDownload(
        url,
        file.name.includes('.') ? file.name : `${file.name}.txt`
      );
      URL.revokeObjectURL(url);
    }
  }, []);

  // Remove single file
  const handleRemove = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    playToggleClick();
    systemStore.removeShelfFile(id);
  }, []);

  // Quick Image Compressor Action (Compress (-65%))
  const handleCompress = useCallback(
    async (file: ShelfFileItem, e: React.MouseEvent) => {
      e.stopPropagation();
      if (file.isCompressed || processingId === file.id || !file.previewUrl) return;

      playWaterDrop();
      setProcessingId(file.id);

      try {
        const res = await compressImage(file.previewUrl, 0.35);
        systemStore.updateShelfFile(file.id, {
          size: res.size,
          formattedSize: res.formattedSize,
          isCompressed: true,
          previewUrl: res.dataUrl,
        });
      } catch (err) {
        console.error('Compression failed:', err);
      } finally {
        setProcessingId(null);
      }
    },
    [processingId]
  );

  // Quick Image Converter Action (⇄ WEBP / PNG)
  const handleConvert = useCallback(
    async (file: ShelfFileItem, e: React.MouseEvent) => {
      e.stopPropagation();
      if (processingId === file.id || !file.previewUrl) return;

      playToggleClick();
      setProcessingId(file.id);

      try {
        const isCurrentWebp = file.name.toLowerCase().endsWith('.webp');
        const targetFormat: 'webp' | 'png' = isCurrentWebp ? 'png' : 'webp';
        const res = await convertImageFormat(file.previewUrl, targetFormat);

        const baseName = file.name.replace(/\.[^/.]+$/, '');
        const newFilename = `${baseName}.${res.extension}`;

        systemStore.updateShelfFile(file.id, {
          name: newFilename,
          type: res.mimeType,
          formattedSize: res.formattedSize,
          previewUrl: res.dataUrl,
        });

        triggerFileDownload(res.dataUrl, newFilename);
      } catch (err) {
        console.error('Format conversion failed:', err);
      } finally {
        setProcessingId(null);
      }
    },
    [processingId]
  );

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        width: '100%',
        height: '100%',
        padding: '0 4px',
        boxSizing: 'border-box',
        position: 'relative',
        userSelect: 'none',
      }}
    >
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="*/*"
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
      />

      {/* Floating Companion Catch Flash Overlay */}
      <AnimatePresence>
        {catchNotification && (
          <motion.div
            key="catch-banner"
            initial={{ opacity: 0, y: -8, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.94 }}
            transition={{ duration: 0.16 }}
            style={{
              position: 'absolute',
              top: '2px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 35,
              padding: '3px 12px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(56, 189, 248, 0.92)',
              backdropFilter: 'blur(12px)',
              color: '#04101d',
              fontSize: '10px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              boxShadow: '0 4px 16px rgba(56, 189, 248, 0.5)',
              pointerEvents: 'none',
            }}
          >
            <Sparkles size={11} style={{ color: '#04101d' }} />
            <span>{catchNotification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================================================================== */}
      {/* 1. Left Universal Dropzone Box (128px × 86px)                        */}
      {/* ==================================================================== */}
      <motion.div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleBrowseClick}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        animate={{
          borderColor: isDragOver ? '#38bdf8' : 'rgba(255, 255, 255, 0.22)',
          backgroundColor: isDragOver ? 'rgba(56, 189, 248, 0.16)' : 'rgba(255, 255, 255, 0.04)',
          boxShadow: isDragOver
            ? '0 0 20px rgba(56, 189, 248, 0.45)'
            : '0 4px 12px rgba(0, 0, 0, 0.15)',
        }}
        transition={{ type: 'spring', stiffness: 450, damping: 24 }}
        style={{
          width: '128px',
          height: '86px',
          minWidth: '128px',
          borderWidth: '1.5px',
          borderStyle: 'dashed',
          borderRadius: '14px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '3px',
          cursor: 'pointer',
          padding: '6px 4px',
          boxSizing: 'border-box',
          position: 'relative',
          overflow: 'hidden',
          flexShrink: 0,
          background:
            'linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%)',
          backdropFilter: 'blur(16px)',
        }}
        title="Drop files, images, links, or snippets - or click to browse"
      >
        <div
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '7px',
            backgroundColor: isDragOver ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease',
          }}
        >
          <FolderDown
            size={14}
            style={{
              color: isDragOver ? '#38bdf8' : '#e2e8f0',
              transition: 'color 0.15s ease',
            }}
          />
        </div>

        <span
          style={{
            fontSize: '9.5px',
            fontWeight: 700,
            color: isDragOver ? '#38bdf8' : '#ffffff',
            letterSpacing: '0.2px',
            textAlign: 'center',
            lineHeight: 1.1,
          }}
        >
          {isDragOver ? 'Release to Drop' : 'Drop anything here'}
        </span>

        {/* Quick Action Pills inside Dropzone */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleBrowseClick();
            }}
            className="btn-pill"
            style={{
              fontSize: '8px',
              padding: '1px 6px',
              height: '17px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.16)',
              color: '#f8fafc',
              borderRadius: '9999px',
              gap: '3px',
              cursor: 'pointer',
            }}
            title="Browse files from PC"
          >
            <Upload size={8} style={{ color: '#38bdf8' }} />
            <span>Browse</span>
          </button>

          <button
            type="button"
            onClick={handlePasteClipboard}
            className="btn-pill"
            style={{
              fontSize: '8px',
              padding: '1px 6px',
              height: '17px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.16)',
              color: '#f8fafc',
              borderRadius: '9999px',
              gap: '3px',
              cursor: 'pointer',
            }}
            title="Paste text/link from clipboard"
          >
            <Copy size={8} style={{ color: '#10b981' }} />
            <span>Paste</span>
          </button>
        </div>
      </motion.div>

      {/* ==================================================================== */}
      {/* 2. Right Cards List (Scrollable Area)                                */}
      {/* ==================================================================== */}
      <div
        style={{
          flex: 1,
          height: '86px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        <AnimatePresence mode="popLayout">
          {shelfFiles.length === 0 ? (
            /* Modern Empty State */
            <motion.div
              key="shelf-empty-state"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '100%',
                gap: '6px',
                padding: '0 8px',
                boxSizing: 'border-box',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#ffffff',
                    letterSpacing: '0.2px',
                  }}
                >
                  Shelf is empty
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    color: '#94a3b8',
                  }}
                >
                  &mdash; drag files, photos, links or text
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={handleSimulateDrop}
                  className="btn-pill"
                  style={{
                    fontSize: '9px',
                    padding: '2px 9px',
                    height: '20px',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#f8fafc',
                    borderRadius: '9999px',
                    gap: '4px',
                    cursor: 'pointer',
                  }}
                  title="Add sample 2.4 MB beach.jpg to test compression"
                >
                  <Sparkles size={10} style={{ color: '#38bdf8' }} />
                  <span>+ Add beach.jpg</span>
                </button>

                <button
                  type="button"
                  onClick={handleSimulateTextDrop}
                  className="btn-pill"
                  style={{
                    fontSize: '9px',
                    padding: '2px 9px',
                    height: '20px',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#f8fafc',
                    borderRadius: '9999px',
                    gap: '4px',
                    cursor: 'pointer',
                  }}
                  title="Add sample code snippet to test clipboard"
                >
                  <FileCode size={10} style={{ color: '#10b981' }} />
                  <span>+ Add Snippet</span>
                </button>
              </div>
            </motion.div>
          ) : (
            /* Item Cards */
            shelfFiles.map((file: ShelfFileItem) => {
              const ext = file.name.split('.').pop()?.toUpperCase() || 'FILE';
              const isText =
                file.type === 'text/plain' ||
                file.type === 'text/code' ||
                file.type?.startsWith('text/');
              const isUrl = file.type === 'url' || file.type === 'text/uri-list';
              const isWebImage = file.type === 'image/web';
              const isLocalImage =
                file.type?.startsWith('image/') ||
                ['PNG', 'JPG', 'JPEG', 'WEBP', 'GIF', 'SVG', 'BMP', 'ICO'].includes(ext);
              const isImage = Boolean(file.previewUrl) && (isWebImage || isLocalImage);
              const isWebp = ext === 'WEBP';
              const hasDiskPath = Boolean(file.path);
              const formatLabel = isUrl
                ? 'URL'
                : isText
                ? file.type === 'text/code'
                  ? 'CODE'
                  : 'TXT'
                : isWebImage
                ? 'WEB'
                : ext;

              return (
                <motion.div
                  key={file.id}
                  layout
                  draggable
                  onDragStart={(e) => {
                    const de = e as unknown as React.DragEvent;
                    if (de && de.dataTransfer) {
                      if (file.content) {
                        de.dataTransfer.setData('text/plain', file.content);
                      } else if (file.previewUrl) {
                        de.dataTransfer.setData('text/uri-list', file.previewUrl);
                      }
                    }
                  }}
                  initial={{ opacity: 0, scale: 0.92, x: 14 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.88, x: -14 }}
                  transition={{ duration: 0.16 }}
                  title="Draggable item - Drag out or click actions below"
                  style={{
                    minWidth: '264px',
                    width: '264px',
                    height: '86px',
                    borderRadius: '14px',
                    backgroundColor: 'rgba(22, 22, 28, 0.88)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '7px 8px',
                    gap: '8px',
                    boxSizing: 'border-box',
                    position: 'relative',
                    flexShrink: 0,
                    cursor: 'grab',
                  }}
                >
                  {/* Top-Right Remove Button (×) */}
                  <button
                    type="button"
                    onClick={(e) => handleRemove(file.id, e)}
                    title="Remove from Shelf"
                    style={{
                      position: 'absolute',
                      top: '4px',
                      right: '5px',
                      width: '16px',
                      height: '16px',
                      borderRadius: '9999px',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0,
                      outline: 'none',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
                  >
                    <X size={12} />
                  </button>

                  {/* Thumbnail / Squircle Preview Container */}
                  <div
                    style={{
                      width: '66px',
                      height: '66px',
                      minWidth: '66px',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      border: '1px solid rgba(255, 255, 255, 0.16)',
                      background: isUrl
                        ? 'rgba(56, 189, 248, 0.1)'
                        : isText
                        ? '#0f172a'
                        : '#18181b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.35)',
                    }}
                  >
                    {isImage ? (
                      <img
                        src={file.previewUrl}
                        alt={file.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                        }}
                      />
                    ) : isUrl ? (
                      <Globe size={26} style={{ color: '#38bdf8' }} />
                    ) : isText ? (
                      file.content ? (
                        <div
                          style={{
                            width: '100%',
                            height: '100%',
                            padding: '4px',
                            boxSizing: 'border-box',
                            fontSize: '6.5px',
                            fontFamily: 'Consolas, monospace',
                            color: '#93c5fd',
                            overflow: 'hidden',
                            lineHeight: 1.25,
                            wordBreak: 'break-all',
                            backgroundColor: '#0a0f1d',
                          }}
                        >
                          {file.content.slice(0, 90)}
                        </div>
                      ) : (
                        <FileCode size={24} style={{ color: '#10b981' }} />
                      )
                    ) : (
                      <FileText size={24} style={{ color: '#38bdf8' }} />
                    )}

                    {/* Format Tag Pill Overlay */}
                    <span
                      style={{
                        position: 'absolute',
                        bottom: '2px',
                        left: '2px',
                        fontSize: '7.5px',
                        fontWeight: 700,
                        backgroundColor: isUrl
                          ? 'rgba(14, 165, 233, 0.9)'
                          : isText
                          ? 'rgba(16, 185, 129, 0.9)'
                          : 'rgba(0, 0, 0, 0.75)',
                        color: '#f8fafc',
                        padding: '1px 3.5px',
                        borderRadius: '3px',
                        letterSpacing: '0.3px',
                      }}
                    >
                      {formatLabel}
                    </span>
                  </div>

                  {/* Metadata & Smart Quick Action Bar */}
                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      height: '66px',
                      minWidth: 0,
                      paddingRight: '10px',
                    }}
                  >
                    {/* Filename & Timestamp */}
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: '#ffffff',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          lineHeight: 1.2,
                        }}
                        title={file.name}
                      >
                        {file.name}
                      </div>

                      {/* Size Readout */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '9.5px',
                          color: '#94a3b8',
                          marginTop: '2px',
                        }}
                      >
                        {file.isCompressed ? (
                          <span style={{ color: '#10b981', fontWeight: 600 }}>
                            {file.originalFormattedSize || '2.4 MB'} &rarr; {file.formattedSize}
                          </span>
                        ) : (
                          <span>{file.formattedSize}</span>
                        )}

                        {file.isCompressed && (
                          <span
                            style={{
                              fontSize: '8px',
                              padding: '0 4px',
                              borderRadius: '9999px',
                              backgroundColor: 'rgba(16, 185, 129, 0.2)',
                              border: '1px solid rgba(16, 185, 129, 0.4)',
                              color: '#10b981',
                              fontWeight: 700,
                            }}
                          >
                            -65%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Smart Quick Action Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {/* Case A: Text / Code Snippet */}
                      {isText && (
                        <>
                          <button
                            type="button"
                            onClick={(e) =>
                              handleCopyText(file.content || file.name, file.id, e)
                            }
                            className="btn-pill"
                            style={{
                              fontSize: '8.5px',
                              padding: '1.5px 6px',
                              height: '18px',
                              backgroundColor:
                                copiedId === file.id
                                  ? 'rgba(16, 185, 129, 0.2)'
                                  : 'rgba(255, 255, 255, 0.08)',
                              borderColor:
                                copiedId === file.id ? '#10b981' : 'rgba(255, 255, 255, 0.15)',
                              color: copiedId === file.id ? '#10b981' : '#f8fafc',
                              gap: '3px',
                              cursor: 'pointer',
                            }}
                            title="Copy snippet to clipboard"
                          >
                            {copiedId === file.id ? (
                              <Check size={8} style={{ color: '#10b981' }} />
                            ) : (
                              <Copy size={8} style={{ color: '#38bdf8' }} />
                            )}
                            <span>{copiedId === file.id ? 'Copied!' : 'Copy'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleDownload(file, e)}
                            className="btn-pill"
                            style={{
                              fontSize: '8.5px',
                              padding: '1.5px 6px',
                              height: '18px',
                              backgroundColor: 'rgba(255, 255, 255, 0.08)',
                              borderColor: 'rgba(255, 255, 255, 0.15)',
                              color: '#f8fafc',
                              gap: '3px',
                              cursor: 'pointer',
                            }}
                            title="Download snippet as .txt"
                          >
                            <Download size={8} style={{ color: '#10b981' }} />
                            <span>Save</span>
                          </button>
                        </>
                      )}

                      {/* Case B: Web Link / URL */}
                      {isUrl && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => handleCopyText(file.content || '', file.id, e)}
                            className="btn-pill"
                            style={{
                              fontSize: '8.5px',
                              padding: '1.5px 6px',
                              height: '18px',
                              backgroundColor:
                                copiedId === file.id
                                  ? 'rgba(16, 185, 129, 0.2)'
                                  : 'rgba(255, 255, 255, 0.08)',
                              borderColor:
                                copiedId === file.id ? '#10b981' : 'rgba(255, 255, 255, 0.15)',
                              color: copiedId === file.id ? '#10b981' : '#f8fafc',
                              gap: '3px',
                              cursor: 'pointer',
                            }}
                            title="Copy link URL"
                          >
                            {copiedId === file.id ? (
                              <Check size={8} style={{ color: '#10b981' }} />
                            ) : (
                              <Copy size={8} style={{ color: '#38bdf8' }} />
                            )}
                            <span>{copiedId === file.id ? 'Copied' : 'Copy'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleOpenUrl(file.content || '', e)}
                            className="btn-pill"
                            style={{
                              fontSize: '8.5px',
                              padding: '1.5px 6px',
                              height: '18px',
                              backgroundColor: 'rgba(255, 255, 255, 0.08)',
                              borderColor: 'rgba(255, 255, 255, 0.15)',
                              color: '#f8fafc',
                              gap: '3px',
                              cursor: 'pointer',
                            }}
                            title="Open URL in web browser"
                          >
                            <ExternalLink size={8} style={{ color: '#38bdf8' }} />
                            <span>Open</span>
                          </button>
                        </>
                      )}

                      {/* Case C: Web Image */}
                      {isWebImage && (
                        <>
                          <button
                            type="button"
                            onClick={(e) =>
                              handleCopyText(
                                file.content || file.previewUrl || '',
                                file.id,
                                e
                              )
                            }
                            className="btn-pill"
                            style={{
                              fontSize: '8.5px',
                              padding: '1.5px 6px',
                              height: '18px',
                              backgroundColor:
                                copiedId === file.id
                                  ? 'rgba(16, 185, 129, 0.2)'
                                  : 'rgba(255, 255, 255, 0.08)',
                              borderColor:
                                copiedId === file.id ? '#10b981' : 'rgba(255, 255, 255, 0.15)',
                              color: copiedId === file.id ? '#10b981' : '#f8fafc',
                              gap: '3px',
                              cursor: 'pointer',
                            }}
                            title="Copy image source URL"
                          >
                            {copiedId === file.id ? (
                              <Check size={8} style={{ color: '#10b981' }} />
                            ) : (
                              <Copy size={8} style={{ color: '#38bdf8' }} />
                            )}
                            <span>{copiedId === file.id ? 'Copied' : 'Copy'}</span>
                          </button>

                          {file.previewUrl && (
                            <button
                              type="button"
                              onClick={(e) => handleConvert(file, e)}
                              disabled={processingId === file.id}
                              className="btn-pill"
                              style={{
                                fontSize: '8.5px',
                                padding: '1.5px 5px',
                                height: '18px',
                                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                borderColor: 'rgba(255, 255, 255, 0.15)',
                                color: '#f8fafc',
                                gap: '2px',
                                cursor: 'pointer',
                              }}
                              title="Convert format to PNG/WEBP and download"
                            >
                              <ArrowLeftRight size={8} style={{ color: '#38bdf8' }} />
                              <span>Convert</span>
                            </button>
                          )}
                        </>
                      )}

                      {/* Case D: Image Files (Compress, Transcode, Download) */}
                      {isImage && !isWebImage && (
                        <>
                          {/* Compress (-65%) Pill */}
                          <button
                            type="button"
                            onClick={(e) => handleCompress(file, e)}
                            disabled={file.isCompressed || processingId === file.id}
                            className="btn-pill"
                            style={{
                              fontSize: '8.5px',
                              padding: '1.5px 5px',
                              height: '18px',
                              backgroundColor: file.isCompressed
                                ? 'rgba(16, 185, 129, 0.15)'
                                : 'rgba(255, 255, 255, 0.08)',
                              borderColor: file.isCompressed
                                ? '#10b981'
                                : 'rgba(255, 255, 255, 0.15)',
                              color: file.isCompressed ? '#10b981' : '#f8fafc',
                              cursor: file.isCompressed ? 'default' : 'pointer',
                              gap: '2px',
                              opacity: file.isCompressed ? 0.8 : 1,
                            }}
                            title={
                              file.isCompressed
                                ? 'Image already compressed (-65%)'
                                : 'Compress image via HTML5 Canvas (-65%)'
                            }
                          >
                            {file.isCompressed ? (
                              <Check size={8} style={{ color: '#10b981' }} />
                            ) : (
                              <Zap size={8} style={{ color: '#f59e0b' }} />
                            )}
                            <span>{file.isCompressed ? 'Saved' : 'Compress'}</span>
                          </button>

                          {/* ⇄ WEBP / PNG Convert Pill */}
                          <button
                            type="button"
                            onClick={(e) => handleConvert(file, e)}
                            disabled={processingId === file.id}
                            className="btn-pill"
                            style={{
                              fontSize: '8.5px',
                              padding: '1.5px 5px',
                              height: '18px',
                              backgroundColor: 'rgba(255, 255, 255, 0.08)',
                              borderColor: 'rgba(255, 255, 255, 0.15)',
                              color: '#f8fafc',
                              gap: '2px',
                              cursor: 'pointer',
                            }}
                            title={`Convert format to ${isWebp ? 'PNG' : 'WEBP'} and download`}
                          >
                            <ArrowLeftRight size={8} style={{ color: '#38bdf8' }} />
                            <span>{isWebp ? 'PNG' : 'WEBP'}</span>
                          </button>

                          {/* Reveal in Explorer if disk path exists */}
                          {hasDiskPath && (
                            <button
                              type="button"
                              onClick={(e) => handleRevealInExplorer(file.path!, e)}
                              className="btn-pill"
                              style={{
                                fontSize: '8.5px',
                                padding: '1.5px 5px',
                                height: '18px',
                                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                borderColor: 'rgba(255, 255, 255, 0.15)',
                                color: '#f8fafc',
                                gap: '2px',
                                cursor: 'pointer',
                              }}
                              title="Reveal file in Windows File Explorer"
                            >
                              <FolderOpen size={8} style={{ color: '#38bdf8' }} />
                              <span>Reveal</span>
                            </button>
                          )}
                        </>
                      )}

                      {/* Case E: General Local Files (Reveal, Open, Copy Path) */}
                      {!isImage && !isText && !isUrl && !isWebImage && (
                        <>
                          {hasDiskPath && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => handleRevealInExplorer(file.path!, e)}
                                className="btn-pill"
                                style={{
                                  fontSize: '8.5px',
                                  padding: '1.5px 5px',
                                  height: '18px',
                                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                  borderColor: 'rgba(255, 255, 255, 0.15)',
                                  color: '#f8fafc',
                                  gap: '2px',
                                  cursor: 'pointer',
                                }}
                                title="Reveal file in Windows Explorer"
                              >
                                <FolderOpen size={8} style={{ color: '#38bdf8' }} />
                                <span>Reveal</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => handleOpenFileDefault(file.path!, e)}
                                className="btn-pill"
                                style={{
                                  fontSize: '8.5px',
                                  padding: '1.5px 5px',
                                  height: '18px',
                                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                  borderColor: 'rgba(255, 255, 255, 0.15)',
                                  color: '#f8fafc',
                                  gap: '2px',
                                  cursor: 'pointer',
                                }}
                                title="Open file with default app"
                              >
                                <ExternalLink size={8} style={{ color: '#38bdf8' }} />
                                <span>Open</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) =>
                                  handleCopyText(file.path!, file.id, e)
                                }
                                className="btn-pill"
                                style={{
                                  fontSize: '8.5px',
                                  padding: '1.5px 5px',
                                  height: '18px',
                                  backgroundColor:
                                    copiedId === file.id
                                      ? 'rgba(16, 185, 129, 0.2)'
                                      : 'rgba(255, 255, 255, 0.08)',
                                  borderColor:
                                    copiedId === file.id
                                      ? '#10b981'
                                      : 'rgba(255, 255, 255, 0.15)',
                                  color: copiedId === file.id ? '#10b981' : '#f8fafc',
                                  gap: '2px',
                                  cursor: 'pointer',
                                }}
                                title="Copy full file path"
                              >
                                {copiedId === file.id ? (
                                  <Check size={8} style={{ color: '#10b981' }} />
                                ) : (
                                  <Copy size={8} style={{ color: '#38bdf8' }} />
                                )}
                                <span>{copiedId === file.id ? 'Copied' : 'Path'}</span>
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
