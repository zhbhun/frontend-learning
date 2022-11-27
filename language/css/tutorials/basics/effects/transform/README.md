
## 进阶

- [用CSS开启硬件加速来提高网站性能（转）](http://www.cnblogs.com/rubylouvre/p/3471490.html)

### matrix()

- [Transformations and Matrices](https://www.mathsisfun.com/algebra/matrix-transform.html)
- [完全理解transform中的Matrix()](https://juejin.cn/post/6964408154020904997)
- [理解CSS3 transform中的Matrix(矩阵)](https://www.zhangxinxu.com/wordpress/2012/06/css3-transform-matrix-%E7%9F%A9%E9%98%B5/)

## 案例

### 3D 位移

## 参考文献

- [CSS3 Transform](http://www.w3cplus.com/content/css3-transform)
- [transform-origin](http://www.w3cplus.com/css3/transform-origin.html)
- [Transform-style和Perspective属性](http://www.w3cplus.com/css3/transform-basic-property.html)
- [CSS3 2D Transform](http://www.w3cplus.com/css3/css3-2d-transform.html)
- [CSS3 3D Transform](https://www.w3cplus.com/css3/css3-3d-transform.html)

---

```javascript
s.touchEvents = {
    start : s.support.touch || !s.params.simulateTouch  ? 'touchstart' : s.touchEventsDesktop.start,
    move : s.support.touch || !s.params.simulateTouch ? 'touchmove' : s.touchEventsDesktop.move,
    end : s.support.touch || !s.params.simulateTouch ? 'touchend' : s.touchEventsDesktop.end
};

s.initEvents = function (detach) {
    var actionDom = detach ? 'off' : 'on';
    var action = detach ? 'removeEventListener' : 'addEventListener';
    var touchEventsTarget = s.params.touchEventsTarget === 'container' ? s.container[0] : s.wrapper[0];
    var target = s.support.touch ? touchEventsTarget : document;

    var moveCapture = s.params.nested ? true : false;

    //Touch Events
    if (s.browser.ie) {
        touchEventsTarget[action](s.touchEvents.start, s.onTouchStart, false);
        target[action](s.touchEvents.move, s.onTouchMove, moveCapture);
        target[action](s.touchEvents.end, s.onTouchEnd, false);
    }
    else {
        if (s.support.touch) {
            var passiveListener = s.touchEvents.start === 'touchstart' && s.support.passiveListener && s.params.passiveListeners ? {passive: true, capture: false} : false;
            touchEventsTarget[action](s.touchEvents.start, s.onTouchStart, passiveListener);
            touchEventsTarget[action](s.touchEvents.move, s.onTouchMove, moveCapture);
            touchEventsTarget[action](s.touchEvents.end, s.onTouchEnd, passiveListener);
        }
        if ((params.simulateTouch && !s.device.ios && !s.device.android) || (params.simulateTouch && !s.support.touch && s.device.ios)) {
            touchEventsTarget[action]('mousedown', s.onTouchStart, false);
            document[action]('mousemove', s.onTouchMove, moveCapture);
            document[action]('mouseup', s.onTouchEnd, false);
        }
    }
    window[action]('resize', s.onResize);

    // Next, Prev, Index
    if (s.params.nextButton && s.nextButton && s.nextButton.length > 0) {
        s.nextButton[actionDom]('click', s.onClickNext);
        if (s.params.a11y && s.a11y) s.nextButton[actionDom]('keydown', s.a11y.onEnterKey);
    }
    if (s.params.prevButton && s.prevButton && s.prevButton.length > 0) {
        s.prevButton[actionDom]('click', s.onClickPrev);
        if (s.params.a11y && s.a11y) s.prevButton[actionDom]('keydown', s.a11y.onEnterKey);
    }
    if (s.params.pagination && s.params.paginationClickable) {
        s.paginationContainer[actionDom]('click', '.' + s.params.bulletClass, s.onClickIndex);
        if (s.params.a11y && s.a11y) s.paginationContainer[actionDom]('keydown', '.' + s.params.bulletClass, s.a11y.onEnterKey);
    }

    // Prevent Links Clicks
    if (s.params.preventClicks || s.params.preventClicksPropagation) touchEventsTarget[action]('click', s.preventClicks, true);
};
s.attachEvents = function () {
    s.initEvents();
};
s.detachEvents = function () {
    s.initEvents(true);
};

var isTouched,
    isMoved,
    allowTouchCallbacks,
    touchStartTime,
    isScrolling,
    currentTranslate,
    startTranslate,
    allowThresholdMove,
    // Form elements to match
    formElements = 'input, select, textarea, button, video',
    // Last click time
    lastClickTime = Date.now(), clickTimeout,
    //Velocities
    velocities = [],
    allowMomentumBounce;

s.touches = {
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    diff: 0
};
s.onTouchStart = function (e) {
    if (e.originalEvent) e = e.originalEvent;
    isTouchEvent = e.type === 'touchstart';
    if (!isTouchEvent && 'which' in e && e.which === 3) return;
    if (s.params.noSwiping && findElementInEvent(e, '.' + s.params.noSwipingClass)) {
        s.allowClick = true;
        return;
    }
    if (s.params.swipeHandler) {
        if (!findElementInEvent(e, s.params.swipeHandler)) return;
    }

    var startX = s.touches.currentX = e.type === 'touchstart' ? e.targetTouches[0].pageX : e.pageX;
    var startY = s.touches.currentY = e.type === 'touchstart' ? e.targetTouches[0].pageY : e.pageY;

    // Do NOT start if iOS edge swipe is detected. Otherwise iOS app (UIWebView) cannot swipe-to-go-back anymore
    if(s.device.ios && s.params.iOSEdgeSwipeDetection && startX <= s.params.iOSEdgeSwipeThreshold) {
        return;
    }

    isTouched = true;
    isMoved = false;
    allowTouchCallbacks = true;
    isScrolling = undefined;
    startMoving = undefined;
    s.touches.startX = startX;
    s.touches.startY = startY;
    touchStartTime = Date.now();
    s.allowClick = true;
    s.updateContainerSize();
    s.swipeDirection = undefined;
    if (s.params.threshold > 0) allowThresholdMove = false;
    if (e.type !== 'touchstart') {
        var preventDefault = true;
        if ($(e.target).is(formElements)) preventDefault = false;
        if (document.activeElement && $(document.activeElement).is(formElements)) {
            document.activeElement.blur();
        }
        if (preventDefault) {
            e.preventDefault();
        }
    }
    s.emit('onTouchStart', s, e);
};

s.onTouchMove = function (e) {
    if (e.originalEvent) e = e.originalEvent;
    if (isTouchEvent && e.type === 'mousemove') return;
    if (e.preventedByNestedSwiper) {
        s.touches.startX = e.type === 'touchmove' ? e.targetTouches[0].pageX : e.pageX;
        s.touches.startY = e.type === 'touchmove' ? e.targetTouches[0].pageY : e.pageY;
        return;
    }
    if (s.params.onlyExternal) {
        // isMoved = true;
        s.allowClick = false;
        if (isTouched) {
            s.touches.startX = s.touches.currentX = e.type === 'touchmove' ? e.targetTouches[0].pageX : e.pageX;
            s.touches.startY = s.touches.currentY = e.type === 'touchmove' ? e.targetTouches[0].pageY : e.pageY;
            touchStartTime = Date.now();
        }
        return;
    }
    if (isTouchEvent && s.params.touchReleaseOnEdges && !s.params.loop) {
        if (!s.isHorizontal()) {
            // Vertical
            if (
                (s.touches.currentY < s.touches.startY && s.translate <= s.maxTranslate()) ||
                (s.touches.currentY > s.touches.startY && s.translate >= s.minTranslate())
                ) {
                return;
            }
        }
        else {
            if (
                (s.touches.currentX < s.touches.startX && s.translate <= s.maxTranslate()) ||
                (s.touches.currentX > s.touches.startX && s.translate >= s.minTranslate())
                ) {
                return;
            }
        }
    }
    if (isTouchEvent && document.activeElement) {
        if (e.target === document.activeElement && $(e.target).is(formElements)) {
            isMoved = true;
            s.allowClick = false;
            return;
        }
    }
    if (allowTouchCallbacks) {
        s.emit('onTouchMove', s, e);
    }
    if (e.targetTouches && e.targetTouches.length > 1) return;

    s.touches.currentX = e.type === 'touchmove' ? e.targetTouches[0].pageX : e.pageX;
    s.touches.currentY = e.type === 'touchmove' ? e.targetTouches[0].pageY : e.pageY;

    if (typeof isScrolling === 'undefined') {
        var touchAngle;
        if (s.isHorizontal() && s.touches.currentY === s.touches.startY || !s.isHorizontal() && s.touches.currentX === s.touches.startX) {
            isScrolling = false;
        }
        else {
            touchAngle = Math.atan2(Math.abs(s.touches.currentY - s.touches.startY), Math.abs(s.touches.currentX - s.touches.startX)) * 180 / Math.PI;
            isScrolling = s.isHorizontal() ? touchAngle > s.params.touchAngle : (90 - touchAngle > s.params.touchAngle);
        }
    }
    if (isScrolling) {
        s.emit('onTouchMoveOpposite', s, e);
    }
    if (typeof startMoving === 'undefined') {
        if (s.touches.currentX !== s.touches.startX || s.touches.currentY !== s.touches.startY) {
            startMoving = true;
        }
    }
    if (!isTouched) return;
    if (isScrolling)  {
        isTouched = false;
        return;
    }
    if (!startMoving) {
        return;
    }
    s.allowClick = false;
    s.emit('onSliderMove', s, e);
    e.preventDefault();
    if (s.params.touchMoveStopPropagation && !s.params.nested) {
        e.stopPropagation();
    }

    if (!isMoved) {
        if (params.loop) {
            s.fixLoop();
        }
        startTranslate = s.getWrapperTranslate();
        s.setWrapperTransition(0);
        if (s.animating) {
            s.wrapper.trigger('webkitTransitionEnd transitionend oTransitionEnd MSTransitionEnd msTransitionEnd');
        }
        if (s.params.autoplay && s.autoplaying) {
            if (s.params.autoplayDisableOnInteraction) {
                s.stopAutoplay();
            }
            else {
                s.pauseAutoplay();
            }
        }
        allowMomentumBounce = false;
        //Grab Cursor
        if (s.params.grabCursor && (s.params.allowSwipeToNext === true || s.params.allowSwipeToPrev === true)) {
            s.setGrabCursor(true);
        }
    }
    isMoved = true;

    var diff = s.touches.diff = s.isHorizontal() ? s.touches.currentX - s.touches.startX : s.touches.currentY - s.touches.startY;

    diff = diff * s.params.touchRatio;
    if (s.rtl) diff = -diff;

    s.swipeDirection = diff > 0 ? 'prev' : 'next';
    currentTranslate = diff + startTranslate;

    var disableParentSwiper = true;
    if ((diff > 0 && currentTranslate > s.minTranslate())) {
        disableParentSwiper = false;
        if (s.params.resistance) currentTranslate = s.minTranslate() - 1 + Math.pow(-s.minTranslate() + startTranslate + diff, s.params.resistanceRatio);
    }
    else if (diff < 0 && currentTranslate < s.maxTranslate()) {
        disableParentSwiper = false;
        if (s.params.resistance) currentTranslate = s.maxTranslate() + 1 - Math.pow(s.maxTranslate() - startTranslate - diff, s.params.resistanceRatio);
    }

    if (disableParentSwiper) {
        e.preventedByNestedSwiper = true;
    }

    // Directions locks
    if (!s.params.allowSwipeToNext && s.swipeDirection === 'next' && currentTranslate < startTranslate) {
        currentTranslate = startTranslate;
    }
    if (!s.params.allowSwipeToPrev && s.swipeDirection === 'prev' && currentTranslate > startTranslate) {
        currentTranslate = startTranslate;
    }


    // Threshold
    if (s.params.threshold > 0) {
        if (Math.abs(diff) > s.params.threshold || allowThresholdMove) {
            if (!allowThresholdMove) {
                allowThresholdMove = true;
                s.touches.startX = s.touches.currentX;
                s.touches.startY = s.touches.currentY;
                currentTranslate = startTranslate;
                s.touches.diff = s.isHorizontal() ? s.touches.currentX - s.touches.startX : s.touches.currentY - s.touches.startY;
                return;
            }
        }
        else {
            currentTranslate = startTranslate;
            return;
        }
    }

    if (!s.params.followFinger) return;

    // Update active index in free mode
    if (s.params.freeMode || s.params.watchSlidesProgress) {
        s.updateActiveIndex();
    }
    if (s.params.freeMode) {
        //Velocity
        if (velocities.length === 0) {
            velocities.push({
                position: s.touches[s.isHorizontal() ? 'startX' : 'startY'],
                time: touchStartTime
            });
        }
        velocities.push({
            position: s.touches[s.isHorizontal() ? 'currentX' : 'currentY'],
            time: (new window.Date()).getTime()
        });
    }
    // Update progress
    s.updateProgress(currentTranslate);
    // Update translate
    s.setWrapperTranslate(currentTranslate);
};
s.onTouchEnd = function (e) {
    if (e.originalEvent) e = e.originalEvent;
    if (allowTouchCallbacks) {
        s.emit('onTouchEnd', s, e);
    }
    allowTouchCallbacks = false;
    if (!isTouched) return;
    //Return Grab Cursor
    if (s.params.grabCursor && isMoved && isTouched  && (s.params.allowSwipeToNext === true || s.params.allowSwipeToPrev === true)) {
        s.setGrabCursor(false);
    }

    // Time diff
    var touchEndTime = Date.now();
    var timeDiff = touchEndTime - touchStartTime;

    // Tap, doubleTap, Click
    if (s.allowClick) {
        s.updateClickedSlide(e);
        s.emit('onTap', s, e);
        if (timeDiff < 300 && (touchEndTime - lastClickTime) > 300) {
            if (clickTimeout) clearTimeout(clickTimeout);
            clickTimeout = setTimeout(function () {
                if (!s) return;
                if (s.params.paginationHide && s.paginationContainer.length > 0 && !$(e.target).hasClass(s.params.bulletClass)) {
                    s.paginationContainer.toggleClass(s.params.paginationHiddenClass);
                }
                s.emit('onClick', s, e);
            }, 300);

        }
        if (timeDiff < 300 && (touchEndTime - lastClickTime) < 300) {
            if (clickTimeout) clearTimeout(clickTimeout);
            s.emit('onDoubleTap', s, e);
        }
    }

    lastClickTime = Date.now();
    setTimeout(function () {
        if (s) s.allowClick = true;
    }, 0);

    if (!isTouched || !isMoved || !s.swipeDirection || s.touches.diff === 0 || currentTranslate === startTranslate) {
        isTouched = isMoved = false;
        return;
    }
    isTouched = isMoved = false;

    var currentPos;
    if (s.params.followFinger) {
        currentPos = s.rtl ? s.translate : -s.translate;
    }
    else {
        currentPos = -currentTranslate;
    }
    if (s.params.freeMode) {
        if (currentPos < -s.minTranslate()) {
            s.slideTo(s.activeIndex);
            return;
        }
        else if (currentPos > -s.maxTranslate()) {
            if (s.slides.length < s.snapGrid.length) {
                s.slideTo(s.snapGrid.length - 1);
            }
            else {
                s.slideTo(s.slides.length - 1);
            }
            return;
        }

        if (s.params.freeModeMomentum) {
            if (velocities.length > 1) {
                var lastMoveEvent = velocities.pop(), velocityEvent = velocities.pop();

                var distance = lastMoveEvent.position - velocityEvent.position;
                var time = lastMoveEvent.time - velocityEvent.time;
                s.velocity = distance / time;
                s.velocity = s.velocity / 2;
                if (Math.abs(s.velocity) < s.params.freeModeMinimumVelocity) {
                    s.velocity = 0;
                }
                // this implies that the user stopped moving a finger then released.
                // There would be no events with distance zero, so the last event is stale.
                if (time > 150 || (new window.Date().getTime() - lastMoveEvent.time) > 300) {
                    s.velocity = 0;
                }
            } else {
                s.velocity = 0;
            }
            s.velocity = s.velocity * s.params.freeModeMomentumVelocityRatio;

            velocities.length = 0;
            var momentumDuration = 1000 * s.params.freeModeMomentumRatio;
            var momentumDistance = s.velocity * momentumDuration;

            var newPosition = s.translate + momentumDistance;
            if (s.rtl) newPosition = - newPosition;
            var doBounce = false;
            var afterBouncePosition;
            var bounceAmount = Math.abs(s.velocity) * 20 * s.params.freeModeMomentumBounceRatio;
            if (newPosition < s.maxTranslate()) {
                if (s.params.freeModeMomentumBounce) {
                    if (newPosition + s.maxTranslate() < -bounceAmount) {
                        newPosition = s.maxTranslate() - bounceAmount;
                    }
                    afterBouncePosition = s.maxTranslate();
                    doBounce = true;
                    allowMomentumBounce = true;
                }
                else {
                    newPosition = s.maxTranslate();
                }
            }
            else if (newPosition > s.minTranslate()) {
                if (s.params.freeModeMomentumBounce) {
                    if (newPosition - s.minTranslate() > bounceAmount) {
                        newPosition = s.minTranslate() + bounceAmount;
                    }
                    afterBouncePosition = s.minTranslate();
                    doBounce = true;
                    allowMomentumBounce = true;
                }
                else {
                    newPosition = s.minTranslate();
                }
            }
            else if (s.params.freeModeSticky) {
                var j = 0,
                    nextSlide;
                for (j = 0; j < s.snapGrid.length; j += 1) {
                    if (s.snapGrid[j] > -newPosition) {
                        nextSlide = j;
                        break;
                    }

                }
                if (Math.abs(s.snapGrid[nextSlide] - newPosition) < Math.abs(s.snapGrid[nextSlide - 1] - newPosition) || s.swipeDirection === 'next') {
                    newPosition = s.snapGrid[nextSlide];
                } else {
                    newPosition = s.snapGrid[nextSlide - 1];
                }
                if (!s.rtl) newPosition = - newPosition;
            }
            //Fix duration
            if (s.velocity !== 0) {
                if (s.rtl) {
                    momentumDuration = Math.abs((-newPosition - s.translate) / s.velocity);
                }
                else {
                    momentumDuration = Math.abs((newPosition - s.translate) / s.velocity);
                }
            }
            else if (s.params.freeModeSticky) {
                s.slideReset();
                return;
            }

            if (s.params.freeModeMomentumBounce && doBounce) {
                s.updateProgress(afterBouncePosition);
                s.setWrapperTransition(momentumDuration);
                s.setWrapperTranslate(newPosition);
                s.onTransitionStart();
                s.animating = true;
                s.wrapper.transitionEnd(function () {
                    if (!s || !allowMomentumBounce) return;
                    s.emit('onMomentumBounce', s);

                    s.setWrapperTransition(s.params.speed);
                    s.setWrapperTranslate(afterBouncePosition);
                    s.wrapper.transitionEnd(function () {
                        if (!s) return;
                        s.onTransitionEnd();
                    });
                });
            } else if (s.velocity) {
                s.updateProgress(newPosition);
                s.setWrapperTransition(momentumDuration);
                s.setWrapperTranslate(newPosition);
                s.onTransitionStart();
                if (!s.animating) {
                    s.animating = true;
                    s.wrapper.transitionEnd(function () {
                        if (!s) return;
                        s.onTransitionEnd();
                    });
                }

            } else {
                s.updateProgress(newPosition);
            }

            s.updateActiveIndex();
        }
        if (!s.params.freeModeMomentum || timeDiff >= s.params.longSwipesMs) {
            s.updateProgress();
            s.updateActiveIndex();
        }
        return;
    }

    // Find current slide
    var i, stopIndex = 0, groupSize = s.slidesSizesGrid[0];
    for (i = 0; i < s.slidesGrid.length; i += s.params.slidesPerGroup) {
        if (typeof s.slidesGrid[i + s.params.slidesPerGroup] !== 'undefined') {
            if (currentPos >= s.slidesGrid[i] && currentPos < s.slidesGrid[i + s.params.slidesPerGroup]) {
                stopIndex = i;
                groupSize = s.slidesGrid[i + s.params.slidesPerGroup] - s.slidesGrid[i];
            }
        }
        else {
            if (currentPos >= s.slidesGrid[i]) {
                stopIndex = i;
                groupSize = s.slidesGrid[s.slidesGrid.length - 1] - s.slidesGrid[s.slidesGrid.length - 2];
            }
        }
    }

    // Find current slide size
    var ratio = (currentPos - s.slidesGrid[stopIndex]) / groupSize;

    if (timeDiff > s.params.longSwipesMs) {
        // Long touches
        if (!s.params.longSwipes) {
            s.slideTo(s.activeIndex);
            return;
        }
        if (s.swipeDirection === 'next') {
            if (ratio >= s.params.longSwipesRatio) s.slideTo(stopIndex + s.params.slidesPerGroup);
            else s.slideTo(stopIndex);

        }
        if (s.swipeDirection === 'prev') {
            if (ratio > (1 - s.params.longSwipesRatio)) s.slideTo(stopIndex + s.params.slidesPerGroup);
            else s.slideTo(stopIndex);
        }
    }
    else {
        // Short swipes
        if (!s.params.shortSwipes) {
            s.slideTo(s.activeIndex);
            return;
        }
        if (s.swipeDirection === 'next') {
            s.slideTo(stopIndex + s.params.slidesPerGroup);

        }
        if (s.swipeDirection === 'prev') {
            s.slideTo(stopIndex);
        }
    }
};
Swiper.prototype = {
    isSafari: (function () {
        var ua = window.navigator.userAgent.toLowerCase();
        return (ua.indexOf('safari') >= 0 && ua.indexOf('chrome') < 0 && ua.indexOf('android') < 0);
    })(),
    isUiWebView: /(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(window.navigator.userAgent),
    isArray: function (arr) {
        return Object.prototype.toString.apply(arr) === '[object Array]';
    },
    /*==================================================
    Browser
    ====================================================*/
    browser: {
        ie: window.navigator.pointerEnabled || window.navigator.msPointerEnabled,
        ieTouch: (window.navigator.msPointerEnabled && window.navigator.msMaxTouchPoints > 1) || (window.navigator.pointerEnabled && window.navigator.maxTouchPoints > 1),
        lteIE9: (function() {
            // create temporary DIV
            var div = document.createElement('div');
            // add content to tmp DIV which is wrapped into the IE HTML conditional statement
            div.innerHTML = '<!--[if lte IE 9]><i></i><![endif]-->';
            // return true / false value based on what will browser render
            return div.getElementsByTagName('i').length === 1;
        })()
    },
    /*==================================================
    Devices
    ====================================================*/
    device: (function () {
        var ua = window.navigator.userAgent;
        var android = ua.match(/(Android);?[\s\/]+([\d.]+)?/);
        var ipad = ua.match(/(iPad).*OS\s([\d_]+)/);
        var ipod = ua.match(/(iPod)(.*OS\s([\d_]+))?/);
        var iphone = !ipad && ua.match(/(iPhone\sOS|iOS)\s([\d_]+)/);
        return {
            ios: ipad || iphone || ipod,
            android: android
        };
    })(),
    /*==================================================
    Feature Detection
    ====================================================*/
    support: {
        touch : (window.Modernizr && Modernizr.touch === true) || (function () {
            return !!(('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch);
        })(),

        transforms3d : (window.Modernizr && Modernizr.csstransforms3d === true) || (function () {
            var div = document.createElement('div').style;
            return ('webkitPerspective' in div || 'MozPerspective' in div || 'OPerspective' in div || 'MsPerspective' in div || 'perspective' in div);
        })(),

        flexbox: (function () {
            var div = document.createElement('div').style;
            var styles = ('alignItems webkitAlignItems webkitBoxAlign msFlexAlign mozBoxAlign webkitFlexDirection msFlexDirection mozBoxDirection mozBoxOrient webkitBoxDirection webkitBoxOrient').split(' ');
            for (var i = 0; i < styles.length; i++) {
                if (styles[i] in div) return true;
            }
        })(),

        observer: (function () {
            return ('MutationObserver' in window || 'WebkitMutationObserver' in window);
        })(),

        passiveListener: (function () {
            var supportsPassive = false;
            try {
                var opts = Object.defineProperty({}, 'passive', {
                    get: function() {
                        supportsPassive = true;
                    }
                });
                window.addEventListener('testPassiveListener', null, opts);
            } catch (e) {}
            return supportsPassive;
        })(),

        gestures: (function () {
            return 'ongesturestart' in window;
        })()
    },
    /*==================================================
    Plugins
    ====================================================*/
    plugins: {}
};
```
