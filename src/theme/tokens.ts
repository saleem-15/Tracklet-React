/**
 * Tracklet Design System Tokens
 * Single Source of Truth for control heights, corner radiuses, and component styles.
 */
export const UI_TOKENS = {
  // Base Design Tokens
  radius: {
    badge: 'rounded-md',
    item: 'rounded-[8px]',
    control: 'rounded-[10px]',
    menu: 'rounded-[12px]',
    card: 'rounded-2xl',
  },
  height: {
    sm: 'h-8',
    md: 'h-[34px]',
    lg: 'h-9',
  },
  
  // Control Composites (Height + Radius)
  controlSm: 'h-8 rounded-[10px]',
  controlMd: 'h-[34px] rounded-[10px]',
  controlLg: 'h-9 rounded-[10px]',

  // Composed Container & Card Styles
  card: 'bg-white border border-slate-200/90 rounded-2xl shadow-2xs',
  modal: 'bg-white border border-slate-200/90 rounded-2xl shadow-2xl',

  // Composed Button & Input Style Classes
  btnPrimary: 'h-[34px] px-3.5 rounded-[10px] bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-semibold border border-transparent shadow-xs text-xs shadow-blue-500/20 cursor-pointer flex items-center justify-center gap-1.5 transition-all',
  btnSecondary: 'h-[34px] px-3 rounded-[10px] bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold border border-blue-200 shadow-2xs text-xs cursor-pointer flex items-center justify-between gap-1.5 transition-all',
  btnOutline: 'h-[34px] px-3 rounded-[10px] bg-white hover:bg-slate-100 text-slate-700 font-medium border border-slate-200 shadow-2xs text-xs cursor-pointer flex items-center justify-center gap-1.5 transition-all',
  btnGhost: 'h-8 px-2 rounded-[10px] bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900 text-xs transition-colors cursor-pointer',
  inputBase: 'h-[34px] bg-slate-50 text-slate-900 placeholder-slate-400 rounded-[10px] border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white text-xs transition-all shadow-2xs',
};
