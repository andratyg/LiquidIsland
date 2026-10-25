import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystemStore, systemStore } from '../../store/useSystemStore';
import { playGlassPop, playWaterDrop, playToggleClick } from '../../utils/sfx';
import {
  compressImage,
  convertImageFormat,
  triggerFileDownload,
  formatFileSize,
  DEFAULT_BEACH_SVG
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
  Trash2,
  Copy,
  ExternalLink,
  Globe,
  FileCode,
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

  // Handle local File Object dropping
  const handleProcessFiles = useCallback(
    (files: FileList | File[]) => {
      if (!files || files.length === 0) return;

      playGlassPop();
      onDropJellyBounce?.();

      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const resultUrl = e.target?.result as string;
          const newFile: ShelfFileItem = {
            id: `shelf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            name: file.name,
            size: file.size,
            formattedSize: formatFileSize(file.size),
            type: file.type || 'application/octet-stream',
            previewUrl: resultUrl || DEFAULT_BEACH_SVG,
            timestamp: 'Just now',
            isCompressed: false,
            originalSize: file.size,
            originalFormattedSize: formatFileSize(file.size),
          };
          systemStore.addShelfFile(newFile);
          triggerCatchAlert(file.name);
        };
        reader.readAsDataURL(file);
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
      const targetUrl = (uriList && uriList.trim()) || (plainText && /^https?:\/\//i.test(plainText) ? plainText : null);

      if (targetUrl) {
        playGlassPop();
        onDropJellyBounce?.();

        let host = 'Web Link';
        try {
          const parsed = new URL(targetUrl);
          host = parsed.hostname + (parsed.pathname.length > 1 ? parsed.pathname.slice(0, 22) : '');
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
        const title = firstLine.length > 28 ? `${firstLine.substring(0, 28)}...` : firstLine || 'Text Snippet';
        const isCodeLike = /[{};=()=>]|const |let |function |def |import |class /.test(plainText);

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

  // 1-Click Copy Text / URL
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

  // Remove single file
  const handleRemove = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    playToggleClick();
    systemStore.removeShelfFile(id);
  }, []);

  // Clear all files
  const handleClearAll = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    playGlassPop();
    systemStore.clearShelfFiles();
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

        // Compute new filename
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        const newFilename = `${baseName}.${res.extension}`;

        systemStore.updateShelfFile(file.id, {
          name: newFilename,
          type: res.mimeType,
          formattedSize: res.formattedSize,
          previewUrl: res.dataUrl,
        });

        // Trigger direct native client download
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
        accept="image/*,*"
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
              top: '4px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 30,
              padding: '2px 10px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(59, 130, 246, 0.9)',
              color: '#ffffff',
              fontSize: '10px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.45)',
              pointerEvents: 'none',
            }}
          >
            <Sparkles size={11} />
            <span>{catchNotification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================================================================== */}
      {/* 1. Left Universal Dropzone Box (122px × 84px)                        */}
      {/* ==================================================================== */}
      <motion.div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleBrowseClick}
        animate={{
          scale: isDragOver ? 1.03 : 1,
          borderColor: isDragOver ? '#3b82f6' : 'rgba(255, 255, 255, 0.22)',
          backgroundColor: isDragOver ? 'rgba(59, 130, 246, 0.14)' : 'rgba(255, 255, 255, 0.04)',
        }}
        transition={{ type: 'spring', stiffness: 450, damping: 24 }}
        style={{
          width: '122px',
          height: '84px',
          minWidth: '122px',
          borderWidth: '1.5px',
          borderStyle: 'dashed',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '3px',
          cursor: 'pointer',
          padding: '6px',
          boxSizing: 'border-box',
          position: 'relative',
          overflow: 'hidden',
          flexShrink: 0,
        }}
        title="Drop anything: text selections, web images, links, or files"
      >
        <FolderDown
          size={18}
          style={{
            color: isDragOver ? '#3b82f6' : 'var(--text-secondary)',
            transition: 'color 0.15s ease',
          }}
        />

        <span
          style={{
            fontSize: '9.5px',
            fontWeight: 600,
            color: isDragOver ? '#3b82f6' : 'var(--text-primary)',
            letterSpacing: '0.2px',
            textAlign: 'center',
          }}
        >
          {isDragOver ? 'Release to Drop' : 'Drop anything here'}
        </span>

        {/* Actions inside Left Dropzone */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
          <button
            type="button"
            onClick={handleSimulateDrop}
            className="btn-pill"
            style={{
              fontSize: '8px',
              padding: '1px 5px',
              height: '16px',
              backgroundColor: 'var(--pill-bg)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-secondary)',
            }}
            title="Simulate Drop: beach.jpg"
          >
            <Upload size={8} style={{ color: '#3b82f6' }} />
            <span>File</span>
          </button>

          <button
            type="button"
            onClick={handleSimulateTextDrop}
            className="btn-pill"
            style={{
              fontSize: '8px',
              padding: '1px 5px',
              height: '16px',
              backgroundColor: 'var(--pill-bg)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-secondary)',
            }}
            title="Simulate Drop: Text/Code Snippet"
          >
            <FileCode size={8} style={{ color: '#10b981' }} />
            <span>Text</span>
          </button>

          {shelfFiles.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="btn-pill"
              style={{
                fontSize: '8px',
                padding: '1px 5px',
                height: '16px',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
              }}
              title="Clear all items from Shelf"
            >
              <Trash2 size={8} style={{ color: '#f87171' }} />
            </button>
          )}
        </div>
      </motion.div>

      {/* ==================================================================== */}
      {/* 2. Right Cards List (Scrollable Area)                                */}
      {/* ==================================================================== */}
      <div
        style={{
          flex: 1,
          height: '84px',
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
            /* Empty State */
            <motion.div
              key="shelf-empty-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '100%',
                gap: '5px',
                color: 'var(--text-secondary)',
                fontSize: '10.5px',
              }}
            >
              <span>Shelf is empty &mdash; drag text, images, links or files</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={handleSimulateDrop}
                  className="btn-pill"
                  style={{ fontSize: '9px', padding: '2px 8px' }}
                >
                  <Sparkles size={9} style={{ color: '#3b82f6' }} />
                  <span>Add beach.jpg</span>
                </button>
                <button
                  type="button"
                  onClick={handleSimulateTextDrop}
                  className="btn-pill"
                  style={{ fontSize: '9px', padding: '2px 8px' }}
                >
                  <FileCode size={9} style={{ color: '#10b981' }} />
                  <span>Add Snippet</span>
                </button>
              </div>
            </motion.div>
          ) : (
            /* Item Cards */
            shelfFiles.map((file: ShelfFileItem) => {
              const ext = file.name.split('.').pop()?.toUpperCase() || 'FILE';
              const isText = file.type === 'text/plain' || file.type === 'text/code';
              const isUrl = file.type === 'url' || file.type === 'text/uri-list';
              const isWebImage = file.type === 'image/web';
              const isImage = file.previewUrl && (isWebImage || file.type?.startsWith('image/') || ['PNG', 'JPG', 'JPEG', 'WEBP', 'GIF', 'SVG'].includes(ext));
              const isWebp = ext === 'WEBP';
              const formatLabel = isUrl ? 'URL' : isText ? (file.type === 'text/code' ? 'CODE' : 'TXT') : isWebImage ? 'WEB' : ext;

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
                    minWidth: '256px',
                    width: '256px',
                    height: '84px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--glass-border)',
                    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.22)',
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

                  {/* Thumbnail Preview */}
                  <div
                    style={{
                      width: '66px',
                      height: '66px',
                      minWidth: '66px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: '1px solid rgba(255, 255, 255, 0.16)',
                      background: isUrl
                        ? 'rgba(56, 189, 248, 0.08)'
                        : isText
                        ? '#141419'
                        : '#1e1e24',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
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
                            fontFamily: 'monospace',
                            color: '#94a3b8',
                            overflow: 'hidden',
                            lineHeight: 1.25,
                            wordBreak: 'break-all',
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
                          ? 'rgba(14, 165, 233, 0.85)'
                          : isText
                          ? 'rgba(16, 185, 129, 0.85)'
                          : 'rgba(0, 0, 0, 0.65)',
                        color: '#f8fafc',
                        padding: '1px 3px',
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
                          color: 'var(--text-primary)',
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
                          color: 'var(--text-secondary)',
                          marginTop: '1.5px',
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
                              backgroundColor: 'rgba(16, 185, 129, 0.18)',
                              border: '1px solid rgba(16, 185, 129, 0.35)',
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
                        <button
                          type="button"
                          onClick={(e) => handleCopyText(file.content || file.name, file.id, e)}
                          className="btn-pill"
                          style={{
                            fontSize: '8.5px',
                            padding: '1.5px 6px',
                            height: '18px',
                            backgroundColor: copiedId === file.id ? 'rgba(16, 185, 129, 0.18)' : 'var(--pill-bg)',
                            borderColor: copiedId === file.id ? '#10b981' : 'var(--glass-border)',
                            color: copiedId === file.id ? '#10b981' : 'var(--text-primary)',
                            gap: '3px',
                          }}
                          title="Copy text snippet to clipboard"
                        >
                          {copiedId === file.id ? <Check size={8} style={{ color: '#10b981' }} /> : <Copy size={8} style={{ color: '#38bdf8' }} />}
                          <span>{copiedId === file.id ? 'Copied!' : 'Copy Text'}</span>
                        </button>
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
                              backgroundColor: copiedId === file.id ? 'rgba(16, 185, 129, 0.18)' : 'var(--pill-bg)',
                              borderColor: copiedId === file.id ? '#10b981' : 'var(--glass-border)',
                              color: copiedId === file.id ? '#10b981' : 'var(--text-primary)',
                              gap: '3px',
                            }}
                            title="Copy link URL"
                          >
                            {copiedId === file.id ? <Check size={8} style={{ color: '#10b981' }} /> : <Copy size={8} style={{ color: '#38bdf8' }} />}
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
                              backgroundColor: 'var(--pill-bg)',
                              borderColor: 'var(--glass-border)',
                              color: 'var(--text-primary)',
                              gap: '3px',
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
                            onClick={(e) => handleCopyText(file.content || file.previewUrl || '', file.id, e)}
                            className="btn-pill"
                            style={{
                              fontSize: '8.5px',
                              padding: '1.5px 6px',
                              height: '18px',
                              backgroundColor: copiedId === file.id ? 'rgba(16, 185, 129, 0.18)' : 'var(--pill-bg)',
                              borderColor: copiedId === file.id ? '#10b981' : 'var(--glass-border)',
                              color: copiedId === file.id ? '#10b981' : 'var(--text-primary)',
                              gap: '3px',
                            }}
                            title="Copy image source URL"
                          >
                            {copiedId === file.id ? <Check size={8} style={{ color: '#10b981' }} /> : <Copy size={8} style={{ color: '#38bdf8' }} />}
                            <span>{copiedId === file.id ? 'Copied' : 'Copy URL'}</span>
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
                                backgroundColor: 'var(--pill-bg)',
                                borderColor: 'var(--glass-border)',
                                color: 'var(--text-primary)',
                                gap: '2px',
                              }}
                              title="Convert format to PNG/WEBP and download"
                            >
                              <ArrowLeftRight size={8} style={{ color: '#3b82f6' }} />
                              <span>Convert</span>
                            </button>
                          )}
                        </>
                      )}

                      {/* Case D: Local Image / File (Compress & Transcode) */}
                      {!isText && !isUrl && !isWebImage && (
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
                                : 'var(--pill-bg)',
                              borderColor: file.isCompressed ? '#10b981' : 'var(--glass-border)',
                              color: file.isCompressed ? '#10b981' : 'var(--text-primary)',
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
                              backgroundColor: 'var(--pill-bg)',
                              borderColor: 'var(--glass-border)',
                              color: 'var(--text-primary)',
                              gap: '2px',
                            }}
                            title={`Convert format to ${isWebp ? 'PNG' : 'WEBP'} and download`}
                          >
                            <ArrowLeftRight size={8} style={{ color: '#3b82f6' }} />
                            <span>{isWebp ? 'PNG' : 'WEBP'}</span>
                          </button>
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
