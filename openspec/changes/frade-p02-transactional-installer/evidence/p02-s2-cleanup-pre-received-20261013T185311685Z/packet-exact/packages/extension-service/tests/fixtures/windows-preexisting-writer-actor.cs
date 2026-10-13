using System;using System.Runtime.InteropServices;using System.Web.Script.Serialization;
[assembly: DefaultDllImportSearchPaths(DllImportSearchPath.System32)]
class Writer {
[DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern IntPtr CreateFileW(string p,uint a,uint s,IntPtr d,uint c,uint f,IntPtr t);
[DllImport("kernel32.dll",SetLastError=true)] static extern bool CloseHandle(IntPtr h);
static int Main(string[] args){if(args.Length!=1)return 3;IntPtr h=CreateFileW(args[0],0x40000000,7,IntPtr.Zero,3,0x02000000|0x00200000,IntPtr.Zero);var json=new JavaScriptSerializer();if(h==new IntPtr(-1)){Console.WriteLine(json.Serialize(new {stage="writer-open",success=false,error=Marshal.GetLastWin32Error()}));return 2;}try{Console.WriteLine(json.Serialize(new {stage="writer-held",success=true,error=0}));Console.ReadLine();}finally{if(!CloseHandle(h))throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());}return 0;}}
