# [Vagrant](https://www.vagrantup.com/)


## 安装

1. 访问 Vagrant 的[下载页面](https://www.vagrantup.com/downloads.html)，选择相应平台的安装包。

    ps：Vagrant 是开源的，可以去 [hashicorp/vagrant](https://github.com/hashicorp/vagrant) 下载源码自行编译。

2. 在命令行运行 `vagrant` 验证是否安装成功。

---

- [在Windows下如何修改Vagrant和VirtualBox的路径](https://github.com/uolcano/blog/issues/7)
- [在Windows上更改VAGRANT_HOME目录](https://harvsworld.com/2014/change-vagrant_home-directory-windows/)
- [在Windows下如何修改Vagrant和VirtualBox的路径 ](https://github.com/uolcano/blog/issues/7)

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

#### VirtualBox

- [Creating a Base Box](https://www.vagrantup.com/docs/boxes/base.html)
- [Creating a Base Box of VirtualBox](https://www.vagrantup.com/docs/virtualbox/boxes.html)
- [制作自己第一个 vagrant box](https://unifreak.github.io/tutorial/Making-my-first-vagrant-box)
- [Vagrant创建自定义的BOX](http://www.winseliu.com/blog/2017/08/23/vagrant-create-your-own-box/)
- [制作自己的Vagrant Box](https://segmentfault.com/a/1190000002507999)
- [用packer做vagrant的box](http://www.jiangjiang.space/2017/09/17/%E7%94%A8packer%E5%81%9Avagrant%E7%9A%84box/)
- [使用Packer制作vagrant box](https://blog.csdn.net/lingxuan630/article/details/47836105)
- [boxcutter](https://github.com/boxcutter/centos)
- [chef/bento](https://github.com/chef/bento)
- [【译】从头制作 Vagrant Box](http://blog.levi-g.info/building-a-vagrant-box.html)

#### VMWare

创建 VMWare Vagrant Box

```bash
$ choco install packer
$ packer buil ./package.json
$ vagrant box add --name xxx/xxx ./xxx.box
```

package.json:

```
{
  "builders": [{
    "type": "vmware-vmx",
    "source_path": "/path/to/a/vm.vmx", // vmware 虚拟机的 vmx 路径
    "ssh_username": "root", // 虚拟机需要开启 ssh
    "ssh_password": "root",
    "ssh_wait_timeout": "30s",
    "shutdown_command": "echo 'packer' | sudo -S shutdown -P now"
  }],
  "provisioners": [{
    "type": "shell",
    "inline": ["echo 'my additional provisioning steps'"]
  }],
  "post-processors": [{
    "type": "vagrant",
    "keep_input_artifact": true,
    "output": "mycentos.box" // vagrant box 名称
  }]
}
```

- [VMware Builder (from VMX)](https://www.packer.io/docs/builders/vmware-vmx.html)
- [how to create a vagrant box from vmware image with packer](https://stackoverflow.com/questions/31262833/how-to-create-a-vagrant-box-from-vmware-image-with-packer)

启动 Vagrant Box

```bash
$ vagrant init xxx/xxx
$ vagrant plugin install vagrant-vmware-desktop
$ vagrant up --provider vmware_desktop
```

启动 vmware 的 varant box 需要安装插件 vagrant-vmware-desktop，但该插件要求付费，相关参考文献如下所示：

- https://www.vagrantup.com/docs/vmware/installation.html
- [The provider 'vmware_workstation' could not be found, but was requested to back the machine 'devmachine2'. Please use a provider that exists.](https://github.com/hashicorp/vagrant/issues/2342)
- [Is there a cheaper VMWare provider for Vagrant available?](https://www.quora.com/Is-there-a-cheaper-VMWare-provider-for-Vagrant-available)
- [Why isn't there an Open Source Vmware Vagrant Plugin?](https://stackoverflow.com/questions/43468927/why-isnt-there-an-open-source-vmware-vagrant-plugin)
- [vagrant-vmware-esxi](https://github.com/josenk/vagrant-vmware-esxi)
- [vagrant-vmware-free](https://github.com/orishavit/vagrant-vmware-free)
- [@vianaweb vianaweb/gist:5164544](https://gist.github.com/vianaweb/5164544)



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

- [How can Vagrant forward multiple ports on the same machine?](https://stackoverflow.com/questions/17623528/how-can-vagrant-forward-multiple-ports-on-the-same-machine)

### 分享

https://www.vagrantup.com/intro/getting-started/share.html

## 进阶

### Provision

https://www.vagrantup.com/intro/getting-started/provisioning.html

### 快照备份

- [使用vagrant snapshot创建快照备份](http://blog.huatai.me/2015/12/03/use-vagrant-snapshot-create-backup/)

### 备份迁移

- [Vagrant之工作环境的迁移（box的导入与导出）](https://blog.csdn.net/bluehawksky/article/details/93720933)
- [How to export a Vagrant virtual machine to transfer it](https://stackoverflow.com/questions/20679054/how-to-export-a-vagrant-virtual-machine-to-transfer-it)

### 关联现有的虚拟机

```shell
$ VBoxManage list vms # "virtualMachine" {xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx}
$ cd .vagrant/machines/default/virtualbox
$ touch id && echo {id} > 'id'
```

- [How do I associate a Vagrant project directory with an existing VirtualBox VM?](https://stackoverflow.com/questions/9434313/how-do-i-associate-a-vagrant-project-directory-with-an-existing-virtualbox-vm)

### 压缩虚拟磁盘文件

- vhd

    ```bash
    $ diskpart
    $ select vdisk file="c:\test.vhd"
    $ compact vdisk
    ```

参考文献

- [虚拟磁盘VHD文件压缩方法](https://www.cnblogs.com/azureology/p/12342507.html)

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

### Stderr: VBoxManage.exe: error: RawFile#0 failed to create the raw output file

```
There was an error while executing `VBoxManage`, a CLI used by Vagrant
for controlling VirtualBox. The command and stderr is shown below.

Command: ["startvm", "a5efe367-6388-4727-8d3e-af9e84171e47", "--type", "headless"]

Stderr: VBoxManage: error: RawFile#0 failed to create the raw output file /.../.../ubuntu-xenial-16.04-cloudimg-console.log (VERR_FILE_NOT_FOUND)
VBoxManage: error: Details: code NS_ERROR_FAILURE (0x80004005), component ConsoleWrap, interface IConsole
```

- [Stderr: VBoxManage.exe: error: RawFile#0 failed to create the raw output file ../ubuntu-xenial-16.04-cloudimg-console.log (VERR_PATH_NOT_FOUND) ](https://github.com/joelhandwell/ubuntu_vagrant_boxes/issues/1)
- [Vagrant up (1.9.5) not running on WSL](https://github.com/hashicorp/vagrant/issues/8604)
- [vagrant with virtualbox on wsl VERR_PATH_NOT_FOUND](https://stackoverflow.com/questions/45773825/vagrant-with-virtualbox-on-wsl-verr-path-not-found)

### [Vagrant was unable to mount VirtualBox shared folders](https://stackoverflow.com/questions/43492322/vagrant-was-unable-to-mount-virtualbox-shared-folders)

...

### [sbin/mount.vboxsf: mounting failed with the error: No such device](https://www.google.com/search?q=sbin%2Fmount.vboxsf%3A+mounting+failed+with+the+error%3A+No+such+device&oq=sbin%2Fmount.vboxsf%3A+mounting+failed+with+the+error%3A+No+such+device&aqs=chrome..69i57j69i58.1187j0j4&sourceid=chrome&ie=UTF-8)

- [VirtualBox: mount.vboxsf: mounting failed with the error: No such device [closed]](https://stackoverflow.com/questions/28328775/virtualbox-mount-vboxsf-mounting-failed-with-the-error-no-such-device)

### 怎么升级 Vagrant VirtualBox Addition

- [vagrant-vbguest](https://github.com/dotless-de/vagrant-vbguest)
- [How to upgrade to VirtualBox Guest Additions on VM box?](https://stackoverflow.com/questions/20308794/how-to-upgrade-to-virtualbox-guest-additions-on-vm-box)
- [manually install VBoxGuestAdditions.iso](https://askubuntu.com/questions/1077007/manually-install-vboxguestadditions-iso)
- [How do I install the VirtualBox version from Oracle to install an Extension Pack?](https://askubuntu.com/questions/41478/how-do-i-install-the-virtualbox-version-from-oracle-to-install-an-extension-pack)
- [How do I install Guest Additions in a VirtualBox VM?](https://askubuntu.com/questions/22743/how-do-i-install-guest-additions-in-a-virtualbox-vm)
- https://download.virtualbox.org/virtualbox/

### 怎么扩容虚拟机磁盘容量

- [【vagrant】硬盘扩容]( https://www.cnblogs.com/HansBug/p/9447020.html)
- [Vagrant虚拟机硬盘扩容]( http://www.voycn.com/article/vagrantxunijiyingpankuorong )

### vagrant root 用户

使用 root 用户需要设置 root 用户密码。

```
sudo passwd root
```

-[vagrant login as root by default](https://stackoverflow.com/questions/25758737/vagrant-login-as-root-by-default)

## 衍生

- https://github.com/jedi4ever/veewee

## 应用

- [vscode + vagrant + frp 远程开发环境](https://segmentfault.com/a/1190000020219041)
