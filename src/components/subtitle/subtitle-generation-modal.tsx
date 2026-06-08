'use client';

import { useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Modal, Progress, Button, Result, Spin, Space, Typography } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, ReloadOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { useSubtitleSocket } from '@/hooks/use-subtitle-socket';
import { useRequestSubtitle, useSubtitleJobStatus } from '@/hooks/use-subtitle';
import { useSubtitle } from '@/hooks/use-subtitle';
import { SUBTITLE_STAGE_LABELS } from '@kmate/shared-types';

const { Text } = Typography;

interface SubtitleGenerationModalProps {
  open: boolean;
  videoId: string;
  youtubeUrl?: string;
  videoTitle?: string;
  videoThumbnail?: string;
  userId?: string;
  onClose: () => void;
  onSubtitleReady?: (subtitleUrl: string, segmentCount: number) => void;
  onSubtitleError?: (error: string) => void;
}

/**
 * Modal UI for requesting AI subtitle generation.
 * Shows real-time progress via WebSocket and polls job status as fallback.
 */
export function SubtitleGenerationModal({
  open,
  videoId,
  youtubeUrl,
  videoTitle,
  videoThumbnail,
  onClose,
  onSubtitleReady,
  onSubtitleError,
}: SubtitleGenerationModalProps) {
  const router = useRouter();
  const { progressPercent, stageLabel, error, completed, ready, failed, reset, isConnected, jobCreated } =
    useSubtitleSocket({ videoId, enabled: open });

  const requestMutation = useRequestSubtitle();
  const [jobIdRef, setJobIdRef] = useState<string | null>(null);
  const jobIdFromSocket = jobCreated?.jobId ?? null;
  const resolvedJobId = jobIdRef ?? requestMutation.data?.jobId ?? jobIdFromSocket;

  const { data: jobStatus } = useSubtitleJobStatus(
    resolvedJobId,
  );
  const { data: existingSubtitle } = useSubtitle(videoId);

  // Determine current status
  const status = useCallback((): 'idle' | 'requesting' | 'processing' | 'completed' | 'failed' | 'cached' | 'queued' => {
    if (requestMutation.isPending) return 'requesting';
    if (failed) return 'failed';
    if (jobStatus?.status === 'FAILED') return 'failed';
    if (completed || ready) return 'completed';
    if (requestMutation.data?.status === 'CACHED' || requestMutation.data?.status === 'EXISTS') return 'cached';
    if (resolvedJobId) return 'queued';
    if (progressPercent > 0) return 'processing';
    return 'idle';
  }, [requestMutation.isPending, requestMutation.data?.status, failed, completed, ready, progressPercent, resolvedJobId, jobStatus?.status]);

  // Capture the jobId from the mutation response once it arrives
  useEffect(() => {
    if (requestMutation.data?.jobId && jobIdRef === null) {
      setJobIdRef(requestMutation.data.jobId);
    }
  }, [requestMutation.data?.jobId, jobIdRef]);

  // Capture the jobId from WebSocket event once it arrives
  useEffect(() => {
    if (jobCreated?.jobId && jobIdRef === null) {
      setJobIdRef(jobCreated.jobId);
    }
  }, [jobCreated?.jobId, jobIdRef]);

  // Trigger subtitle ready callback
  useEffect(() => {
    if (ready && onSubtitleReady) {
      onSubtitleReady(ready.url, ready.segmentCount);
    }
  }, [ready, onSubtitleReady]);

  // Trigger error callback
  useEffect(() => {
    if (failed && onSubtitleError) {
      onSubtitleError(failed.error);
    }
  }, [failed, onSubtitleError]);

  // Also trigger error callback when polling detects FAILED status (WebSocket might not be connected)
  useEffect(() => {
    if (jobStatus?.status === 'FAILED' && jobStatus.errorMessage && onSubtitleError) {
      onSubtitleError(jobStatus.errorMessage);
    }
  }, [jobStatus?.status, jobStatus?.errorMessage, onSubtitleError]);

  const handleRequest = async () => {
    setJobIdRef(null);
    reset();
    try {
      await requestMutation.mutateAsync({ videoId, youtubeUrl });
    } catch {
      // Error handled by mutation state
    }
  };

  const queryClient = useQueryClient();

  // Invalidate job status query when WebSocket failed event arrives
  // This ensures the jobStatus polling data is refreshed immediately
  useEffect(() => {
    if (failed?.jobId) {
      queryClient.invalidateQueries({ queryKey: ['subtitle-job', failed.jobId] });
    }
  }, [failed?.jobId, queryClient]);

  // When modal opens, trigger subtitle generation only if no job is in progress
  // Guard: skip if we already have a resolved job ID (from a previous attempt in this session)
  useEffect(() => {
    if (!open) return;
    if (existingSubtitle) return;
    if (requestMutation.isPending) return;
    if (requestMutation.data) return;
    if (jobIdRef) return;
    handleRequest();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const renderContent = () => {
    const s = status();

    if (s === 'requesting' || s === 'queued') {
      return (
        <div className="text-center py-8">
          <Spin size="large" />
          <Text className="block mt-4">
            {s === 'requesting' ? 'Processing request...' : 'Job queued — waiting for processing...'}
          </Text>
          {s === 'queued' && (
            <Text type="secondary" className="block mt-1 text-sm">
              This usually takes a few seconds
            </Text>
          )}
        </div>
      );
    }

    if (s === 'cached' || s === 'completed') {
      const url = ready?.url ?? requestMutation.data?.url ?? '';
      const segmentCount = ready?.segmentCount ?? 0;

      return (
        <Result
          status="success"
          icon={<CheckCircleOutlined className="text-green-500" />}
          title="Subtitles ready!"
          subTitle={
            segmentCount > 0
              ? `${segmentCount} segments generated`
              : 'Subtitles have been loaded'
          }
          extra={
            <Space direction="vertical" className="w-full">
              <Button type="primary" size="large" onClick={onClose}>
                Watch Now
              </Button>
              {url && (
                <Button variant="text" size="small" onClick={() => window.open(url, '_blank')}>
                  Download subtitles
                </Button>
              )}
            </Space>
          }
        />
      );
    }

    if (s === 'failed') {
      const failedError = failed?.error ?? jobStatus?.errorMessage ?? 'An unexpected error occurred';
      const isRetryable = failed?.retryable ?? false;
      return (
        <Result
          status="error"
          icon={<CloseCircleOutlined className="text-red-500" />}
          title="Subtitle generation failed"
          subTitle={
            isRetryable
              ? `${failedError} — will retry automatically`
              : failedError
          }
          extra={
            isRetryable ? (
              <Text type="secondary">Please wait while we retry...</Text>
            ) : (
              <Space direction="vertical" className="w-full">
                <Button
                  type="primary"
                  icon={<ReloadOutlined />}
                  onClick={handleRequest}
                  loading={requestMutation.isPending}
                >
                  Try Again
                </Button>
                <Button variant="text" onClick={onClose}>
                  Cancel
                </Button>
              </Space>
            )
          }
        />
      );
    }

    // Processing (includes 'queued' state — job is queued but not started yet)
    // Prefer WebSocket progress; fall back to polling data when WS events haven't arrived yet
    const wsProgress = progressPercent ?? 0;
    const pollingProgress = jobStatus?.progress ?? 0;
    const displayPercent = wsProgress > 0 ? wsProgress : pollingProgress;
    const displayStage = jobStatus?.stage ?? stageLabel ?? (s === 'idle' ? 'Waiting for job...' : 'Processing...');
    const stageText = SUBTITLE_STAGE_LABELS[displayStage] ?? displayStage;

    return (
      <div className="text-center py-4">
        <Progress
          type="circle"
          percent={Math.round(displayPercent)}
          size={120}
          strokeColor={{
            '0%': '#6366f1',
            '100%': '#8b5cf6',
          }}
        />
        <div className="mt-6">
          <Text strong className="text-lg">{stageText}</Text>
          <Text className="block text-gray-500 mt-1 text-sm">
            {displayPercent > 0
              ? `${displayPercent.toFixed(0)}% complete`
              : jobStatus
              ? 'Processing...'
              : 'Waiting in queue...'}
            {jobStatus?.retryCount && jobStatus.retryCount > 0
              ? ` — retry ${jobStatus.retryCount}/3`
              : ''}
          </Text>
          {!isConnected && (
            <Text type="warning" className="block mt-2 text-xs">
              Real-time updates unavailable — reconnecting...
            </Text>
          )}
          {/* Watch while processing CTA */}
          <div className="mt-4 pt-4 border-t border-gray-700">
            <Button
              type="link"
              icon={<PlayCircleOutlined />}
              onClick={() => {
                if (resolvedJobId) {
                  const params = new URLSearchParams({
                    jobId: resolvedJobId,
                    videoId,
                    title: videoTitle ?? videoId,
                    thumbnail: videoThumbnail ?? '',
                  });
                  router.push(`/waiting?${params.toString()}`);
                }
              }}
              disabled={!resolvedJobId}
              className="text-sky-400 hover:text-sky-300 text-sm"
            >
              Watch short videos while processing
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title="AI Subtitle Generation"
      width={420}
      centered
      maskClosable={status() !== 'processing'}
    >
      <div className="py-2">{renderContent()}</div>
    </Modal>
  );
}
