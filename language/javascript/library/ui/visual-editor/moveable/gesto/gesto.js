/*
Copyright (c) 2019 Daybrush
name: gesto
license: MIT
author: Daybrush
repository: git+https://github.com/daybrush/gesto.git
version: 1.12.1
*/
!function(t,n){"object"==typeof exports&&"undefined"!=typeof module?module.exports=n():"function"==typeof define&&define.amd?define(n):(t=t||self).Gesto=n()}(this,function(){"use strict";var i=function(t,n){return(i=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,n){t.__proto__=n}||function(t,n){for(var e in n)n.hasOwnProperty(e)&&(t[e]=n[e])})(t,n)};var S=function(){return(S=Object.assign||function(t){for(var n,e=1,i=arguments.length;e<i;e++)for(var o in n=arguments[e])Object.prototype.hasOwnProperty.call(n,o)&&(t[o]=n[o]);return t}).apply(this,arguments)};function e(t){return function(t,n){var e=n[0]-t[0],i=n[1]-t[1],o=Math.atan2(i,e);return 0<=o?o:o+2*Math.PI}([t[0].clientX,t[0].clientY],[t[1].clientX,t[1].clientY])/Math.PI*180}function M(t){return t?t.touches?function(t){for(var n=Math.min(t.length,2),e=[],i=0;i<n;++i)e.push(s(t[i]));return e}(t.touches):[s(t)]:[]}function r(t,n,e){var i=e.length,o=g(t,i),r=o.clientX,s=o.clientY,a=o.originalClientX,c=o.originalClientY,u=g(n,i),l=u.clientX,h=u.clientY,v=g(e,i);return{clientX:a,clientY:c,deltaX:r-l,deltaY:s-h,distX:r-v.clientX,distY:s-v.clientY}}function o(t){return Math.sqrt(Math.pow(t[0].clientX-t[1].clientX,2)+Math.pow(t[0].clientY-t[1].clientY,2))}function s(t){return{clientX:t.clientX,clientY:t.clientY}}function g(t,n){void 0===n&&(n=t.length);for(var e={clientX:0,clientY:0,originalClientX:0,originalClientY:0},i=0;i<n;++i){var o=t[i];e.originalClientX+="originalClientX"in o?o.originalClientX:o.clientX,e.originalClientY+="originalClientY"in o?o.originalClientY:o.clientY,e.clientX+=o.clientX,e.clientY+=o.clientY}return n?{clientX:e.clientX/n,clientY:e.clientY/n,originalClientX:e.originalClientX/n,originalClientY:e.originalClientY/n}:e}function a(t){return t&&"object"==typeof t}function P(){return Date.now?Date.now():(new Date).getTime()}function X(t,n,e,i){t.addEventListener(n,e,i)}function Y(t,n,e,i){t.removeEventListener(n,e,i)}var c=function(){return(c=Object.assign||function(t){for(var n,e=1,i=arguments.length;e<i;e++)for(var o in n=arguments[e])Object.prototype.hasOwnProperty.call(n,o)&&(t[o]=n[o]);return t}).apply(this,arguments)};var t=function(){function t(){this._events={}}var n=t.prototype;return n.on=function(t,n){if(a(t))for(var e in t)this.on(e,t[e]);else this._addEvent(t,n,{});return this},n.off=function(t,n){if(t)if(a(t))for(var e in t)this.off(e);else if(n){var i=this._events[t];if(i){var o=function(t,n,e){void 0===e&&(e=-1);for(var i=t.length,o=0;o<i;++o)if(n(t[o],o,t))return o;return e}(i,function(t){return t.listener===n});-1<o&&i.splice(o,1)}}else this._events[t]=[];else this._events={};return this},n.once=function(n,t){var e=this;return t&&this._addEvent(n,t,{once:!0}),new Promise(function(t){e._addEvent(n,t,{once:!0})})},n.emit=function(n,e){var i=this;void 0===e&&(e={});var t=this._events[n];if(!n||!t)return!0;var o=!1;return e.eventType=n,e.stop=function(){o=!0},e.currentTarget=this,function(){for(var t=0,n=0,e=arguments.length;n<e;n++)t+=arguments[n].length;var i=Array(t),o=0;for(n=0;n<e;n++)for(var r=arguments[n],s=0,a=r.length;s<a;s++,o++)i[o]=r[s];return i}(t).forEach(function(t){t.listener(e),t.once&&i.off(n,t.listener)}),!o},n.trigger=function(t,n){return void 0===n&&(n={}),this.emit(t,n)},n._addEvent=function(t,n,e){var i=this._events;i[t]=i[t]||[],i[t].push(c({listener:n},e))},t}(),y=function(){function t(t){this.prevClients=[],this.startClients=[],this.movement=0,this.length=0,this.startClients=t,this.prevClients=t,this.length=t.length}var n=t.prototype;return n.getAngle=function(t){return void 0===t&&(t=this.prevClients),e(t)},n.getRotation=function(t){return void 0===t&&(t=this.prevClients),e(t)-e(this.startClients)},n.getPosition=function(t,n){void 0===t&&(t=this.prevClients);var e=r(t||this.prevClients,this.prevClients,this.startClients),i=e.deltaX,o=e.deltaY;return this.movement+=Math.sqrt(i*i+o*o),this.prevClients=t,e},n.getPositions=function(e){void 0===e&&(e=this.prevClients);var i=this.prevClients;return this.startClients.map(function(t,n){return r([e[n]],[i[n]],[t])})},n.getMovement=function(t){var n=this.movement;if(!t)return n;var e=g(t,this.length),i=g(this.prevClients,this.length),o=e.clientX-i.clientX,r=e.clientY-i.clientY;return Math.sqrt(o*o+r*r)+n},n.getDistance=function(t){return void 0===t&&(t=this.prevClients),o(t)},n.getScale=function(t){return void 0===t&&(t=this.prevClients),o(t)/o(this.startClients)},n.move=function(n,e){this.startClients.forEach(function(t){t.clientX-=n,t.clientY-=e})},t}(),w=["textarea","input"],n=function(c){function t(t,n){void 0===n&&(n={});var _=c.call(this)||this;_.options={},_.flag=!1,_.pinchFlag=!1,_.datas={},_.isDrag=!1,_.isPinch=!1,_.isMouse=!1,_.isTouch=!1,_.clientStores=[],_.targets=[],_.prevTime=0,_.doubleFlag=!1,_._dragFlag=!1,_._isMouseEvent=!1,_._isSecondaryButton=!1,_._preventMouseEvent=!1,_.onDragStart=function(t,n){if(void 0===n&&(n=!0),_.flag||!1!==t.cancelable){var e=_.options,i=e.container,o=e.pinchOutside,r=e.preventWheelClick,s=e.preventRightClick,a=e.preventDefault,c=e.checkInput,u=e.preventClickEventOnDragStart,l=e.preventClickEventOnDrag,h=e.preventClickEventByCondition,v=_.isTouch,g=!_.flag;if(_._isSecondaryButton=3===t.which||2===t.button,r&&(2===t.which||1===t.button)||s&&(3===t.which||2===t.button))return _.initDrag(),!1;if(g){var f=document.activeElement,p=t.target,d=p.tagName.toLowerCase(),C=-1<w.indexOf(d),m=p.isContentEditable;if(C||m){if(c||f===p)return!1;if(f&&m&&f.isContentEditable&&f.contains(p))return!1}else if((a||"touchstart"===t.type)&&f){var E=f.tagName;(f.isContentEditable||-1<w.indexOf(E))&&f.blur()}(u||l||h)&&X(window,"click",_._onClick,!0),_.clientStores=[new y(M(t))],_.flag=!0,_.isDrag=!1,_._dragFlag=!0,_.datas={},_.doubleFlag=P()-_.prevTime<200,_._isMouseEvent=function(t){return t&&(-1<t.type.indexOf("mouse")||"button"in t)}(t),!_._isMouseEvent&&_._preventMouseEvent&&(_._preventMouseEvent=!1),!1===(_._preventMouseEvent||_.emit("dragStart",S(S({datas:_.datas,inputEvent:t,isMouseEvent:_._isMouseEvent,isSecondaryButton:_._isSecondaryButton,isTrusted:n,isDouble:_.doubleFlag},_.getCurrentStore().getPosition()),{preventDefault:function(){t.preventDefault()},preventDrag:function(){_._dragFlag=!1}})))&&_.initDrag(),_._isMouseEvent&&_.flag&&a&&t.preventDefault()}if(!_.flag)return!1;var D=0;if(g&&v&&o&&(D=setTimeout(function(){X(i,"touchstart",_.onDragStart,{passive:!1})})),!g&&v&&o&&Y(i,"touchstart",_.onDragStart),_.flag&&function(t){return t.touches&&2<=t.touches.length}(t)){if(clearTimeout(D),g&&t.touches.length!==t.changedTouches.length)return;_.pinchFlag||_.onPinchStart(t)}}},_.onDrag=function(t,n){if(_.flag){var e=_.options.preventDefault;!_._isMouseEvent&&e&&t.preventDefault();var i=M(t),o=_.moveClients(i,t,!1);if(_._dragFlag){if(_.pinchFlag||o.deltaX||o.deltaY)if(!1===(_._preventMouseEvent||_.emit("drag",S(S({},o),{isScroll:!!n,inputEvent:t}))))return void _.stop();_.pinchFlag&&_.onPinch(t,i)}_.getCurrentStore().getPosition(i,!0)}},_.onDragEnd=function(t){if(_.flag){var n=_.options,e=n.pinchOutside,i=n.container,o=n.preventClickEventOnDrag,r=n.preventClickEventOnDragStart,s=n.preventClickEventByCondition,a=_.isDrag;(o||r||s)&&requestAnimationFrame(function(){_._allowClickEvent()}),s||r||!o||a||_._allowClickEvent(),_.isTouch&&e&&Y(i,"touchstart",_.onDragStart),_.pinchFlag&&_.onPinchEnd(t);var c=(null==t?void 0:t.touches)?M(t):[];0!==c.length&&_.options.keepDragging?_._addStore(new y(c)):_.flag=!1;var u=_._getPosition(),l=P(),h=!a&&_.doubleFlag;_.prevTime=a||h?0:l,_.flag||(_._preventMouseEvent||_.emit("dragEnd",S({datas:_.datas,isDouble:h,isDrag:a,isClick:!a,isMouseEvent:_._isMouseEvent,isSecondaryButton:_._isSecondaryButton,inputEvent:t},u)),_.clientStores=[],_._isMouseEvent||(_._preventMouseEvent=!0,requestAnimationFrame(function(){requestAnimationFrame(function(){_._preventMouseEvent=!1})})))}},_.onBlur=function(){_.onDragEnd()},_._allowClickEvent=function(){Y(window,"click",_._onClick,!0)},_._onClick=function(t){_._preventMouseEvent=!1;var n=_.options.preventClickEventByCondition;null!=n&&n(t)||(t.stopPropagation(),t.preventDefault())},_._onContextMenu=function(t){_.options.preventRightClick?_.onDragEnd(t):t.preventDefault()};var e=[].concat(t);_.options=S({checkInput:!1,container:1<e.length?window:e[0],preventRightClick:!0,preventWheelClick:!0,preventClickEventOnDragStart:!1,preventClickEventOnDrag:!1,preventClickEventByCondition:null,preventDefault:!0,checkWindowBlur:!1,keepDragging:!1,pinchThreshold:0,events:["touch","mouse"]},n);var i=_.options,o=i.container,r=i.events,s=i.checkWindowBlur;if(_.isTouch=-1<r.indexOf("touch"),_.isMouse=-1<r.indexOf("mouse"),_.targets=e,_.isMouse&&(e.forEach(function(t){X(t,"mousedown",_.onDragStart)}),X(o,"mousemove",_.onDrag),X(o,"mouseup",_.onDragEnd),X(o,"contextmenu",_._onContextMenu)),s&&X(window,"blur",_.onBlur),_.isTouch){var a={passive:!1};e.forEach(function(t){X(t,"touchstart",_.onDragStart,a)}),X(o,"touchmove",_.onDrag,a),X(o,"touchend",_.onDragEnd,a),X(o,"touchcancel",_.onDragEnd,a)}return _}!function(t,n){function e(){this.constructor=t}i(t,n),t.prototype=null===n?Object.create(n):(e.prototype=n.prototype,new e)}(t,c);var n=t.prototype;return n.stop=function(){this.isDrag=!1,this.flag=!1,this.clientStores=[],this.datas={}},n.getMovement=function(t){return this.getCurrentStore().getMovement(t)+this.clientStores.slice(1).reduce(function(t,n){return t+n.movement},0)},n.isDragging=function(){return this.isDrag},n.isFlag=function(){return this.flag},n.isPinchFlag=function(){return this.pinchFlag},n.isDoubleFlag=function(){return this.doubleFlag},n.isPinching=function(){return this.isPinch},n.scrollBy=function(t,n,e,i){void 0===i&&(i=!0),this.flag&&(this.clientStores[0].move(t,n),i&&this.onDrag(e,!0))},n.move=function(t,n){var i=t[0],o=t[1],e=this.getCurrentStore().prevClients;return this.moveClients(e.map(function(t){var n=t.clientX,e=t.clientY;return{clientX:n+i,clientY:e+o,originalClientX:n,originalClientY:e}}),n,!0)},n.triggerDragStart=function(t){this.onDragStart(t,!1)},n.setEventDatas=function(t){var n=this.datas;for(var e in t)n[e]=t[e];return this},n.getCurrentEvent=function(t){return S(S({datas:this.datas},this._getPosition()),{movement:this.getMovement(),isDrag:this.isDrag,isPinch:this.isPinch,isScroll:!1,inputEvent:t})},n.getEventDatas=function(){return this.datas},n.unset=function(){var n=this,t=this.targets,e=this.options.container;this.off(),Y(window,"blur",this.onBlur),this.isMouse&&(t.forEach(function(t){Y(t,"mousedown",n.onDragStart)}),Y(e,"mousemove",this.onDrag),Y(e,"mouseup",this.onDragEnd),Y(e,"contextmenu",this._onContextMenu)),this.isTouch&&(t.forEach(function(t){Y(t,"touchstart",n.onDragStart)}),Y(e,"touchstart",this.onDragStart),Y(e,"touchmove",this.onDrag),Y(e,"touchend",this.onDragEnd),Y(e,"touchcancel",this.onDragEnd))},n.onPinchStart=function(t){var n=this.options.pinchThreshold;if(!(this.isDrag&&this.getMovement()>n)){var e=new y(M(t));this.pinchFlag=!0,this._addStore(e),!1===this.emit("pinchStart",S(S({datas:this.datas,angle:e.getAngle(),touches:this.getCurrentStore().getPositions()},e.getPosition()),{inputEvent:t}))&&(this.pinchFlag=!1)}},n.onPinch=function(t,n){if(this.flag&&this.pinchFlag&&!(n.length<2)){var e=this.getCurrentStore();this.isPinch=!0,this.emit("pinch",S(S({datas:this.datas,movement:this.getMovement(n),angle:e.getAngle(n),rotation:e.getRotation(n),touches:e.getPositions(n),scale:e.getScale(n),distance:e.getDistance(n)},e.getPosition(n)),{inputEvent:t}))}},n.onPinchEnd=function(t){if(this.pinchFlag){var n=this.isPinch;this.isPinch=!1,this.pinchFlag=!1;var e=this.getCurrentStore();this.emit("pinchEnd",S(S({datas:this.datas,isPinch:n,touches:e.getPositions()},e.getPosition()),{inputEvent:t}))}},n.initDrag=function(){this.clientStores=[],this.pinchFlag=!1,this.doubleFlag=!1,this.prevTime=0,this.flag=!1,this._allowClickEvent()},n.getCurrentStore=function(){return this.clientStores[0]},n.moveClients=function(t,n,e){var i=this._getPosition(t,e);return(i.deltaX||i.deltaY)&&(this.isDrag=!0),S(S({datas:this.datas},i),{movement:this.getMovement(t),isDrag:this.isDrag,isPinch:this.isPinch,isScroll:!1,isMouseEvent:this._isMouseEvent,isSecondaryButton:this._isSecondaryButton,inputEvent:n})},n._addStore=function(t){this.clientStores.splice(0,0,t)},n._getPosition=function(t,n){var e=this.getCurrentStore().getPosition(t,n),i=this.clientStores.slice(1).reduce(function(t,n){var e=n.getPosition();return t.distX+=e.distX,t.distY+=e.distY,t},e),o=i.distX,r=i.distY;return S(S({},e),{distX:o,distY:r})},t}(t),u={default:n};for(var l in u)n[l]=u[l];return n});
//# sourceMappingURL=gesto.min.js.map