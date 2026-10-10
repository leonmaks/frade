// P02 no-effect TDD shell. First native positive fixture must fail before Win32 implementation.
using System;
using System.Collections.Generic;
using System.Text;
using System.Web.Script.Serialization;
public static class FradeFilesystem {
  public static int Main() {
    Console.InputEncoding = new UTF8Encoding(false, true);
    Console.OutputEncoding = new UTF8Encoding(false);
    string line = Console.ReadLine();
    if (line == null) return 2;
    try {
      var json = new JavaScriptSerializer();
      var value = json.Deserialize<Dictionary<string, object>>(line);
      Console.WriteLine(json.Serialize(new { version=1, requestId=value["requestId"], session=value["session"], generation=value["generation"], clockMs=0, status="REFUSED", code="NOT_IMPLEMENTED" }));
    } catch (Exception e) { Console.Error.WriteLine(e.GetType().Name); }
    return 2;
  }
}
