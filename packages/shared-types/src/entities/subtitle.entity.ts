export interface SubtitleSegment {
  id: string;
  start: number;
  end: number;
  text: string;
  translation?: string;
}

export interface SubtitleFile {
  id: string;
  videoId: string;
  language: string;
  subtitleContent: SubtitleSegment[];
  bilingualContent?: SubtitleSegment[];
  source: 'AUTO_GENERATED' | 'CACHED' | 'MANUAL';
  createdAt: string;
  updatedAt: string;
}

export interface SubtitleProcessingJob {
  id: string;
  videoId: string;
  userId: string;
  sourceLanguage: string;
  targetLanguage: string;
  status: SubtitleProcessingStatus;
  progress: number;
  stage: string | null;
  retryCount: number;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
  subtitles?: SubtitleFile[];
}

export type SubtitleProcessingStatus =
  | 'PENDING'
  | 'QUEUED'
  | 'DOWNLOADING'
  | 'EXTRACTING_AUDIO'
  | 'TRANSCRIBING'
  | 'TRANSLATING'
  | 'SYNCING'
  | 'UPLOADING'
  | 'COMPLETED'
  | 'FAILED'
  | 'DEAD_LETTER';

export interface SubtitleGenerationRequest {
  videoId: string;
  youtubeUrl?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
}

export interface SubtitleGenerationResponse {
  status: 'CACHED' | 'EXISTS' | 'IN_PROGRESS' | 'QUEUED';
  jobId?: string;
  subtitleId?: string;
  url?: string;
  message?: string;
}

export const SUBTITLE_STAGE_LABELS: Record<string, string> = {
  PENDING: 'Đang chuẩn bị...',
  QUEUED: 'Đang chờ...',
  DOWNLOADING: 'Đang tải video...',
  EXTRACTING_AUDIO: 'Đang trích xuất âm thanh...',
  TRANSCRIBING: 'Đang phụ đề hóa với AI...',
  TRANSLATING: 'Đang dịch phụ đề...',
  SYNCING: 'Đang đồng bộ phụ đề...',
  UPLOADING: 'Đang lưu phụ đề...',
  COMPLETED: 'Sẵn sàng!',
  FAILED: 'Thất bại',
  DEAD_LETTER: 'Thất bại',
};
