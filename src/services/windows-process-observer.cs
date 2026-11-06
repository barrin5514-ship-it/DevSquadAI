using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Web.Script.Serialization;

// Read-only identity observer. No process killing, memory reading, file access,
// credentials, network calls or privilege changes are supported by this helper.
public static class ProcessObserver {
 [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] struct Entry {
  public uint size, usage, pid; public UIntPtr heap; public uint module, threads, parent;
  public int priority; public uint flags;
  [MarshalAs(UnmanagedType.ByValTStr, SizeConst=260)] public string name;
 }
 [StructLayout(LayoutKind.Sequential)] struct Time { public uint low, high; }
 [DllImport("kernel32.dll", SetLastError=true)] static extern IntPtr CreateToolhelp32Snapshot(uint flags,uint pid);
 [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern bool Process32FirstW(IntPtr snapshot,ref Entry entry);
 [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern bool Process32NextW(IntPtr snapshot,ref Entry entry);
 [DllImport("kernel32.dll", SetLastError=true)] static extern IntPtr OpenProcess(uint access,bool inherit,uint pid);
 [DllImport("kernel32.dll", SetLastError=true)] static extern bool GetProcessTimes(IntPtr process,out Time creation,out Time exit,out Time kernel,out Time user);
 [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
 [DllImport("kernel32.dll")] static extern uint GetCurrentProcessId();
 public static int Main(string[] args) {
  var json=new JavaScriptSerializer();
  try {
   uint target;if(args.Length!=1||!UInt32.TryParse(args[0],out target)||target==0)throw new Exception();
   var entries=new List<Entry>();var snapshot=CreateToolhelp32Snapshot(2,0);
   if(snapshot==new IntPtr(-1))throw new Exception();
   try {
    var e=new Entry();e.size=(uint)Marshal.SizeOf(typeof(Entry));
    if(!Process32FirstW(snapshot,ref e))throw new Exception();
    do {entries.Add(e);if(entries.Count>20000)throw new Exception();} while(Process32NextW(snapshot,ref e));
    if(Marshal.GetLastWin32Error()!=18)throw new Exception();
   } finally {CloseHandle(snapshot);}
   var ids=new HashSet<uint>();ids.Add(target);
   // Process IDs and parent IDs come from one snapshot, so no recursive WMI calls.
   for(int i=0;i<entries.Count;i++){bool added=false;foreach(var e in entries)if(e.pid!=GetCurrentProcessId()&&ids.Contains(e.parent))added|=ids.Add(e.pid);if(!added)break;if(i==entries.Count-1)throw new Exception();}
   var result=new List<object>();
   foreach(var e in entries)if(ids.Contains(e.pid)&&e.pid!=GetCurrentProcessId()) {
    var handle=OpenProcess(0x1000,false,e.pid); // QUERY_LIMITED_INFORMATION only.
    if(handle==IntPtr.Zero){if(Marshal.GetLastWin32Error()==87)continue;throw new Exception();}
    try {
     Time birth,exit,kernel,user;if(!GetProcessTimes(handle,out birth,out exit,out kernel,out user))throw new Exception();
     long filetime=(long)(((ulong)birth.high<<32)|birth.low);
     var stamp=DateTime.FromFileTimeUtc(filetime);
     // WMI history has microsecond precision. Keep its exact string convention.
     stamp=new DateTime(stamp.Ticks-stamp.Ticks%10,DateTimeKind.Utc);
     result.Add(new {pid=e.pid,parent=e.parent,birth=stamp.ToString("o")});
    } finally {CloseHandle(handle);}
   }
   Console.Write(json.Serialize(new {verified=true,processes=result}));return 0;
  } catch {Console.Write("{\"verified\":false,\"reason\":\"Windows process identity could not be verified. Lock retained.\"}");return 1;}
 }
}
