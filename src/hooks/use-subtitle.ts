'use client';

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  SubtitleGenerationResponse,
  SubtitleProcessingJob,
  SubtitleFile,
} from '@kmate/shared-types';

export interface UseRequestSubtitleOptions {
  videoId: string;
  youtubeUrl?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
}

/**
 * Request AI subtitle generation for a video.
 */
export function useRequestSubtitle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (options: UseRequestSubtitleOptions) => {
      const { data } = await api.post<SubtitleGenerationResponse>(
        '/subtitles/generate',
        options,
      );
      return data;
    },
    onSuccess: (data) => {
      if (data.jobId) {
        queryClient.invalidateQueries({ queryKey: ['subtitle-job', data.jobId] });
      }
      queryClient.invalidateQueries({ queryKey: ['subtitle-jobs'] });
    },
  });
}

/**
 * Get the status of a subtitle processing job.
 */
export function useSubtitleJobStatus(jobId: string | null, userId?: string) {
  return useQuery({
    queryKey: ['subtitle-job', jobId],
    queryFn: async () => {
      if (!jobId) return null;
      // Add timestamp to bypass React Query/browser HTTP caching (ETags/304)
      // so FAILED status is always reflected immediately
      const { data } = await api.get<{ data: SubtitleProcessingJob }>(
        `/subtitles/jobs/${jobId}?_=${Date.now()}`,
      );
      return data.data;
    },
    enabled: !!jobId,
    staleTime: 0,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      // Stop polling once COMPLETED (keep polling FAILED so UI always shows current state)
      if (status === 'COMPLETED') return false;
      // Poll every 3s
      return 3000;
    },
  });
}

/**
 * Get subtitle for a specific video and language.
 */
export function useSubtitle(videoId: string, language = 'vi') {
  return useQuery({
    queryKey: ['subtitle', videoId, language],
    queryFn: async () => {
      const { data } = await api.get<SubtitleFile>(
        `/subtitles/video/${videoId}?language=${language}`,
      );
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

/**
 * Get all subtitles for a video.
 */
export function useVideoSubtitles(videoId: string) {
  return useQuery({
    queryKey: ['subtitles', videoId],
    queryFn: async () => {
      const { data } = await api.get<{ videoId: string; subtitles: SubtitleFile[] }>(
        `/subtitles/${videoId}`,
      );
      return data;
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

/**
 * Get the user's subtitle processing job history.
 */
export function useSubtitleJobs(
  status?: string,
  page = 1,
  limit = 20,
) {
  return useQuery({
    queryKey: ['subtitle-jobs', status, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (status) params.set('status', status);
      const { data } = await api.get(`/subtitles/jobs?${params.toString()}`);
      return data;
    },
    placeholderData: keepPreviousData,
  });
}

/**
 * Cancel a subtitle processing job.
 */
export function useCancelSubtitleJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jobId: string) => {
      const { data } = await api.delete(`/subtitles/jobs/${jobId}`);
      return data;
    },
    onSuccess: (_, jobId) => {
      queryClient.invalidateQueries({ queryKey: ['subtitle-job', jobId] });
      queryClient.invalidateQueries({ queryKey: ['subtitle-jobs'] });
    },
  });
}
