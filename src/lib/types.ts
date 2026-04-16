export type VideoItem = {
  id: string;
  title: string;
  description: string;
  duration: string;
  views: number;
  likes: number;
  dislikes: number;
  category: string;
  tags: string[];
  thumbnail: string;
  videoUrl: string;
  streamUrl?: string;
  createdAt: string;
  comments?: CommentItem[];
};

export type CategoryItem = {
  slug: string;
  name: string;
  videoCount: number;
  thumbnailUrl?: string;
};

export type CommentItem = {
  id: string;
  author: string;
  content: string;
  createdAt: string;
};

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  likedVideos: string[];
  watchHistory: string[];
};
