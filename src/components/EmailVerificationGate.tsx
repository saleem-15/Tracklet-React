import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { VerifyEmailView } from './auth/VerifyEmailView';

interface EmailVerificationGateProps {
  onVerified?: () => void;
  onShowToast?: (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => void;
}

export const EmailVerificationGate: React.FC<EmailVerificationGateProps> = ({
  onVerified,
  onShowToast,
}) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center px-4 sm:px-6 bg-slate-50 text-slate-900 select-none font-sans">
      <div className="w-full max-w-[380px] py-10 flex flex-col justify-center">
        <motion.div
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
          animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0.01 : 0.2, ease: 'easeOut' }}
          className="w-full"
        >
          <VerifyEmailView
            onVerified={onVerified}
            onShowToast={onShowToast}
          />
        </motion.div>
      </div>
    </div>
  );
};
