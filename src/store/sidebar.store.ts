import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SidebarState {
  collapsed: boolean;
  activeKey: string;
  setCollapsed: (collapsed: boolean) => void;
  toggle: () => void;
  setActiveKey: (key: string) => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      collapsed: true,
      activeKey: '/user/dashboard',

      setCollapsed: (collapsed) => set({ collapsed }),

      toggle: () => set((state) => ({ collapsed: !state.collapsed })),

      setActiveKey: (activeKey) => set({ activeKey }),
    }),
    {
      name: 'kmate-sidebar',
    }
  )
);
