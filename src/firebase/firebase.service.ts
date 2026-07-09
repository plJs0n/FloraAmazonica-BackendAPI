import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  initializeApp,
  getApps,
  cert,
  App,
} from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private app: App | null = null;

  onModuleInit() {
    if (getApps().length > 0) {
      this.app = getApps()[0];
      return;
    }

    try {
      const projectId   = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey  = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

      if (!projectId || !clientEmail || !privateKey) {
        this.logger.warn(
          'Firebase no configurado — push notifications desactivadas. ' +
          'Agrega FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL y FIREBASE_PRIVATE_KEY en .env',
        );
        return;
      }

      this.app = initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
      });

      this.logger.log('Firebase Admin SDK inicializado correctamente');
    } catch (err) {
      this.logger.error(`Error inicializando Firebase: ${err.message}`);
    }
  }

  /**
   * Envía push notification al dispositivo via FCM.
   * Si Firebase no está configurado o el token es inválido, loguea y continúa.
   */
  async sendPushNotification(
    fcmToken: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    if (!fcmToken || !this.app) return;

    try {
      await getMessaging(this.app).send({
        token: fcmToken,
        notification: { title, body },
        data: data ?? {},
        apns: {
          payload: { aps: { sound: 'default', badge: 1 } },
        },
        android: {
          priority: 'high',
          notification: { sound: 'default' },
        },
      });
      this.logger.log(`Push enviada → ${fcmToken.substring(0, 20)}...`);
    } catch (err) {
      this.logger.error(`Error enviando push: ${err.message}`);
    }
  }
}
