# 版本规范

## NPM 版本管理规范

### [semantic-release](https://github.com/semantic-release/semantic-release)

semantic-release 是一个完全自动化的版本管理和包发布工具。

工作原理

semantic-release 通过不同分支和提交记录来发布下一个符合[语义化规范](http://semver.org/)的版本，并且在发布完成后可以自动提交一个 commit 用于更新项目配置文件（`package.json`）的版本和 CHANGELOG 文件，以及在 Github 上提交一个 releasse。如果提交记录里只有 `fix: ...`，那么只升级小版本号。如果提交记录里有 `feat: ...`，那么升级次版本号。如果提交记录里带有 `break change:`，那么升级主版本号。提交记录合并到不同的分支会产生不同的后缀，如下所示是默认的配置方式。

- alpha：x.x.x-alpha.x
- beta：x.x.x-beta.x
- master：x.x.x
- next：x.x.x，和 master 的区别在于 npm 发布的时候会打上 next 标签，下载依赖的时候还是默认下载 master 对应的版本，除非加上了 next 标识

项目示例

- [zhbhun/semantic-release-demo](https://github.com/zhbhun/semantic-release-demo)
- [semantic-release-npm-github-config](https://github.com/jedmao/semantic-release-npm-github-config)
- [oleg-koval/semantic-release-npm-github-publish](https://github.com/oleg-koval/semantic-release-npm-github-publish)
- [gitlab-config](https://github.com/semantic-release/gitlab-config)
- [apm-config](https://github.com/semantic-release/apm-config)

存在问题

- 不支持 lerna

最佳实践

- 理解[版本语义化规范](Semantic Versioning 2.0.0)
- 学习[Angular Commit 信息规范](https://github.com/angular/angular.js/blob/master/DEVELOPERS.md#-git-commit-guidelines)，可以搭配使用工具 [commitizen](https://github.com/commitizen/cz-cli)

参考文献

- [Introduction to SemVer](https://blog.greenkeeper.io/introduction-to-semver-d272990c44f2)
- [Introduction to Semantic Release](https://blog.greenkeeper.io/introduction-to-semantic-release-33f73b117c8)
- [semantic-release 集成](https://zqblog.beaf.tech/semantic-release/)
- [团队敏捷实践 —— 使用 semantic-release 自动管理发布版本](https://blog.dteam.top/posts/2020-05/semantic-release.html)

### [changesets](https://github.com/changesets/changesets)

> A way to manage your versioning and changelogs with a focus on monorepos

### [standard-version](https://github.com/conventional-changelog/standard-version)

TODO

### [release-it](https://github.com/release-it/release-it)

Generic CLI tool to automate versioning and package publishing related tasks:

### [vercel/release](https://github.com/vercel/release)

Generate changelogs with a single command

### [github-tools/github-release-notes](https://github.com/github-tools/github-release-notes)

Node module to create a release or a changelog from a tag and uses issues or commits to creating the release notes.

### [bumped](https://github.com/bumped/bumped)

一个用于发布软件的工具，可以在为你的软件发布新版本前后轻松地执行操作。

### [unleash](https://github.com/netflix/unleash)

一个用于自动化软件发行和发布生命周期的工具。

### [lerna](https://github.com/lerna/lerna)

一个用于管理宏仓库（monorepo）的工具，源自 Babel 项目。
