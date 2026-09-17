import React, { useState, useEffect } from 'react';
import { AccountSelector } from '../components/AccountSelector';
import { ImageUploader } from '../components/ImageUploader';
import { ImageGrid } from '../components/ImageGrid';
import { CaptionEditor } from '../components/CaptionEditor';
import { CarouselPreview } from '../components/CarouselPreview';
import { PublishButton } from '../components/PublishButton';
import { MediaEditorModal } from '../components/MediaEditorModal';
import { PublicLinksModal } from '../components/PublicLinksModal';
import type { ImageItem, HealthResponse, PublishResponse, AccountItem } from '../types';
import { getHealth, getAccounts, createJob, publishJob, uploadForPublicLinks, type PublicMediaLinkItem } from '../services/api';
import {
  Server,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Link2,
  Loader2,
} from 'lucide-react';

export const Home: React.FC = () => {
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
        // Fallback to initial hardcoded accounts
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

  const handleEditImage = (item: ImageItem) => {
    setEditingItem(item);
  };

  const handleSaveEditedImage = (updatedItem: ImageItem) => {
    setImages((prev) =>
      prev.map((img) => (img.id === updatedItem.id ? updatedItem : img))
    );
    setPublishResult(null);
    setPublishError(null);
  };
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
      {/* Tactical Hero Banner matching gowthamlinux */}
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
                CONTINUOUS 9:16 TRANSCODING &bull; MULTI-ACCOUNT WEBHOOKS &bull; CAROUSEL DEPLOYMENTS
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
                  Instagram Business carousel payload verified and executed via Webhook.
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
                <span className="text-gray-500">MAKE_EXECUTION:</span>{' '}
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
              UPLOAD PHOTOS &amp; VIDEOS
            </h2>
          </div>
          <span className="text-[11px] text-gray-400 hidden sm:inline font-mono">
            [LIMIT: 2 TO 10 SLIDES]
          </span>
        </div>
        <ImageUploader
          disabled={isPublishing}
          currentCount={images.length}
          onImagesAdded={handleImagesAdded}
        />
      </section>

      {/* Reordering Grid */}
      <ImageGrid
        images={images}
        onRemove={handleRemoveImage}
        onMove={handleMoveImage}
        onReorder={handleReorder}
        onEdit={handleEditImage}
        onClearAll={handleClearAll}
      />

      {/* 3. Caption & Hashtag Input */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 font-mono">
          <span className="text-yellow-400 font-bold text-xs">// 03.</span>
          <h2 className="text-xs sm:text-sm font-bold tracking-wider text-gray-200 uppercase font-orbitron">
            CAPTION &amp; METADATA
          </h2>
        </div>
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
        <div className="flex items-center gap-2 font-mono">
          <span className="text-yellow-400 font-bold text-xs">// 04.</span>
          <h2 className="text-xs sm:text-sm font-bold tracking-wider text-gray-200 uppercase font-orbitron">
            CAROUSEL PREVIEW
          </h2>
        </div>
        <CarouselPreview
          images={images}
          caption={caption}
          hashtags={hashtags}
        />
      </section>

      {/* 5. Publish & Public Links Action (Desktop & Tablet) */}
      <section className="pt-2 space-y-3">
        <div className="flex items-center gap-2 font-mono">
          <span className="text-yellow-400 font-bold text-xs">// 05.</span>
          <h2 className="text-xs sm:text-sm font-bold tracking-wider text-gray-200 uppercase font-orbitron">
            POST ON INSTA
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <PublishButton
              disabled={!canPublish}
              isLoading={isPublishing}
              stageText={stageText}
              isSuccess={publishResult !== null}
              isError={publishError !== null}
              onClick={handlePublish}
            />
          </div>

          <button
            type="button"
            disabled={images.length === 0 || isGeneratingLinks || isPublishing}
            onClick={handleGetPublicLinksOnly}
            className="py-4 px-4 rounded font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all font-orbitron uppercase tracking-wider border border-yellow-400/50 bg-[#0d0f15] hover:bg-yellow-400 hover:text-black text-yellow-400 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation shadow-[0_0_15px_rgba(250,204,21,0.15)]"
            title="Upload media to Supabase and get direct public URLs for manual posting"
          >
            {isGeneratingLinks ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="font-mono">EXPORTING...</span>
              </>
            ) : (
              <>
                <Link2 className="w-4 h-4" />
                <span>GET PUBLIC LINKS ONLY</span>
              </>
            )}
          </button>
        </div>

        {!canPublish && images.length > 0 && !isPublishing && (
          <p className="text-center text-xs text-gray-500 font-mono">
            {!isCountValid
              ? `// SYSTEM STATUS: Instagram requires 2 to 10 slides (current: ${images.length}). "Get Public Links Only" is available for any count.`
              : '// SYSTEM STATUS: Corrupt or unreadable slides must be removed before deployment.'}
          </p>
        )}
      </section>

      {/* Sticky Mobile Bottom Bar for quick thumb access on phones */}
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
              {isPublishing ? <span>POSTING...</span> : <span>POST ON INSTA</span>}
            </button>
          </div>
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
