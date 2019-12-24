# [Docker](https://www.docker.com)

## 介绍

### 为什么需要容器？

1. 环境配置的难题

    只有操作系统设置正确，并且安装了各种库和组件，软件才能正常运行。为了解决环境配置问题，需要一种带环境安装软件的解决方案。

2. 虚拟机弊端

    虚拟机是带环境安装的一种解决方案，它可以在一种操作系统里面运行另一种操作系统。虽然可以通过虚拟机还原软件的原始环境。但是，这个方案有几个缺点。

    - 资源占用多
    - 冗余步骤多
    - 启动慢

3. Linux 容器

    Linux 容器不是模拟一个完整的操作系统，而是对进程进行隔离。或者说，在正常进程的外面套了一个保护层。对于容器里面的进程来说，它接触到的各种资源都是虚拟的，从而实现与底层系统的隔离。

    - 启动快
    - 资源占用少
    - 体积小

参考文献

- [当Node.js遇见Docker](https://blog.fundebug.com/2017/03/27/nodejs-docker/)

### Docker 是什么？

Docker 属于 Linux 容器的一种封装，提供简单易用的容器使用接口。它是目前最流行的 Linux 容器解决方案。

- 提供一次性的环境。
- 提供弹性的云服务。
- 组建微服务架构。

## 安装

### 社区版

- [Mac](https://docs.docker.com/docker-for-mac/install/)
- [Windows](https://docs.docker.com/docker-for-windows/install/)

    要求 Win10 专业版或者企业版

- [Ubuntu](https://docs.docker.com/install/linux/docker-ce/ubuntu/)
- [Debian](https://docs.docker.com/install/linux/docker-ce/debian/)
- [CentOS](https://docs.docker.com/install/linux/docker-ce/centos/)
- [Fedora](https://docs.docker.com/install/linux/docker-ce/fedora/)
- [Others](https://docs.docker.com/install/linux/docker-ce/binaries/)

旧版本的 window 和 mac 需要使用 [Docker Toolbox](https://docs.docker.com/toolbox/overview/) 来安装。 —— [Issues while installing Docker on Windows 10 home edition](https://stackoverflow.com/questions/49677610/issues-while-installing-docker-on-windows-10-home-edition#:~:targetText=As%20the%20error%20says%2C%20you,or%20Windows%20server%202016%20RTM.%22&targetText=The%20current%20version%20of%20Docker,%2C%20Build%2014393%20or%20later)

### 企业版

N/A

### 检验安装

- `sudo usermod -aG docker $USER`

    Docker 需要用户具有 sudo 权限，为了避免每次命令都输入sudo，可以把用户加入 Docker 用户组

- `docker version` / `docker info`

### 启动服务

```
sudo service docker start
```

或者

```
sudo systemctl start docker
```

### Hello World!

1. `docker image pull hello-world`
2. `docker container run hello-world`

## 教程

- [Docker 入门教程](http://www.ruanyifeng.com/blog/2018/02/docker-tutorial.html)
- [Docker 微服务教程](http://www.ruanyifeng.com/blog/2018/02/docker-wordpress-tutorial.html)
- [Docker 教程](https://www.w3cschool.cn/docker/)
- [docker-curriculum](https://github.com/prakhar1989/docker-curriculum)

### Image 管理

> Docker 把应用程序及其依赖，打包在 image 文件里面。只有通过这个文件，才能生成 Docker 容器。image 文件可以看作是容器的模板。Docker 根据 image 文件生成容器的实例。同一个 image 文件，可以生成多个同时运行的容器实例。

> image 是二进制文件。实际开发中，一个 image 文件往往通过继承另一个 image 文件，加上一些个性化设置而生成。举例来说，你可以在 Ubuntu 的 image 基础上，往里面加入 Apache 服务器，形成你的 image。

> image 文件是通用的，一台机器的 image 文件拷贝到另一台机器，照样可以使用。一般来说，为了节省时间，我们应该尽量使用别人制作好的 image 文件，而不是自己制作。即使要定制，也应该基于别人的 image 文件进行加工，而不是从零开始制作。

#### Image 常用命令

- `docker image ls`：列出本机的所有 image 文件
- `docker image rm [imageName]`：删除 image 文件
- `docker image pull <group_name>/<image_name>`：下载 image 文件

#### Image 远程仓库

> 为了方便共享，image 文件制作完成后，可以上传到网上的仓库。

- [官方仓库](https://hub.docker.com)

#### 配置仓库镜像

- [9102 年在国内如何快速的下载 Docker 镜像, 现存 Docker 镜像源横评](https://tomwei7.com/docker/2019/07/12/how-to-pull-docker-image-fast-in-china.html)

- [国内 docker 仓库镜像对比](https://ieevee.com/tech/2016/09/28/docker-mirror.html)

- [docker改国内官方镜像](https://www.cnblogs.com/coolwinds/p/7465475.html)

- [Docker 国内仓库和镜像](https://www.cnblogs.com/wushuaishuai/p/9984228.html)

- [docker_mirror](https://github.com/silenceshell/docker_mirror)

- [Docker 配置国内镜像](https://www.jianshu.com/p/05f1232bda9f)

- [docker for mac更换国内镜像源](https://www.jianshu.com/p/419eaf4425a6)

- [Docker Toolbox下配置国内镜像源-阿里云加速器](https://www.jianshu.com/p/b59c1be8db87)

- ubuntu

    1. `sudo vi /etc/docker/daemon.json`

        ```
        {
          "registry-mirrors": [
            "https://dockerhub.azk8s.cn",
            "https://hub-mirror.c.163.com",
            "https://docker.mirrors.ustc.edu.cn"
          ]
        }
        ```

    2. `sudo systemctl daemon-reload`
    3. `sudo systemctl restart docker`

- window docker toolbox

    ```bash
    # 创建default虚拟机
    $ docker-machine create --driver virtualbox default
    # 删除default虚拟机
    $ docker-machine rm default
    # 创建 default 虚拟机,并配置阿里云加速器
    docker-machine create --engine-registry-mirror=加速地址 -d virtualbox default
    # 配置已经创建的 default 虚拟机
    $ docker-machine ssh default 
    $ sudo sed -i "s|EXTRA_ARGS='|EXTRA_ARGS='--registry-mirror=加速地址 |g" /var/lib/boot2docker/profile
    $ exit 
    $ docker-machine restart default
    ```

- docker desktop

    在配置界面里设置

#### 发布个人镜像

- [发布你的个人docker镜像](https://yancai.github.io/doc/docker/publish-your-image/)
- [发布镜像](https://github.com/zhangpeihao/LearningDocker/blob/master/manuscript/03-PublishImage.md)
- [Set up automated builds](https://docs.docker.com/docker-hub/builds/)

### Container 管理

#### Container 常用命令

- `docker container run [OPTIONS] IMAGE [COMMAND] [ARG...]`：运行容器
- `docker container ls [OPTIONS]`：列出本机正在运行的容器

    Image 文件生成的容器实例，本身也是一个文件，称为容器文件。也就是说，一旦容器生成，就会同时存在两个文件： image 文件和容器文件。而且关闭容器并不会删除容器文件，只是容器停止运行而已。

- `docker container kill [OPTIONS] CONTAINER [CONTAINER...]`：终止容器

    有些容器不会自动终止，例如：安装运行 Ubuntu 的 image，就可以在命令行体验 Ubuntu 系统。

    `docker container run -it ubuntu bash`

- `docker container rm [OPTIONS] CONTAINER [CONTAINER...]`：删除容器
- `docker container start [OPTIONS] CONTAINER [CONTAINER...]`：启动容器

    `docker container run` 命令是新建容器，每运行一次，就会新建一个容器。同样的命令运行两次，就会生成两个一模一样的容器文件。如果希望重复使用容器，就要使用 `docker container start` 命令，它用来启动已经生成、已经停止运行的容器文件。

- `docker container stop [OPTIONS] CONTAINER [CONTAINER...]`：终止容器

    前面的 `docker container kill` 命令终止容器运行，相当于向容器里面的主进程发出 SIGKILL 信号。而 `docker container stop` 命令也是用来终止容器运行，相当于向容器里面的主进程发出 SIGTERM 信号，然后过一段时间再发出 SIGKILL 信号。

- `docker container logs [OPTIONS] CONTAINER`：查看日志

    `docker container logs` 命令用来查看 docker 容器的输出，即容器里面 Shell 的标准输出。如果 `docker run` 命令运行容器的时候，没有使用 `-it` 参数，就要用这个命令查看输出。

- `docker container exec [OPTIONS] CONTAINER COMMAND [ARG...]`：在指定容器上运行命令

    `docker container exec` 命令用于进入一个正在运行的 docker 容器。如果 `docker run` 命令运行容器的时候，没有使用 `-it` 参数，就要用这个命令进入容器。一旦进入了容器，就可以在容器的 Shell 执行命令了。

- `docker container cp [OPTIONS] CONTAINER:SRC_PATH DEST_PATH`：拷贝文件（从正在运行的 Docker 容器里面，将文件拷贝到本机）

### Dockerfile 配置

Dockerfile 是一个文本文件，用来配置 image。Docker 根据该文件生成二进制的 image 文件。

#### 制作自己的 Image 文件

1. `git clone https://github.com/ruanyf/koa-demos.git`
2. `cd koa-demos`
3. `.dockerignore`

    ```
    .git
    node_modules
    npm-debug.log
    ```

4. `Dockerfile`

    ```
    FROM node:8.4
    COPY . /app
    WORKDIR /app
    RUN npm install --registry=https://registry.npm.taobao.org
    EXPOSE 3000
    ```
5. `docker image build -t koa-demo:0.0.1 .`
6. `docker image ls`
7. `docker container run -p 8000:3000 -it koa-demo:0.0.1 /bin/bash`
8. `docker login`
9. `docker image tag [imageName] [username]/[repository]:[tag]`
10. `docker image push [username]/[repository]:[tag]`

### 常用镜像

- [MySQL](https://hub.docker.com/_/mysql)
- [adminer](https://hub.docker.com/_/adminer) - Adminer (formerly phpMinAdmin) is a full-featured database management tool written in PHP.
- [poste](https://hub.docker.com/r/analogic/poste.io) - complete mailserver built in one container.
- android

    - [thyrlian/AndroidSDK](https://github.com/thyrlian/AndroidSDK)

### Network

- [Docker Network—Bridge 模式](https://www.cnkirito.moe/docker-network-bridge/)
- [使用 Docker 容器网络](https://www.ibm.com/developerworks/cn/linux/l-docker-network/index.html)
- [Docker 网络之进阶篇](https://www.cnblogs.com/sparkdev/p/9198109.html)
- [如何让在不同network中的两个docker容器互通](https://www.wencst.com/archives/787)

### Compose

- [Install Docker Compose](https://docs.docker.com/compose/install/)

## 问题

### 如何配置时区？

- [docker 配置时区](https://www.jianshu.com/p/f00c29bc6bb6)
- [List of tz database time zones](https://en.wikipedia.org/wiki/List_of_tz_database_time_zoness)

### 主机和容器的文件权限问题

- [解决 Docker 数据卷挂载的文件权限问题](https://padeoe.com/docker-volume-file-permission-problem/)
- [docker-compose volumes 容器内权限会变为root所有?](https://segmentfault.com/q/1010000010446328/a-1020000010446370)
- [Mount container volume root folder?](https://forums.docker.com/t/mount-container-volume-root-folder/38265)

### Got permission denied while trying to connect to the Docker daemon socket at unix:///var/run/docker.sock:

- [Permission denied when running Docker after installing it as a Snap](https://askubuntu.com/questions/941816/permission-denied-when-running-docker-after-installing-it-as-a-snap)
- [How to fix docker: Got permission denied while trying to connect to the Docker daemon socket](https://www.digitalocean.com/community/questions/how-to-fix-docker-got-permission-denied-while-trying-to-connect-to-the-docker-daemon-socket)

### Error Connecting to Docker hub

- 问题：

    ```
    Error response from daemon: Get https://registry-1.docker.io/v2/: net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)
    ```

- 解决：修改 DNS 服务器为 8.8.8.8

    [Error Connecting to Docker hub](https://stackoverflow.com/questions/41262622/error-connecting-to-docker-hub)


### net/http: TLS handshake timeout

- [Docker pull: TLS handshake timeout](https://serverfault.com/questions/908141/docker-pull-tls-handshake-timeout)
- [docker报错“net/http: TLS handshake timeout”的解决方法](https://www.cnblogs.com/kaishirenshi/p/10392559.html)
- [使用docker时报错“net/http: TLS handshake timeout”的解决方案](https://www.jianshu.com/p/e9c6efd5e3e1)

### uid 和 gid 工作原理

- [Understanding how uid and gid work in Docker containers](https://medium.com/@mccode/understanding-how-uid-and-gid-work-in-docker-containers-c37a01d01cf)
- [Running a Docker container as a non-root user](https://medium.com/redbubble/running-a-docker-container-as-a-non-root-user-7d2e00f8ee15)

### MYSQL `mbind: Operation not permitted`

- [docker logs mbind: Operation not permitted](https://github.com/docker-library/mysql/issues/303)
