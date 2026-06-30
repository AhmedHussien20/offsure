import { CommonModule } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Injector,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import {
  DEFAULT_INTRO_VIDEO_SETTINGS,
  INTRO_VIDEO_ACCEPT,
  IntroVideoSettingsDto,
} from 'app/core/models/team-members/intro-video.models';
import { resolveStorageAssetUrl } from 'app/core/models/team-members/team-member.models';
import { TeamPortalService } from 'app/core/services/team-portal.service';
import { IntroVideoPlayerComponent } from 'app/shared/components/intro-video-player/intro-video-player.component';
import { ConfirmDialogService } from 'app/shared/services/confirm-dialog.service';
import { ToastrService } from 'ngx-toastr';

type RecorderPhase = 'permission' | 'idle' | 'countdown' | 'recording' | 'preview';

@Component({
  selector: 'app-intro-video-manager',
  standalone: true,
  imports: [CommonModule, IntroVideoPlayerComponent],
  templateUrl: './intro-video-manager.component.html',
  styleUrl: './intro-video-manager.component.scss',
})
export class IntroVideoManagerComponent implements OnInit, OnDestroy {
  @Input() videoUrl: string | null | undefined;
  @Output() videoChange = new EventEmitter<string | null | undefined>();

  @ViewChild('livePreview') livePreviewRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('recordedPreview') recordedPreviewRef?: ElementRef<HTMLVideoElement>;

  settings: IntroVideoSettingsDto = { ...DEFAULT_INTRO_VIDEO_SETTINGS };
  readonly accept = INTRO_VIDEO_ACCEPT;

  busy = false;
  showRecorder = false;
  recorderPhase: RecorderPhase = 'idle';
  countdownValue = 0;
  recordingSeconds = 0;
  cameraError: string | null = null;
  requestingPermission = false;
  cameraReady = false;

