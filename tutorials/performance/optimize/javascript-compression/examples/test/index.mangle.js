window.$=function(){var e="temp one";e="temp two";var n="unuse";document.body.innerHTML=e;function t(e){return e+e}document.body.innerHTML=t("pure function. ");function f(e){return e.effect0}f("effect0");function o(e){console.log(e);return e+e}o("effect1");function c(e){console.log(e);return e.effect2}c("effect2");function u(e){console.log(e);return"effect3".effect3}u("effect3");function r(e){console.log(e);return e.effect4}r("effect4");function i(e){console.log(e);return e.effect5}i("effect5");function t(e){return e.a}t({a:123});function l(e){return e.a}l({a:456})};