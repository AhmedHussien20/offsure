import { CommonModule } from '@angular/common';
import { Component, ElementRef, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild } from '@angular/core';
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
export class IntroVideoPlayerComponent implements OnChanges, OnDestroy {
  @Input() videoUrl: string | null | undefined;
  @Input() placeholder = 'No introduction added yet';

  @ViewChild('audioEl') audioEl?: ElementRef<HTMLAudioElement>;

  isPlaying = false;
  currentTime = 0;
  duration = 0;
  metadataReady = false;

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
    if (!this.duration || this.duration <= 0) {
      return 0;
    }
    return Math.min(100, (this.currentTime / this.duration) * 100);
  }

  get currentTimeLabel(): string {
    return this.formatTime(this.currentTime);
  }

  get durationLabel(): string {
    return this.metadataReady && this.duration > 0 ? this.formatTime(this.duration) : '--:--';
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['videoUrl']) {
      this.isPlaying = false;
      this.currentTime = 0;
      this.duration = 0;
      this.metadataReady = false;
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
      void audio.play();
    } else {
      audio.pause();
    }
  }

  onAudioPlay(): void {
    this.isPlaying = true;
  }

  onAudioPause(): void {
    this.isPlaying = false;
  }

  onAudioTimeUpdate(): void {
    const audio = this.audioEl?.nativeElement;
    if (!audio) {
      return;
    }
    this.currentTime = audio.currentTime;
  }

  onAudioLoadedMetadata(): void {
    const audio = this.audioEl?.nativeElement;
    if (!audio) {
      return;
    }
    this.duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    this.metadataReady = this.duration > 0;
    this.currentTime = audio.currentTime;
  }

  onAudioDurationChange(): void {
    this.onAudioLoadedMetadata();
  }

  onAudioEnded(): void {
    this.isPlaying = false;
    const audio = this.audioEl?.nativeElement;
    if (audio) {
      this.currentTime = audio.currentTime;
    }
  }

  seekAudio(event: Event): void {
    const audio = this.audioEl?.nativeElement;
    if (!audio || !this.duration) {
      return;
    }

    const value = Number((event.target as HTMLInputElement).value);
    if (!Number.isFinite(value)) {
      return;
    }

    audio.currentTime = (value / 100) * this.duration;
    this.currentTime = audio.currentTime;
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
