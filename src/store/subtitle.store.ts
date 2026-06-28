import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SubtitleSegment {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  translation: string;
  words?: WordInfo[];
}

export interface WordInfo {
  word: string;
  startChar: number;
  endChar: number;
  reading?: string;
}

interface SubtitleState {
  // Subtitle data
  segments: SubtitleSegment[];
  videoId: string | null;
  language: string;
  
  // Current segment tracking
  currentSegment: SubtitleSegment | null;
  currentSegmentIndex: number;
  
  // Loading state
  isLoading: boolean;
  hasError: boolean;
  errorMessage: string;
}

interface SubtitleActions {
  // Data actions
  setSegments: (segments: SubtitleSegment[], videoId: string, language: string) => void;
  clearSegments: () => void;
  
  // Segment tracking
  updateCurrentSegment: (time: number) => SubtitleSegment | null;
  
  // State actions
  setIsLoading: (loading: boolean) => void;
  setHasError: (error: boolean, message?: string) => void;
  
  // Helpers
  getSegmentAtTime: (time: number) => SubtitleSegment | null;
  getSegmentIndex: (time: number) => number;
  getUpcomingSegments: (count: number) => SubtitleSegment[];
  getPreviousSegments: (count: number) => SubtitleSegment[];
}

const initialState: SubtitleState = {
  segments: [],
  videoId: null,
  language: 'vi',
  currentSegment: null,
  currentSegmentIndex: -1,
  isLoading: false,
  hasError: false,
  errorMessage: '',
};

export const useSubtitleStore = create<SubtitleState & SubtitleActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      setSegments: (segments, videoId, language) => {
        const currentTime = get().currentSegment?.startTime ?? 0;
        set({
          segments,
          videoId,
          language,
          currentSegment: null,
          currentSegmentIndex: -1,
          isLoading: false,
          hasError: false,
        });
        if (segments.length) {
          get().updateCurrentSegment(currentTime);
        }
      },

      clearSegments: () => set({
        segments: [],
        videoId: null,
        currentSegment: null,
        currentSegmentIndex: -1,
      }),

      updateCurrentSegment: (time) => {
        const { segments } = get();
        if (!segments.length) return null;

        // Linear scan: find the segment that contains `time` (start <= time <= end).
        // This is O(n) but correct. With typical subtitle segment counts (hundreds),
        // the performance difference vs binary search is negligible.
        // Binary search was incorrect because segments are not uniformly distributed
        // and the mid-point comparison logic didn't handle the "time falls in a gap"
        // case properly — leading to the wrong segment being returned.
        let result: SubtitleSegment | null = null;
        let resultIndex = -1;
        for (let i = 0; i < segments.length; i++) {
          const seg = segments[i];
          if (time >= seg.startTime && time <= seg.endTime) {
            result = seg;
            resultIndex = i;
            break;
          }
        }

        if (result !== get().currentSegment || resultIndex !== get().currentSegmentIndex) {
          set({ currentSegment: result, currentSegmentIndex: resultIndex });
        }

        return result;
      },

      setIsLoading: (isLoading) => set({ isLoading }),
      setHasError: (hasError, message = '') => set({ hasError, errorMessage: message }),

      getSegmentAtTime: (time) => {
        const { segments } = get();
        return segments.find(
          (s) => time >= s.startTime && time <= s.endTime
        ) || null;
      },

      getSegmentIndex: (time) => {
        const { segments } = get();
        const index = segments.findIndex(
          (s) => time >= s.startTime && time <= s.endTime
        );
        return index;
      },

      getUpcomingSegments: (count) => {
        const { segments, currentSegmentIndex } = get();
        const start = currentSegmentIndex + 1;
        return segments.slice(start, start + count);
      },

      getPreviousSegments: (count) => {
        const { segments, currentSegmentIndex } = get();
        const end = currentSegmentIndex;
        const start = Math.max(0, end - count);
        return segments.slice(start, end);
      },
    }),
    {
      name: 'kmate-subtitle-prefs',
      partialize: (state) => ({
        language: state.language,
      }),
    }
  )
);
