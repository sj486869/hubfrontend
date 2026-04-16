import type { CategoryItem, CommentItem, UserProfile, VideoItem } from './types';

const IS_SERVER = typeof window === 'undefined';
const API_BASE = (IS_SERVER
  ? (process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api')
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')
).replace(/\/$/, '');

/**
 * Rewrites an HTTP media/stream URL to go through the Next.js /api/proxy
 * route when the browser page is on HTTPS. This prevents Mixed Content blocks
 * caused by the frontend being on HTTPS while the EC2 backend is plain HTTP.
 *
 * - On the server side (SSR) or when both are already HTTPS, returns url as-is.
 * - On the client side under HTTPS, rewrites http:// backend URLs to proxy.
 */
export function proxyUrl(url: string): string {
  if (!url) return url;
  // Only rewrite if we're in the browser on HTTPS and the asset is HTTP
  if (
    typeof window !== 'undefined' &&
    window.location.protocol === 'https:' &&
    url.startsWith('http:')
  ) {
    return `/api/proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}

type BackendComment = {
  id: string;
  author: string;
  content: string;
  created_at?: string;
  createdAt?: string;
};

type BackendVideo = {
  id: string;
  title: string;
  description: string;
  duration: string;
  views: number;
  likes: number;
  dislikes: number;
  category: string;
  tags?: string[];
  thumbnail?: string;
  thumbnail_url?: string;
  video_url?: string;
  stream_url?: string;
  streamUrl?: string;
  videoUrl?: string;
  created_at?: string;
  createdAt?: string;
  comments?: BackendComment[];
};

type BackendCategory = {
  slug: string;
  name: string;
  thumbnail_url?: string;
  thumbnailUrl?: string;
  video_count?: number;
  videoCount?: number;
};

type BackendUserProfile = {
  id: string;
  name: string;
  email: string;
  role?: 'admin' | 'user';
  liked_videos?: string[];
  likedVideos?: string[];
  watch_history?: string[];
  watchHistory?: string[];
};

type CategoryPayload = FormData | { name: string; slug: string; thumbnail_url?: string };

type VideoPayload =
  | FormData
  | {
      title: string;
      description: string;
      category: string;
      duration: string;
      thumbnail_url: string;
      video_url: string;
      tags?: string[];
    };

type VideoUpdatePayload =
  | FormData
  | {
      title?: string;
      description?: string;
      category?: string;
      duration?: string;
      thumbnail_url?: string;
      video_url?: string;
      tags?: string[];
    };

async function request<T>(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers || {});
  const isFormDataBody = typeof FormData !== 'undefined' && options.body instanceof FormData;

  if (!isFormDataBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      cache: 'no-store',
      headers,
      ...options,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`${response.status} ${response.statusText}: ${errorText}`);
    }

    return (await response.json()) as T;
  } catch (err: any) {
    if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
      // Check if this is a common SSL/Mixed Content issue
      if (typeof window !== 'undefined' && window.location.protocol === 'https:' && API_BASE.startsWith('http:')) {
        throw new Error('Connection Blocked: Your browser is blocking this request because the backend is not secure (HTTP). Please allow "Insecure Content" in your browser settings or use a secure backend.');
      }
      throw new Error('Backend Unreachable: The server might be down or your internet is disconnected.');
    }
    throw err;
  }
}

function uploadFormData<T>(
  path: string,
  token: string,
  formData: FormData,
  {
    method = 'POST',
    onProgress,
  }: {
    method?: 'POST' | 'PUT';
    onProgress?: (progress: number) => void;
  } = {},
) {
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, `${API_BASE}${path}`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) return;
      onProgress(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onload = () => {
      const responseText = xhr.responseText || '';
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(responseText) as T);
        } catch (error) {
          reject(error);
        }
        return;
      }
      reject(new Error(`${xhr.status} ${xhr.statusText}: ${responseText}`));
    };

    xhr.onerror = () => {
      reject(new Error('Network error while uploading.'));
    };

    xhr.send(formData);
  });
}

function normalizeComment(comment: BackendComment): CommentItem {
  return {
    id: comment.id,
    author: comment.author,
    content: comment.content,
    createdAt: comment.createdAt || comment.created_at || '',
  };
}

function normalizeVideo(video: BackendVideo): VideoItem {
  return {
    id: video.id,
    title: video.title,
    description: video.description,
    duration: video.duration,
    views: video.views,
    likes: video.likes,
    dislikes: video.dislikes,
    category: video.category,
    tags: video.tags || [],
    thumbnail: video.thumbnail || video.thumbnail_url || '',
    videoUrl: video.streamUrl || video.stream_url || video.videoUrl || video.video_url || '',
    streamUrl: video.streamUrl || video.stream_url,
    createdAt: video.createdAt || video.created_at || '',
    comments: video.comments?.map(normalizeComment) || [],
  };
}

function normalizeCategory(category: BackendCategory): CategoryItem {
  return {
    slug: category.slug,
    name: category.name,
    videoCount: category.videoCount ?? category.video_count ?? 0,
    thumbnailUrl: category.thumbnailUrl || category.thumbnail_url,
  };
}

function normalizeProfile(profile: BackendUserProfile): UserProfile {
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    role: profile.role || 'user',
    likedVideos: profile.likedVideos || profile.liked_videos || [],
    watchHistory: profile.watchHistory || profile.watch_history || [],
  };
}

export async function fetchVideos(): Promise<VideoItem[]> {
  const videos = await request<BackendVideo[]>('/videos');
  return videos.map(normalizeVideo);
}

export async function fetchVideoById(id: string): Promise<VideoItem> {
  const video = await request<BackendVideo>(`/videos/${id}`);
  return normalizeVideo(video);
}

export async function fetchCategories(): Promise<CategoryItem[]> {
  const categories = await request<BackendCategory[]>('/categories');
  return categories.map(normalizeCategory);
}

export async function fetchVideosByCategory(slug: string): Promise<VideoItem[]> {
  const videos = await request<BackendVideo[]>(`/category/${slug}`);
  return videos.map(normalizeVideo);
}

export async function searchVideos(query: string): Promise<VideoItem[]> {
  const videos = await request<BackendVideo[]>(`/videos?search=${encodeURIComponent(query)}`);
  return videos.map(normalizeVideo);
}

export async function signup(payload: { name: string; email: string; password: string }) {
  return request<{ access_token: string; refresh_token: string; role: 'admin' | 'user' }>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function login(payload: { email: string; password: string }) {
  return request<{ access_token: string; refresh_token: string; role: 'admin' | 'user' }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function refreshTokens(refreshToken: string) {
  return request<{ access_token: string; refresh_token: string; role: 'admin' | 'user' }>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
}

export async function createCategory(token: string, payload: CategoryPayload) {
  const category = await request<BackendCategory>('/admin/category', {
    method: 'POST',
    body: payload instanceof FormData ? payload : JSON.stringify(payload),
    headers: { Authorization: `Bearer ${token}` },
  });
  return normalizeCategory(category);
}

export async function adminUpdateCategory(token: string, slug: string, payload: CategoryPayload) {
  const category = await request<BackendCategory>(`/admin/category/${slug}`, {
    method: 'PUT',
    body: payload instanceof FormData ? payload : JSON.stringify(payload),
    headers: { Authorization: `Bearer ${token}` },
  });
  return normalizeCategory(category);
}

export async function adminDeleteCategory(token: string, slug: string) {
  return request<{ message: string }>(`/admin/category/${slug}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function adminUploadVideo(token: string, payload: VideoPayload) {
  const video = await request<BackendVideo>('/admin/upload-video', {
    method: 'POST',
    body: payload instanceof FormData ? payload : JSON.stringify(payload),
    headers: { Authorization: `Bearer ${token}` },
  });
  return normalizeVideo(video);
}

export async function adminUploadVideoWithProgress(
  token: string,
  payload: FormData,
  onProgress?: (progress: number) => void,
) {
  const video = await uploadFormData<BackendVideo>('/admin/upload-video', token, payload, {
    method: 'POST',
    onProgress,
  });
  return normalizeVideo(video);
}

export async function adminDeleteVideo(token: string, id: string) {
  return request<{ message: string }>(`/admin/video/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function adminUpdateVideo(token: string, id: string, payload: VideoUpdatePayload) {
  const video = await request<BackendVideo>(`/admin/video/${id}`, {
    method: 'PUT',
    body: payload instanceof FormData ? payload : JSON.stringify(payload),
    headers: { Authorization: `Bearer ${token}` },
  });
  return normalizeVideo(video);
}

export async function adminUpdateVideoWithProgress(
  token: string,
  id: string,
  payload: FormData,
  onProgress?: (progress: number) => void,
) {
  const video = await uploadFormData<BackendVideo>(`/admin/video/${id}`, token, payload, {
    method: 'PUT',
    onProgress,
  });
  return normalizeVideo(video);
}

export async function postComment(token: string, payload: { video_id: string; content: string }) {
  const comment = await request<BackendComment>('/comments', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { Authorization: `Bearer ${token}` },
  });
  return normalizeComment(comment);
}

export async function toggleLike(token: string, payload: { video_id: string; action: 'like' | 'dislike' }) {
  return request<{ likes: number; dislikes: number }>('/like', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function trackWatchHistory(token: string, videoId: string) {
  return request<{ message: string }>(`/videos/${videoId}/watch`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function createVideo(
  token: string,
  payload: {
    title: string;
    description: string;
    category: string;
    duration: string;
    thumbnail_url: string;
    video_url: string;
    tags?: string[];
  },
) {
  const video = await request<BackendVideo>('/videos', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { Authorization: `Bearer ${token}` },
  });
  return normalizeVideo(video);
}

export async function fetchProfile(token: string): Promise<UserProfile> {
  const profile = await request<BackendUserProfile>('/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return normalizeProfile(profile);
}
