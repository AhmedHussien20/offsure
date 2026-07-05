export interface IntroVideoSettingsDto {
  maxDurationSeconds: number;
  maxFileSizeMb: number;
  acceptedFormats: string[];
}

export type IntroMediaKind = 'video' | 'audio';

export const INTRO_VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov'];
export const INTRO_AUDIO_EXTENSIONS = ['mp3', 'm4a', 'wav', 'ogg', 'oga'];

export const INTRO_VIDEO_ACCEPT = '.mp4,.webm,.mov,video/mp4,video/webm,video/quicktime';
export const INTRO_AUDIO_ACCEPT =
  '.mp3,.m4a,.wav,.ogg,.oga,audio/mpeg,audio/mp4,audio/wav,audio/ogg';

export const DEFAULT_INTRO_VIDEO_SETTINGS: IntroVideoSettingsDto = {
  maxDurationSeconds: 90,
  maxFileSizeMb: 50,
  acceptedFormats: [...INTRO_VIDEO_EXTENSIONS, ...INTRO_AUDIO_EXTENSIONS],
};

/** Infer whether a stored intro media path/URL is audio or video by its extension. */
export function resolveIntroMediaKind(pathOrUrl: string | null | undefined): IntroMediaKind {
  if (!pathOrUrl) {
    return 'video';
  }
  const clean = pathOrUrl.split('?')[0].split('#')[0];
  const extension = clean.split('.').pop()?.toLowerCase() ?? '';
  return INTRO_AUDIO_EXTENSIONS.includes(extension) ? 'audio' : 'video';
}
