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

### Docker 是什么？

Docker 属于 Linux 容器的一种封装，提供简单易用的容器使用接口。它是目前最流行的 Linux 容器解决方案。

- 提供一次性的环境。
- 提供弹性的云服务。
- 组建微服务架构。

## 安装

### 社区版

- [Mac](https://docs.docker.com/docker-for-mac/install/)
- [Windows](https://docs.docker.com/docker-for-windows/install/)
- [Ubuntu](https://docs.docker.com/install/linux/docker-ce/ubuntu/)
- [Debian](https://docs.docker.com/install/linux/docker-ce/debian/)
- [CentOS](https://docs.docker.com/install/linux/docker-ce/centos/)
- [Fedora](https://docs.docker.com/install/linux/docker-ce/fedora/)
- [Others](https://docs.docker.com/install/linux/docker-ce/binaries/)

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

- [国内 docker 仓库镜像对比](https://ieevee.com/tech/2016/09/28/docker-mirror.html)
- [docker改国内官方镜像](https://www.cnblogs.com/coolwinds/p/7465475.html)
- [Docker 国内仓库和镜像](https://www.cnblogs.com/wushuaishuai/p/9984228.html)
- [docker_mirror](https://github.com/silenceshell/docker_mirror)
- [Docker 配置国内镜像](https://www.jianshu.com/p/05f1232bda9f)
- [docker for mac更换国内镜像源](https://www.jianshu.com/p/419eaf4425a6)

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

## 问题

### 如何配置时区？

- [docker 配置时区](https://www.jianshu.com/p/f00c29bc6bb6)
- [List of tz database time zones](https://en.wikipedia.org/wiki/List_of_tz_database_time_zoness)
