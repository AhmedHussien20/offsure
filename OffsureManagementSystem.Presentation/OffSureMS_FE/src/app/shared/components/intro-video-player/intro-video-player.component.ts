import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { resolveStorageAssetUrl } from 'app/core/models/team-members/team-member.models';
import {
  IntroMediaKind,
  resolveIntroMediaKind,
} from 'app/core/models/team-members/intro-video.models';

@Component({
  selector: 'app-intro-video-player',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './intro-video-player.component.html',
  styleUrl: './intro-video-player.component.scss',
})
export class IntroVideoPlayerComponent implements OnChanges, OnDestroy, AfterViewInit {
  @Input() videoUrl: string | null | undefined;
  @Input() placeholder = 'No introduction added yet';

  @ViewChild('audioEl') audioEl?: ElementRef<HTMLAudioElement>;

  isPlaying = false;
  currentTime = 0;
  duration = 0;
  metadataReady = false;

  private durationProbeActive = false;

  constructor(private cdr: ChangeDetectorRef) {}

  get resolvedUrl(): string | null {
    return resolveStorageAssetUrl(this.videoUrl);
  }

  get mediaKind(): IntroMediaKind {
    return resolveIntroMediaKind(this.videoUrl);
  }

  get isAudio(): boolean {
    return this.mediaKind === 'audio';
  }

  get progressPercent(): number {
    const duration = this.effectiveDuration;
    if (!duration || duration <= 0) {
      return 0;
    }
    return Math.min(100, (this.currentTime / duration) * 100);
  }

  get currentTimeLabel(): string {
    return this.formatTime(this.currentTime);
  }

  get durationLabel(): string {
    const duration = this.effectiveDuration;
    return duration > 0 ? this.formatTime(duration) : '--:--';
  }

  get canSeek(): boolean {
    return this.effectiveDuration > 0;
  }

  private get effectiveDuration(): number {
    if (this.duration > 0) {
      return this.duration;
    }
    const audio = this.audioEl?.nativeElement;
    return audio ? this.resolveDuration(audio) : 0;
  }

  ngAfterViewInit(): void {
    void this.probeDurationIfNeeded();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['videoUrl']) {
      this.resetPlaybackState();
      setTimeout(() => void this.probeDurationIfNeeded());
    }
  }

  ngOnDestroy(): void {
    this.audioEl?.nativeElement?.pause();
  }

  togglePlay(): void {
    const audio = this.audioEl?.nativeElement;
    if (!audio) {
      return;
    }

    if (audio.paused) {
      void this.startPlayback();
    } else {
      audio.pause();
    }
  }

  private async startPlayback(): Promise<void> {
    const audio = this.audioEl?.nativeElement;
    if (!audio) {
      return;
    }

    if (this.effectiveDuration <= 0) {
      await this.probeDurationIfNeeded();
    }

    try {
      await audio.play();
    } catch {
      // Ignore autoplay policy failures.
    }
  }

  onAudioPlay(): void {
    this.isPlaying = true;
    this.syncFromAudio();
  }

  onAudioPause(): void {
    this.isPlaying = false;
    this.syncFromAudio();
  }

  onAudioTimeUpdate(): void {
    this.syncFromAudio();
  }

  onAudioProgress(): void {
    this.syncFromAudio();
  }

  onAudioLoadedMetadata(): void {
    this.syncFromAudio();
  }

  onAudioDurationChange(): void {
    this.syncFromAudio();
  }

  onAudioCanPlay(): void {
    this.syncFromAudio();
  }

  onAudioEnded(): void {
    this.isPlaying = false;
    this.syncFromAudio();
    const audio = this.audioEl?.nativeElement;
    if (audio && this.duration <= 0 && audio.currentTime > 0) {
      this.duration = audio.currentTime;
      this.metadataReady = true;
      this.cdr.markForCheck();
    }
  }

  seekAudio(event: Event): void {
    const audio = this.audioEl?.nativeElement;
    const duration = this.effectiveDuration;
    if (!audio || !duration) {
      return;
    }

    const value = Number((event.target as HTMLInputElement).value);
    if (!Number.isFinite(value)) {
      return;
    }

    audio.currentTime = (value / 100) * duration;
    this.syncFromAudio();
  }

  /** WebM blobs often omit duration metadata — seek to the end once to discover it. */
  private async probeDurationIfNeeded(): Promise<void> {
    const audio = this.audioEl?.nativeElement;
    if (!audio || !this.isAudio || this.durationProbeActive) {
      return;
    }

    const needsProbe = () => {
      if (this.duration > 0) {
        return false;
      }
      return (
        !Number.isFinite(audio.duration) || audio.duration <= 0 || audio.duration === Infinity
      );
    };

    if (!needsProbe()) {
      return;
    }

    this.durationProbeActive = true;
    const savedTime = audio.currentTime;

    try {
      if (audio.readyState < 1) {
        await new Promise<void>(resolve => {
          audio.addEventListener('loadedmetadata', () => resolve(), { once: true });
        });
      }

      if (!needsProbe()) {
        this.syncFromAudio();
        return;
      }

      await new Promise<void>(resolve => {
        const onSeeked = () => {
          audio.removeEventListener('seeked', onSeeked);
          resolve();
        };
        audio.addEventListener('seeked', onSeeked);
        audio.currentTime = Number.MAX_SAFE_INTEGER;
      });

      const resolved = this.resolveDuration(audio);
      if (resolved > 0) {
        this.duration = resolved;
        this.metadataReady = true;
      }

      audio.currentTime = savedTime;
      this.currentTime = savedTime;
      this.cdr.markForCheck();
    } catch {
      // Playback events will keep trying if the probe fails.
    } finally {
      this.durationProbeActive = false;
    }
  }

  private resetPlaybackState(): void {
    this.isPlaying = false;
    this.currentTime = 0;
    this.duration = 0;
    this.metadataReady = false;
    this.durationProbeActive = false;
  }

  private syncFromAudio(): void {
    const audio = this.audioEl?.nativeElement;
    if (!audio) {
      return;
    }

    this.currentTime = audio.currentTime;
    const resolved = this.resolveDuration(audio);
    if (resolved > 0) {
      this.duration = Math.max(this.duration, resolved, audio.currentTime);
      this.metadataReady = true;
    } else if (!this.durationProbeActive && audio.paused) {
      void this.probeDurationIfNeeded();
    }

    this.cdr.markForCheck();
  }

  /** WebM recordings often lack duration until buffered — read seekable/buffered ranges. */
  private resolveDuration(audio: HTMLAudioElement): number {
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      return audio.duration;
    }

    if (audio.seekable.length > 0) {
      const end = audio.seekable.end(audio.seekable.length - 1);
      if (Number.isFinite(end) && end > 0) {
        return end;
      }
    }

    if (audio.buffered.length > 0) {
      const end = audio.buffered.end(audio.buffered.length - 1);
      if (Number.isFinite(end) && end > 0) {
        return end;
      }
    }

    return 0;
  }

  private formatTime(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds < 0) {
      return '0:00';
    }
    const total = Math.floor(seconds);
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}
