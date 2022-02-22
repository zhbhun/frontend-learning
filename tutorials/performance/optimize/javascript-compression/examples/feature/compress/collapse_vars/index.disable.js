function f1() {
    var s = "abcdef", i = 2, log = console.log.bind(console), x = s.charAt(i++), y = s.charAt(i++), z = s.charAt(i++);
    log(x, y, z, 7);
}