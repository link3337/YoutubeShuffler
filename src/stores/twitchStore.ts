import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const TWITCH_STORE_STORAGE_KEY = 'ytpl_twitch_store';

type TwitchStoreState = {
  twitchChannel: string;
  twitchUsername: string;
  twitchOauthToken: string;
  shadowbannedUsers: string;
  blacklistedSongs: string;
  maxRequestsPerUser: number;
  twitchConnected: boolean;
  requestCount: number;
  setTwitchChannel: (value: string) => void;
  setTwitchUsername: (value: string) => void;
  setTwitchOauthToken: (value: string) => void;
  setShadowbannedUsers: (value: string) => void;
  setBlacklistedSongs: (value: string) => void;
  setMaxRequestsPerUser: (value: number) => void;
  setTwitchConnected: (value: boolean) => void;
  incrementRequestCount: () => void;
  resetRequestCount: () => void;
};

export const useTwitchStore = create<TwitchStoreState>()(
  persist(
    (set) => ({
      twitchChannel: '',
      twitchUsername: '',
      twitchOauthToken: '',
      shadowbannedUsers: '',
      blacklistedSongs: '',
      maxRequestsPerUser: 10,
      twitchConnected: false,
      requestCount: 0,
      setTwitchChannel: (value) => set({ twitchChannel: value }),
      setTwitchUsername: (value) => set({ twitchUsername: value }),
      setTwitchOauthToken: (value) => set({ twitchOauthToken: value }),
      setShadowbannedUsers: (value) => set({ shadowbannedUsers: value }),
      setBlacklistedSongs: (value) => set({ blacklistedSongs: value }),
      setMaxRequestsPerUser: (value) =>
        set({
          maxRequestsPerUser: Number.isFinite(value)
            ? Math.min(100, Math.max(0, Math.floor(value)))
            : 10
        }),
      setTwitchConnected: (value) => set({ twitchConnected: value }),
      incrementRequestCount: () =>
        set((state) => ({
          requestCount: state.requestCount + 1
        })),
      resetRequestCount: () => set({ requestCount: 0 })
    }),
    {
      name: TWITCH_STORE_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        twitchChannel: state.twitchChannel,
        twitchUsername: state.twitchUsername,
        twitchOauthToken: state.twitchOauthToken,
        shadowbannedUsers: state.shadowbannedUsers,
        blacklistedSongs: state.blacklistedSongs,
        maxRequestsPerUser: state.maxRequestsPerUser
      })
    }
  )
);
