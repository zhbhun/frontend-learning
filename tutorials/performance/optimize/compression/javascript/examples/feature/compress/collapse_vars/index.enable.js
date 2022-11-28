function f1() {
    var s = "abcdef", i = 2;
    console.log.bind(console)(s.charAt(i++), s.charAt(i++), s.charAt(i++), 7);
}