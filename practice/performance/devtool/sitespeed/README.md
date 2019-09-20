# [Sitespeed](https://www.sitespeed.io)

## 结果

- 测试信息：域名、时间
- 测试演示：HTML、CSS、JS、Font、Image 等
- 汇总信息：browsertime.json、browsertime.har
- 页面信息：

    - 演示页面
    - 原始数据：截图、视频

SiteSpeed

```
.
└── www.baidu.com
    ├── 2019-09-03-06-28-14
    │   ├── css
    │   ├── font
    │   ├── img
    │   ├── js
    │   ├── logs
    │   │   └── sitespeed.io.log
    │   ├── pages
    │   │   └── www.baidu.com
    │   │       ├── data
    │   │       │   ├── screenshots
    │   │       │   │   ├── 1.png
    │   │       │   │   ├── 2.png
    │   │       │   │   └── 3.png
    │   │       │   ├── video
    │   │       │   │   ├── images
    │   │       │   │   │   ├── 1
    │   │       │   │   │   │   ├── ms_000000.jpg
    │   │       │   │   │   │   ├── ...
    │   │       │   │   │   │   └── ms_005634.jpg
    │   │       │   │   │   ├── 2
    │   │       │   │   │   │   ├── ms_000000.jpg
    │   │       │   │   │   │   ├── ...
    │   │       │   │   │   │   └── ms_005600.jpg
    │   │       │   │   │   └── 3
    │   │       │   │   │       ├── ms_000000.jpg
    │   │       │   │   │       ├── ...
    │   │       │   │   │       └── ms_005600.jpg
    │   │       │   │   ├── 1.mp4
    │   │       │   │   ├── 2.mp4
    │   │       │   │   └── 3.mp4
    │   │       │   └── browsertime.har
    │   │       ├── 1.html
    │   │       ├── 2.html
    │   │       ├── 3.html
    │   │       └── index.html
    │   ├── assets.html
    │   ├── detailed.html
    │   ├── domains.html
    │   ├── help.html
    │   ├── index.html
    │   ├── pages.html
    │   └── toplist.html
    └── 2019-09-03-06-34-19
```

Browsertime

```
.
└── www.baidu.com
    └── 2019-09-03T094759+0000
        ├── pages
        │   └── www.baidu.com
        │       └── data
        │           └── video
        │               ├── images
        │               │   ├── 1
        │               │   │   ├── ms_000000.jpg
        │               │   │   ├── ...
        │               │   │   └── ms_005633.jpg
        │               │   ├── 2
        │               │   │   ├── ms_000000.jpg
        │               │   │   ├── ...
        │               │   │   └── ms_005700.jpg
        │               │   └── 3
        │               │       ├── ms_000000.jpg
        │               │       ├── ...
        │               │       ├── ms_005067.jpg
        │               │       └── ms_005667.jpg
        │               ├── 1.mp4
        │               ├── 2.mp4
        │               └── 3.mp4
        ├── browsertime.har
        └── browsertime.json
```

```
.
├── screenshots
│   └── 1.jpg
├── video
│   ├── images
│   │   └── 1
│   │       ├── ms_000000.jpg
│   │       ├── ...
│   │       └── ms_003466.jpg
│   └── 1.mp4
├── browsertime.har
├── browsertime.json
├── chromePerflog-1.json.gz
├── info.json
└── trace-1.json.gz
```

## 网络

