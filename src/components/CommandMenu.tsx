import React from 'react';
import { Modal } from './Modal';

export interface CommandMenuProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  maxWidthClassName?: string;
  children: React.ReactNode;
}

/**
 * CommandMenu
 *
 * Origin-aware centered command dialog wrapper powered by universal Modal motion.
 */
export const CommandMenu: React.FC<CommandMenuProps> = ({
  isOpen,
  onClose,
  title,
  maxWidthClassName = 'max-w-xl',
  children,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title || 'Command Dialog'}
      align="top"
      maxWidthClassName={maxWidthClassName}
      className="p-5"
    >
      {children}
    </Modal>
  );
};

export default CommandMenu;
