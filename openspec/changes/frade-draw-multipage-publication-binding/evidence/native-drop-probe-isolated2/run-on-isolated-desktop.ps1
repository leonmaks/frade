param([Parameter(Mandatory=$true)][string]$Script)
$ErrorActionPreference='Stop'
$scriptPath=(Resolve-Path -LiteralPath $Script).Path
if(-not $scriptPath.StartsWith('E:\dev\codex\frade\.worktrees\requests\')){throw 'Unapproved isolated script path'}
Add-Type -TypeDefinition @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class FradeProofDesktop {
 [StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)] public struct STARTUPINFO { public int cb; public string reserved; public string desktop; public string title; public uint x,y,xSize,ySize,xChars,yChars,fill,flags; public short show,reserved2; public IntPtr reservedPtr,input,output,error; }
 [StructLayout(LayoutKind.Sequential)] public struct PROCESSINFO { public IntPtr process,thread; public uint pid,tid; }
 [DllImport("user32.dll",CharSet=CharSet.Unicode,SetLastError=true)] public static extern IntPtr CreateDesktop(string name,IntPtr device,IntPtr devmode,uint flags,uint access,IntPtr security);
 [DllImport("user32.dll",SetLastError=true)] public static extern bool CloseDesktop(IntPtr desktop);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] public static extern bool CreateProcess(string app,StringBuilder command,IntPtr processSecurity,IntPtr threadSecurity,bool inherit,uint flags,IntPtr environment,string cwd,ref STARTUPINFO startup,out PROCESSINFO process);
 [DllImport("kernel32.dll",SetLastError=true)] public static extern uint WaitForSingleObject(IntPtr handle,uint timeout);
 [DllImport("kernel32.dll",SetLastError=true)] public static extern bool GetExitCodeProcess(IntPtr handle,out uint exitCode);
 [DllImport("kernel32.dll",SetLastError=true)] public static extern bool CloseHandle(IntPtr handle);
}
'@
$desktopName='FradeProof_'+[Guid]::NewGuid().ToString('N')
$desktop=[FradeProofDesktop]::CreateDesktop($desktopName,[IntPtr]::Zero,[IntPtr]::Zero,0,0x10000000,[IntPtr]::Zero)
if($desktop -eq [IntPtr]::Zero){throw "CreateDesktop failed: $([Runtime.InteropServices.Marshal]::GetLastWin32Error())"}
$process=[FradeProofDesktop+PROCESSINFO]::new()
try{
 $startup=[FradeProofDesktop+STARTUPINFO]::new();$startup.cb=[Runtime.InteropServices.Marshal]::SizeOf($startup);$startup.desktop='winsta0\'+$desktopName;$startup.flags=1;$startup.show=0
 $shellPath=Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
 $command=[Text.StringBuilder]::new(('"'+$shellPath+'" -NoProfile -NonInteractive -File "'+$scriptPath+'"'))
 $ok=[FradeProofDesktop]::CreateProcess($shellPath,$command,[IntPtr]::Zero,[IntPtr]::Zero,$false,0x08000000,[IntPtr]::Zero,'E:\dev\codex\frade',[ref]$startup,[ref]$process)
 if(-not $ok){throw "CreateProcess failed: $([Runtime.InteropServices.Marshal]::GetLastWin32Error())"}
 @{desktop=$desktopName;pid=$process.pid;script=$scriptPath;userDesktopSwitched=$false;createdAt=[DateTime]::UtcNow.ToString('o')}|ConvertTo-Json|Set-Content -Encoding utf8 -LiteralPath ($scriptPath+'.desktop-start.json')
 $wait=[FradeProofDesktop]::WaitForSingleObject($process.process,[uint32]::MaxValue)
 if($wait -ne 0){throw "Process wait failed: $wait"}
 [uint32]$resultCode=0
 if(-not [FradeProofDesktop]::GetExitCodeProcess($process.process,[ref]$resultCode)){throw 'Missing child exit code'}
 @{desktop=$desktopName;pid=$process.pid;exitCode=$resultCode;userDesktopSwitched=$false;finishedAt=[DateTime]::UtcNow.ToString('o')}|ConvertTo-Json|Set-Content -Encoding utf8 -LiteralPath ($scriptPath+'.desktop-result.json')
}finally{
 if($process.thread -ne [IntPtr]::Zero){[void][FradeProofDesktop]::CloseHandle($process.thread)}
 if($process.process -ne [IntPtr]::Zero){[void][FradeProofDesktop]::CloseHandle($process.process)}
 [void][FradeProofDesktop]::CloseDesktop($desktop)
}
exit $resultCode
