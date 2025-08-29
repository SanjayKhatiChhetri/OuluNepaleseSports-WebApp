// TypeScript enums for type safety (since SQLite doesn't support native enums)

export enum UserRole {
  VISITOR = 'VISITOR',
  MEMBER = 'MEMBER',
  EDITOR = 'EDITOR',
  ADMIN = 'ADMIN',
}

export enum ContentType {
  ANNOUNCEMENT = 'ANNOUNCEMENT',
  NEWS = 'NEWS',
  EVENT = 'EVENT',
}

export enum MediaType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  DOCUMENT = 'DOCUMENT',
}

export enum RegistrationStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
}

export enum SocialPlatform {
  FACEBOOK = 'FACEBOOK',
  INSTAGRAM = 'INSTAGRAM',
}

export enum SocialPostStatus {
  PENDING = 'PENDING',
  PUBLISHED = 'PUBLISHED',
  FAILED = 'FAILED',
}

// Validation functions
export const isValidUserRole = (role: string): role is UserRole => {
  return Object.values(UserRole).includes(role as UserRole);
};

export const isValidContentType = (type: string): type is ContentType => {
  return Object.values(ContentType).includes(type as ContentType);
};

export const isValidMediaType = (type: string): type is MediaType => {
  return Object.values(MediaType).includes(type as MediaType);
};

export const isValidRegistrationStatus = (status: string): status is RegistrationStatus => {
  return Object.values(RegistrationStatus).includes(status as RegistrationStatus);
};

export const isValidSocialPlatform = (platform: string): platform is SocialPlatform => {
  return Object.values(SocialPlatform).includes(platform as SocialPlatform);
};

export const isValidSocialPostStatus = (status: string): status is SocialPostStatus => {
  return Object.values(SocialPostStatus).includes(status as SocialPostStatus);
};