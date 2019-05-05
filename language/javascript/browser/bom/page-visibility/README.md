[拥抱HTML5 — Page Visibility(页面可见性) API介绍](http://www.cnblogs.com/zichi/p/5158745.html)

# 兼容性
- IE10+：visibilitychange
- IE9-：onfocusin/onfocusout
- iOS：onpageshow/onpagehide

# 实际应用
- 通过 visibilityState 的值检测页面当前是否可见，以及打开网页的时间等；
- 在页面被切换到其他后台进程的时候，自动暂停音乐或视频的播放；

## 参考文献

- [Page Visibility API 教程](http://www.ruanyifeng.com/blog/2018/10/page_visibility_api.html)
