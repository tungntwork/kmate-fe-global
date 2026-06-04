'use client';

import { useEffect, useCallback } from 'react';
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
  const { progressPercent, stageLabel, error, completed, ready, failed, reset, isConnected, jobCreated } =
    useSubtitleSocket({ videoId, enabled: open });

  const requestMutation = useRequestSubtitle();
  const { data: jobStatus } = useSubtitleJobStatus(
    jobCreated?.jobId ?? requestMutation.data?.jobId ?? null,
  );
  const { data: existingSubtitle } = useSubtitle(videoId);

  // Determine current status
  const status = useCallback((): 'idle' | 'requesting' | 'processing' | 'completed' | 'failed' | 'cached' | 'queued' => {
    if (requestMutation.isPending) return 'requesting';
    if (failed) return 'failed';
    if (jobStatus?.status === 'FAILED') return 'failed';
    if (completed || ready) return 'completed';
    if (requestMutation.data?.status === 'CACHED' || requestMutation.data?.status === 'EXISTS') return 'cached';
    // jobCreated from WebSocket arrives immediately when job is queued on server (before HTTP response)
    if (jobCreated?.jobId) return 'queued';
    if (progressPercent > 0) return 'processing';
    return 'idle';
  }, [requestMutation.isPending, requestMutation.data?.status, requestMutation.data?.jobId, failed, completed, ready, progressPercent, jobCreated?.jobId, jobStatus?.status]);

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

  // When modal opens, re-fetch subtitle status to catch jobs created in previous sessions
  useEffect(() => {
    if (open && !existingSubtitle && !requestMutation.isPending && !requestMutation.data && !jobCreated) {
      handleRequest();
    }
  }, [open, existingSubtitle, requestMutation.isPending, requestMutation.data, jobCreated]);

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
    const displayPercent = progressPercent ?? jobStatus?.progress ?? 0;
    const displayStage = jobStatus?.stage ?? stageLabel ?? (s === 'queued' ? 'Job queued...' : 'Processing...');
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
            {jobStatus
              ? `${jobStatus.progress.toFixed(0)}% complete — ${jobStatus.retryCount > 0 ? `retry ${jobStatus.retryCount}/3` : ''}`
              : `${displayPercent.toFixed(0)}% complete`}
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
                const jobId = requestMutation.data?.jobId;
                if (jobId) {
                  const params = new URLSearchParams({
                    jobId,
                    videoId,
                    title: videoTitle ?? videoId,
                    thumbnail: videoThumbnail ?? '',
                  });
                  window.location.href = `/waiting?${params.toString()}`;
                }
              }}
              disabled={!requestMutation.data?.jobId}
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
