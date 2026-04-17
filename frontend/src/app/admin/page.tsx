'use client';

import type { FormEvent } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/Navbar';
import {
  adminDeleteCategory,
  adminDeleteVideo,
  adminUpdateCategory,
  adminUpdateVideo,
  adminUpdateVideoWithProgress,
  adminUploadVideoWithProgress,
  createCategory,
  fetchCategories,
  fetchProfile,
  fetchVideos,
} from '../../lib/api';
import { clearAuthSession, getStoredAccessToken, getStoredRole, updateStoredRole } from '../../lib/session';
import type { CategoryItem, UserProfile, VideoItem } from '../../lib/types';

const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'];
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png'];
const MAX_VIDEO_SIZE = 1024 * 1024 * 500;
const MAX_IMAGE_SIZE = 1024 * 1024 * 10;

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [status, setStatus] = useState('');
  const [activeJob, setActiveJob] = useState<'category' | 'upload' | 'update' | 'delete' | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategorySlug, setNewCategorySlug] = useState('');
  const [newCategoryThumbnailFile, setNewCategoryThumbnailFile] = useState<File | null>(null);
  
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategorySlug, setEditCategorySlug] = useState('');
  const [editCategoryThumbnailFile, setEditCategoryThumbnailFile] = useState<File | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [updateTitle, setUpdateTitle] = useState('');
  const [updateDescription, setUpdateDescription] = useState('');
  const [updateDuration, setUpdateDuration] = useState('');
  const [updateCategory, setUpdateCategory] = useState('');
  const [updateTags, setUpdateTags] = useState('');
  const [updateVideoUrl, setUpdateVideoUrl] = useState('');
  const [updateThumbnailUrl, setUpdateThumbnailUrl] = useState('');
  const [updateVideoFile, setUpdateVideoFile] = useState<File | null>(null);
  const [updateThumbnailFile, setUpdateThumbnailFile] = useState<File | null>(null);
  
  const [confirmDeleteSlug, setConfirmDeleteSlug] = useState<string | null>(null);
  const [confirmDeleteVideoId, setConfirmDeleteVideoId] = useState<string | null>(null);
  
  const router = useRouter();

  const isAuthError = (error: unknown) =>
    error instanceof Error && (error.message.startsWith('401') || error.message.startsWith('403'));

  const uploadStatusLabel =
    uploadProgress >= 100
      ? 'Finalizing library...'
      : uploadProgress >= 80
        ? 'Processing uploaded files...'
        : uploadProgress >= 35
          ? 'Uploading media to your server...'
          : 'Preparing upload...';

  const selectedVideo = useMemo(
    () => videos.find((video) => video.id === selectedVideoId) || null,
    [selectedVideoId, videos],
  );

  const selectedCategory = useMemo(
    () => categories.find((cat) => cat.slug === selectedCategorySlug) || null,
    [selectedCategorySlug, categories]
  );

  const handleSelectCategory = useCallback((cat: CategoryItem | null) => {
    if (!cat) {
      setSelectedCategorySlug(null);
      setEditCategoryName('');
      setEditCategorySlug('');
      setEditCategoryThumbnailFile(null);
      return;
    }
    setSelectedCategorySlug(cat.slug);
    setEditCategoryName(cat.name);
    setEditCategorySlug(cat.slug);
    setEditCategoryThumbnailFile(null);
  }, []);

  const handleSelectVideo = useCallback((video: VideoItem) => {
    setSelectedVideoId(video.id);
    setUpdateTitle(video.title);
    setUpdateDescription(video.description);
    setUpdateDuration(video.duration);
    setUpdateCategory(video.category);
    setUpdateTags(video.tags.join(', '));
    setUpdateVideoUrl(video.videoUrl);
    setUpdateThumbnailUrl(video.thumbnail);
    setUpdateVideoFile(null);
    setUpdateThumbnailFile(null);
  }, []);

  const refreshAdminData = useCallback(async () => {
    const [fetchedCategories, fetchedVideos] = await Promise.all([
      fetchCategories(),
      fetchVideos(),
    ]);

    setCategories(fetchedCategories);
    setVideos(fetchedVideos);

    if (!category && fetchedCategories[0]) {
      setCategory(fetchedCategories[0].slug);
    }

    if (updateCategory && !fetchedCategories.some((item) => item.slug === updateCategory)) {
      setUpdateCategory(fetchedCategories[0]?.slug || '');
    }

    if (!selectedVideoId && fetchedVideos[0]) {
      handleSelectVideo(fetchedVideos[0]);
    }

    if (selectedVideoId) {
      const refreshedSelectedVideo = fetchedVideos.find((video) => video.id === selectedVideoId);
      if (refreshedSelectedVideo) {
        handleSelectVideo(refreshedSelectedVideo);
      }
    }
  }, [category, handleSelectVideo, selectedVideoId, updateCategory]);

  useEffect(() => {
    const savedToken = getStoredAccessToken();
    const savedRole = getStoredRole();

    if (!savedToken) {
      router.replace('/auth');
      return;
    }

    if (savedRole !== 'admin') {
      router.replace('/');
      return;
    }

    fetchProfile(savedToken)
      .then(async (profileData) => {
        if (profileData.role !== 'admin') {
          clearAuthSession();
          router.replace('/');
          return;
        }

        setToken(savedToken);
        setProfile(profileData);
        updateStoredRole(profileData.role);
        await refreshAdminData();
      })
      .catch((error) => {
        if (isAuthError(error)) {
          clearAuthSession();
          router.replace('/auth');
          return;
        }

        setToken(savedToken);
        setStatus('Backend is restarting or temporarily unavailable. Reload the page in a moment.');
      });
  }, [refreshAdminData, router]);

  const ensureImageFile = (file: File | null, label: string) => {
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      throw new Error(`${label} must be a JPG or PNG image.`);
    }
    if (file.size > MAX_IMAGE_SIZE) {
      throw new Error(`${label} must be 10MB or smaller.`);
    }
  };

  const ensureVideoFile = (file: File | null) => {
    if (!file) {
      throw new Error('Video file is required.');
    }
    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      throw new Error('Video must be MP4 or WebM.');
    }
    if (file.size > MAX_VIDEO_SIZE) {
      throw new Error('Video must be 500MB or smaller.');
    }
  };

  const handleCreateCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;

    if (selectedCategorySlug) {
      const categoryName = editCategoryName.trim();
      const categorySlug = slugify(editCategorySlug || editCategoryName);
      if (!categoryName || !categorySlug) {
        alert('Category name and slug are required.');
        return;
      }

      try {
        ensureImageFile(editCategoryThumbnailFile, 'Category thumbnail');
        setActiveJob('category');
        setStatus('Updating category...');

        const formData = new FormData();
        formData.append('name', categoryName);
        formData.append('slug', categorySlug);
        if (editCategoryThumbnailFile) {
          formData.append('thumbnail_file', editCategoryThumbnailFile);
        }

        await adminUpdateCategory(token, selectedCategorySlug, formData);

        await refreshAdminData();
        handleSelectCategory(null);
        setStatus('Category updated successfully.');
      } catch (error) {
        console.error(error);
        setStatus(error instanceof Error ? error.message : 'Failed to update category.');
      } finally {
        setActiveJob(null);
      }
      return;
    }

    const categoryName = newCategoryName.trim();
    const categorySlug = slugify(newCategorySlug || newCategoryName);
    if (!categoryName || !categorySlug) {
      alert('Category name and slug are required.');
      return;
    }

    try {
      ensureImageFile(newCategoryThumbnailFile, 'Category thumbnail');
      setActiveJob('category');
      setStatus('Creating category...');

      const formData = new FormData();
      formData.append('name', categoryName);
      formData.append('slug', categorySlug);
      if (newCategoryThumbnailFile) {
        formData.append('thumbnail_file', newCategoryThumbnailFile);
      }

      await createCategory(token, formData);

      setNewCategoryName('');
      setNewCategorySlug('');
      setNewCategoryThumbnailFile(null);
      await refreshAdminData();
      setCategory(categorySlug);
      setStatus('Category created successfully.');
    } catch (error) {
      console.error(error);
      setStatus(error instanceof Error ? error.message : 'Failed to create category.');
    } finally {
      setActiveJob(null);
    }
  };

  const handleDeleteCategory = async (slug: string) => {
    if (!token) return;
    try {
      setActiveJob('delete');
      setStatus('Deleting category...');
      await adminDeleteCategory(token, slug);
      if (selectedCategorySlug === slug) handleSelectCategory(null);
      await refreshAdminData();
      setConfirmDeleteSlug(null);
      setStatus('Category deleted successfully.');
    } catch (error) {
      console.error(error);
      setStatus(error instanceof Error ? error.message : 'Failed to delete category.');
    } finally {
      setActiveJob(null);
    }
  };

  const handleUpdateVideo = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || !selectedVideoId) return;

    try {
      if (updateVideoFile) {
        ensureVideoFile(updateVideoFile);
      }
      ensureImageFile(updateThumbnailFile, 'Thumbnail');
      setActiveJob('update');
      setUploadProgress(updateVideoFile || updateThumbnailFile ? 4 : 100);
      setStatus('Updating video...');
      const formData = new FormData();
      formData.append('title', updateTitle.trim());
      formData.append('description', updateDescription.trim());
      formData.append('category', updateCategory);
      formData.append('tags', updateTags);
      if (updateVideoFile) {
        formData.append('video_file', updateVideoFile);
      }
      if (updateThumbnailFile) {
        formData.append('thumbnail_file', updateThumbnailFile);
      }

      if (updateVideoFile || updateThumbnailFile) {
        await adminUpdateVideoWithProgress(token, selectedVideoId, formData, (progress) => {
          setUploadProgress(Math.max(progress, 4));
        });
      } else {
        await adminUpdateVideo(token, selectedVideoId, formData);
      }
      await refreshAdminData();
      setUpdateVideoFile(null);
      setUpdateThumbnailFile(null);
      setUploadProgress(100);
      setStatus('Video updated successfully.');
    } catch (error) {
      console.error(error);
      setStatus(error instanceof Error ? error.message : 'Failed to update video.');
    } finally {
      setActiveJob(null);
      setUploadProgress(0);
    }
  };

  const handleDeleteVideo = async (id: string) => {
    if (!token) return;
    try {
      setActiveJob('delete');
      setStatus('Deleting video...');
      await adminDeleteVideo(token, id);
      setSelectedVideoId(null);
      await refreshAdminData();
      setConfirmDeleteVideoId(null);
      setStatus('Video deleted successfully.');
    } catch (error) {
      console.error(error);
      setStatus(error instanceof Error ? error.message : 'Failed to delete video.');
    } finally {
      setActiveJob(null);
    }
  };

  const handleUploadVideo = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;

    try {
      const trimmedTitle = title.trim();
      const trimmedDescription = description.trim();

      if (trimmedTitle.length < 2) {
        throw new Error('Title must be at least 2 characters.');
      }
      if (trimmedDescription.length < 2) {
        throw new Error('Description must be at least 2 characters.');
      }
      if (!category) {
        throw new Error('Please select a category before uploading.');
      }

      const selectedVideoFile = videoFile;
      const selectedThumbnailFile = thumbnailFile;
      ensureVideoFile(selectedVideoFile);
      ensureImageFile(selectedThumbnailFile, 'Thumbnail');

      if (!selectedVideoFile || !selectedThumbnailFile) {
        throw new Error('Video file and thumbnail file are required.');
      }

      setActiveJob('upload');
      setUploadProgress(4);
      setStatus('Uploading raw files to VibeStream servers...');
      const formData = new FormData();
      formData.append('title', trimmedTitle);
      formData.append('description', trimmedDescription);
      formData.append('category', category);
      formData.append('tags', tags);
      formData.append('video_file', selectedVideoFile);
      formData.append('thumbnail_file', selectedThumbnailFile);

      await adminUploadVideoWithProgress(token, formData, (progress) => {
        setUploadProgress(Math.max(progress, 4));
        if (progress >= 100) {
          setStatus('Publishing to library & generating stream segments...');
        }
      });

      setTitle('');
      setDescription('');
      setTags('');
      setVideoFile(null);
      setThumbnailFile(null);
      await refreshAdminData();
      setUploadProgress(100);
      setStatus('Success! Video is now live in the library.');
    } catch (error) {
      console.error(error);
      setStatus(error instanceof Error ? error.message : 'Upload failed.');
    } finally {
      setActiveJob(null);
      setUploadProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="space-y-10">
          <section className="animate-fade-up rounded-3xl border border-white/10 bg-panel p-8 shadow-glow">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-accent/90">Admin dashboard</p>
                <h1 className="text-4xl font-semibold text-white">Manage videos and categories</h1>
                <p className="mt-2 text-sm text-muted">Only administrators can upload, edit, delete, and publish content.</p>
              </div>
              <div className="rounded-full bg-black/30 px-4 py-3 text-sm text-white">
                Signed in as <span className="font-semibold">{profile?.email || 'Admin'}</span>
              </div>
            </div>
          </section>

          {(activeJob === 'upload' || activeJob === 'update') && (
            <section className="animate-fade-up rounded-3xl border border-white/20 bg-panel/95 p-6 shadow-glow">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-semibold uppercase tracking-[0.3em] text-white">
                    Upload in progress
                  </p>
                  <p className="text-lg font-semibold text-white">{uploadStatusLabel}</p>
                  <p className="text-sm text-muted">
                    Your files are being sent to the backend and published into the library.
                  </p>
                </div>
                <div className="animate-float-gentle rounded-full border border-white/10 bg-black/25 px-4 py-3 text-sm font-semibold text-white">
                  {uploadProgress}%
                </div>
              </div>
              <div className="mt-5 h-3 overflow-hidden rounded-full bg-black/25">
                <div
                  className="progress-stripes h-full rounded-full bg-white transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </section>
          )}

          <section className="grid gap-6 xl:grid-cols-2">
            <div className="animate-fade-up rounded-3xl border border-white/10 bg-panel p-6 shadow-glow">
              <h2 className="text-2xl font-semibold text-white">
                {selectedCategorySlug ? 'Edit category' : 'Create category'}
              </h2>
              {selectedCategorySlug && (
                <div className="mt-2 flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm text-muted">
                  <span>Editing: <strong className="text-white">{selectedCategory?.name}</strong></span>
                  <button type="button" onClick={() => handleSelectCategory(null)} className="text-accent hover:text-white">Cancel</button>
                </div>
              )}
              <form onSubmit={handleCreateCategory} className="mt-4 space-y-4">
                <label className="block text-sm text-muted">
                  <span className="mb-2 block">Name</span>
                  <input
                    value={selectedCategorySlug ? editCategoryName : newCategoryName}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (selectedCategorySlug) {
                        setEditCategoryName(value);
                        if (!editCategorySlug || editCategorySlug === slugify(selectedCategory?.name || '')) {
                          setEditCategorySlug(slugify(value));
                        }
                      } else {
                        setNewCategoryName(value);
                        if (!newCategorySlug) {
                          setNewCategorySlug(slugify(value));
                        }
                      }
                    }}
                    required
                    className="w-full rounded-3xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
                  />
                </label>
                <label className="block text-sm text-muted">
                  <span className="mb-2 block">Slug</span>
                  <input
                    value={selectedCategorySlug ? editCategorySlug : newCategorySlug}
                    onChange={(event) => {
                      if (selectedCategorySlug) {
                        setEditCategorySlug(slugify(event.target.value));
                      } else {
                        setNewCategorySlug(slugify(event.target.value));
                      }
                    }}
                    required
                    className="w-full rounded-3xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
                  />
                </label>
                <label className="block text-sm text-muted">
                  <span className="mb-2 block">
                    {selectedCategorySlug ? 'Replace thumbnail' : 'Thumbnail'}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={(event) => {
                      const file = event.target.files?.[0] || null;
                      if (selectedCategorySlug) {
                        setEditCategoryThumbnailFile(file);
                      } else {
                        setNewCategoryThumbnailFile(file);
                      }
                    }}
                    className="text-sm text-text"
                  />
                </label>
                <button type="submit" disabled={activeJob !== null} className="rounded-full bg-[#114a70] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1a5b87] disabled:cursor-not-allowed disabled:opacity-70">
                  {activeJob === 'category' ? 'Saving...' : (selectedCategorySlug ? 'Save changes' : 'Create category')}
                </button>
              </form>

              <div className="mt-10 border-t border-white/10 pt-8">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Current categories</h3>
                  <span className="rounded-full bg-black/30 px-3 py-1 text-xs font-medium text-muted">
                    {categories.length} total
                  </span>
                </div>
                <div className="max-h-[600px] space-y-3 overflow-y-auto pr-2">
                  {categories.map((item) => (
                    <div key={item.slug} className="group relative flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/40 p-3 text-sm transition-colors hover:bg-black/60 sm:flex-row sm:items-center sm:justify-between sm:p-4">
                      <div className="flex items-center gap-4">
                        {item.thumbnailUrl ? (
                          <img
                            src={item.thumbnailUrl}
                            alt={item.name}
                            className="h-10 w-10 flex-shrink-0 rounded-xl object-cover ring-1 ring-white/10"
                          />
                        ) : (
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#114a70]/50 ring-1 ring-white/10">
                            <span className="text-xs font-semibold text-white/50">
                              {item.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-white">{item.name}</p>
                          <p className="text-xs text-muted">/{item.slug}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-4 sm:justify-end">
                        <span className="text-xs font-medium text-accent">
                          {item.videoCount} {item.videoCount === 1 ? 'video' : 'videos'}
                        </span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleSelectCategory(item)}
                            className="rounded-full border border-white/10 bg-[#114a70] px-4 py-2 text-xs font-medium text-white transition hover:bg-[#0b2031]"
                          >
                            Edit
                          </button>
                          {confirmDeleteSlug === item.slug ? (
                            <div className="flex gap-1 animate-fade-up">
                              <button
                                type="button"
                                disabled={activeJob !== null}
                                onClick={() => handleDeleteCategory(item.slug)}
                                className="rounded-full border border-red-500 bg-red-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-700"
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteSlug(null)}
                                className="rounded-full border border-white/10 bg-black/40 px-3 py-2 text-xs font-medium text-white transition hover:bg-black/60"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={activeJob !== null}
                              onClick={() => setConfirmDeleteSlug(item.slug)}
                              className="rounded-full border border-red-500/50 bg-red-500/10 px-4 py-2 text-xs font-medium text-red-400 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {!categories.length && (
                    <p className="py-4 text-center text-sm text-muted">No categories exist yet.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="animate-fade-up rounded-3xl border border-white/10 bg-panel p-6 shadow-glow">
              <h2 className="text-2xl font-semibold text-white">Upload new video</h2>
              <form onSubmit={handleUploadVideo} className="mt-6 space-y-4">
                <label className="block text-sm text-muted">
                  <span className="mb-2 block">Title <span className="text-red-400">*</span></span>
                  <input value={title} onChange={(event) => setTitle(event.target.value)} required minLength={2} maxLength={200} placeholder="At least 2 characters" className="w-full rounded-3xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/30" />
                </label>
                <label className="block text-sm text-muted">
                  <span className="mb-2 block">Description <span className="text-red-400">*</span></span>
                  <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} required minLength={2} maxLength={4000} placeholder="At least 2 characters" className="w-full rounded-3xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/30" />
                </label>
                <label className="block text-sm text-muted">
                  <span className="mb-2 block">Category</span>
                  <select value={category} onChange={(event) => setCategory(event.target.value)} className="w-full rounded-3xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/30">
                    {categories.map((categoryItem) => (
                      <option key={categoryItem.slug} value={categoryItem.slug}>{categoryItem.name}</option>
                    ))}
                  </select>
                </label>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block text-sm text-muted">
                    <span className="mb-2 block">Duration</span>
                    <div className="rounded-3xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-muted">
                      Auto-detected after upload
                    </div>
                  </label>
                  <label className="block text-sm text-muted">
                    <span className="mb-2 block">Tags</span>
                    <input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="featured, tutorial" className="w-full rounded-3xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/30" />
                  </label>
                </div>
                <label className="block text-sm text-muted">
                  <span className="mb-2 block">Video file</span>
                  <input type="file" accept="video/mp4,video/webm" onChange={(event) => setVideoFile(event.target.files?.[0] || null)} className="text-sm text-text" />
                </label>
                <label className="block text-sm text-muted">
                  <span className="mb-2 block">Thumbnail file</span>
                  <input type="file" accept="image/jpeg,image/png" onChange={(event) => setThumbnailFile(event.target.files?.[0] || null)} className="text-sm text-text" />
                </label>
                <button type="submit" disabled={activeJob !== null} className="rounded-full bg-[#114a70] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1a5b87] disabled:cursor-not-allowed disabled:opacity-70">
                  {activeJob === 'upload' ? 'Uploading...' : 'Upload video'}
                </button>
              </form>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="animate-fade-up rounded-3xl border border-white/10 bg-panel p-6 shadow-glow">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-2xl font-semibold text-white">Video library</h2>
                <span className="rounded-full bg-black/30 px-3 py-1 text-sm text-white">{videos.length} videos</span>
              </div>
              <div className="mt-6 space-y-3">
                {videos.map((video) => (
                  <div key={video.id} className="rounded-3xl border border-white/10 bg-black/40 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-semibold text-white">{video.title}</p>
                        <p className="text-sm text-muted">{video.category}</p>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => handleSelectVideo(video)} className="rounded-full border border-white/10 bg-[#114a70] px-4 py-2 text-sm text-white transition hover:bg-[#0b2031]">
                          Edit
                        </button>
                        {confirmDeleteVideoId === video.id ? (
                            <div className="flex gap-1 animate-fade-up">
                              <button
                                type="button"
                                disabled={activeJob !== null}
                                onClick={() => handleDeleteVideo(video.id)}
                                className="rounded-full border border-red-500 bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteVideoId(null)}
                                className="rounded-full border border-white/10 bg-black/40 px-3 py-2 text-sm font-medium text-white transition hover:bg-black/60"
                              >
                                Cancel
                              </button>
                            </div>
                        ) : (
                          <button type="button" disabled={activeJob !== null} onClick={() => setConfirmDeleteVideoId(video.id)} className="rounded-full border border-red-500 bg-red-500/10 px-4 py-2 text-sm text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-70">
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {!videos.length && <p className="text-sm text-muted">No videos available yet.</p>}
              </div>
            </div>

            <div className="animate-fade-up rounded-3xl border border-white/10 bg-panel p-6 shadow-glow">
              <h2 className="text-2xl font-semibold text-white">Edit selected video</h2>
              {selectedVideo ? (
                <form onSubmit={handleUpdateVideo} className="mt-6 space-y-4">
                  <label className="block text-sm text-muted">
                    <span className="mb-2 block">Title</span>
                    <input value={updateTitle} onChange={(event) => setUpdateTitle(event.target.value)} className="w-full rounded-3xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/30" />
                  </label>
                  <label className="block text-sm text-muted">
                    <span className="mb-2 block">Description</span>
                    <textarea value={updateDescription} onChange={(event) => setUpdateDescription(event.target.value)} rows={3} className="w-full rounded-3xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/30" />
                  </label>
                  <label className="block text-sm text-muted">
                    <span className="mb-2 block">Category</span>
                    <select value={updateCategory} onChange={(event) => setUpdateCategory(event.target.value)} className="w-full rounded-3xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/30">
                      {categories.map((categoryItem) => (
                        <option key={categoryItem.slug} value={categoryItem.slug}>{categoryItem.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm text-muted">
                    <span className="mb-2 block">Duration</span>
                    <input value={updateDuration} readOnly className="w-full rounded-3xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-text outline-none" />
                  </label>
                  <label className="block text-sm text-muted">
                    <span className="mb-2 block">Tags</span>
                    <input value={updateTags} onChange={(event) => setUpdateTags(event.target.value)} className="w-full rounded-3xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/30" />
                  </label>
                <label className="block text-sm text-muted">
                  <span className="mb-2 block">Video URL</span>
                  <input value={updateVideoUrl} readOnly className="w-full rounded-3xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-text outline-none" />
                </label>
                <label className="block text-sm text-muted">
                  <span className="mb-2 block">Thumbnail URL</span>
                  <input value={updateThumbnailUrl} readOnly className="w-full rounded-3xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-text outline-none" />
                </label>
                <label className="block text-sm text-muted">
                  <span className="mb-2 block">Replace video file</span>
                  <input type="file" accept="video/mp4,video/webm" onChange={(event) => setUpdateVideoFile(event.target.files?.[0] || null)} className="text-sm text-text" />
                </label>
                <label className="block text-sm text-muted">
                  <span className="mb-2 block">Replace thumbnail file</span>
                  <input type="file" accept="image/jpeg,image/png" onChange={(event) => setUpdateThumbnailFile(event.target.files?.[0] || null)} className="text-sm text-text" />
                </label>
                  <button type="submit" disabled={activeJob !== null} className="rounded-full bg-[#114a70] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1a5b87] disabled:cursor-not-allowed disabled:opacity-70">
                    {activeJob === 'update' ? 'Saving...' : 'Save changes'}
                  </button>
                </form>
              ) : (
                <p className="mt-6 text-sm text-muted">Select a video to edit its metadata.</p>
              )}
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-3 text-sm text-white/70">
            {activeJob ? <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-white" /> : null}
            <p>{status}</p>
          </div>
        </div>
      </main>
    </div>
  );
}