  private mediaStream: MediaStream | null = null;
  private previewStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private recordedBlob: Blob | null = null;
  recordedPreviewUrl: string | null = null;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;
  private recordingTimer: ReturnType<typeof setInterval> | null = null;
  private maxDurationTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private teamPortal: TeamPortalService,
    private toastr: ToastrService,
    private confirmDialog: ConfirmDialogService,
    private cdr: ChangeDetectorRef,
    private injector: Injector
  ) {}

  ngOnInit(): void {
    this.teamPortal.getIntroVideoSettings().subscribe({
      next: res => {
        if (res.data) {
          this.settings = res.data;
        }
      },
      error: () => {
        this.settings = { ...DEFAULT_INTRO_VIDEO_SETTINGS };
      },
    });
  }

  ngOnDestroy(): void {
    this.cleanupRecorder();
  }

  get hasVideo(): boolean {
    return !!resolveStorageAssetUrl(this.videoUrl);
  }

  get previewUrl(): string | null {
    if (this.recordedPreviewUrl) {
      return this.recordedPreviewUrl;
    }
    return resolveStorageAssetUrl(this.videoUrl);
  }

  get maxDurationLabel(): string {
    return `${this.settings.maxDurationSeconds}s`;
  }

  get fileSizeLabel(): string {
    return `${this.settings.maxFileSizeMb} MB`;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.uploadFile(file);
    }
    input.value = '';
  }

  openRecorder(): void {
    this.showRecorder = true;
    this.recorderPhase = 'permission';
    this.cameraError = null;
    this.cameraReady = false;
    this.requestingPermission = false;
  }

  async requestCameraAccess(): Promise<void> {
    this.cameraError = null;
    this.requestingPermission = true;

    const stream = await this.acquireMediaStream();
    this.requestingPermission = false;

    if (!stream) {
      return;
    }

    this.mediaStream = stream;
    this.cameraReady = true;
    this.recorderPhase = 'idle';
    this.cdr.detectChanges();

    afterNextRender(
      () => {
        void this.attachStreamToPreview();
      },
      { injector: this.injector }
    );
  }

  closeRecorder(): void {
    this.showRecorder = false;
    this.cleanupRecorder();
  }

  async startCountdown(): Promise<void> {
    if (!this.mediaStream) {
      await this.requestCameraAccess();
    }
    if (!this.mediaStream) {
      return;
    }

    await this.attachStreamToPreview();

    this.clearRecordedPreview();
    this.recorderPhase = 'countdown';
    this.countdownValue = 3;

    this.countdownTimer = setInterval(() => {
      this.countdownValue -= 1;
      if (this.countdownValue <= 0) {
        this.clearCountdownTimer();
        this.beginRecording();
      }
    }, 1000);
  }

  discardRecording(): void {
    this.clearRecordedPreview();
    this.recorderPhase = this.cameraReady ? 'idle' : 'permission';
    this.recordingSeconds = 0;
    if (this.cameraReady) {
      this.cdr.detectChanges();
      afterNextRender(
        () => {
          void this.attachStreamToPreview();
        },
        { injector: this.injector }
      );
    }
  }

  async saveRecording(): Promise<void> {
    if (!this.recordedBlob) {
      return;
    }

    const extension = this.recordedBlob.type.includes('webm') ? 'webm' : 'mp4';
    const file = new File([this.recordedBlob], `intro-video.${extension}`, {
      type: this.recordedBlob.type || 'video/webm',
    });
    await this.uploadFile(file);
    this.closeRecorder();
  }

  async deleteVideo(): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Remove introduction video',
      message: 'Remove your introduction video? You can upload or record a new one later.',
      confirmLabel: 'Remove video',
      variant: 'danger',
    });
    if (!confirmed) {
      return;
    }

    this.busy = true;
    this.teamPortal.deleteIntroVideo().subscribe({
      next: res => {
        this.videoUrl = res.data?.introVideoUrl ?? null;
        this.videoChange.emit(this.videoUrl);
        this.toastr.success('Introduction video removed.');
        this.busy = false;
      },
      error: err => {
        this.toastr.error(err?.error?.message || 'Failed to remove video.');
        this.busy = false;
      },
    });
  }

  private async uploadFile(file: File): Promise<void> {
    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!this.settings.acceptedFormats.includes(extension)) {
      this.toastr.error('Video must be MP4, WEBM, or MOV.');
      return;
    }

    const maxBytes = this.settings.maxFileSizeMb * 1024 * 1024;
    if (file.size > maxBytes) {
      this.toastr.error(`Video must be ${this.settings.maxFileSizeMb}MB or smaller.`);
      return;
    }

    this.busy = true;
    this.teamPortal.uploadIntroVideo(file).subscribe({
      next: res => {
        this.videoUrl = res.data?.introVideoUrl ?? null;
        this.videoChange.emit(this.videoUrl);
        this.toastr.success('Introduction video saved.');
        this.busy = false;
      },
      error: err => {
        this.toastr.error(err?.error?.message || 'Failed to upload video.');
        this.busy = false;
      },
    });
  }

  private async acquireMediaStream(): Promise<MediaStream | null> {
    if (!navigator.mediaDevices?.getUserMedia) {
      this.cameraError = 'Camera recording is not supported in this browser.';
      return null;
    }

    const attempts: MediaStreamConstraints[] = [
      { video: { facingMode: 'user' }, audio: true },
      { video: true, audio: true },
      { video: true, audio: false },
    ];

    let lastError: unknown = null;

    for (const constraints of attempts) {
      try {
        this.stopMediaStream();
        return await navigator.mediaDevices.getUserMedia(constraints);
      } catch (error) {
        lastError = error;
        if (this.isPermissionDenied(error)) {
          break;
        }
      }
    }

    this.cameraError = this.describeMediaError(lastError);
    this.stopMediaStream();
    return null;
  }

  private isPermissionDenied(error: unknown): boolean {
    return error instanceof DOMException && error.name === 'NotAllowedError';
  }

  private describeMediaError(error: unknown): string {
    if (error instanceof DOMException) {
      switch (error.name) {
        case 'NotAllowedError':
          return 'Camera access was blocked. Click "Allow camera & microphone" below — your browser should prompt you. If it does not, open site settings (lock icon in the address bar) and allow camera and microphone for this site.';
        case 'NotFoundError':
          return 'No camera or microphone was found on this device. Connect a camera or use "Upload video" instead.';
        case 'NotReadableError':
        case 'AbortError':
          return 'Your camera or microphone is in use by another app. Close other apps using the camera and try again.';
        case 'SecurityError':
          return 'Camera access requires a secure connection. Use https:// or http://localhost.';
        case 'OverconstrainedError':
          return 'Your camera does not support the requested settings. Try again or upload a video file instead.';
        default:
          return `Unable to access camera (${error.name}). Check browser permissions or upload a video file.`;
      }
    }

    return 'Unable to access camera and microphone. Click "Allow camera & microphone" and approve the browser prompt.';
  }

  private async attachStreamToPreview(): Promise<void> {
    const video = this.livePreviewRef?.nativeElement;
    if (!video || !this.mediaStream) {
      return;
    }

    // Preview is video-only so the mic is not played back through speakers (no echo).
    this.previewStream = new MediaStream(this.mediaStream.getVideoTracks());
    video.muted = true;
    video.volume = 0;
    video.srcObject = this.previewStream;
    try {
      await video.play();
    } catch {
      // Muted preview should still work; ignore autoplay policy edge cases.
    }
  }

  private beginRecording(): void {
    if (!this.mediaStream) {
      return;
    }

    this.recordedChunks = [];
    const preferredType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : '';

    try {
      this.mediaRecorder = preferredType
        ? new MediaRecorder(this.mediaStream, { mimeType: preferredType })
        : new MediaRecorder(this.mediaStream);
    } catch {
      this.toastr.error('Recording is not supported in this browser.');
      this.recorderPhase = 'idle';
      return;
    }

    this.mediaRecorder.ondataavailable = event => {
      if (event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      const type = this.mediaRecorder?.mimeType || 'video/webm';
      this.recordedBlob = new Blob(this.recordedChunks, { type });
      this.revokeRecordedPreviewUrl();
      this.recordedPreviewUrl = URL.createObjectURL(this.recordedBlob);

      this.stopMediaStream();
      this.recorderPhase = 'preview';
      this.clearRecordingTimer();
      this.cdr.detectChanges();

      afterNextRender(
        () => {
          void this.loadRecordedPreview();
        },
        { injector: this.injector }
      );
    };

    this.mediaRecorder.start(250);
    this.recorderPhase = 'recording';
    this.recordingSeconds = 0;

    this.recordingTimer = setInterval(() => {
      this.recordingSeconds += 1;
    }, 1000);

    this.maxDurationTimer = setTimeout(() => {
      this.stopRecording();
    }, this.settings.maxDurationSeconds * 1000);
  }

  private async loadRecordedPreview(): Promise<void> {
    const preview = this.recordedPreviewRef?.nativeElement;
    if (!preview || !this.recordedPreviewUrl) {
      return;
    }

    preview.src = this.recordedPreviewUrl;
    preview.load();
  }

  stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.clearMaxDurationTimer();
  }

  private cleanupRecorder(): void {
    this.clearCountdownTimer();
    this.clearRecordingTimer();
    this.clearMaxDurationTimer();
    this.stopMediaRecorder();
    this.stopMediaStream();
    this.clearRecordedPreview();
    this.recorderPhase = 'permission';
    this.recordingSeconds = 0;
    this.cameraError = null;
    this.cameraReady = false;
    this.requestingPermission = false;
  }

  private clearRecordedPreview(): void {
    this.recordedBlob = null;
    this.revokeRecordedPreviewUrl();
    this.recordedChunks = [];
  }

  private revokeRecordedPreviewUrl(): void {
    if (this.recordedPreviewUrl) {
      URL.revokeObjectURL(this.recordedPreviewUrl);
      this.recordedPreviewUrl = null;
    }
  }

  private stopMediaRecorder(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.mediaRecorder = null;
  }

  private stopMediaStream(): void {
    this.mediaStream?.getTracks().forEach(track => track.stop());
    this.mediaStream = null;
    this.previewStream = null;

    const video = this.livePreviewRef?.nativeElement;
    if (video) {
      video.srcObject = null;
      video.muted = true;
      video.volume = 0;
    }
  }

  private clearCountdownTimer(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  private clearRecordingTimer(): void {
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
    }
  }

  private clearMaxDurationTimer(): void {
    if (this.maxDurationTimer) {
      clearTimeout(this.maxDurationTimer);
      this.maxDurationTimer = null;
    }
  }
}
