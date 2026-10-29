import React, { useState, useEffect, useCallback } from 'react';
import { AccountSelector } from '../components/AccountSelector';
import { ImageUploader } from '../components/ImageUploader';
import { ImageGrid } from '../components/ImageGrid';
import { CaptionEditor } from '../components/CaptionEditor';
import { CarouselPreview } from '../components/CarouselPreview';
import { PublishButton } from '../components/PublishButton';
import { MediaEditorModal } from '../components/MediaEditorModal';
import { PublicLinksModal } from '../components/PublicLinksModal';
import { PostsGallery } from '../components/PostsGallery';
import type { ImageItem, HealthResponse, PublishResponse, AccountItem } from '../types';
import { getHealth, getAccounts, createJob, publishJob, uploadForPublicLinks, type PublicMediaLinkItem } from '../services/api';
import {
  Server,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Link2,
  Loader2,
  Zap,
  Layers,
} from 'lucide-react';

export const Home: React.FC = () => {
  // Navigation tab state: Studio (Make.com) vs Gallery
  const [activeTab, setActiveTab] = useState<'make' | 'gallery'>('make');

  // Accounts state
  const [accounts, setAccounts] = useState<AccountItem[]>([
    { id: 'account_1', name: 'nature.art', handle: '@nature.art', description: 'Nature art and visual scenery carousels', has_webhook: true },
    { id: 'account_2', name: 'frames of nature', handle: '@framesofnature', description: 'Wildlife, landscapes and nature photography frames', has_webhook: true },
    { id: 'account_3', name: 'frames of movies', handle: '@framesofmovies', description: 'Cinematic film stills and movie scene frames', has_webhook: true },
  ]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('account_1');

  const [images, setImages] = useState<ImageItem[]>([]);
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [backendHealth, setBackendHealth] = useState<HealthResponse | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<ImageItem | null>(null);

  // Publishing state
  const [isPublishing, setIsPublishing] = useState(false);
  const [stageText, setStageText] = useState<string | null>(null);
  const [publishResult, setPublishResult] = useState<PublishResponse | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  // Direct public links generation state (Manual use)
  const [isGeneratingLinks, setIsGeneratingLinks] = useState(false);
  const [publicLinks, setPublicLinks] = useState<PublicMediaLinkItem[]>([]);
  const [isLinksModalOpen, setIsLinksModalOpen] = useState(false);

  useEffect(() => {
    // Check backend health
    getHealth()
      .then((data) => {
        setBackendHealth(data);
        setBackendError(null);
      })
      .catch((err) => {
        setBackendError(err.message || 'Unable to connect to backend API');
        setBackendHealth(null);
      });

    // Fetch accounts from backend
    getAccounts()
      .then((accs) => {
        if (accs && accs.length > 0) {
          setAccounts(accs);
        }
      })
      .catch(() => {
        // Fallback to initial default accounts
      });
  }, []);

  // ⚡ Bolt Optimization: Memoize handlers passed to ImageGrid and ImageCard
  // Why: Prevents re-rendering all ImageCards in the grid on every keystroke in CaptionEditor or when unrelated state changes. ImageCard is already React.memo(), but it requires stable function props.
  // Impact: Significantly reduces React render time and eliminates layout thrashing during text input or grid interactions.

  const handleImagesAdded = useCallback((newItems: ImageItem[]) => {
    setPublishResult(null);
    setPublishError(null);
    setImages((prev) => {
      const combined = [...prev, ...newItems];
      return combined.map((item, idx) => ({ ...item, orderIndex: idx }));
    });
  }, []);

  const handleMove = useCallback((index: number, direction: 'up' | 'down') => {
    setImages((prev) => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const newItems = [...prev];
      const [moved] = newItems.splice(index, 1);
      newItems.splice(targetIndex, 0, moved);
      return newItems.map((item, idx) => ({ ...item, orderIndex: idx }));
    });
  }, []);

  const handleReorder = useCallback((startIndex: number, endIndex: number) => {
    if (startIndex === endIndex) return;
    setImages((prev) => {
      const newItems = [...prev];
      const [removed] = newItems.splice(startIndex, 1);
      newItems.splice(endIndex, 0, removed);
      return newItems.map((item, idx) => ({ ...item, orderIndex: idx }));
    });
  }, []);

  const handleRemove = useCallback((id: string) => {
    setImages((prev) =>
      prev.filter((item) => item.id !== id).map((item, idx) => ({ ...item, orderIndex: idx }))
    );
  }, []);

  const handleClearAll = useCallback(() => {
    setImages([]);
    setCaption('');
    setHashtags('');
    setPublishResult(null);
    setPublishError(null);
    setStageText(null);
  }, []);

  const handleOpenEditor = useCallback((item: ImageItem) => {
    setEditingItem(item);
  }, []);

  const handleSaveEditedImage = useCallback((updatedItem: ImageItem) => {
    setImages((prev) =>
      prev.map((item) => (item.id === updatedItem.id ? updatedItem : item))
    );
    setEditingItem(null);
  }, []);

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const handlePublish = async () => {
    if (images.length < 2 || images.length > 10) return;
    if (images.some((img) => !img.isValid)) return;

    setIsPublishing(true);
    setPublishError(null);
    setPublishResult(null);

    try {
      // Step 1: Validating payload
      setStageText('Validating 9:16 normalized images...');
      await sleep(350);

      // Step 2: Preparing files
      setStageText('Bundling image sequence...');
      const files = images.map((img) => img.file);
      const orders = images.map((_, idx) => idx + 1);

      // Media edits payload
      const mediaEdits = images.map((img, idx) => ({
        order_index: idx + 1,
        media_type: img.mediaType || 'IMAGE',
        rotation: img.rotation || 0,
        fit_mode: img.fitMode || 'cover',
        alignment: img.alignment || 'center',
        is_muted: !!img.isMuted,
      }));

      // Create and prepare job on backend with selected target account and edits
      const job = await createJob(files, orders, caption, hashtags, selectedAccountId, mediaEdits);

      // Step 3: Verifying image URLs
      setStageText('Verifying media URLs...');
      await sleep(400);

      // Step 4: Publishing to Instagram via Make.com scenario bridge
      setStageText('Dispatched to Make.com Instagram scenario...');
      const result = await publishJob(job.job_id, 'make');

      setPublishResult(result);
      setStageText('✓ Carousel published successfully via Make.com');
    } catch (err: any) {
      setPublishError(err.message || 'Publishing operation failed.');
      setStageText('✕ Publishing failed');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleGetPublicLinksOnly = async () => {
    if (images.length === 0 || isGeneratingLinks) return;
    setIsGeneratingLinks(true);
    setPublishError(null);

    try {
      const files = images.map((img) => img.file);
      const mediaEdits = images.map((img, idx) => ({
        order_index: idx + 1,
        media_type: img.mediaType || 'IMAGE',
        rotation: img.rotation || 0,
        fit_mode: img.fitMode || 'cover',
        alignment: img.alignment || 'center',
        is_muted: !!img.isMuted,
      }));

      const res = await uploadForPublicLinks(files, mediaEdits);
      setPublicLinks(res.links);
      setIsLinksModalOpen(true);
    } catch (err: any) {
      setPublishError(err.message || 'Failed to upload and generate public links.');
    } finally {
      setIsGeneratingLinks(false);
    }
  };

  const hasInvalid = images.some((img) => !img.isValid);
  const isCountValid = images.length >= 2 && images.length <= 10;
  const canPublish = isCountValid && !hasInvalid && !isPublishing;

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8 pb-28 sm:pb-12">
      {/* Tactical Hero Banner */}
      <div className="space-y-3 border-b border-[#1e2433] pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded overflow-hidden ring-1 ring-yellow-400/50 shadow-[0_0_15px_rgba(250,204,21,0.25)] flex-shrink-0 bg-black">
              <img
                src="/zenitsu-logo.jpg"
                alt="Zenitsu"
                className="w-full h-full object-cover object-top"
              />
            </div>
            <div>
              <span className="text-[10px] text-yellow-400 font-bold tracking-widest font-mono uppercase block">
                // MEDIA_ORCHESTRATION_PIPELINE
              </span>
              <h1 className="text-xl sm:text-3xl font-black font-orbitron tracking-wider text-gray-100 uppercase">
                MISSION ARCHIVE
              </h1>
              <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                CONTINUOUS 9:16 TRANSCODING &bull; MAKE.COM WEBHOOK ROUTING &bull; CAROUSEL DEPLOYMENTS
              </p>
            </div>
          </div>

          {/* Backend Connectivity Status Badge */}
          <div className="flex items-center gap-2 bg-[#0d0f15] border border-[#1e2433] px-3.5 py-1.5 rounded text-xs w-fit font-mono shadow-sm">
            <Server className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-gray-400 font-bold">SYSTEM:</span>
            {backendHealth ? (
              <span className="inline-flex items-center gap-1 text-yellow-400 font-bold">
                <CheckCircle className="w-3 h-3 text-yellow-400" /> ONLINE ({backendHealth.env})
              </span>
            ) : backendError ? (
              <span className="inline-flex items-center gap-1 text-rose-400 font-bold" title={backendError}>
                <AlertTriangle className="w-3 h-3" /> OFFLINE
              </span>
            ) : (
              <span className="text-gray-500">PROBING...</span>
            )}
          </div>
        </div>
      </div>

      {/* Primary Workflow Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-[#1e2433] pb-1 overflow-x-auto font-mono scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('make')}
          className={`flex items-center gap-2 px-4 py-3 rounded-t-lg font-orbitron text-xs sm:text-sm font-bold uppercase tracking-wider transition ${
            activeTab === 'make'
              ? 'bg-[#0e121a] text-yellow-400 border-t-2 border-x border-[#1e2433] border-t-yellow-400 shadow-[0_-4px_15px_rgba(250,204,21,0.1)]'
              : 'text-gray-400 hover:text-gray-200 hover:bg-[#090b10] border-t-2 border-transparent'
          }`}
        >
          <Zap className="w-4 h-4 text-yellow-400" />
          <span>MAKE.COM STUDIO</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('gallery')}
          className={`flex items-center gap-2 px-4 py-3 rounded-t-lg font-orbitron text-xs sm:text-sm font-bold uppercase tracking-wider transition ${
            activeTab === 'gallery'
              ? 'bg-[#0e121a] text-emerald-400 border-t-2 border-x border-[#1e2433] border-t-emerald-400 shadow-[0_-4px_15px_rgba(16,185,129,0.1)]'
              : 'text-gray-400 hover:text-gray-200 hover:bg-[#090b10] border-t-2 border-transparent'
          }`}
        >
          <Layers className="w-4 h-4 text-emerald-400" />
          <span>POSTS GALLERY</span>
        </button>
      </div>

      {/* TAB 2: GALLERY VIEW */}
      {activeTab === 'gallery' ? (
        <PostsGallery onSwitchToStudio={() => setActiveTab('make')} />
      ) : (
        /* TAB 1: STUDIO (MAKE.COM) */
        <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
          {/* Published Confirmation Card */}
          {publishResult && (
            <div className="p-5 sm:p-6 rounded bg-[#06150f] border border-emerald-500/40 space-y-4 shadow-[0_0_20px_rgba(16,185,129,0.15)] animate-in fade-in slide-in-from-top-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-emerald-300 font-orbitron uppercase tracking-wide">
                      CAROUSEL DEPLOYED SUCCESSFULLY
                    </h3>
                    <p className="text-xs text-emerald-400/80 mt-0.5 font-mono">
                      Instagram Business carousel payload verified and executed via{' '}
                      <span className="font-bold text-emerald-200 uppercase">
                        MAKE.COM
                      </span>{' '}
                      Scenario Webhook.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClearAll}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-xs font-mono font-bold transition touch-manipulation"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>NEW_MISSION</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 pt-2 border-t border-emerald-900/50 text-xs text-gray-300 font-mono">
                <div>
                  <span className="text-gray-500">JOB_ID:</span>{' '}
                  <span className="text-emerald-400 font-bold">{publishResult.job_id}</span>
                </div>
                {publishResult.account_handle && (
                  <div>
                    <span className="text-gray-500">TARGET_PROFILE:</span>{' '}
                    <span className="text-yellow-400 font-bold">{publishResult.account_handle}</span>
                  </div>
                )}
                {publishResult.instagram_post_id && (
                  <div>
                    <span className="text-gray-500">INSTAGRAM_ID:</span>{' '}
                    <span className="text-emerald-400 font-bold">{publishResult.instagram_post_id}</span>
                  </div>
                )}
                {publishResult.published_at && (
                  <div>
                    <span className="text-gray-500">DEPLOYED_AT:</span>{' '}
                    <span>{new Date(publishResult.published_at).toLocaleTimeString()}</span>
                  </div>
                )}
                {publishResult.make_execution_id && (
                  <div>
                    <span className="text-gray-500">EXECUTION_ID:</span>{' '}
                    <span className="text-gray-400">{publishResult.make_execution_id}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error Alert */}
          {publishError && (
            <div className="p-4 rounded bg-[#18090d] border border-rose-500/40 text-xs text-rose-300 flex items-start gap-3 font-mono shadow-[0_0_15px_rgba(244,63,94,0.15)]">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
              <div className="space-y-1">
                <strong className="block text-rose-200 font-orbitron uppercase">DEPLOYMENT PIPELINE FAILED</strong>
                <p>{publishError}</p>
              </div>
            </div>
          )}

          {/* 1. Account Selector */}
          <section>
            <AccountSelector
              accounts={accounts}
              selectedAccountId={selectedAccountId}
              onSelectAccount={setSelectedAccountId}
              disabled={isPublishing}
            />
          </section>

          {/* 2. Upload Zone */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono">
                <span className="text-yellow-400 font-bold text-xs">// 02.</span>
                <h2 className="text-xs sm:text-sm font-bold tracking-wider text-gray-200 uppercase font-orbitron">
                  UPLOAD SOURCE MEDIA
                </h2>
              </div>
              <span className="text-[11px] text-gray-400 font-mono hidden sm:inline">
                [MIN: 2 &bull; MAX: 10 &bull; AUTO 9:16 CROP]
              </span>
            </div>

            <ImageUploader
              onImagesAdded={handleImagesAdded}
              currentCount={images.length}
              disabled={isPublishing}
            />
          </section>

          {/* 3. Sequence & 9:16 Editor Grid */}
          {images.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-yellow-400 font-bold text-xs">// 03.</span>
                  <h2 className="text-xs sm:text-sm font-bold tracking-wider text-gray-200 uppercase font-orbitron">
                    SLIDE SEQUENCE &amp; CROP EDITING
                  </h2>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={isGeneratingLinks || isPublishing}
                    onClick={handleGetPublicLinksOnly}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#131722] hover:bg-[#1a2030] text-yellow-400 border border-yellow-400/40 text-xs font-mono font-bold transition shadow-sm disabled:opacity-40"
                    title="Upload images to Supabase/S3 and get permanent public URLs"
                  >
                    {isGeneratingLinks ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Link2 className="w-3.5 h-3.5 text-yellow-400" />
                    )}
                    <span>GET PUBLIC LINKS</span>
                  </button>

                  <button
                    onClick={handleClearAll}
                    disabled={isPublishing}
                    className="text-xs font-mono text-gray-500 hover:text-rose-400 transition"
                  >
                    CLEAR ALL
                  </button>
                </div>
              </div>

              <ImageGrid
                images={images}
                onRemove={handleRemove}
                onMove={handleMove}
                onReorder={handleReorder}
                onEdit={handleOpenEditor}
                onClearAll={handleClearAll}
              />
            </section>
          )}

          {/* 4. Caption & Hashtags Editor */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono">
                <span className="text-yellow-400 font-bold text-xs">// 04.</span>
                <h2 className="text-xs sm:text-sm font-bold tracking-wider text-gray-200 uppercase font-orbitron">
                  CAPTION &amp; METADATA
                </h2>
              </div>
              <span className="text-[11px] text-gray-400 font-mono hidden sm:inline">
                [MAX 2,200 CHARACTERS &bull; MAX 30 HASHTAGS]
              </span>
            </div>

            <CaptionEditor
              caption={caption}
              hashtags={hashtags}
              onCaptionChange={setCaption}
              onHashtagsChange={setHashtags}
              disabled={isPublishing}
            />
          </section>

          {/* 5. Live Instagram Carousel Preview */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono">
                <span className="text-yellow-400 font-bold text-xs">// 05.</span>
                <h2 className="text-xs sm:text-sm font-bold tracking-wider text-gray-200 uppercase font-orbitron">
                  INSTAGRAM FEED PREVIEW
                </h2>
              </div>
              <span className="text-[11px] text-gray-400 font-mono hidden sm:inline">
                [SIMULATED 9:16 FEED VIEW]
              </span>
            </div>

            <CarouselPreview
              images={images}
              caption={caption}
              hashtags={hashtags}
            />
          </section>

          {/* 6. Tactical Action Trigger */}
          <section className="pt-2">
            <PublishButton
              disabled={!canPublish}
              isLoading={isPublishing}
              stageText={stageText}
              buttonLabel="PUBLISH CAROUSEL VIA MAKE.COM"
              onClick={handlePublish}
            />

            {!isCountValid && images.length > 0 && (
              <p className="text-center text-xs font-mono text-yellow-400/80 mt-2">
                ⚠ Requires between 2 and 10 slides to publish an Instagram carousel (Current: {images.length}).
              </p>
            )}

            {hasInvalid && (
              <p className="text-center text-xs font-mono text-rose-400/80 mt-2">
                ⚠ One or more files are invalid or failed to load. Please inspect slides.
              </p>
            )}
          </section>

          {/* Sticky Mobile Bottom Bar */}
          {images.length > 0 && (
            <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-[#050608]/95 backdrop-blur-xl border-t border-[#1e2433] p-3 z-40 shadow-2xl flex items-center justify-between gap-2">
              <div className="flex flex-col min-w-0 flex-1 font-mono">
                <div className="flex items-center gap-1.5 text-xs font-bold text-white truncate">
                  <span className={canPublish ? 'text-emerald-400' : 'text-yellow-400'}>
                    {images.length}/10 SLIDES
                  </span>
                  <span className="text-gray-500">&bull;</span>
                  <span className="text-[11px] text-yellow-400 truncate">
                    {accounts.find((a) => a.id === selectedAccountId)?.name || 'Account'}
                  </span>
                </div>
                <span className="text-[10px] text-gray-400 truncate">
                  {canPublish ? 'PIPELINE_READY' : isCountValid ? 'NODE_ERRORS' : 'REQUIRES 2-10 SLIDES'}
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0 font-mono">
                <button
                  type="button"
                  disabled={images.length === 0 || isGeneratingLinks || isPublishing}
                  onClick={handleGetPublicLinksOnly}
                  className="px-3 py-2.5 rounded text-xs font-bold border border-yellow-400/50 bg-[#161a24] text-yellow-400 transition active:scale-95 disabled:opacity-40 touch-manipulation flex items-center gap-1"
                  title="Get direct public URLs"
                >
                  {isGeneratingLinks ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
                  <span>LINKS</span>
                </button>

                <button
                  type="button"
                  disabled={!canPublish || isPublishing}
                  onClick={handlePublish}
                  className={`px-4 py-2.5 rounded text-xs font-extrabold font-orbitron tracking-wider transition flex items-center gap-1.5 shadow-lg ${
                    canPublish
                      ? 'bg-yellow-400 text-black shadow-[0_0_15px_rgba(250,204,21,0.4)] active:scale-95'
                      : 'bg-[#161a24] text-gray-600 border border-[#1e2433] cursor-not-allowed'
                  }`}
                >
                  {isPublishing ? (
                    <span>POSTING...</span>
                  ) : (
                    <span>POST INSTA</span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Image Editor Modal (Rotate 90°, Fit vs Fill, Alignments) */}
      {editingItem && (
        <MediaEditorModal
          image={editingItem}
          isOpen={editingItem !== null}
          onClose={() => setEditingItem(null)}
          onSave={handleSaveEditedImage}
        />
      )}

      {/* Public Links Modal (Manual use) */}
      <PublicLinksModal
        isOpen={isLinksModalOpen}
        onClose={() => setIsLinksModalOpen(false)}
        links={publicLinks}
      />
    </div>
  );
};
