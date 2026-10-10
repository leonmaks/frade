using System;using System.IO;using System.Text;using System.Runtime.InteropServices;using System.Web.Script.Serialization;
[assembly: DefaultDllImportSearchPaths(DllImportSearchPath.System32)]
class Actor {
[StructLayout(LayoutKind.Sequential)] struct IoStatus {public IntPtr Status,Information;}
[DllImport("ntdll.dll")] static extern int NtSetInformationFile(IntPtr h,out IoStatus io,IntPtr b,uint n,int c);
[DllImport("ntdll.dll")] static extern uint RtlNtStatusToDosError(int s);
[DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern IntPtr CreateFileW(string p,uint a,uint s,IntPtr d,uint c,uint f,IntPtr t);
[DllImport("kernel32.dll",SetLastError=true)] static extern bool CloseHandle(IntPtr h);
static int Rename(IntPtr h,string name){byte[] b=Encoding.Unicode.GetBytes(name);int n=24+b.Length+2;IntPtr p=Marshal.AllocHGlobal(n);try{for(int i=0;i<n;i++)Marshal.WriteByte(p,i,0);Marshal.WriteInt32(p,16,b.Length);Marshal.Copy(b,0,IntPtr.Add(p,20),b.Length);IoStatus io;int status=NtSetInformationFile(h,out io,p,(uint)n,10);return status<0?(int)RtlNtStatusToDosError(status):unchecked((int)io.Status.ToInt64());}finally{Marshal.FreeHGlobal(p);}}
static int Main(string[] args){IntPtr h=CreateFileW(args[0],0x00110000,7,IntPtr.Zero,3,0x02000000|0x00200000,IntPtr.Zero);var j=new JavaScriptSerializer();if(h==new IntPtr(-1)){Console.WriteLine(j.Serialize(new {stage="open-delete",success=false,error=Marshal.GetLastWin32Error()}));return 0;}try{string name=Path.GetFileName(args[0]);int error=Rename(h,name+"-moved"),restore=error==0?Rename(h,name):0;Console.WriteLine(j.Serialize(new {stage="nt-same-parent-ancestor-rename",success=error==0,error=error,reparseRemoved=restore==0,restoreError=restore}));return restore==0?0:3;}finally{if(!CloseHandle(h))throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());}}
}