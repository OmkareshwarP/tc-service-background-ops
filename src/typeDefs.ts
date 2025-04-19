import { PostType, PostVisibility } from "./utils/constant.js";

export interface IUser {
  userId: string;
  provider: string;
  email: string;
  username: string;
  name: string;
  profilePictureMediaId: string;
  headerPictureMediaId: string;
  signUpIpv4Address: string;
  moderationStatus: string;
  deletionStatus: string;
  internalTags: string[];
  profileLink: string;
  profileRejectionReasons: string[];
  createdAt: number;
  updatedAt: number;
  postCount: number;
}

export interface BgMessageData {
  messageIdentifier: string;
  createdAt: string;
  messageName: string;
  entityId: string;
  entityType: string;
  actionInputOne?: any;
  actionInputTwo?: any;
  metadata?: any;
}

export interface AnalyticsEventData {
  eventName: string;
  entityId: string;
  entityType: string;
  typeOfOperation?: string,
  actionInputOne?: any;
  actionInputTwo?: any;
  actionInputThree?: any;
  actionInputFour?: any;
  actionInputFive?: any;
}

export interface IPollPost {
  options: string[];
  votes: Record<string, number>;
  startAt: number;
  endAt: number;
}

export interface IPost {
  postId: string;
  userId: string;
  content: string;
  media: string[];
  postType: PostType;
  parentPostId?: string;
  threadParentPostId?: string;
  repostedPostId?: string;
  poll?: IPollPost;
  reposts: number;
  engagementScore: number;
  likes: number;
  comments: number;
  bookmarks: number;
  impressions: number;
  status: string;
  postVisibility: PostVisibility;
  createdAt: number;
  updatedAt: number;
}