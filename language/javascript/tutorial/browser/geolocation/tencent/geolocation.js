window.qq = window.qq || {}, qq.maps = qq.maps || {}, window.soso || (window.soso = qq), soso.maps || (soso.maps = qq.maps),
    qq.maps.Geolocation = function () {
        "use strict";
        var e = [],
            t = null,
            o = 0,
            n = "_geoIframe_" + Math.ceil(1e7 * Math.random()),
            i = document.createElement("iframe"),
            r = null,
            s = null,
            a = null,
            c = null,
            u = function (u, l) {
                if (!u) return void alert("璇疯緭鍏ey锛�");
                if (!l) return void alert("璇疯緭鍏eferer锛�");
                var p = document.getElementById(n);
                if (!p) {
                    i.setAttribute("id", n), i.setAttribute("allow", "geolocation");
                    var g = "https:";
                    i.setAttribute("src", g + "//apis.map.qq.com/tools/geolocation?key=" + u + "&referer=" + l), i.setAttribute(
                        "style", "display: none; width: 100%; height: 30%"), document.body ? document.body.appendChild(
                        i) : document.write(i.outerHTML);
                    var m = this;
                    window.addEventListener("message", function (n) {
                        var i = n.data;
                        if (i && "geolocation" == i.module) {
                            if (clearTimeout(c), e.length > 0) {
                                var u = e.shift();
                                u.sucCb && u.sucCb(i)
                            }
                            o = 2, m.executeNextGeo(), t && t(i)
                        } else {
                            s = (new Date).getTime();
                            var l = s - r;
                            if (l >= a) {
                                if (e.length > 0 && "geo" === e[0].type) {
                                    var u = e.shift(),
                                        p = {
                                            type: "fail",
                                            code: 5,
                                            message: "The request"
                                        };
                                    u.errCb && u.errCb(p)
                                }
                                clearTimeout(c), o = -1, m.executeNextGeo()
                            }
                            if (e.length > 0 && "ip" === e[0].type) {
                                var u = e.shift();
                                u.errCb && u.errCb(p)
                            }
                        }
                    }, !1)
                }
            };
        return u.prototype.executeNextGeo = function () {
            1 !== o && e.length > 0 && (o = 1, e[0].geoprocess())
        }, u.prototype.getLocation = function (t, n, i) {
            if (i && i.timeout) {
                var r = new RegExp("^[0-9]*$");
                if (!r.test(i.timeout)) return void alert("timeout 璇疯緭鍏ユ暟瀛�")
            }
            if (e.length > 10) throw new Error("geolocation queue must be lass than 10");
            e.push({
                sucCb: t,
                errCb: n,
                option: i,
                geoprocess: this.getOnceLocation,
                type: "geo"
            }), 1 !== o && (o = 1, this.getOnceLocation())
        }, u.prototype.getOnceLocation = function () {
            var t = e[0] && e[0].option;
            r = (new Date).getTime(), a = t && t.timeout ? +t.timeout : 1e4, clearTimeout(c), c = setTimeout(
                function () {
                    if (e.length > 0) {
                        var t = e.shift();
                        t.errCb && t.errCb()
                    }
                }, a), document.getElementById(n).contentWindow.postMessage("getLocation", "*")
        }, u.prototype.getIpLocation = function (t, n) {
            if (e.length > 10) throw new Error("geolocation queue mast be lass than 10");
            e.push({
                sucCb: t,
                errCb: n,
                geoprocess: this.getOnceIpLocation,
                type: "ip"
            }), 1 !== o && (o = 1, this.getOnceIpLocation())
        }, u.prototype.getOnceIpLocation = function () {
            document.getElementById(n).contentWindow.postMessage("getLocation.robust", "*")
        }, u.prototype.watchPosition = function (e) {
            t = e, document.getElementById(n).contentWindow.postMessage("watchPosition", "*")
        }, u.prototype.clearWatch = function () {
            t = null, document.getElementById(n).contentWindow.postMessage("clearWatch", "*")
        }, u
    }();
