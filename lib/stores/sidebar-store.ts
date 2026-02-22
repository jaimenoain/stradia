import { create } from 'zustand';

interface SidebarState {
  isOpen: boolean;
  isPinned: boolean;
  toggleOpen: () => void;
  setOpen: (isOpen: boolean) => void;
  togglePinned: () => void;
  setPinned: (isPinned: boolean) => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isOpen: true,
  isPinned: false,
  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
  setOpen: (isOpen) => set({ isOpen }),
  togglePinned: () => set((state) => ({ isPinned: !state.isPinned })),
  setPinned: (isPinned) => set({ isPinned }),
}));
