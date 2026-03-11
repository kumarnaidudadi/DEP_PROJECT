'use client';
// ─── SignaturePad ──────────────────────────────────────────────────────────────
// Canvas-based draw pad for capturing signatures.

import React from 'react';

interface SignaturePadProps {
    fieldKey: string;
    value: string;
    onChange: (val: string) => void;
}

export default function SignaturePad({ value, onChange }: SignaturePadProps) {
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const drawing = React.useRef(false);

    React.useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.strokeStyle = '#1f2937';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        if (value) {
            const img = new Image();
            img.onload = () => ctx.drawImage(img, 0, 0);
            img.src = value;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current!.getBoundingClientRect();
        const scaleX = canvasRef.current!.width / rect.width;
        const scaleY = canvasRef.current!.height / rect.height;
        return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
    };

    const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        drawing.current = true;
        const ctx = canvasRef.current!.getContext('2d')!;
        const pos = getPos(e);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!drawing.current) return;
        const ctx = canvasRef.current!.getContext('2d')!;
        const pos = getPos(e);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
    };

    const endDraw = () => {
        if (!drawing.current) return;
        drawing.current = false;
        onChange(canvasRef.current!.toDataURL());
    };

    const clear = () => {
        const canvas = canvasRef.current!;
        canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
        onChange('');
    };

    return (
        <div>
            <canvas
                ref={canvasRef}
                width={600} height={140}
                onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
                style={{ border: '1px solid #d1d5db', borderRadius: '8px', background: '#fafafa', cursor: 'crosshair', width: '100%', height: '140px', display: 'block' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                <span style={{ fontSize: '11px', color: '#9ca3af' }}>Draw your signature above</span>
                <button type="button" onClick={clear} style={{ fontSize: '11px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Clear</button>
            </div>
            {value && <div style={{ fontSize: '11px', color: '#16a34a', marginTop: '4px' }}>✓ Signature captured</div>}
        </div>
    );
}
