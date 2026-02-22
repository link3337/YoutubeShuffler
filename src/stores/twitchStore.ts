import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const TWITCH_STORE_STORAGE_KEY = 'ytpl_twitch_store';

type TwitchStoreState = {
    twitchChannel: string;
    twitchUsername: string;
    twitchOauthToken: string;
    shadowbannedUsers: string;
    blacklistedSongs: string;
    twitchConnected: boolean;
    requestCount: number;
    setTwitchChannel: (value: string) => void;
    setTwitchUsername: (value: string) => void;
    setTwitchOauthToken: (value: string) => void;
    setShadowbannedUsers: (value: string) => void;
    setBlacklistedSongs: (value: string) => void;
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
            twitchConnected: false,
            requestCount: 0,
            setTwitchChannel: (value) => set({ twitchChannel: value }),
            setTwitchUsername: (value) => set({ twitchUsername: value }),
            setTwitchOauthToken: (value) => set({ twitchOauthToken: value }),
            setShadowbannedUsers: (value) => set({ shadowbannedUsers: value }),
            setBlacklistedSongs: (value) => set({ blacklistedSongs: value }),
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
                blacklistedSongs: state.blacklistedSongs
            })
        }
    )
);