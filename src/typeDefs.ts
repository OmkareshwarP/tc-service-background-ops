export interface IUser {
  userId: string;
  email: string;
  username: string;
  provider: string;
  name: string;
  profilePictureMediaId: string;
  moderationStatus: string;
  verificationStatus: string;
  deletionStatus: string;
  publicTags: string[];
  internalTags: string[];
  profileLink: string;
  createdAt: number;
  updatedAt: number;
  signUpIpv4Address: string;
  profileRejectionReasons: string[];
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