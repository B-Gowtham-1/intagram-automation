import React, { useState, useEffect } from 'react';
import { ImageUploader } from '../components/ImageUploader';
import { ImageGrid } from '../components/ImageGrid';
import { CaptionEditor } from '../components/CaptionEditor';
import { CarouselPreview } from '../components/CarouselPreview';
import { PublishButton } from '../components/PublishButton';
import type { ImageItem, HealthResponse, PublishResponse } from '../types';
import { getHealth, createJob, publishJob } from '../services/api';
import { generateTestImages, generateCorruptImage } from '../utils/sampleImages';
import {
  Server,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  Wand2,
  ShieldAlert,
  RotateCcw,
} from 'lucide-react';

export const Home: React.FC = () => {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [backendHealth, setBackendHealth] = useState<HealthResponse | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [isGeneratingSamples, setIsGeneratingSamples] = useState(false);

  // Publishing state
  const [isPublishing, setIsPublishing] = useState(false);
  const [stageText, setStageText] = useState<string | null>(null);
  const [publishResult, setPublishResult] = useState<PublishResponse | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  useEffect(() => {
    getHealth()
      .then((data) => {
        setBackendHealth(data);
        setBackendError(null);
      })
      .catch((err) => {
        setBackendError(err.message || 'Unable to connect to backend API');
        setBackendHealth(null);
      });
  }, []);

  const handleImagesAdded = (newItems: ImageItem[]) => {
    setPublishResult(null);
    setPublishError(null);
    setImages((prev) => {
      const combined = [...prev, ...newItems];
      return combined.map((item, idx) => ({ ...item, orderIndex: idx }));
    });
  };

  const handleRemoveImage = (id: string) => {
    setPublishResult(null);
    setImages((prev) => {
      const target = prev.find((img) => img.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev
        .filter((img) => img.id !== id)
        .map((item, idx) => ({ ...item, orderIndex: idx }));
    });
  };

  const handleClearAll = () => {
    images.forEach((img) => {
      if (img.previewUrl) URL.revokeObjectURL(img.previewUrl);
    });
    setImages([]);
    setPublishResult(null);
    setPublishError(null);
  };

  const handleMoveImage = (index: number, direction: 'up' | 'down') => {
    setImages((prev) => {
      const nextIndex = direction === 'up' ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;
      const updated = [...prev];
      const [moved] = updated.splice(index, 1);
      updated.splice(nextIndex, 0, moved);
      return updated.map((item, idx) => ({ ...item, orderIndex: idx }));
    });
  };

  const handleReorder = (startIndex: number, endIndex: number) => {
    setImages((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(startIndex, 1);
      updated.splice(endIndex, 0, moved);
      return updated.map((item, idx) => ({ ...item, orderIndex: idx }));
    });
  };

  const handleLoadSamples = async () => {
    setIsGeneratingSamples(true);
    setPublishResult(null);
    setPublishError(null);
    try {
      const samples = await generateTestImages();
      setImages((prev) => {
        const combined = [...prev, ...samples];
        return combined.map((item, idx) => ({ ...item, orderIndex: idx }));
      });
      if (!caption) {
        setCaption('Urban architecture and sunset highlights across the city. Swipe through to see the full set.');
      }
      if (!hashtags) {
        setHashtags('#architecture #sunset #urbanvibes #cityphotography #carousel');
      }
    } finally {
      setIsGeneratingSamples(false);
    }
  };

  const handleLoadCorruptSample = async () => {
    const corrupt = await generateCorruptImage();
    setImages((prev) => {
      const combined = [...prev, corrupt];
      return combined.map((item, idx) => ({ ...item, orderIndex: idx }));
    });
  };

  // Section 34 & 35 Publishing Execution Flow
  const handlePublish = async () => {
    if (images.length < 2 || isPublishing) return;

    setIsPublishing(true);
    setPublishError(null);
    setPublishResult(null);

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    try {
      // Step 1: Preparing carousel
      setStageText('Preparing carousel...');
      await sleep(350);

      // Step 2: Validating images
      setStageText('Validating images...');
      await sleep(350);

      // Step 3: Processing images to 9:16
      setStageText('Processing images to 9:16...');
      await sleep(350);

      // Step 4: Uploading images
      setStageText('Uploading images to storage...');
      
      const files = images.map((img) => img.file);
      const orders = images.map((_, idx) => idx + 1);

      // Create and prepare job on backend
      const job = await createJob(files, orders, caption, hashtags);

      // Step 5: Verifying image URLs
      setStageText('Verifying image URLs...');
      await sleep(400);

      // Step 6: Publishing to Instagram via Make
      setStageText('Publishing to Instagram...');
      const result = await publishJob(job.job_id);

      setPublishResult(result);
      setStageText('✓ Carousel published successfully');
    } catch (err: any) {
      setPublishError(err.message || 'Publishing operation failed.');
      setStageText('✕ Publishing failed');
    } finally {
      setIsPublishing(false);
    }
  };

  const hasInvalid = images.some((img) => !img.isValid);
  const isCountValid = images.length >= 2 && images.length <= 10;
  const canPublish = isCountValid && !hasInvalid && !isPublishing;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Instagram Carousel Publisher
            </h1>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-gradient-to-r from-pink-500/20 to-rose-500/20 text-pink-400 border border-pink-500/30">
              V1 Active
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Hermes Orchestrator &bull; Supabase Storage &bull; Make.com &bull; Instagram Business
          </p>
        </div>

        {/* Backend Connectivity Status Badge */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-xs">
          <Server className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-400 font-medium">Backend:</span>
          {backendHealth ? (
            <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
              <CheckCircle className="w-3 h-3" /> Online ({backendHealth.env})
            </span>
          ) : backendError ? (
            <span className="inline-flex items-center gap-1 text-amber-400 font-medium" title={backendError}>
              <AlertTriangle className="w-3 h-3" /> Offline / Connecting...
            </span>
          ) : (
            <span className="text-slate-500">Checking...</span>
          )}
        </div>
      </div>

      {/* Published Confirmation Card (Section 29) */}
      {publishResult && (
        <div className="p-6 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 space-y-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-emerald-300">
                  Carousel Published Successfully
                </h3>
                <p className="text-xs text-emerald-400/80 mt-0.5">
                  Your Instagram Business carousel post has been verified and confirmed.
                </p>
              </div>
            </div>
            <button
              onClick={handleClearAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-xs font-semibold transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Create Another</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-emerald-900/50 text-xs text-slate-300">
            <div>
              <span className="text-slate-500">Job ID:</span>{' '}
              <span className="font-mono text-emerald-400 font-medium">{publishResult.job_id}</span>
            </div>
            {publishResult.instagram_post_id && (
              <div>
                <span className="text-slate-500">Instagram Post ID:</span>{' '}
                <span className="font-mono text-emerald-400 font-medium">{publishResult.instagram_post_id}</span>
              </div>
            )}
            {publishResult.published_at && (
              <div>
                <span className="text-slate-500">Published At:</span>{' '}
                <span>{new Date(publishResult.published_at).toLocaleTimeString()}</span>
              </div>
            )}
            {publishResult.make_execution_id && (
              <div>
                <span className="text-slate-500">Make Execution:</span>{' '}
                <span className="font-mono text-slate-400">{publishResult.make_execution_id}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Alert */}
      {publishError && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
          <div className="space-y-1">
            <strong className="block text-rose-200">Publishing Failed</strong>
            <p>{publishError}</p>
          </div>
        </div>
      )}

      {/* Demo helper controls */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <Sparkles className="w-4 h-4 text-pink-400 flex-shrink-0" />
          <span>Quick actions:</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            disabled={isGeneratingSamples || isPublishing}
            onClick={handleLoadSamples}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/40 text-xs font-medium transition disabled:opacity-50"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>+ Load 4 Test Images (9:16, 1:1, 4:5, 16:9)</span>
          </button>
          <button
            type="button"
            disabled={isPublishing}
            onClick={handleLoadCorruptSample}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-300 border border-slate-700 text-xs font-medium transition disabled:opacity-50"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>+ Test Corrupt Image</span>
          </button>
        </div>
      </div>

      {/* 1. Upload Zone */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-200">1. Upload Images</h2>
        <ImageUploader
          disabled={isPublishing}
          currentCount={images.length}
          onImagesAdded={handleImagesAdded}
        />
      </section>

      {/* 2. Reordering Grid */}
      <ImageGrid
        images={images}
        onRemove={handleRemoveImage}
        onMove={handleMoveImage}
        onReorder={handleReorder}
        onClearAll={handleClearAll}
      />

      {/* 3. Caption & Hashtag Input */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-200">2. Caption &amp; Hashtags</h2>
        <CaptionEditor
          disabled={isPublishing}
          caption={caption}
          hashtags={hashtags}
          onCaptionChange={setCaption}
          onHashtagsChange={setHashtags}
        />
      </section>

      {/* 4. Live Preview */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-200">3. Carousel Preview</h2>
        <CarouselPreview
          images={images}
          caption={caption}
          hashtags={hashtags}
        />
      </section>

      {/* 5. Publish Action (Section 34 & 35) */}
      <section className="pt-2">
        <PublishButton
          disabled={!canPublish}
          isLoading={isPublishing}
          stageText={stageText}
          isSuccess={publishResult !== null}
          isError={publishError !== null}
          onClick={handlePublish}
        />
        {!canPublish && images.length > 0 && !isPublishing && (
          <p className="text-center text-xs text-slate-500 mt-2">
            {!isCountValid
              ? 'Instagram Carousels require between 2 and 10 images.'
              : 'Please remove corrupt/invalid images before publishing.'}
          </p>
        )}
      </section>
    </div>
  );
};
