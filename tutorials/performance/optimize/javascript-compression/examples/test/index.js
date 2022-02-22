window.$ = function () {
  /**
   * @preserve 变量赋值
   */
  var temp = 'temp one';
  temp = 'temp two';
  var unuse = 'unuse';
  document.body.innerHTML = temp;

  /**
   * @preserve 纯函数
   */

  /**
   * @param {nuber} value
   */
  function square(value) {
    return value + value;
  }
  document.body.innerHTML = square('pure function. ');

  /**
   * @preserve 副作用函数
   */
  function effect0(value) {
    return value.effect0;
  }
  effect0('effect0');

  function effect1(value) {
    console.log(value); // 副作用
    return value + value;
  }
  effect1('effect1');

  function effect2(value) {
    console.log(value); // 副作用
    return value.effect2; // console.log(value) 可能修改了 value 的属性，value.effect2 可能调用了 value 的 getter 方法
  }
  effect2('effect2');

  function effect3(value) {
    console.log(value); // 副作用
    return 'effect3'.effect3; // 没有副作用
  }
  effect3('effect3');

  function effect4(value) {
    /*@__PURE__*/
    console.log(value);
    return value.effect4;
  }
  effect4('effect4');

  function effect5(value) {
    console.log(value);
    return value.effect5;
  }
  /*@__PURE__*/
  effect5('effect5');
}
