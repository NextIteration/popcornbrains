/**
 * DesktopNotifier — System-level toast notifications for interventions.
 *
 * Uses Windows toast notifications (via PowerShell) so the user sees
 * the intervention alert even when they are in Chrome, YouTube, or
 * any other desktop application.  The dashboard remains the place
 * where the user actually responds (Continue / Return to Task), but
 * the notification brings the issue to their attention immediately.
 */

import { execSync } from 'child_process';

export class DesktopNotifier {
  private lastNotificationTime: number = 0;
  private readonly cooldownMs: number;

  constructor(cooldownMs = 10_000) {
    this.cooldownMs = cooldownMs;
  }

  /**
   * Show a Windows toast notification with the given title and body.
   * Silently no-ops if the notification cannot be shown (e.g. non-Windows OS,
   * PowerShell not available, or cooldown not elapsed).
   */
  notify(title: string, body: string): void {
    const now = Date.now();
    if (now - this.lastNotificationTime < this.cooldownMs) {
      return; // Rate-limit notifications
    }

    try {
      // Escape single quotes for PowerShell strings
      const safeTitle = title.replace(/'/g, "''");
      const safeBody = body.replace(/'/g, "''");

      const ps = `
        [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
        [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null

        $template = @"
        <toast duration="long">
          <visual>
            <binding template="ToastGeneric">
              <text>$( '${safeTitle}' )</text>
              <text>$( '${safeBody}' )</text>
            </binding>
          </visual>
          <audio src="ms-winsoundevent:Notification.Default"/>
        </toast>
"@

        $xml = New-Object Windows.Data.Xml.Dom.XmlDocument
        $xml.LoadXml($template)
        $toast = [Windows.UI.Notifications.ToastNotification]::new($xml)
        [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('The Unplugged').Show($toast)
      `;

      execSync(
        `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "${ps.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`,
        { timeout: 5000, stdio: 'ignore' }
      );

      this.lastNotificationTime = now;
      console.log('[DesktopNotifier] Toast notification shown');
    } catch {
      // Fallback: try simpler BurntToast or msg approach
      try {
        const safeTitle = title.replace(/'/g, "''");
        const safeBody = body.replace(/'/g, "''");

        execSync(
          `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "Add-Type -AssemblyName System.Windows.Forms; $n = New-Object System.Windows.Forms.NotifyIcon; $n.Icon = [System.Drawing.SystemIcons]::Warning; $n.Visible = $true; $n.ShowBalloonTip(10000, '${safeTitle}', '${safeBody}', [System.Windows.Forms.ToolTipIcon]::Warning); Start-Sleep -Seconds 3; $n.Dispose()"`,
          { timeout: 8000, stdio: 'ignore' }
        );

        this.lastNotificationTime = now;
        console.log('[DesktopNotifier] Balloon notification shown (fallback)');
      } catch {
        console.warn('[DesktopNotifier] Could not show notification');
      }
    }
  }
}
