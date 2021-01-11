# [Jenkins](https://www.jenkins.io/zh/)

Jenkins 是一款开源 CI&CD 软件，用于自动化各种任务，包括构建、测试和部署软件。

## 安装配置

https://www.jenkins.io/zh/doc/book/installing/

- 系统包：https://www.jenkins.io/zh/download/
- Docker：https://hub.docker.com/r/jenkins/jenkins

常见问题

- [【Devops】【Jenkins】Jenkins插件安装失败处理方法](http://mirror.esuni.jp/jenkins/)
- [镜像地址](http://mirrors.jenkins-ci.org/status.html)

启动/停止/重启/重载

- [Jenkins技巧：如何启动、停止、重启、重载Jenkins](https://www.cnblogs.com/dzblog/p/6962810.html)

```bash
sudo service jenkins start
```

修改配置

```bash
$ vim /etc/sysconfig/jenkins
$ sudo service jenkins restart
```

参考文献

[Git Plugin](https://wiki.jenkins.io/pages/viewpage.action?pageId=99058510&navigatingVersions=true)

### 基于 Docker 安装

- [使用 Docker 安装 Jenkins 的方式](https://segmentfault.com/a/1190000021925039)

## 使用教程

- [手把手教你搭建Jenkins+Github持续集成环境](https://github.com/muyinchen/woker/blob/master/%E9%9B%86%E6%88%90%E6%B5%8B%E8%AF%95%E7%8E%AF%E5%A2%83%E6%90%AD%E5%BB%BA/%E6%89%8B%E6%8A%8A%E6%89%8B%E6%95%99%E4%BD%A0%E6%90%AD%E5%BB%BAJenkins%2BGithub%E6%8C%81%E7%BB%AD%E9%9B%86%E6%88%90%E7%8E%AF%E5%A2%83.md)
- [再也不用找了，持续集成与部署工具Jenkins全系列实战，全面的令人发指](https://segmentfault.com/a/1190000023915935)

### Git

ps：有时候需要在构建完成后，对远程仓库进行变更提交，这时候需要配置 SSH key 和用户信息。

1. 配置 `user.name` 和 `user.email`

    Manage Jenkins => Configuration System => Git plugin

    ps：如果不配置用户信息，git 无法提交变更。

2. 配置 SSH

    ```bash
    $ cd /var/lib/jenkins/
    $ # 在这个目录下配置 ssh key
    ```

    ps：要在构建脚本里执行 git 操作，需要配置 jenkins 所在用户的 git 访问仓库的权限，否则没有权限操作远程仓库。

### Nodejs

安装配置

1. 安装：Manage Jenkins => Manage Plugins => Available => Nodejs
2. 配置：Manage Jenkins => Global Tool Configuration => Nodejs => Nodejs Installations => Add Nodejs

- [【第1262期】Jenkins打造强大的前端自动化工作流](https://juejin.im/entry/6844903601643454471)
- [Jenkins进行Node.js项目的持续集成](https://axiu.me/coding/jenkins-run-nodejs-project/)
- [使用npm构建Node.js和React应用 ](https://www.jenkins.io/zh/doc/tutorials/build-a-node-js-and-react-app-with-npm/)

### gitlab

1. 配置 Gitlab 证书（用于 Jenkins 项目拉取源代码）：右上角用户菜单 => Credentials => Stores from parent => global => Add Credentials => SSH Username with private key => ...
2. 配置 Gitlab Webhook

    [利用gitlab webhook自动触发jenkins部署任务](https://hadestang.github.io/2018/03/22/%E5%88%A9%E7%94%A8gitlab-webhook%E8%87%AA%E5%8A%A8%E8%A7%A6%E5%8F%91jenkins%E9%83%A8%E7%BD%B2%E4%BB%BB%E5%8A%A1/)

    常见问题

    - gitlab webhook 403

        - [gitlab webhook jenkins 403问题解决方案](https://www.cnblogs.com/kaerxifa/p/11671961.html)
        - [Web hook fails when Jenkins Anonymous user does not have job/build permission](https://github.com/jenkinsci/gitlab-plugin/issues/375)

### Docker

常见问题

- `Got permission denied while trying to connect to the Docker daemon socket at `

    需要将 jenkins 用户加入到 docker 分组（`sudo usermod -aG docker jenkins`），并且重启 jenkins

    - [How to solve Docker permission error when trigger by Jenkins](https://stackoverflow.com/questions/44444099/how-to-solve-docker-permission-error-when-trigger-by-jenkins)
    - [Getting “Permission Denied” error when pulling a docker image in Jenkins docker container on Mac](https://medium.com/swlh/getting-permission-denied-error-when-pulling-a-docker-image-in-jenkins-docker-container-on-mac-b335af02ebca)
    - [Jenkins构建Docker时，docker拉取镜像权限不足问题？](https://segmentfault.com/q/1010000010647228)

- git 不能执行问题

    需要映射用户主目录，/etc/passwd 和 /etc/group，例如：`-v /var/lib/jenkins:/var/lib/jenkins -v /etc/passwd:/etc/passwd -v /etc/group:/etc/group`

    - [Use git in jenkins pipeline with docker agent](https://stackoverflow.com/questions/42426325/use-git-in-jenkins-pipeline-with-docker-agent)
    - [Docker Plugin for Jenkins Pipeline - No user exists for uid 1005](https://stackoverflow.com/questions/42404473/docker-plugin-for-jenkins-pipeline-no-user-exists-for-uid-1005)

### MultiPipelne

- 如何限制分支

    - [How to disable some branches in Multibranch Jenkins Builds?](https://devops.stackexchange.com/questions/3400/how-to-disable-some-branches-in-multibranch-jenkins-builds)
    - [Limit which branch is built by Jenkins pipeline?](https://stackoverflow.com/questions/52821516/limit-which-branch-is-built-by-jenkins-pipeline)

- webhook 触发

    [Multibranch Scan Webhook Trigger](https://plugins.jenkins.io/multibranch-scan-webhook-trigger/)

## 常见问题

- [JENKINS 踩过的坑之再总结](https://www.cnblogs.com/vana/p/8707651.html)
- [解决centos7上Jenkins在Shell执行git权限问题](https://blog.csdn.net/abc81163788/article/details/105407160)
