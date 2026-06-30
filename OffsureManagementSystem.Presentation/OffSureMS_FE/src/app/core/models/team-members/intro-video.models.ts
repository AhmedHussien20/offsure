export interface IntroVideoSettingsDto {
  maxDurationSeconds: number;
  maxFileSizeMb: number;
  acceptedFormats: string[];
}

export const INTRO_VIDEO_ACCEPT = '.mp4,.webm,.mov,video/mp4,video/webm,video/quicktime';

export const DEFAULT_INTRO_VIDEO_SETTINGS: IntroVideoSettingsDto = {
  maxDurationSeconds: 90,
  maxFileSizeMb: 50,
  acceptedFormats: ['mp4', 'webm', 'mov'],
};
