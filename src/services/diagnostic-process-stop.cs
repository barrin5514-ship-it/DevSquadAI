using System;
using System.Runtime.InteropServices;
// Check creation time and terminate through the SAME Windows handle. A reused
// PID must never turn a delayed diagnostic cleanup into an unrelated kill.
class DiagnosticStop {
 [StructLayout(LayoutKind.Sequential)] struct Time {public uint low,high;}
 [DllImport("kernel32.dll",SetLastError=true)] static extern IntPtr OpenProcess(uint access,bool inherit,uint pid);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool GetProcessTimes(IntPtr h,out Time birth,out Time exit,out Time kernel,out Time user);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool TerminateProcess(IntPtr h,uint code);
 [DllImport("kernel32.dll")] static extern uint WaitForSingleObject(IntPtr h,uint milliseconds);
 [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr h);
 static int Main(string[] args){IntPtr h=IntPtr.Zero;try{
  uint pid;if(args.Length!=2||!uint.TryParse(args[0],out pid)||pid==0)return 1;
  DateTime expected=DateTime.Parse(args[1],null,System.Globalization.DateTimeStyles.RoundtripKind).ToUniversalTime();
  h=OpenProcess(0x1000|0x0001|0x100000,false,pid);if(h==IntPtr.Zero)return 1;
  Time birth,exit,kernel,user;if(!GetProcessTimes(h,out birth,out exit,out kernel,out user))return 1;
  long stamp=(long)(((ulong)birth.high<<32)|birth.low);DateTime actual=DateTime.FromFileTimeUtc(stamp);actual=new DateTime(actual.Ticks-actual.Ticks%10,DateTimeKind.Utc);
  if(actual.Ticks!=expected.Ticks)return 2;
  if(!TerminateProcess(h,1))return 1;return WaitForSingleObject(h,3000)==0?0:1;
 }catch{return 1;}finally{if(h!=IntPtr.Zero)CloseHandle(h);}}
}
