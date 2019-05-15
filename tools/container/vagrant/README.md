# [Vagrant](https://www.vagrantup.com/)


## 安装

1. 访问 Vagrant 的[下载页面](https://www.vagrantup.com/downloads.html)，选择相应平台的安装包。

    ps：Vagrant 是开源的，可以去 [hashicorp/vagrant](https://github.com/hashicorp/vagrant) 下载源码自行编译。

2. 在命令行运行 `vagrant` 验证是否安装成功。

## 教程

- [教程](https://www.vagrantup.com/intro/index.html)
- [文档](https://www.vagrantup.com/docs/index.html)

### 第一个项目

1. `mkdir vagrant_getting_started`
2. `cd vagrant_getting_started`
3. `vagrant init hashicorp/precise64`

    `init` 是一个项目的初始化命令，该命令会生成一个项目配置文件 `Vagrantfile`。`hashicorp/precise64` 是该项目的基础镜像（包含虚拟机要运行的操作系统），设置在配置文件 `Vagrantfile` 中。

5. `vagrant up`：启动
6. `vagrant ssh`：SSH 连接
7. `vagrant destroy`：关闭


### 管理 Box

Box 是指 Vagrant 的基础镜像，使用基础镜像可以快速克隆创建虚拟机，vagrant 要求每个项目的配置文件 `Vagrantfile` 必须指定 box（`config.vm.box`）。

- 查找：

    - 访问 [Boxes](https://app.vagrantup.com/boxes/search)，查找可用的 box

        `https://vagrantcloud.com/xxx/boxes/yyy/versions/z.z.z/providers/virtualbox.box`

    - `vagrant box list`：查看本地已经添加的 box

- 安装：`vagrant box add [options] <name, url, or path>`

    - `vagrant box add xxx/yyy`：添加 [Boxes](https://app.vagrantup.com/boxes/search) 中的box
    - `vagrant box add --name xxx/yyy <path>`：添加指定路径的 box 和名称

- 更新：

    - `vagrant box outdated`
    - `vagrant box update`

- 删除：

    - `vagrant box prune`
    - `vagrant box remove`

- 创建

    - [Creating a Base Box](https://www.vagrantup.com/docs/boxes/base.html)
    - [Creating a Base Box of VirtualBox](https://www.vagrantup.com/docs/virtualbox/boxes.html)
    - [制作自己第一个 vagrant box](https://unifreak.github.io/tutorial/Making-my-first-vagrant-box)
    - [Vagrant创建自定义的BOX](http://www.winseliu.com/blog/2017/08/23/vagrant-create-your-own-box/)
    - [制作自己的Vagrant Box](https://segmentfault.com/a/1190000002507999)

### 启动和 SSH

1. `vagrant up`：启动
2. `vagrant ssh`：打开 SSH 连接，验证是否启动成功
3. `vagrant destroy`：销毁

    - `vagrant suspend`：暂停，启动快，但需要额外的存储保存虚拟机状态
    - `vagrant halt`：关闭，不需要额外的空间保存虚拟机状态，但启动慢
    - `vagrant destroy`：销毁，关闭并删除了所有相关的文件，但启动很慢

### 同步文件

Vagrant 默认将项目文件夹共享虚拟机，挂载在 `/vagrant` 目录下。

1. `vagrant up`：启动
2. `vagrant ssh`：打开 SSH 连接，验证是否启动成功
3. `ls /vagrant`：验证共享目录的存在

### 端口映射

```ruby
Vagrant.configure("2") do |config|
  config.vm.box = "hashicorp/precise64"
  config.vm.provision :shell, path: "bootstrap.sh"
  config.vm.network :forwarded_port, guest: 80, host: 4567
end
```

### 分享

https://www.vagrantup.com/intro/getting-started/share.html

## 进阶

### Provision

https://www.vagrantup.com/intro/getting-started/provisioning.html

## 示例

- https://github.com/search?o=desc&q=vagrant&s=stars&type=Repositories
- [Varying-Vagrant-Vagrants/VVV](https://github.com/Varying-Vagrant-Vagrants/VVV)
- [puphpet/puphpet](https://github.com/puphpet/puphpet)
- [chef/bento](https://github.com/chef/bento)

## 问题


### 如何压缩 box

- http://vstone.eu/reducing-vagrant-box-size/
- [Making smaller base boxes](https://github.com/mitchellh/vagrant/issues/343)
- https://gist.github.com/adrienbrault/3775253
- [vagrant打包越来越大，如何缩小打包空间？](https://segmentfault.com/q/1010000011073382)
- [如何减小VirtualBox虚拟硬盘文件的大小](https://my.oschina.net/tsl0922/blog/188276)
- [VirtualBox压缩vdi文件](https://mowblog.com/virtualbox%E5%8E%8B%E7%BC%A9vdi%E6%96%87%E4%BB%B6/)

### Authentication failure. Retrying...

- ["Warning: Authentication failure. Retrying... " after packaging box](https://github.com/hashicorp/vagrant/issues/5186#issuecomment-112052573)

## 衍生

- https://github.com/jedi4ever/veewee
