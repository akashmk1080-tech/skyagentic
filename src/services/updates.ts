import { Platform, Alert } from 'react-native';
import * as Updates from 'expo-updates';

export interface UpdateStatus {
  isChecking: boolean;
  isDownloading: boolean;
  isUpdateAvailable: boolean;
  updateMessage: string;
}

class UpdatesServiceManager {
  private listeners: ((status: UpdateStatus) => void)[] = [];
  private status: UpdateStatus = {
    isChecking: false,
    isDownloading: false,
    isUpdateAvailable: false,
    updateMessage: '',
  };

  public subscribe(listener: (status: UpdateStatus) => void): () => void {
    this.listeners.push(listener);
    listener(this.status);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private setStatus(newStatus: Partial<UpdateStatus>) {
    this.status = { ...this.status, ...newStatus };
    this.listeners.forEach(l => l(this.status));
  }

  /**
   * Automatically check for and apply updates in the background on app launch
   */
  public async autoCheckOnLaunch() {
    if (Platform.OS === 'web') {
      return;
    }

    if (!Updates.isEnabled) {
      console.log('[Updates] expo-updates is not enabled in dev mode. Active in production/preview builds.');
      return;
    }

    try {
      this.setStatus({ isChecking: true, updateMessage: 'Checking for updates...' });
      const check = await Updates.checkForUpdateAsync();

      if (check.isAvailable) {
        this.setStatus({
          isChecking: false,
          isDownloading: true,
          isUpdateAvailable: true,
          updateMessage: 'Downloading latest developer update...',
        });

        await Updates.fetchUpdateAsync();
        
        this.setStatus({
          isDownloading: false,
          updateMessage: 'Update downloaded. Reloading app...',
        });

        // Automatically reload app with latest update
        await Updates.reloadAsync();
      } else {
        this.setStatus({ isChecking: false, updateMessage: 'App is up to date.' });
      }
    } catch (e: any) {
      console.warn('[Updates] Auto-check error:', e.message);
      this.setStatus({ isChecking: false, updateMessage: '' });
    }
  }

  /**
   * Manual update check triggered from Settings
   */
  public async checkManually(): Promise<{ success: boolean; message: string }> {
    if (Platform.OS === 'web') {
      return {
        success: true,
        message: 'On Web, changes are updated instantly on page refresh.',
      };
    }

    if (!Updates.isEnabled) {
      return {
        success: false,
        message: 'Auto-updates are active in your installed standalone APK (disabled in local Expo Go dev).',
      };
    }

    try {
      this.setStatus({ isChecking: true, updateMessage: 'Checking for updates...' });
      const check = await Updates.checkForUpdateAsync();

      if (check.isAvailable) {
        this.setStatus({ isChecking: false, isDownloading: true, isUpdateAvailable: true });
        await Updates.fetchUpdateAsync();

        Alert.alert(
          'Update Ready!',
          'A new version has been downloaded. Would you like to restart now to apply changes?',
          [
            { text: 'Later', style: 'cancel' },
            {
              text: 'Restart Now',
              onPress: async () => {
                await Updates.reloadAsync();
              },
            },
          ]
        );

        return { success: true, message: 'New update downloaded and ready to apply.' };
      } else {
        this.setStatus({ isChecking: false, updateMessage: 'App is already on the latest version.' });
        return { success: true, message: 'You are on the latest version!' };
      }
    } catch (e: any) {
      this.setStatus({ isChecking: false });
      return { success: false, message: e.message || 'Could not reach update server.' };
    }
  }
}

export const UpdatesService = new UpdatesServiceManager();
