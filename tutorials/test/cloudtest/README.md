# 云测平台

- [openstf](https://github.com/openstf/stf)
- [岩鼠](https://yanshu.effirst.com/)
- [百度MTC](http://mtc.baidu.com/)
- [Testin 云测](https://testin.cn/)

## [STF](https://github.com/openstf/stf)

特性

- 支持 Android 系统：Android 2.3+
- 使用键盘和鼠标输入，而且支持多点触控
- 共享剪贴板
- 拖拽安装应用
- 直接打开 URL
- 实时过滤日志
- Shell 命令
- 远程调试

### 安装

- MacOS

    ```bash
    $ brew install rethinkdb graphicsmagick zeromq protobuf yasm pkg-config
    # 必须试用 node 8.x 版本
    $ npm install -g stf
    $ rethinkdb
    $ stf local --public-ip <your_internal_network_ip_here>
    ```

- Window：官方已经说明了不推荐也不支持在 Window 上安装 STF，但可以使用 Linux 虚拟机来安装
- Linux：支持使用 Docker 来安装 STF

常见问题

- 必须试用 node 8.x 版本安装 stf，参见 [Failed to install stf using npm](https://github.com/openstf/stf/issues/995)
- MacOS 不支持使用 Docker 来安装 STF，参见 [No /dev/bus/usb virtualization on Mac OS Sierra](https://github.com/sorccu/docker-adb/issues/8)

参考文献

- [Mac OS环境搭建STF](https://vic.kim/2019/08/21/Mac%20OS%E7%8E%AF%E5%A2%83%E6%90%AD%E5%BB%BASTF/)
- [OpenStf的搭建以及分布式部署的实现](https://juejin.im/post/5e21890ce51d45020a698cba)
- [OpenSTF 平台搭建](https://www.cnblogs.com/yyoba/p/11232406.html)
- [MacOS搭建openstf环境](https://www.jianshu.com/p/fb8d419c0ede)
- [STF 折腾之路 最后换成 Docker 来安装](https://testerhome.com/topics/10406)
- [deploy-stf-docker](https://github.com/thinkhy/deploy-stf-docker)
- [STF 的 docker 镜像介绍及快速构建方法](https://testerhome.com/topics/9358)

### 部署

- [Deployment](https://github.com/openstf/stf/blob/master/doc/DEPLOYMENT.md)
- [Smartphone Test Farm Setup Examples](https://github.com/openstf/setup-examples)
- [OpenStf的搭建以及分布式部署的实现](https://juejin.im/post/5e21890ce51d45020a698cba)
