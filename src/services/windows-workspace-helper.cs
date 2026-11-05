// A small first-party Windows helper, not a shell or desktop wrapper.
// Directory handles stay open without delete sharing. Names and identities are
// checked again at commit, including systems that permit POSIX-style renames.
using System;
using System.IO;
using System.Text;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using System.Diagnostics;

public class FileId { public string dev; public string ino; }
public class WorkspaceRequest {
 public string id, action, root, path, target;
 public FileId rootId, sourceId, parentId, sourceParentId;
}
// The current Windows Common Item Dialog chooses real folders without the old Desktop tree.
[ComImport, Guid("42F85136-DB7E-439C-85F1-E4075D135FC8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface ProjectFolderDialog {
 [PreserveSig] int Show(IntPtr owner);
 void SetFileTypes(uint count,IntPtr types); void SetFileTypeIndex(uint index); void GetFileTypeIndex(out uint index);
 void Advise(IntPtr events,out uint cookie); void Unadvise(uint cookie); void SetOptions(uint options); void GetOptions(out uint options);
 void SetDefaultFolder(ProjectShellItem folder); void SetFolder(ProjectShellItem folder); void GetFolder(out ProjectShellItem folder); void GetCurrentSelection(out ProjectShellItem item);
 void SetFileName([MarshalAs(UnmanagedType.LPWStr)] string name); void GetFileName(out IntPtr name);
 void SetTitle([MarshalAs(UnmanagedType.LPWStr)] string title); void SetOkButtonLabel([MarshalAs(UnmanagedType.LPWStr)] string label); void SetFileNameLabel([MarshalAs(UnmanagedType.LPWStr)] string label);
 void GetResult(out ProjectShellItem item); void AddPlace(ProjectShellItem item,int position); void SetDefaultExtension([MarshalAs(UnmanagedType.LPWStr)] string extension); void Close(int result); void SetClientGuid(ref Guid guid); void ClearClientData(); void SetFilter(IntPtr filter);
}
[ComImport,Guid("43826D1E-E718-42EE-BC55-A1E261C37BFE"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface ProjectShellItem {
 void BindToHandler(IntPtr context,ref Guid handler,ref Guid iid,out IntPtr result); void GetParent(out ProjectShellItem parent); void GetDisplayName(uint kind,out IntPtr name); void GetAttributes(uint mask,out uint attributes); void Compare(ProjectShellItem other,uint hint,out int order);
}

public static class WorkspaceHelper {
 [StructLayout(LayoutKind.Sequential)] struct Info {
  public uint attributes; public System.Runtime.InteropServices.ComTypes.FILETIME created,accessed,written;
  public uint volume,sizeHigh,sizeLow,links,indexHigh,indexLow;
 }
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern IntPtr CreateFileW(string p,uint access,uint sharing,IntPtr security,uint disposition,uint flags,IntPtr template);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool GetFileInformationByHandle(IntPtr h,out Info info);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern uint GetFinalPathNameByHandleW(IntPtr h,StringBuilder name,uint length,uint flags);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool CloseHandle(IntPtr h);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern bool CreateDirectoryW(string p,IntPtr security);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool SetFileInformationByHandle(IntPtr h,int type,IntPtr info,uint size);
 [DllImport("kernel32.dll")] static extern IntPtr GetConsoleWindow();
 [DllImport("kernel32.dll")] static extern uint GetConsoleProcessList([Out] uint[] processes,uint count);
 [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr window,int command);
 static readonly JavaScriptSerializer json=new JavaScriptSerializer();
 static readonly List<IntPtr> handles=new List<IntPtr>();
 static readonly Dictionary<string,IntPtr> directories=new Dictionary<string,IntPtr>(StringComparer.OrdinalIgnoreCase);
 static bool changed=false;static string step="request";
 class NativeFailure:Exception { public int code; public NativeFailure(int c){code=c;} }
 static void Check(bool ok){if(!ok)throw new NativeFailure(Marshal.GetLastWin32Error());}
 static Info Metadata(IntPtr handle){Info info;Check(GetFileInformationByHandle(handle,out info));if((info.attributes&0x400)!=0)throw new NativeFailure(4390);return info;}
 static FileId Identity(Info i){return new FileId{dev=i.volume.ToString(),ino=(((ulong)i.indexHigh<<32)|i.indexLow).ToString()};}
 static void Match(IntPtr h,FileId expected){FileId actual=Identity(Metadata(h));if(expected==null||expected.dev!=actual.dev||expected.ino!=actual.ino)throw new NativeFailure(1168);}
 static IntPtr Open(string p,uint access,uint sharing,uint disposition){IntPtr h=CreateFileW(p,access,sharing,IntPtr.Zero,disposition,0x02200000,IntPtr.Zero);if(h==new IntPtr(-1))throw new NativeFailure(Marshal.GetLastWin32Error());handles.Add(h);return h;}
 // FILE_LIST_DIRECTORY (1), rather than metadata-only access, makes Windows
 // enforce the deny-delete sharing mode used to pin each directory.
 static IntPtr Pin(string p){
  step="pin-directories";string full=Path.GetFullPath(p),volume=Path.GetPathRoot(full),current=volume;
  if(!directories.ContainsKey(current)){IntPtr h=Open(current,1,3,3);Metadata(h);directories[current]=h;}
  foreach(string bit in full.Substring(volume.Length).Split(new char[]{'\\'},StringSplitOptions.RemoveEmptyEntries)){
   current=Path.Combine(current,bit);if(!directories.ContainsKey(current)){IntPtr h=Open(current,0x80,3,3);Info m=Metadata(h);if((m.attributes&16)==0)throw new NativeFailure(267);directories[current]=h;}
  }
  return directories[current];
 }
 static void NamedHandle(IntPtr handle,string expected){StringBuilder name=new StringBuilder(4096);uint count=GetFinalPathNameByHandleW(handle,name,4096,0);if(count==0||count>=4096)throw new NativeFailure(1168);string actual=name.ToString();if(actual.StartsWith("\\\\?\\"))actual=actual.Substring(4);if(!String.Equals(actual.TrimEnd('\\'),Path.GetFullPath(expected).TrimEnd('\\'),StringComparison.OrdinalIgnoreCase))throw new NativeFailure(1168);}
 static string Relative(string root,string relative){
  if(String.IsNullOrEmpty(relative)||relative.Length>240||relative.IndexOfAny(new char[]{'\\',':','\0','<','>','"','|','?','*'})>=0||Path.IsPathRooted(relative))throw new NativeFailure(87);
  foreach(string bit in relative.Split('/'))if(String.IsNullOrEmpty(bit)||bit.StartsWith(".")||bit.EndsWith(".")||bit.EndsWith(" "))throw new NativeFailure(87);
  string full=Path.GetFullPath(Path.Combine(root,relative.Replace('/','\\')));
  if(!full.StartsWith(root.TrimEnd('\\')+"\\",StringComparison.OrdinalIgnoreCase))throw new NativeFailure(87);return full;
 }
 static void Emit(object value){Console.WriteLine(json.Serialize(value));Console.Out.Flush();}
 [STAThread] public static int Main(){
  WorkspaceRequest r=null;Console.InputEncoding=new UTF8Encoding(false);Console.OutputEncoding=new UTF8Encoding(false);
  try{
   string line=Console.ReadLine();if(line==null||line.Length>16384)throw new NativeFailure(87);r=json.Deserialize<WorkspaceRequest>(line);
   if(r==null||String.IsNullOrEmpty(r.id))throw new NativeFailure(87);
   if(r.action=="choose"){
    if(!Environment.UserInteractive)throw new NativeFailure(50);
    // The interactive picker must not inherit the background worker's hidden-window startup flag.
    // Hide only our own console window; the folder dialog remains visible.
    uint[] consoleProcesses=new uint[8];if(GetConsoleProcessList(consoleProcesses,8)==1&&consoleProcesses[0]==(uint)Process.GetCurrentProcess().Id)ShowWindow(GetConsoleWindow(),0);step="folder-dialog";
    ProjectFolderDialog chooser=(ProjectFolderDialog)Activator.CreateInstance(Type.GetTypeFromCLSID(new Guid("DC1C5A9C-E88A-4DDE-A5A1-60F82A20AEF7")));
    try{
     uint options;chooser.GetOptions(out options);chooser.SetOptions(options|0x20|0x40|0x800|0x02000000); // folders, filesystem, existing path, no recent-list changes
     chooser.SetTitle("Dev Squad AI — Choose existing project folder");chooser.SetOkButtonLabel("Select project folder");
     int result;using(Form owner=new Form()){owner.Text="Dev Squad folder selection";owner.ShowInTaskbar=false;owner.StartPosition=FormStartPosition.CenterScreen;owner.Size=new System.Drawing.Size(1,1);owner.Opacity=0;owner.TopMost=true;owner.Show();owner.Activate();result=chooser.Show(owner.Handle);owner.Close();}if(result==unchecked((int)0x800704C7)){Emit(new {ok=true,id=r.id,cancelled=true,folder=(string)null});return 0;}Marshal.ThrowExceptionForHR(result);
     ProjectShellItem item;chooser.GetResult(out item);try{IntPtr name;item.GetDisplayName(0x80058000,out name);try{Emit(new {ok=true,id=r.id,cancelled=false,folder=Marshal.PtrToStringUni(name)});}finally{Marshal.FreeCoTaskMem(name);}}finally{Marshal.ReleaseComObject(item);}return 0;
    }finally{Marshal.ReleaseComObject(chooser);}
   }
   if(r.action!="create_file"&&r.action!="create_folder"&&r.action!="rename"&&r.action!="reveal")throw new NativeFailure(87);
   string root=Path.GetFullPath(r.root);Match(Pin(root),r.rootId);
   string target=null,source=null;IntPtr sourceHandle=IntPtr.Zero;
   if(r.action!="reveal"){
    target=Relative(root,r.target);Match(Pin(Path.GetDirectoryName(target)),r.parentId);
    if(r.action=="rename"){
     source=Relative(root,r.path);Match(Pin(Path.GetDirectoryName(source)),r.sourceParentId);
     if(target.StartsWith(source+"\\",StringComparison.OrdinalIgnoreCase))throw new NativeFailure(87);
     sourceHandle=Open(source,0x10080,3,3);Info sourceInfo=Metadata(sourceHandle);if((sourceInfo.attributes&16)==0&&sourceInfo.links>1)throw new NativeFailure(4390);Match(sourceHandle,r.sourceId);
    }
   }
   Emit(new {phase="pinned",id=r.id});
   // The backend rechecks the exact approval, permissions and expiry while the
   // handles are held. No write happens unless that backend sends COMMIT.
   if(Console.ReadLine()!="COMMIT")throw new NativeFailure(1223);
   foreach(KeyValuePair<string,IntPtr> pinned in directories)NamedHandle(pinned.Value,pinned.Key);
   if(sourceHandle!=IntPtr.Zero)NamedHandle(sourceHandle,source);
   FileId resultId=null;
   if(r.action=="create_file"){
    step="create-file";IntPtr file=Open(target,0x40000080,0,1);changed=true;resultId=Identity(Metadata(file));
   }else if(r.action=="create_folder"){
    step="create-folder";Check(CreateDirectoryW(target,IntPtr.Zero));changed=true;resultId=Identity(Metadata(Pin(target)));
   }else if(r.action=="rename"){
    // Windows requires the wide string end marker even though FileNameLength
    // counts only the name bytes. Keep both bytes explicitly zero.
    step="rename";byte[] name=Encoding.Unicode.GetBytes(target);int offset=IntPtr.Size==8?20:12;IntPtr buffer=Marshal.AllocHGlobal(offset+name.Length+2);
    try{for(int i=0;i<offset+name.Length+2;i++)Marshal.WriteByte(buffer,i,0);Marshal.WriteIntPtr(buffer,IntPtr.Size==8?8:4,IntPtr.Zero);Marshal.WriteInt32(buffer,IntPtr.Size==8?16:8,name.Length);Marshal.Copy(name,0,IntPtr.Add(buffer,offset),name.Length);Check(SetFileInformationByHandle(sourceHandle,3,buffer,(uint)(offset+name.Length+2)));changed=true;resultId=Identity(Metadata(sourceHandle));}finally{Marshal.FreeHGlobal(buffer);}
   }else{
    string explorer=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Windows),"explorer.exe");
    Process.Start(new ProcessStartInfo(explorer,"\""+root+"\""){UseShellExecute=false,WorkingDirectory=root});
   }
   Emit(new {ok=true,id=r.id,identity=resultId});return 0;
  }catch(Exception e){NativeFailure known=e as NativeFailure;Emit(new {ok=false,id=r==null?null:r.id,errorCode=known==null?0:known.code,unknown=changed,stage=step});return 1;}
  finally{for(int i=handles.Count-1;i>=0;i--)CloseHandle(handles[i]);}
 }
}
