import { X } from 'lucide-react';
import { useEffect } from 'react';

type Props = {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
};

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
  isDestructive = true,
}: Props) {
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-black text-slate-900">{title}</h2>
          <button
            onClick={onCancel}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">
          <p className="text-sm font-medium leading-relaxed text-slate-600">{message}</p>
        </div>
        <div className="flex flex-col-reverse gap-2 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            onClick={onCancel}
            className="rounded-xl px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-200"
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onCancel();
            }}
            className={`rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-sm transition ${
              isDestructive
                ? 'bg-red-600 hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2'
                : 'bg-slate-900 hover:bg-slate-800 focus:ring-2 focus:ring-slate-900 focus:ring-offset-2'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
