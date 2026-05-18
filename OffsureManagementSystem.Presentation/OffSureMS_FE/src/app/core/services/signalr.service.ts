import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { ToastrService } from 'ngx-toastr';
import { BehaviorSubject } from 'rxjs';
export interface SignalRNotification {
  message: string;
  link?: string;
  createdAt: Date;
  taskId?: number;
}

@Injectable({ providedIn: 'root' })
export class SignalRService {
  private hubConnection!: signalR.HubConnection;
  private isStarted = false;
  private isListenerRegistered = false;

  private notificationSubject = new BehaviorSubject<SignalRNotification | null>(null);

  notification$ = this.notificationSubject.asObservable();
  constructor(
    private toastr: ToastrService
  ) { }

  startConnection(userId: number,) {

    if (this.isStarted) return;

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`https://taskmangmentapi-bzh2erdwazfea9g8.westeurope-01.azurewebsites.net/notifications?userId=${userId}`)
      //.withUrl(`https://localhost:7115/notifications?userId=${userId}`)
      .withAutomaticReconnect()
      .build();

    this.hubConnection.start()
      .then(() => {
        console.log('✅ SignalR Connected');
        this.isStarted = true;
        this.registerListener();
      })
      .catch(err => console.error(' SignalR Error', err));
  }

  private registerListener() {

    if (this.isListenerRegistered) return;

    this.hubConnection.on('ReceiveNotification', (data: { message: string, taskId?: number }) => {
      const notification: SignalRNotification = {
        message: data.message,
        createdAt: new Date(),
        link: '/pages/notifications-list',
        taskId: data.taskId
      };
      console.log('Notification received:', notification.message);
      this.toastr.info(notification.message, '');
      this.notificationSubject.next(notification);
    });

    this.isListenerRegistered = true;
  }

  stop() {
    this.hubConnection?.stop();
    this.isStarted = false;
    this.isListenerRegistered = false;
  }
}
