log('body external script\'s document.readyState: ' + document.readyState);

var img = document.querySelector('img');
img.onload = function () {
  log('img load');
}
