import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
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
export class IntroVideoPlayerComponent {
  @Input() videoUrl: string | null | undefined;
  @Input() placeholder = 'No introduction added yet';

  get resolvedUrl(): string | null {
    return resolveStorageAssetUrl(this.videoUrl);
  }

  get mediaKind(): IntroMediaKind {
    return resolveIntroMediaKind(this.videoUrl);
  }

  get isAudio(): boolean {
    return this.mediaKind === 'audio';
  }
}
