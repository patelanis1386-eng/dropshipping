'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  isVisible: boolean;
  onClose: () => void;
}

export default function Toast({ message, type, isVisible, onClose }: ToastProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: 100, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 100, scale: 0.9 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border ${
            type === 'success'
              ? 'bg-green-50 dark:bg-green-900/90 border-green-200 dark:border-green-700'
              : 'bg-red-50 dark:bg-red-900/90 border-red-200 dark:border-red-700'
          }`}
        >
          {type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-300 shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 text-red-600 dark:text-red-300 shrink-0" />
          )}
          <span className={`text-sm font-medium ${
            type === 'success'
              ? 'text-green-800 dark:text-green-200'
              : 'text-red-800 dark:text-red-200'
          }`}>
            {message}
          </span>
          <button
            onClick={onClose}
            className={`p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors ${
              type === 'success'
                ? 'text-green-600 dark:text-green-300'
                : 'text-red-600 dark:text-red-300'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
