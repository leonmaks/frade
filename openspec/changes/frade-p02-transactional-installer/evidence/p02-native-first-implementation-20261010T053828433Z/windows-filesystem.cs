// First-party installation-root helper. No extension execution, network, shell or renderer path API.
using System;
using System.IO;
using System.Text;
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics;
using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text.RegularExpressions;
using System.Web.Script.Serialization;
[assembly: DefaultDllImportSearchPaths(DllImportSearchPath.System32)]
public static class FradeFilesystem {
  const uint Sync=0x100000, Attr=0x80, Delete=0x10000, Reparse=0x400;
  const int MaxFrame=131072, MaxChunk=65536, MaxFile=209715200;
  static readonly Stopwatch Clock=Stopwatch.StartNew();
  static readonly JavaScriptSerializer Json=new JavaScriptSerializer { MaxJsonLength=MaxFrame, RecursionLimit=40 };
  static readonly UTF8Encoding Utf8=new UTF8Encoding(false,true);
  static readonly Dictionary<string,Dir> Dirs=new Dictionary<string,Dir>(StringComparer.OrdinalIgnoreCase);
  static readonly List<IntPtr> Outer=new List<IntPtr>();
  static readonly Dictionary<string,Written> Writes=new Dictionary<string,Written>();
  static readonly Dictionary<string,Listing> Lists=new Dictionary<string,Listing>();
  static string Session, Volume; static long Generation, NextId=1; static uint Serial;
  static IntPtr Lease=IntPtr.Zero; static bool Bound, Effect; static int Created; static long OpenBudget;
  class Dir { public IntPtr Handle; public string Final, Key; }
  class Written { public IntPtr Handle; public Dir Parent; public string Name; public long Max, Length; public bool Sealed; public string Hash; }
  class Listing { public string Key; public List<Dictionary<string,object>> Rows; public int Index; }
  [StructLayout(LayoutKind.Sequential)] struct UnicodeString { public ushort Length, MaximumLength; public IntPtr Buffer; }
  [StructLayout(LayoutKind.Sequential)] struct ObjectAttributes { public uint Length; public IntPtr RootDirectory, ObjectName; public uint Attributes; public IntPtr SecurityDescriptor, SecurityQualityOfService; }
  [StructLayout(LayoutKind.Sequential)] struct IoStatus { public IntPtr Status, Information; }
  [StructLayout(LayoutKind.Sequential)] struct FileInfo { public uint Attributes; public System.Runtime.InteropServices.ComTypes.FILETIME Created, Accessed, Written; public uint VolumeSerial, SizeHigh, SizeLow, Links, IdHigh, IdLow; }
  [DllImport("ntdll.dll")] static extern int NtCreateFile(out IntPtr h,uint access,ref ObjectAttributes attrs,out IoStatus ios,IntPtr size,uint attributes,uint share,uint disposition,uint options,IntPtr ea,uint eaLength);
  [DllImport("ntdll.dll")] static extern uint RtlNtStatusToDosError(int status);
  [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern IntPtr CreateFileW(string name,uint access,uint share,IntPtr security,uint disposition,uint flags,IntPtr template);
  [DllImport("kernel32.dll",SetLastError=true)] static extern bool CloseHandle(IntPtr h);
  [DllImport("kernel32.dll",SetLastError=true)] static extern bool GetFileInformationByHandle(IntPtr h,out FileInfo info);
  [DllImport("kernel32.dll",SetLastError=true)] static extern bool GetFileInformationByHandleEx(IntPtr h,int type,IntPtr buffer,uint length);
  [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern uint GetFinalPathNameByHandleW(IntPtr h,StringBuilder result,uint length,uint flags);
  [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern bool GetVolumeNameForVolumeMountPointW(string mount,StringBuilder result,uint length);
  [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern bool GetVolumeInformationW(string root,StringBuilder name,uint nameLength,out uint serial,out uint component,out uint flags,StringBuilder fs,uint fsLength);
  [DllImport("kernel32.dll",CharSet=CharSet.Unicode)] static extern uint GetDriveTypeW(string root);
  [DllImport("kernel32.dll",SetLastError=true)] static extern bool SetFilePointerEx(IntPtr h,long distance,out long position,uint method);
  [DllImport("kernel32.dll",SetLastError=true)] static extern bool ReadFile(IntPtr h,byte[] buffer,uint count,out uint read,IntPtr overlapped);
  [DllImport("kernel32.dll",SetLastError=true)] static extern bool WriteFile(IntPtr h,byte[] buffer,uint count,out uint written,IntPtr overlapped);
  [DllImport("kernel32.dll",SetLastError=true)] static extern bool FlushFileBuffers(IntPtr h);
  [DllImport("kernel32.dll",SetLastError=true)] static extern bool SetFileInformationByHandle(IntPtr h,int type,IntPtr buffer,uint length);
  static void Check(bool value) { if(!value) throw new Win32Exception(Marshal.GetLastWin32Error()); }
  static void Refuse(string code) { throw new InvalidDataException(code); }
  static string S(Dictionary<string,object> v,string k) { object x; if(!v.TryGetValue(k,out x)||!(x is string)) Refuse("INVALID_"+k); return (string)x; }
  static long N(Dictionary<string,object> v,string k,long min,long max) { object x; if(!v.TryGetValue(k,out x)||!(x is int || x is long || x is decimal || x is double)) Refuse("INVALID_"+k); decimal d=Convert.ToDecimal(x); if(d!=Decimal.Truncate(d)||d<min||d>max) Refuse("INVALID_"+k); return (long)d; }
  static bool Component(string s) { return s.Length>0&&s.Length<=255&&s.Normalize()==s&&s!="."&&s!=".."&&!Regex.IsMatch(s,@"[\x00-\x1f\x7f<>:""/\\|?*]")&&!Regex.IsMatch(s,@"[. ]$")&&!Regex.IsMatch(s,@"^(CON|PRN|AUX|NUL|COM[1-9¹²³]|LPT[1-9¹²³])(?:\.|$)",RegexOptions.IgnoreCase); }
  static string[] PathParts(Dictionary<string,object> v,string key,bool empty) { object x; if(!v.TryGetValue(key,out x)||!(x is object[])) Refuse("INVALID_PATH"); object[] a=(object[])x; if(a.Length>32||(!empty&&a.Length==0)) Refuse("INVALID_PATH_DEPTH"); var parts=new string[a.Length]; for(int i=0;i<a.Length;i++){if(!(a[i] is string)||!Component((string)a[i])) Refuse("INVALID_COMPONENT");parts[i]=(string)a[i];}if(String.Join("\\",parts).Length>4096) Refuse("INVALID_PATH_LENGTH");return parts; }
  static void Keys(Dictionary<string,object> v,params string[] extra) { var expected=new HashSet<string>(new[]{"version","session","generation","requestId","deadlineMs","operation"});foreach(string s in extra) expected.Add(s);if(v.Count!=expected.Count)Refuse("UNKNOWN_OR_MISSING_FIELD");foreach(string k in v.Keys)if(!expected.Contains(k))Refuse("UNKNOWN_FIELD"); }
  static string Final(IntPtr h) {var b=new StringBuilder(4097);uint n=GetFinalPathNameByHandleW(h,b,4097,1);if(n==0||n>4096)throw new Win32Exception(Marshal.GetLastWin32Error());return b.ToString();}
  static FileInfo Identity(IntPtr h,bool directory,string expected) { FileInfo f;Check(GetFileInformationByHandle(h,out f));if((f.Attributes&(Reparse|0x40|0x1000|0x4000|0x200))!=0||((f.Attributes&0x10)!=0)!=directory||f.VolumeSerial!=Serial||(!directory&&f.Links!=1)||!String.Equals(Final(h),expected,StringComparison.OrdinalIgnoreCase))Refuse("UNSAFE_OBJECT_IDENTITY");if(directory){IntPtr buf=Marshal.AllocHGlobal(4);try{Check(GetFileInformationByHandleEx(h,23,buf,4));if(Marshal.ReadInt32(buf)!=0)Refuse("CASE_SENSITIVE_DIRECTORY");}finally{Marshal.FreeHGlobal(buf);}}return f; }
  static void Close(IntPtr h) {if(h!=IntPtr.Zero)Check(CloseHandle(h));}
  static IntPtr Relative(IntPtr parent,string name,bool directory,uint disposition,bool writable,bool deletable) {
    if(!Component(name))Refuse("INVALID_COMPONENT");IntPtr text=Marshal.StringToHGlobalUni(name),ptr=IntPtr.Zero,h;
    try { var u=new UnicodeString {Length=checked((ushort)(name.Length*2)),MaximumLength=checked((ushort)((name.Length+1)*2)),Buffer=text};ptr=Marshal.AllocHGlobal(Marshal.SizeOf(typeof(UnicodeString)));Marshal.StructureToPtr(u,ptr,false);var a=new ObjectAttributes {Length=(uint)Marshal.SizeOf(typeof(ObjectAttributes)),RootDirectory=parent,ObjectName=ptr,Attributes=0x40};IoStatus io;uint access=Sync|Attr|1|(writable?2u:0u)|(deletable?Delete:0u);int status=NtCreateFile(out h,access,ref a,out io,IntPtr.Zero,0x80,directory?1u:0u,disposition,0x200000|0x20|(directory?1u:0x40u)|(writable?2u:0u),IntPtr.Zero,0);if(status<0)throw new Win32Exception((int)RtlNtStatusToDosError(status));if(disposition==2 || io.Information.ToInt64()==2)Effect=true;return h;
    } finally {if(ptr!=IntPtr.Zero)Marshal.FreeHGlobal(ptr);Marshal.FreeHGlobal(text);}
  }
  static Dir Directory(string[] parts) {Dir d=Dirs[""];string key="";foreach(string part in parts){key=key.Length==0?part:key+"\\"+part;Dir existing;if(Dirs.TryGetValue(key,out existing)){Identity(existing.Handle,true,existing.Final);d=existing;continue;}IntPtr h=Relative(d.Handle,part,true,1,false,true);string final=d.Final.TrimEnd('\\')+"\\"+part;try{Identity(h,true,final);}catch{Close(h);throw;}d=new Dir {Handle=h,Final=final,Key=key};Dirs.Add(key,d);}return d; }
  static void Bind(Dictionary<string,object> v) {
    Keys(v,"root");string root=S(v,"root");if(!Environment.Is64BitProcess||!Regex.IsMatch(root,@"^[A-Za-z]:\\")||root.Length>4096)Refuse("UNSUPPORTED_ROOT");string[] parts=root.Substring(3).Split('\\');if(parts.Length>32)Refuse("INVALID_ROOT_DEPTH");foreach(string p in parts)if(!Component(p))Refuse("INVALID_ROOT_COMPONENT");var volume=new StringBuilder(64);Check(GetVolumeNameForVolumeMountPointW(root.Substring(0,3),volume,64));Volume=volume.ToString();if(GetDriveTypeW(Volume)!=3)Refuse("NOT_LOCAL_FIXED_VOLUME");uint component,flags;var fs=new StringBuilder(32);Check(GetVolumeInformationW(Volume,null,0,out Serial,out component,out flags,fs,32));if(fs.ToString()!="NTFS")Refuse("UNSUPPORTED_FILESYSTEM");IntPtr h=CreateFileW(Volume,Sync|Attr|1,1,IntPtr.Zero,3,0x02000000|0x00200000,IntPtr.Zero);if(h==new IntPtr(-1))throw new Win32Exception(Marshal.GetLastWin32Error());Outer.Add(h);Identity(h,true,Volume);string final=Volume.TrimEnd('\\');
    for(int i=0;i<parts.Length;i++){IntPtr next;try{next=Relative(h,parts[i],true,1,false,false);}catch(Win32Exception e){if(i!=parts.Length-1||e.NativeErrorCode!=2)throw;next=Relative(h,parts[i],true,2,false,false);}Outer.Add(next);final+="\\"+parts[i];Identity(next,true,final);h=next;}
    Dirs.Add("",new Dir {Handle=h,Final=final,Key=""});Lease=Relative(h,".coordinator.lock",false,3,false,false);Identity(Lease,false,final+"\\.coordinator.lock");Bound=true;
  }
  static void Seek(IntPtr h,long offset) {long position;Check(SetFilePointerEx(h,offset,out position,0));if(position!=offset)Refuse("INVALID_OFFSET");}
  static long Size(FileInfo f) {return ((long)f.SizeHigh<<32)|f.SizeLow;}
  static byte[] Bytes(IntPtr h,long limit) {FileInfo info;Check(GetFileInformationByHandle(h,out info));long size=Size(info);if(size>limit)Refuse("SIZE_LIMIT");Seek(h,0);byte[] result=new byte[checked((int)size)];int offset=0;while(offset<result.Length){byte[] chunk=new byte[Math.Min(MaxChunk,result.Length-offset)];uint n;Check(ReadFile(h,chunk,(uint)chunk.Length,out n,IntPtr.Zero));if(n==0||n>chunk.Length)Refuse("TRUNCATED_READ");Buffer.BlockCopy(chunk,0,result,offset,(int)n);offset+=(int)n;}return result;}
  static string Hash(byte[] b) {using(var sha=SHA256.Create())return BitConverter.ToString(sha.ComputeHash(b)).Replace("-","").ToLowerInvariant();}
  static Written WrittenFile(Dictionary<string,object> v) {string token=S(v,"handle");Written w;if(!Regex.IsMatch(token,@"^[a-f0-9]{32}$")||!Writes.TryGetValue(token,out w))Refuse("STALE_HANDLE");return Writes[token];}
  static void HashValue(Dictionary<string,object> v) {if(!Regex.IsMatch(S(v,"sha256"),@"^[a-f0-9]{64}$"))Refuse("INVALID_HASH");}
  static void Flush(IntPtr h) {Check(FlushFileBuffers(h));}
  static void Write(IntPtr h,byte[] b) {uint n;Effect=true;Check(WriteFile(h,b,(uint)b.Length,out n,IntPtr.Zero));if(n!=b.Length)Refuse("SHORT_WRITE");}
  static List<Dictionary<string,object>> Enumerate(Dir dir) {
    var rows=new List<Dictionary<string,object>>();IntPtr buffer=Marshal.AllocHGlobal(65536);try{bool first=true;while(true){bool success=GetFileInformationByHandleEx(dir.Handle,first?11:10,buffer,65536);first=false;if(!success){int error=Marshal.GetLastWin32Error();if(error==18)break;throw new Win32Exception(error);}int offset=0;while(true){int next=Marshal.ReadInt32(buffer,offset),length=Marshal.ReadInt32(buffer,offset+60);if(length<0||length>510||(length&1)!=0||offset+104+length>65536)Refuse("DIRECTORY_BUFFER_INVALID");string name=Marshal.PtrToStringUni(IntPtr.Add(buffer,offset+104),length/2);if(name!="."&&name!=".."){if(!Component(name)||rows.Count>=10000)Refuse("DIRECTORY_LIMIT");uint attrs=unchecked((uint)Marshal.ReadInt32(buffer,offset+56));if((attrs&Reparse)!=0)Refuse("REPARSE_ENTRY");bool directory=(attrs&0x10)!=0;string expected=dir.Final.TrimEnd('\\')+"\\"+name;IntPtr child=Relative(dir.Handle,name,directory,1,false,false);FileInfo info;try{info=Identity(child,directory,expected);}finally{Close(child);}rows.Add(new Dictionary<string,object>{{"name",name},{"kind",directory?"directory":"file"},{"bytes",Size(info)},{"identity",info.VolumeSerial.ToString("x8")+info.IdHigh.ToString("x8")+info.IdLow.ToString("x8")}});}if(next==0)break;if(next<104||(next&7)!=0||offset+next>65536-104)Refuse("DIRECTORY_BUFFER_INVALID");offset+=next;}}
    }finally{Marshal.FreeHGlobal(buffer);}return rows;
  }
  static void Remove(Dir parent,string name,bool directory,int depth) {
    if(depth>32)Refuse("CLEANUP_DEPTH");string key=parent.Key.Length==0?name:parent.Key+"\\"+name;Dir cached;IntPtr h;
    if(directory&&Dirs.TryGetValue(key,out cached)){h=cached.Handle;Dirs.Remove(key);}else h=Relative(parent.Handle,name,directory,1,false,true);
    try {string final=parent.Final.TrimEnd('\\')+"\\"+name;Identity(h,directory,final);if(directory){var d=new Dir {Handle=h,Final=final,Key=key};foreach(var row in Enumerate(d))Remove(d,(string)row["name"],(string)row["kind"]=="directory",depth+1);}IntPtr b=Marshal.AllocHGlobal(1);try{Marshal.WriteByte(b,1);Effect=true;Check(SetFileInformationByHandle(h,4,b,1));}finally{Marshal.FreeHGlobal(b);}}finally{Close(h);}
  }
  static Dictionary<string,object> Execute(Dictionary<string,object> v,string operation) {
    var result=new Dictionary<string,object>();
    if(operation=="bind"){Bind(v);return result;}
    if(!Bound)Refuse("ROOT_NOT_BOUND");
    switch(operation){
      case "capabilities": Keys(v);result.Add("capabilities",new {protocol=1,platform="windows-x64",filesystem="NTFS",runtimeProof="NOT_VERIFIED",unconditionalPowerLoss="NOT_PROVEN"});break;
      case "dispose": Keys(v);Release();Bound=false;break;
      case "mkdir": {
        Keys(v,"path");string[] parts=PathParts(v,"path",false);string name=parts[parts.Length-1];Dir parent=Directory(Sub(parts));string key=String.Join("\\",parts);if(Dirs.ContainsKey(key))Refuse("TARGET_EXISTS");IntPtr h=Relative(parent.Handle,name,true,2,false,true);string final=parent.Final.TrimEnd('\\')+"\\"+name;try{Identity(h,true,final);}catch{Close(h);throw;}Dirs.Add(key,new Dir {Handle=h,Final=final,Key=key});break;
      }
      case "write-open": {
        Keys(v,"path","maxBytes");string[] parts=PathParts(v,"path",false);long max=N(v,"maxBytes",0,MaxFile);if(Created>=10000||Writes.Count>=10000||OpenBudget+max>MaxFile)Refuse("WRITE_RESOURCE_LIMIT");Dir parent=Directory(Sub(parts));string name=parts[parts.Length-1];IntPtr h=Relative(parent.Handle,name,false,2,true,true);try{Identity(h,false,parent.Final.TrimEnd('\\')+"\\"+name);}catch{Close(h);throw;}string token=Guid.NewGuid().ToString("N");Writes.Add(token,new Written {Handle=h,Parent=parent,Name=name,Max=max});Created++;OpenBudget+=max;result.Add("handle",token);break;
      }
      case "write-chunk": {
        Keys(v,"handle","offset","data");Written w=WrittenFile(v);if(w.Sealed||N(v,"offset",0,MaxFile)!=w.Length)Refuse("INVALID_WRITE_OFFSET");string data=S(v,"data");if(data.Length==0||data.Length>87384||!Regex.IsMatch(data,@"^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$"))Refuse("INVALID_CHUNK");byte[] bytes=Convert.FromBase64String(data);if(bytes.Length==0||bytes.Length>MaxChunk||Convert.ToBase64String(bytes)!=data||w.Length+bytes.Length>w.Max)Refuse("WRITE_LIMIT");Identity(w.Handle,false,w.Parent.Final.TrimEnd('\\')+"\\"+w.Name);Seek(w.Handle,w.Length);Write(w.Handle,bytes);w.Length+=bytes.Length;result.Add("offset",w.Length);break;
      }
      case "write-close": {
        bool retain=true;if(v.ContainsKey("retainForPublication")){Keys(v,"handle","sha256","retainForPublication");if(!(v["retainForPublication"] is bool))Refuse("INVALID_HOLD_POLICY");retain=(bool)v["retainForPublication"];}else Keys(v,"handle","sha256");HashValue(v);Written w=WrittenFile(v);if(w.Sealed)Refuse("SEALED_HANDLE");Flush(w.Handle);FileInfo info=Identity(w.Handle,false,w.Parent.Final.TrimEnd('\\')+"\\"+w.Name);if(Size(info)!=w.Length||Hash(Bytes(w.Handle,w.Max))!=S(v,"sha256"))Refuse("HASH_MISMATCH");w.Sealed=true;w.Hash=S(v,"sha256");if(!retain){Close(w.Handle);Writes.Remove(S(v,"handle"));OpenBudget-=w.Max;}result.Add("sha256",w.Hash);break;
      }
      case "replace": {
        Keys(v,"handle","parent","name","sha256");HashValue(v);Written w=WrittenFile(v);Dir parent=Directory(PathParts(v,"parent",true));string name=S(v,"name");if(!Component(name)||!w.Sealed||w.Hash!=S(v,"sha256")||parent.Handle!=w.Parent.Handle||w.Length>1048576)Refuse("INVALID_PUBLICATION");Identity(w.Handle,false,w.Parent.Final.TrimEnd('\\')+"\\"+w.Name);byte[] bytes=Bytes(w.Handle,1048576);if(Hash(bytes)!=w.Hash)Refuse("HASH_MISMATCH");byte[] nameBytes=Encoding.Unicode.GetBytes(name);int baseOffset=IntPtr.Size==8?20:12,total=baseOffset+nameBytes.Length;IntPtr buffer=Marshal.AllocHGlobal(total);try{for(int i=0;i<total;i++)Marshal.WriteByte(buffer,i,0);Marshal.WriteIntPtr(buffer,IntPtr.Size==8?8:4,parent.Handle);Marshal.WriteInt32(buffer,IntPtr.Size==8?16:8,nameBytes.Length);Marshal.Copy(nameBytes,0,IntPtr.Add(buffer,baseOffset),nameBytes.Length);Effect=true;Check(SetFileInformationByHandle(w.Handle,3,buffer,(uint)total));}finally{Marshal.FreeHGlobal(buffer);}w.Name=name;Seek(w.Handle,0);Write(w.Handle,bytes);Flush(w.Handle);FileInfo final=Identity(w.Handle,false,parent.Final.TrimEnd('\\')+"\\"+name);if(Size(final)!=w.Length||Hash(Bytes(w.Handle,1048576))!=w.Hash)Refuse("PUBLISH_READBACK_MISMATCH");Close(w.Handle);Writes.Remove(S(v,"handle"));OpenBudget-=w.Max;result.Add("sha256",w.Hash);break;
      }
      case "read": {
        Keys(v,"path","offset","length");string[] parts=PathParts(v,"path",false);long offset=N(v,"offset",0,MaxFile);int length=(int)N(v,"length",1,MaxChunk);if(offset+length>MaxFile)Refuse("READ_LIMIT");Dir parent=Directory(Sub(parts));string name=parts[parts.Length-1];IntPtr h=Relative(parent.Handle,name,false,1,false,false);try{FileInfo info=Identity(h,false,parent.Final.TrimEnd('\\')+"\\"+name);if(Size(info)>MaxFile||offset>Size(info))Refuse("READ_LIMIT");Seek(h,offset);byte[] bytes=new byte[length];uint n;Check(ReadFile(h,bytes,(uint)length,out n,IntPtr.Zero));result.Add("data",Convert.ToBase64String(bytes,0,(int)n));result.Add("bytes",(int)n);result.Add("size",Size(info));}finally{Close(h);}break;
      }
      case "list": {
        Keys(v,"path","limit","cursor");string[] parts=PathParts(v,"path",true);int limit=(int)N(v,"limit",1,128);string key=String.Join("\\",parts),cursor;Listing list;
        if(v["cursor"]==null){if(Lists.Count>=32)Refuse("LIST_RESOURCE_LIMIT");cursor=Guid.NewGuid().ToString("N");list=new Listing {Key=key,Rows=Enumerate(Directory(parts)),Index=0};Lists.Add(cursor,list);}else{cursor=S(v,"cursor");if(!Regex.IsMatch(cursor,@"^[a-f0-9]{32}$")||!Lists.TryGetValue(cursor,out list)||list.Key!=key)Refuse("STALE_CURSOR");list=Lists[cursor];}int count=Math.Min(limit,list.Rows.Count-list.Index);result.Add("entries",list.Rows.GetRange(list.Index,count));list.Index+=count;if(list.Index==list.Rows.Count){Lists.Remove(cursor);result.Add("cursor",null);}else result.Add("cursor",cursor);break;
      }
      case "remove": {
        Keys(v,"path","kind");string[] parts=PathParts(v,"path",false);string kind=S(v,"kind");if(kind!="file"&&kind!="directory")Refuse("INVALID_KIND");Remove(Directory(Sub(parts)),parts[parts.Length-1],kind=="directory",0);break;
      }
      default: Refuse("UNKNOWN_OPERATION");break;
    }return result;
  }
  static string[] Sub(string[] a) {var r=new string[a.Length-1];Array.Copy(a,r,r.Length);return r;}
  static void Release() {foreach(var w in Writes.Values)Close(w.Handle);Writes.Clear();Lists.Clear();var directories=new List<Dir>(Dirs.Values);directories.Sort((a,b)=>b.Key.Length.CompareTo(a.Key.Length));foreach(var d in directories)if(d.Key.Length!=0)Close(d.Handle);Dirs.Clear();Close(Lease);Lease=IntPtr.Zero;for(int i=Outer.Count-1;i>=0;i--)Close(Outer[i]);Outer.Clear();}
  static byte[] Frame(Stream input) {var bytes=new List<byte>();while(true){int value=input.ReadByte();if(value<0){if(bytes.Count!=0)Refuse("TRUNCATED_FRAME");return null;}bytes.Add((byte)value);if(bytes.Count>MaxFrame)Refuse("FRAME_LIMIT");if(value==10)return bytes.ToArray();}}
  public static int Main() {
    Console.OutputEncoding=new UTF8Encoding(false);int exit=0;
    try {using(var input=new BufferedStream(Console.OpenStandardInput(),8192)){while(true){Dictionary<string,object> request=null;Effect=false;try{
      byte[] frame=Frame(input);if(frame==null)break;string text=Utf8.GetString(frame,0,frame.Length-1);if(text.IndexOf('\n')>=0)Refuse("AMBIGUOUS_FRAME");request=Json.Deserialize<Dictionary<string,object>>(text);if(request==null||Json.Serialize(request)!=text)Refuse("AMBIGUOUS_JSON");string operation=S(request,"operation");long id=N(request,"requestId",1,9007199254740991),generation=N(request,"generation",1,9007199254740991);string session=S(request,"session");if(!Regex.IsMatch(session,@"^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$")||N(request,"version",1,1)!=1||id!=NextId)Refuse("INVALID_ENVELOPE");long deadline=N(request,"deadlineMs",0,9007199254740991);if(deadline<=Clock.ElapsedMilliseconds||deadline>Clock.ElapsedMilliseconds+10000)Refuse("EXPIRED_DEADLINE");if(Session==null){if(operation!="bind")Refuse("ROOT_NOT_BOUND");Session=session;Generation=generation;}else if(Session!=session||Generation!=generation||operation=="bind")Refuse("STALE_SESSION");var result=Execute(request,operation);if(Clock.ElapsedMilliseconds>=deadline)Refuse("DEADLINE_AFTER_EFFECT");result.Add("version",1);result.Add("requestId",id);result.Add("session",session);result.Add("generation",generation);result.Add("clockMs",Clock.ElapsedMilliseconds);result.Add("status","ACK");string reply=Json.Serialize(result);if(Utf8.GetByteCount(reply)+1>MaxFrame)Refuse("REPLY_LIMIT");Console.WriteLine(reply);NextId++;if(operation=="dispose")break;
    }catch(Exception e){var result=new Dictionary<string,object>{{"version",1},{"requestId",request!=null&&request.ContainsKey("requestId")?request["requestId"]:0},{"session",Session},{"generation",Generation},{"clockMs",Clock.ElapsedMilliseconds},{"status",Effect?"UNKNOWN":"REFUSED"},{"code",e is Win32Exception?"WIN32_"+((Win32Exception)e).NativeErrorCode:e.Message},{"errorType",e.GetType().Name}};Console.WriteLine(Json.Serialize(result));exit=2;break;}}}
    }catch(Exception e){Console.Error.WriteLine(e.GetType().Name);exit=2;}finally{try{Release();}catch(Exception e){Console.Error.WriteLine("HANDLE_RELEASE_"+e.GetType().Name);exit=2;}}return exit;
  }
}
