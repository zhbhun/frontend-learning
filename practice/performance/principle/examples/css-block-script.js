// 观察这个脚本的执行时间实在 CSS 加载之后执行的
console.log(performance.now());
window.addEventListener('load', function () {
  var resources = performance.getEntriesByType('resource');
  for (var index = 0; index < resources.length; index++) {
    var resource = resources[index];
    console.log(resource.initiatorType, ': ', resource.startTime, resource.duration, resource.responseEnd);
  }
});
