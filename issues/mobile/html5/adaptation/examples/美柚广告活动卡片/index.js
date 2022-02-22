!(function(a) {
  function b() {
    var b = f.clientWidth,
      c = "}";
    !navigator.userAgent.match(
      /Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile/i
    ) &&
      b > 1024 &&
      (
        (b = 640),
        (c =
          ";max-width:" +
          b +
          "px;margin-right:auto!important;margin-left:auto!important;}")
      ), (a.rem = b / 16), /ZTE U930_TD/.test(navigator.userAgent) &&
      (a.rem = 1.13 * a.rem), (h.innerHTML =
      "html{font-size:" +
      a.rem +
      "px!important;}body{font-size:" +
      12 * (b / 320) +
      "px" +
      c);
  }
  var c,
    d,
    e,
    f = document.documentElement,
    g = document.querySelector('meta[name="viewport"]'),
    h = document.createElement("style"),
    c = a.devicePixelRatio || 1;
  if (((d = 1 / c), !g))
    return void console.warn(
      '\u8bf7\u8bbe\u7f6e\u9ed8\u8ba4viewport\u4e3a\uff1a<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no" />'
    );
  if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    var i = f.clientWidth;
    375 === i && g.setAttribute("content", "user-scalable=no"), g.setAttribute(
      "content",
      "width=" +
        c * i +
        ",initial-scale=" +
        d +
        ",maximum-scale=" +
        d +
        ", minimum-scale=" +
        d +
        ",user-scalable=no"
    );
  } else {
    var j = navigator.userAgent.match(/Android[\S\s]+AppleWebkit\/?(\d{3})/i);
    !j || (j && j[1] > 534)
      ? g.setAttribute(
          "content",
          "target-densitydpi=device-dpi,width=device-width,user-scalable=no,initial-scale=" +
            d +
            ",maximum-scale=" +
            d +
            ", minimum-scale=" +
            d
        )
      : (c = 1);
  }
  f.firstElementChild.appendChild(h), f.setAttribute(
    "data-dpr",
    c
  ), (a.dpr = c), a.addEventListener(
    "resize",
    function() {
      clearTimeout(e), (e = setTimeout(b, 300));
    },
    !1
  ), a.addEventListener(
    "pageshow",
    function(a) {
      a.persisted && (clearTimeout(e), (e = setTimeout(b, 300)));
    },
    !1
  ), b();
})(window);
