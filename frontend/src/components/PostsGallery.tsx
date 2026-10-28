import React, { useState, useEffect, useMemo } from 'react';
import type { JobResponse } from '../types';
import { getJobs } from '../services/api';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Search,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
  Copy,
  Check,
  Layers,
  Sparkles,
  Filter,
  Film,
  Image as ImageIcon,
} from 'lucide-react';

const InstagramIcon: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
  </svg>
);


interface PostsGalleryProps {
  onSwitchToStudio?: () => void;
}

export const PostsGallery: React.FC<PostsGalleryProps> = ({ onSwitchToStudio }) => {
  const [jobs, setJobs] = useState<JobResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAccountFilter, setSelectedAccountFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');

  // Lightbox Modal state
  const [activeJobForLightbox, setActiveJobForLightbox] = useState<JobResponse | null>(null);
  const [lightboxSlideIndex, setLightboxSlideIndex] = useState(0);

  // Copy feedback state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchJobsList = () => {
    setIsLoading(true);
    setError(null);
    getJobs(50)
      .then((data) => {
        setJobs(data || []);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load posts gallery');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchJobsList();
  }, []);

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Grouping logic: group jobs by calendar date string
  const groupedJobs = useMemo(() => {
    // 1. Filter jobs
    const filtered = jobs.filter((job) => {
      // Account filter
      if (selectedAccountFilter !== 'ALL') {
        const acc = (job.account_id || '').toLowerCase();
        const handle = (job.account_handle || '').toLowerCase();
        const target = selectedAccountFilter.toLowerCase();
        if (!acc.includes(target) && !handle.includes(target)) {
          return false;
        }
      }

      // Status filter
      if (selectedStatusFilter !== 'ALL') {
        if (job.status !== selectedStatusFilter) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const caption = (job.final_caption || job.caption || '').toLowerCase();
        const handle = (job.account_handle || '').toLowerCase();
        const postId = (job.instagram_post_id || '').toLowerCase();
        const jobId = (job.job_id || '').toLowerCase();
        return (
          caption.includes(query) ||
          handle.includes(query) ||
          postId.includes(query) ||
          jobId.includes(query)
        );
      }

      return true;
    });

    // 2. Group by Date
    const groups: { [dateKey: string]: { label: string; dateObj: Date; items: JobResponse[] } } = {};
    const todayStr = new Date().toDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    filtered.forEach((job) => {
      const dateStr = job.published_at || job.created_at || new Date().toISOString();
      const dateObj = new Date(dateStr);
      const calendarKey = dateObj.toDateString();

      let label = dateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      if (calendarKey === todayStr) {
        label = `TODAY • ${dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      } else if (calendarKey === yesterdayStr) {
        label = `YESTERDAY • ${dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      }

      if (!groups[calendarKey]) {
        groups[calendarKey] = {
          label,
          dateObj,
          items: [],
        };
      }
      groups[calendarKey].items.push(job);
    });

    // Sort groups descending by date
    return Object.values(groups).sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
  }, [jobs, selectedAccountFilter, selectedStatusFilter, searchQuery]);

  const openLightbox = (job: JobResponse, slideIdx: number = 0) => {
    setActiveJobForLightbox(job);
    setLightboxSlideIndex(slideIdx);
  };

  const closeLightbox = () => {
    setActiveJobForLightbox(null);
    setLightboxSlideIndex(0);
  };

  const nextLightboxSlide = () => {
    if (!activeJobForLightbox) return;
    setLightboxSlideIndex((prev) => (prev + 1) % (activeJobForLightbox.images.length || 1));
  };

  const prevLightboxSlide = () => {
    if (!activeJobForLightbox) return;
    setLightboxSlideIndex((prev) =>
      prev === 0 ? (activeJobForLightbox.images.length || 1) - 1 : prev - 1
    );
  };

  // Keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeJobForLightbox) return;
      if (e.key === 'ArrowRight') nextLightboxSlide();
      if (e.key === 'ArrowLeft') prevLightboxSlide();
      if (e.key === 'Escape') closeLightbox();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeJobForLightbox]);

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e2433] pb-6">
        <div>
          <div className="flex items-center gap-2 font-mono">
            <span className="text-yellow-400 font-bold text-xs">// ARCHIVED_MISSIONS</span>
            <span className="text-[10px] text-gray-500 bg-[#121622] px-2 py-0.5 rounded border border-[#1e2433]">
              {jobs.length} CAROUSEL POSTS RECORDED
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black font-orbitron tracking-wider text-gray-100 uppercase mt-1">
            INSTAGRAM POSTS GALLERY
          </h2>
          <p className="text-xs text-gray-400 font-mono mt-0.5">
            Every published 9:16 carousel post grouped chronologically with slide reels &amp; live Instagram IDs.
          </p>
        </div>

        {/* Actions & Refresh */}
        <div className="flex items-center gap-2">
          <button
            onClick={fetchJobsList}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded bg-[#0d0f15] hover:bg-[#161a24] text-gray-300 border border-[#1e2433] hover:border-yellow-400/40 text-xs font-mono font-bold transition shadow-sm"
            title="Refresh posts from database"
          >
            <RotateCcw className={`w-3.5 h-3.5 text-yellow-400 ${isLoading ? 'animate-spin' : ''}`} />
            <span>REFRESH</span>
          </button>

          {onSwitchToStudio && (
            <button
              onClick={onSwitchToStudio}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded bg-yellow-400 hover:bg-yellow-300 text-black text-xs font-mono font-bold transition shadow-[0_0_15px_rgba(250,204,21,0.2)]"
            >
              <Sparkles className="w-3.5 h-3.5 text-black" />
              <span>NEW POST</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#0b0e14] border border-[#1e2433] rounded-lg p-3 sm:p-4 space-y-3 font-mono shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by caption, account, or Instagram Post ID..."
              className="w-full bg-[#06080d] border border-[#1e2433] focus:border-yellow-400/60 rounded pl-9 pr-3 py-2 text-xs text-gray-200 placeholder-gray-600 outline-none transition"
            />
          </div>

          {/* Account Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
            <span className="text-gray-500 text-[11px] flex items-center gap-1">
              <Filter className="w-3 h-3 text-yellow-400" /> ACCOUNT:
            </span>
            {['ALL', 'nature.art', 'framesofnature', 'framesofmovies'].map((acc) => (
              <button
                key={acc}
                onClick={() => setSelectedAccountFilter(acc)}
                className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase transition whitespace-nowrap ${
                  selectedAccountFilter === acc
                    ? 'bg-yellow-400 text-black shadow-sm font-extrabold'
                    : 'bg-[#141824] text-gray-400 hover:text-gray-200 border border-[#1e2433]'
                }`}
              >
                {acc === 'ALL' ? 'ALL ACCOUNTS' : `@${acc}`}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
            <span className="text-gray-500 text-[11px] flex items-center gap-1">
              STATUS:
            </span>
            {['ALL', 'PUBLISHED', 'READY', 'FAILED'].map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatusFilter(st)}
                className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase transition whitespace-nowrap ${
                  selectedStatusFilter === st
                    ? 'bg-yellow-400 text-black shadow-sm font-extrabold'
                    : 'bg-[#141824] text-gray-400 hover:text-gray-200 border border-[#1e2433]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded bg-[#18090d] border border-rose-500/40 text-xs text-rose-300 flex items-center gap-3 font-mono">
          <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Gallery Content */}
      {isLoading && jobs.length === 0 ? (
        <div className="py-20 text-center space-y-3 font-mono text-gray-500">
          <RotateCcw className="w-8 h-8 text-yellow-400 animate-spin mx-auto opacity-70" />
          <p className="text-xs uppercase tracking-widest text-gray-400">
            Scanning mission database &amp; loading carousels...
          </p>
        </div>
      ) : groupedJobs.length === 0 ? (
        <div className="py-16 text-center space-y-4 rounded-xl border border-dashed border-[#1e2433] bg-[#07090e] p-8">
          <div className="w-12 h-12 rounded-full bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center mx-auto text-yellow-400">
            <Layers className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-orbitron font-bold text-gray-200 uppercase tracking-wider text-sm">
              NO POSTS FOUND
            </h3>
            <p className="text-xs text-gray-500 font-mono max-w-sm mx-auto">
              {searchQuery || selectedAccountFilter !== 'ALL'
                ? 'No carousel posts match your current search or filter criteria.'
                : 'You have not published any carousels yet. Upload photos/videos in the Studio to deploy your first carousel!'}
            </p>
          </div>
          {onSwitchToStudio && (
            <button
              onClick={onSwitchToStudio}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-yellow-400 hover:bg-yellow-300 text-black text-xs font-mono font-bold transition shadow-md"
            >
              <span>CREATE FIRST POST</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {groupedJobs.map((group) => (
            <div key={group.label} className="space-y-4">
              {/* Date Group Header */}
              <div className="sticky top-16 z-20 flex items-center gap-2.5 bg-[#050608]/95 backdrop-blur-md py-2 border-b border-[#1e2433]">
                <Calendar className="w-4 h-4 text-yellow-400" />
                <h3 className="font-orbitron font-bold text-xs sm:text-sm text-yellow-400 tracking-wider uppercase">
                  {group.label}
                </h3>
                <span className="text-[10px] font-mono text-gray-400 bg-[#121622] px-2 py-0.5 rounded border border-[#1e2433]">
                  {group.items.length} {group.items.length === 1 ? 'POST' : 'POSTS'}
                </span>
              </div>

              {/* Grid of Post Cards in this Date Group */}
              <div className="grid grid-cols-1 gap-6">
                {group.items.map((job) => {
                  const dateObj = new Date(job.published_at || job.created_at || '');
                  const formattedTime = !isNaN(dateObj.getTime())
                    ? dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                    : 'RECENT';

                  const isPublished = job.status === 'PUBLISHED';
                  const isFailed = job.status === 'FAILED';

                  return (
                    <div
                      key={job.job_id}
                      className="group rounded-xl bg-[#090c12] border border-[#1b2230] hover:border-yellow-400/40 p-4 sm:p-5 transition-all duration-300 shadow-md hover:shadow-[0_4px_25px_rgba(250,204,21,0.06)] flex flex-col gap-4"
                    >
                      {/* Top Bar: Time, Instagram Account, Status, Post ID */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#161d2a] pb-3 text-xs font-mono">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                          {/* Time Badge */}
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#101420] text-gray-300 font-bold border border-[#1e2638]">
                            <Clock className="w-3.5 h-3.5 text-yellow-400" />
                            <span>{formattedTime}</span>
                          </div>

                          {/* Account Pill */}
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-yellow-400/10 text-yellow-400 font-bold border border-yellow-400/30">
                            <InstagramIcon className="w-3.5 h-3.5 text-yellow-400" />
                            <span>{job.account_handle || `@${job.account_id}`}</span>
                          </div>

                          {/* Slide Count Pill */}
                          <div className="inline-flex items-center gap-1 text-[11px] text-gray-400 bg-[#101420] px-2 py-1 rounded border border-[#1e2638]">
                            <Layers className="w-3 h-3 text-yellow-400" />
                            <span>
                              {job.images.length || job.image_count} SLIDES
                            </span>
                          </div>
                        </div>

                        {/* Status & Instagram ID */}
                        <div className="flex items-center gap-2">
                          {job.instagram_post_id && (
                            <button
                              onClick={() =>
                                handleCopyText(job.instagram_post_id!, `post_${job.job_id}`)
                              }
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-black/60 hover:bg-black text-[11px] text-gray-300 border border-[#1e2638] transition font-mono"
                              title="Click to copy Instagram Post ID"
                            >
                              <span className="text-gray-500">IG:</span>
                              <span className="text-emerald-400 font-bold">
                                {job.instagram_post_id.slice(-8)}
                              </span>
                              {copiedId === `post_${job.job_id}` ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3 text-gray-500" />
                              )}
                            </button>
                          )}

                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold font-mono uppercase tracking-wider ${
                              isPublished
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.15)]'
                                : isFailed
                                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/40'
                                : 'bg-yellow-400/15 text-yellow-400 border border-yellow-400/40'
                            }`}
                          >
                            {isPublished && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                            {isFailed && <AlertTriangle className="w-3 h-3 text-rose-400" />}
                            {job.status}
                          </span>
                        </div>
                      </div>

                      {/* Middle: Horizontal Interactive Slide Reel */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-mono text-gray-400">
                          <span className="text-yellow-400 font-bold">
                            // 9:16 CAROUSEL SLIDES GROUP ({job.images.length || job.image_count})
                          </span>
                          <button
                            onClick={() => openLightbox(job, 0)}
                            className="inline-flex items-center gap-1 text-gray-400 hover:text-yellow-400 transition"
                          >
                            <Maximize2 className="w-3 h-3" />
                            <span>INSPECT CAROUSEL</span>
                          </button>
                        </div>

                        {/* Slide Thumbnails Reel */}
                        <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-[#1e2433]">
                          {job.images && job.images.length > 0 ? (
                            job.images.map((img, idx) => {
                              const isVideo = img.media_type === 'VIDEO';
                              return (
                                <div
                                  key={img.order_index || idx}
                                  onClick={() => openLightbox(job, idx)}
                                  className="relative group/slide flex-shrink-0 w-24 h-40 sm:w-28 sm:h-48 rounded-lg overflow-hidden bg-black border border-[#1e2433] hover:border-yellow-400 cursor-pointer transition-all duration-200 transform hover:scale-[1.03] shadow-sm"
                                  title={`Click to preview slide #${img.order_index}`}
                                >
                                  {isVideo ? (
                                    <div className="w-full h-full relative bg-gray-950 flex items-center justify-center">
                                      <video
                                        src={img.public_url}
                                        muted
                                        playsInline
                                        preload="metadata"
                                        className="w-full h-full object-cover"
                                      />
                                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                        <Film className="w-6 h-6 text-yellow-400" />
                                      </div>
                                    </div>
                                  ) : (
                                    <img
                                      src={img.public_url}
                                      alt={img.original_filename}
                                      loading="lazy"
                                      className="w-full h-full object-cover"
                                    />
                                  )}

                                  {/* Slide Number Badge */}
                                  <div className="absolute top-1.5 left-1.5 bg-black/80 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-yellow-400 border border-yellow-400/40">
                                    #{img.order_index}
                                  </div>

                                  {/* Format indicator */}
                                  <div className="absolute bottom-1.5 right-1.5 bg-black/80 px-1.5 py-0.5 rounded text-[9px] font-mono text-gray-300 flex items-center gap-0.5">
                                    {isVideo ? <Film className="w-2.5 h-2.5 text-cyan-400" /> : <ImageIcon className="w-2.5 h-2.5 text-yellow-400" />}
                                    <span>9:16</span>
                                  </div>

                                  {/* Hover overlay */}
                                  <div className="absolute inset-0 bg-yellow-400/10 opacity-0 group-hover/slide:opacity-100 transition-opacity flex items-center justify-center">
                                    <Maximize2 className="w-5 h-5 text-yellow-400 drop-shadow" />
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="py-6 text-center text-xs text-gray-600 font-mono w-full">
                              No slide thumbnail data available.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bottom: Caption & Hashtags preview */}
                      {(job.final_caption || job.caption) && (
                        <div className="pt-2 border-t border-[#141a24] text-xs font-mono">
                          <p className="text-gray-300 line-clamp-2 leading-relaxed bg-[#06080d] p-2.5 rounded border border-[#141a24]">
                            {job.final_caption || job.caption}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* High-Resolution 9:16 Slide Lightbox Modal */}
      {activeJobForLightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="relative max-w-4xl w-full max-h-[92vh] bg-[#090c12] border border-yellow-400/40 rounded-2xl flex flex-col shadow-[0_0_50px_rgba(250,204,21,0.15)] overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-[#1e2433] bg-[#0d1017] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-yellow-400/10 border border-yellow-400/30 text-yellow-400">
                  <InstagramIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-orbitron font-bold text-sm sm:text-base text-gray-100 uppercase tracking-wider">
                    {activeJobForLightbox.account_handle || 'CAROUSEL PREVIEW'}
                  </h3>
                  <p className="text-xs text-gray-400 font-mono">
                    Slide {lightboxSlideIndex + 1} of {activeJobForLightbox.images.length} &bull; 9:16 (1080&times;1920)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={closeLightbox}
                  className="p-1.5 rounded-lg hover:bg-[#1a202c] text-gray-400 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Phone Mockup Slide Viewer */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col md:flex-row items-center justify-center gap-6 bg-[#050608]">
              {/* 9:16 Viewport */}
              <div className="relative w-[280px] sm:w-[320px] aspect-[9/16] rounded-2xl overflow-hidden bg-black border-2 border-yellow-400/50 shadow-2xl flex items-center justify-center flex-shrink-0 group">
                {activeJobForLightbox.images[lightboxSlideIndex] ? (
                  activeJobForLightbox.images[lightboxSlideIndex].media_type === 'VIDEO' ? (
                    <video
                      key={activeJobForLightbox.images[lightboxSlideIndex].public_url}
                      src={activeJobForLightbox.images[lightboxSlideIndex].public_url}
                      controls
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={activeJobForLightbox.images[lightboxSlideIndex].public_url}
                      alt={activeJobForLightbox.images[lightboxSlideIndex].original_filename}
                      className="w-full h-full object-cover"
                    />
                  )
                ) : (
                  <div className="text-gray-500 font-mono text-xs">No Slide</div>
                )}

                {/* Left/Right Navigation buttons inside mockup */}
                {activeJobForLightbox.images.length > 1 && (
                  <>
                    <button
                      onClick={prevLightboxSlide}
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/70 hover:bg-black text-white hover:text-yellow-400 transition border border-white/20"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={nextLightboxSlide}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/70 hover:bg-black text-white hover:text-yellow-400 transition border border-white/20"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}

                {/* Slide Counter Overlay */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-mono font-bold text-yellow-400 border border-yellow-400/40 pointer-events-none">
                  {lightboxSlideIndex + 1} / {activeJobForLightbox.images.length}
                </div>
              </div>

              {/* Side Details Panel */}
              <div className="flex-1 w-full space-y-4 font-mono text-xs text-gray-300">
                <div className="space-y-1">
                  <span className="text-[10px] text-yellow-400 uppercase tracking-widest font-bold">
                    // CAROUSEL_DETAILS
                  </span>
                  <div className="text-sm font-bold text-white font-orbitron">
                    MISSION #{activeJobForLightbox.job_id}
                  </div>
                </div>

                {/* Quick Metadata Grid */}
                <div className="grid grid-cols-2 gap-2 bg-[#0c1017] p-3 rounded-lg border border-[#1e2433] text-[11px]">
                  <div>
                    <span className="text-gray-500 block">STATUS</span>
                    <span className="text-emerald-400 font-bold">{activeJobForLightbox.status}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">ACCOUNT</span>
                    <span className="text-yellow-400 font-bold">
                      {activeJobForLightbox.account_handle || activeJobForLightbox.account_id}
                    </span>
                  </div>
                  {activeJobForLightbox.instagram_post_id && (
                    <div className="col-span-2">
                      <span className="text-gray-500 block">INSTAGRAM POST ID</span>
                      <span className="text-gray-200 font-mono font-bold break-all">
                        {activeJobForLightbox.instagram_post_id}
                      </span>
                    </div>
                  )}
                  {activeJobForLightbox.published_at && (
                    <div className="col-span-2">
                      <span className="text-gray-500 block">PUBLISHED AT</span>
                      <span className="text-gray-400">
                        {new Date(activeJobForLightbox.published_at).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Active Slide URL */}
                {activeJobForLightbox.images[lightboxSlideIndex] && (
                  <div className="space-y-1.5 bg-[#0c1017] p-3 rounded-lg border border-[#1e2433]">
                    <span className="text-gray-500 text-[10px] block">
                      CURRENT SLIDE URL (#{lightboxSlideIndex + 1}):
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={activeJobForLightbox.images[lightboxSlideIndex].public_url}
                        className="flex-1 bg-black/60 border border-[#1e2433] rounded px-2.5 py-1 text-[11px] text-yellow-300 font-mono outline-none"
                      />
                      <button
                        onClick={() =>
                          handleCopyText(
                            activeJobForLightbox.images[lightboxSlideIndex].public_url,
                            'slide_url'
                          )
                        }
                        className="px-2.5 py-1 rounded bg-yellow-400 text-black text-xs font-bold font-mono transition"
                      >
                        {copiedId === 'slide_url' ? 'COPIED' : 'COPY'}
                      </button>
                      <a
                        href={activeJobForLightbox.images[lightboxSlideIndex].public_url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded bg-[#161a24] hover:bg-[#202738] text-gray-300 transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                )}

                {/* Caption Drawer */}
                {(activeJobForLightbox.final_caption || activeJobForLightbox.caption) && (
                  <div className="space-y-1 bg-[#0c1017] p-3 rounded-lg border border-[#1e2433]">
                    <span className="text-gray-500 text-[10px] block">FULL CAPTION:</span>
                    <div className="max-h-36 overflow-y-auto whitespace-pre-wrap text-gray-300 text-xs leading-relaxed scrollbar-thin">
                      {activeJobForLightbox.final_caption || activeJobForLightbox.caption}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
