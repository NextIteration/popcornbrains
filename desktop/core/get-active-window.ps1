Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class WinAPI {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
"@

$hwnd = [WinAPI]::GetForegroundWindow()
$sb = New-Object System.Text.StringBuilder 256
[void][WinAPI]::GetWindowText($hwnd, $sb, 256)
$pid2 = [uint32]0
[void][WinAPI]::GetWindowThreadProcessId($hwnd, [ref]$pid2)
$proc = Get-Process -Id $pid2 -ErrorAction SilentlyContinue
$procName = if($proc) { $proc.ProcessName } else { "Unknown" }
Write-Output "$procName|||$($sb.ToString())"
