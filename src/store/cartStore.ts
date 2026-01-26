import { create } from 'zustand';

export interface ServiceItem {
    id: string;
    name: string;
    description: string;
    image: string;
}

interface CartState {
    items: ServiceItem[];
    isOpen: boolean;
    addItem: (item: ServiceItem) => void;
    removeItem: (itemId: string) => void;
    toggleItem: (item: ServiceItem) => void;
    clearCart: () => void;
    setIsOpen: (isOpen: boolean) => void;
    consultationForm: {
        buildingType: string;
        area: string;
        address: string;
        contact: string;
        name: string;
    };
    setConsultationForm: (data: Partial<CartState["consultationForm"]>) => void;
}

export const useCartStore = create<CartState>((set, get) => ({
    items: [],
    isOpen: false,
    addItem: (item) => set((state) => {
        if (state.items.some(i => i.id === item.id)) return state;
        return { items: [...state.items, item] };
    }),
    removeItem: (itemId) => set((state) => ({
        items: state.items.filter((i) => i.id !== itemId),
    })),
    toggleItem: (item) => set((state) => {
        const exists = state.items.some(i => i.id === item.id);
        if (exists) {
            return { items: state.items.filter((i) => i.id !== item.id) };
        } else {
            return { items: [...state.items, item] };
        }
    }),
    clearCart: () => set({ items: [] }),
    setIsOpen: (isOpen) => set({ isOpen }),

    // Shared Form Data
    consultationForm: {
        buildingType: "",
        area: "",
        address: "",
        contact: "",
        name: ""
    },
    setConsultationForm: (data) => set((state) => ({
        consultationForm: { ...state.consultationForm, ...data }
    })),
}));
