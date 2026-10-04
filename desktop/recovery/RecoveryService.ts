/**
 * RecoveryService — Member 4
 *
 * Helps the user return to their intended task after a drift event.
 * Uses mock app/tab restoration for now; real implementation will
 * use OS-level window management from the tracking service.
 *
 * Does NOT close the user's current applications.
 */

import type { RecoveryTarget, RecoveryResult, UserIntent } from '../shared/types.js';
import type { ITrackingService } from '../shared/mocks.js';

export interface IRecoveryService {
  returnToTask(intent: UserIntent): Promise<RecoveryResult>;
  getLastRecovery(): RecoveryResult | null;
}

export class RecoveryService implements IRecoveryService {
  private trackingService: ITrackingService;
  private lastRecovery: RecoveryResult | null = null;

  constructor(trackingService: ITrackingService) {
    this.trackingService = trackingService;
  }

  /**
   * Attempt to bring the user back to their intended task.
   * Does NOT close the current app — just brings the target to focus.
   */
  async returnToTask(intent: UserIntent): Promise<RecoveryResult> {
    const target = this.resolveTarget(intent);

    try {
      // In real implementation, this would use OS APIs to:
      // 1. Find the target application window
      // 2. Bring it to the foreground
      // 3. Optionally restore a specific tab/file
      const success = await this.mockRestoreWindow(target);

      const result: RecoveryResult = {
        success,
        target,
        message: success
          ? `Brought ${target.application} back to focus.`
          : `Could not find ${target.application}. It may not be running.`,
        timestamp: Date.now(),
      };

      this.lastRecovery = result;
      return result;
    } catch (error) {
      const result: RecoveryResult = {
        success: false,
        target,
        message: `Recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now(),
      };

      this.lastRecovery = result;
      return result;
    }
  }

  /**
   * Get the last recovery attempt result.
   */
  getLastRecovery(): RecoveryResult | null {
    return this.lastRecovery;
  }

  // ----- Private -----

  /**
   * Resolve an intent to a concrete application target.
   */
  private resolveTarget(intent: UserIntent): RecoveryTarget {
    // Use application hints from the intent to determine the target
    const primaryApp = intent.applicationHints?.[0] ?? 'Unknown';

    // Determine if it's a URL-based app
    const isUrl = primaryApp.includes('.') && !primaryApp.includes(' ');

    return {
      application: primaryApp,
      windowTitle: intent.description,
      url: isUrl ? `https://${primaryApp}` : undefined,
    };
  }

  /**
   * Mock window restoration.
   * Real implementation would use electron's BrowserWindow or OS-level APIs.
   */
  private async mockRestoreWindow(target: RecoveryTarget): Promise<boolean> {
    // Simulate async window restoration
    await new Promise(resolve => setTimeout(resolve, 100));

    // Mock: assume success 90% of the time
    // In real impl, this checks if the window actually exists
    const currentApp = this.trackingService.getCurrentApp();

    // If the target app is the same as current, we're already there
    if (currentApp.name.toLowerCase() === target.application.toLowerCase()) {
      return true;
    }

    // Mock: simulate bringing to focus (always succeeds for now)
    return true;
  }
}
