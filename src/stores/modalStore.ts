import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type SetupStep = 'method' | 'credentials' | 'phone' | 'processing' | 'success';

interface TwilioSetupState {
  step: SetupStep;
  setupMethod: 'auto' | 'manual';
  credentials: {
    accountSid: string;
    authToken: string;
  };
  phoneOptions: {
    purchasePhone: boolean;
    countryCode: string;
    areaCode: string;
  };
  processing: boolean;
  result: any;
  error: string | null;
}

interface ModalStore {
  // Twilio Setup Modal
  twilioSetupOpen: boolean;
  twilioSetupState: TwilioSetupState;
  
  // Actions
  setTwilioSetupOpen: (open: boolean) => void;
  setTwilioSetupState: (state: Partial<TwilioSetupState>) => void;
  resetTwilioSetup: () => void;
  
  // Global modal tracking (for preventing unwanted refreshes)
  isAnyModalOpen: () => boolean;
}

const defaultTwilioState: TwilioSetupState = {
  step: 'method',
  setupMethod: 'auto',
  credentials: {
    accountSid: '',
    authToken: ''
  },
  phoneOptions: {
    purchasePhone: false,
    countryCode: 'US',
    areaCode: ''
  },
  processing: false,
  result: null,
  error: null
};

export const useModalStore = create<ModalStore>()(
  persist(
    (set, get) => ({
      // Initial state
      twilioSetupOpen: false,
      twilioSetupState: defaultTwilioState,
      
      // Actions
      setTwilioSetupOpen: (open) => set({ twilioSetupOpen: open }),
      
      setTwilioSetupState: (state) =>
        set((prev) => ({
          twilioSetupState: { ...prev.twilioSetupState, ...state }
        })),
      
      resetTwilioSetup: () =>
        set({ twilioSetupState: defaultTwilioState }),
      
      isAnyModalOpen: () => {
        const state = get();
        return state.twilioSetupOpen;
      }
    }),
    {
      name: 'modal-storage'
    }
  )
);