- [Throttle](https://www.sitespeed.io/documentation/throttle/)

## 监控

- [示例网站](https://dashboard.sitespeed.io)
- [dashboard.sitespeed.io](https://github.com/sitespeedio/dashboard.sitespeed.io) - Example how to use sitespeed.io to monitor the performance of your web site.
- [Performance Dashboard](https://www.sitespeed.io/documentation/sitespeed.io/performance-dashboard/#up-and-running-in-almost-5-minutes)


- [Performance Leaderboard](https://www.sitespeed.io/documentation/sitespeed.io/leaderboard/)
- [grafana-bootstrap-docker](https://github.com/sitespeedio/grafana-bootstrap-docker) - Run this container to get a default Graphite datasource linked with the default sitespeed.io dashboards.
- [docker-compose](https://github.com/sitespeedio/sitespeed.io/blob/master/docker/docker-compose.yml)

相关工具

- [graphite](https://graphiteapp.org)

    - [graphite docker](https://hub.docker.com/r/sitespeedio/graphite)

- [grafana](https://grafana.com)

    - [grafana docker](https://hub.docker.com/r/grafana/grafana/tags)

参考文献

- [Continuously run your tests](https://www.sitespeed.io/documentation/sitespeed.io/continuously-run-your-tests/)
- [Graphite](https://www.sitespeed.io/documentation/sitespeed.io/graphite/)
- [Alerts](https://www.sitespeed.io/documentation/sitespeed.io/alerts/)
- [Continuous Integration](https://www.sitespeed.io/documentation/sitespeed.io/continuous-integration/)

## 录屏

- [WebPageReplay](https://www.sitespeed.io/documentation/sitespeed.io/webpagereplay/)
- [Web Page Replay](https://github.com/catapult-project/catapult/blob/master/web_page_replay_go/README.md)

## 插件

- [I want a JSON from Browsertime/Coach other tools, how do I get that?](https://www.sitespeed.io/documentation/sitespeed.io/best-practice/)

### analysisstorer

## 问题

### 如何同步 Docker 和主机的时区？

- [Synchronise docker machines time with host](https://www.sitespeed.io/documentation/sitespeed.io/docker/#synchronise-docker-machines-time-with-host)
- [docker 配置时区](https://www.jianshu.com/p/f00c29bc6bb6)
- [List of tz database time zones](https://en.wikipedia.org/wiki/List_of_tz_database_time_zoness)

### 如何输出 JSON 格式的数据？

- [I want a JSON from Browsertime/Coach other tools, how do I get that?](https://www.sitespeed.io/documentation/sitespeed.io/best-practice/#i-want-a-json-from-browsertimecoach-other-tools-how-do-i-get-that)

### 模拟网络环境？

教程

- [Connectivity](https://www.sitespeed.io/documentation/sitespeed.io/connectivity/)
- [Throttle or not throttle your connection?](https://www.sitespeed.io/documentation/sitespeed.io/best-practice/#throttle-or-not-throttle-your-connection)
- [Kubernetes](https://www.sitespeed.io/documentation/sitespeed.io/best-practice/#kubernetes)
- [Revisit Chrome throttling support](https://github.com/sitespeedio/sitespeed.io/issues/2267)
- [Throttle the connection](https://github.com/sitespeedio/sitespeed.io/issues/895)
- [set connectivity by using TSProxy](https://www.sitespeed.io/documentation/sitespeed.io/mobile-phones/#tsproxy)

工具

- [tc](https://linux.die.net/man/8/tc)
- [sitespeedio/throttle](https://github.com/sitespeedio/throttle)
- [tylertreat/comcast](https://github.com/tylertreat/Comcast)
- [alexei-led/pumba](https://github.com/alexei-led/pumba)
- [facebookarchive/augmented-traffic-control](https://github.com/facebookarchive/augmented-traffic-control)
- [lukaszlach/docker-tc](https://github.com/lukaszlach/docker-tc)
- [tsproxy](https://github.com/WPO-Foundation/tsproxy)
- [Dummynet](https://cs.baylor.edu/~donahoo/tools/dummy/)
- [win-shaper](https://github.com/WPO-Foundation/win-shaper)
- [clumsy](http://jagt.github.io/clumsy/)

参考

- [Network Throttling & Chrome - status](https://docs.google.com/document/d/1TwWLaLAfnBfbk5_ZzpGXegPapCIfyzT4MWuZgspKUAQ/edit#heading=h.buq49xxy577t)：网络限速工具对比
- [connectivity.ini.sample](https://github.com/WPO-Foundation/webpagetest/blob/master/www/settings/connectivity.ini.sample)：WebPagetest 网络模拟配置
- [Testing with Realistic Networking Conditions](https://calendar.perfplanet.com/2016/testing-with-realistic-networking-conditions/)
- [产品测试中，如何模拟网络不佳的情况？](https://www.zhihu.com/question/29128847)
- [Chaos Testing for Docker Containers](https://codefresh.io/docker-tutorial/chaos_testing_docker/)

### grafana Volume 读写权限问题

- [New Docker Install with persistent storage, Permission problem](https://community.grafana.com/t/new-docker-install-with-persistent-storage-permission-problem/10896)
- [Migration from a previous version of the docker container to 5.1 or later](https://grafana.com/docs/installation/docker/#migration-from-a-previous-version-of-the-docker-container-to-5-1-or-later)

---

https://awesome-docker.netlify.com
