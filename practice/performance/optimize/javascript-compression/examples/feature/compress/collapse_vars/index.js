function f1() {
  var e = 7;
  var s = "abcdef";
  var i = 2;
  var log = console.log.bind(console);
  var x = s.charAt(i++);
  var y = s.charAt(i++);
  var z = s.charAt(i++);
  log(x, y, z, e);
}
