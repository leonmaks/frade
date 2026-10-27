param([string]$Executable,[string]$OutputPath,[string]$StopPath)
$ErrorActionPreference='Stop'
Add-Type -TypeDefinition @"
using System;using System.IO;using System.Text;using System.Diagnostics;using System.Threading;using System.Collections.Generic;using System.Runtime.InteropServices;
public static class FradeFixtureWindows {
 [DllImport("user32.dll")]static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")]static extern uint GetWindowThreadProcessId(IntPtr h,out uint pid);
 [DllImport("user32.dll")]static extern IntPtr GetThreadDesktop(uint tid);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)]static extern bool GetUserObjectInformation(IntPtr h,int i,StringBuilder s,uint bytes,out uint need);
 public class Row{public long EpochMs;public int Pid;public long Hwnd;public string Desktop;public bool Foreground;}
 public static List<Row> Run(string exe,string stop){var rows=new List<Row>();var timer=Stopwatch.StartNew();while(timer.ElapsedMilliseconds<180000&&!File.Exists(stop)){IntPtr foreground=GetForegroundWindow();foreach(var p in Process.GetProcessesByName("electron")){try{if(!String.Equals(p.MainModule.FileName,exe,StringComparison.OrdinalIgnoreCase))continue;var h=p.MainWindowHandle;if(h==IntPtr.Zero)continue;uint pid;uint tid=GetWindowThreadProcessId(h,out pid);if(pid!=(uint)p.Id)continue;var name=new StringBuilder(256);uint needed;if(!GetUserObjectInformation(GetThreadDesktop(tid),2,name,512,out needed))throw new Exception("Target desktop unavailable");rows.Add(new Row{EpochMs=DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),Pid=p.Id,Hwnd=h.ToInt64(),Desktop=name.ToString(),Foreground=h==foreground});}catch(InvalidOperationException){/* target exited during discovery */}finally{p.Dispose();}}Thread.Sleep(20);}return rows;}
}
"@
[FradeFixtureWindows]::Run($Executable,$StopPath)|ConvertTo-Json -Depth 4 -Compress|Set-Content -Encoding utf8 -LiteralPath $OutputPath
