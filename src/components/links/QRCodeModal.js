import React, { useRef, useCallback, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, Image, FileCode } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { cn } from '../../utils/cn';

const SIZES = [
  { label: 'S', value: 128 },
  { label: 'M', value: 200 },
  { label: 'L', value: 300 },
  { label: 'XL', value: 400 },
];

const PRESETS = [
  { label: 'Default', fg: '#191414', bg: '#ffffff' },
  { label: 'Green', fg: '#1DB954', bg: '#191414' },
  { label: 'Dark', fg: '#ffffff', bg: '#191414' },
  { label: 'Blue', fg: '#1D4ED8', bg: '#ffffff' },
];

export default function QRCodeModal({ open, onClose, link }) {
  const [copied, setCopied] = useState(false);
  const [size, setSize] = useState(200);
  const [fgColor, setFgColor] = useState('#191414');
  const [bgColor, setBgColor] = useState('#ffffff');
  const svgRef = useRef(null);

  const fullUrl = link ? `${window.location.origin}/go/${link.slug}` : '';

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Failed to copy');
    }
  }, [fullUrl]);

  const handleDownloadPNG = useCallback(() => {
    const svgElement = svgRef.current?.querySelector('svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new window.Image();

    img.onload = () => {
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      ctx.scale(2, 2);
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const pngUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = `qr-${link?.slug || 'code'}.png`;
      a.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  }, [link?.slug, bgColor]);

  const handleDownloadSVG = useCallback(() => {
    const svgElement = svgRef.current?.querySelector('svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qr-${link?.slug || 'code'}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }, [link?.slug]);

  if (!link) return null;

  return (
    <Modal open={open} onClose={onClose} title="QR Code" maxWidth="md">
      <div className="flex flex-col items-center gap-4">
        {/* QR Code */}
        <div
          ref={svgRef}
          className="p-4 inline-flex items-center justify-center"
          style={{ backgroundColor: bgColor }}
        >
          <QRCodeSVG
            value={fullUrl}
            size={size}
            level="H"
            includeMargin={false}
            fgColor={fgColor}
            bgColor={bgColor}
          />
        </div>

        <p className="text-sm text-text-muted text-center break-all">{fullUrl}</p>

        {/* Size selector */}
        <div className="w-full">
          <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
            Size
          </label>
          <div className="flex items-center border-2 border-border-strong">
            {SIZES.map((s) => (
              <button
                key={s.value}
                onClick={() => setSize(s.value)}
                className={cn(
                  'flex-1 px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors',
                  size === s.value
                    ? 'bg-primary text-text-inverse'
                    : 'bg-dark-elevated text-text-muted hover:text-text-primary'
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Color presets */}
        <div className="w-full">
          <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
            Color Preset
          </label>
          <div className="grid grid-cols-4 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => {
                  setFgColor(p.fg);
                  setBgColor(p.bg);
                }}
                className={cn(
                  'flex flex-col items-center gap-1 p-2 border-2 transition-colors',
                  fgColor === p.fg && bgColor === p.bg
                    ? 'border-primary'
                    : 'border-border-strong hover:border-primary/50'
                )}
              >
                <div
                  className="w-6 h-6 border border-border-strong"
                  style={{ background: `linear-gradient(135deg, ${p.fg} 50%, ${p.bg} 50%)` }}
                />
                <span className="text-xs text-text-muted">{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Custom colors */}
        <div className="w-full grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
              Foreground
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={fgColor}
                onChange={(e) => setFgColor(e.target.value)}
                className="w-8 h-8 border-2 border-border-strong cursor-pointer bg-transparent"
              />
              <span className="text-xs text-text-secondary font-mono">{fgColor}</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
              Background
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="w-8 h-8 border-2 border-border-strong cursor-pointer bg-transparent"
              />
              <span className="text-xs text-text-secondary font-mono">{bgColor}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 w-full">
          <Button variant="primary" onClick={handleDownloadPNG} fullWidth>
            <Image className="w-4 h-4" />
            PNG
          </Button>
          <Button variant="secondary" onClick={handleDownloadSVG} fullWidth>
            <FileCode className="w-4 h-4" />
            SVG
          </Button>
          <Button variant="secondary" onClick={handleCopy} fullWidth>
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy URL'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
