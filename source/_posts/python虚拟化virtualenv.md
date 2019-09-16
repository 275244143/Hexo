---
title: python虚拟化virtualenv
author: 神秘人
tags:
  - python
  - shell
categories:
  - 编程
mathjax: false
date: 2019-09-10 10:55:48
---

### （转）

### virtualenv

　　Python 今天我们就不聊了。接下来咱们说说virtualenv,英文比较好的同学，可能已经猜到了一半，virtual，即：虚拟的。那env是什么鬼？environment吗？所以翻译成中文就是”虚拟环境“。
    到底什么是虚拟环境呢？顾名思义，它是一个虚拟出来的环境。通俗的来讲，可以借助虚拟机，docker来理解虚拟环境，就是把一部分内容独立出来，我们把这部分独立出来的东西称作“容器”，在这个容器中，我们可以只安装我们需要的依赖包，而且各个容器之间互相隔离，互不影响。我们要学习Django,我们通过这个环境搞一个Django的虚拟环境就好了。
**【前提概要】**
    Django也是一个非常流行的web框架。由于Django的迭代更新非常快，也比较频繁，所以有一些过时的东西需要丢弃掉，一些新的东西需要加进来，从而导致不同的版本之间不兼容。比如Django1.3、Django1.4、Django1.8之间就有很大的差异性。
    或者是说，以Python的版本举例，现在工作中使用的Python版本与Python2.x和Python3.x两种。
**【故事背景】**
　　假设要进行Python web开发，使用的是Django。手上还有两个老项目A和B需要维护，而新项目C也正在开发中。这里项目A使用的是django1.3，项目B使用的是django1.4，而新项目C使用的是Django1.8。那么问题来了，如何同时在本地进行ABC这三个项目的开发和维护？
正常的模式可能是这样：现在在A项目上有一个BUG需要修复，于是，先执行下面的命令，删除掉原来的版本：

```python
pip uninstall django
```

然后再执行下面的命令安装django1.3

```python
pip install django==1.3
```

数分钟后，bug修复完毕，好，现在进行新项目C的开发了，然后又要重复上面的故事。
　　好了，这还是最理想的情况。最不理想的情况就是基于django的第三方依赖也是跟Django版本相关的，于是除了install和uninstall Django之外，还要uninstall和install其依赖，Orz，这特么的就尴尬了...

**VirtualEnv能做什么呢？**

　　VirtualEnv可以搭建虚拟且独立的python运行环境, 使得单个项目的运行环境与其它项目独立起来。同时也可以用于在一台机器上创建多个独立的python运行环境，VirtualEnvWrapper为前者提供了一些便利的命令行上的封装。
　　Virtualenv是一个非常好的virtual python environment builder，他最大的好处是，可以让每一个python项目单独使用一个环境，而不会影响python系统环境，也不会影响其他项目的环境。
　　Virtualenv可用于创建独立的Python环境，在这些环境里面可以选择不同的Python版本或者不同的Packages，并且可以在没有root权限的情况下在环境里安装新套件，互相不会产生任何的影响。

**言归正传**

**安装，**virtualenv本质上是个python包, 使用pip安装:

```shell
pip install virtualenv
```

在工作目录下创建虚拟环境(默认在当前目录)：注意需要自定义虚拟环境的名字！

```shell
~$virtualenv TestEnv
New python executable in ~/TestEnv/bin/python
Installing setuptools, pip, wheel...done.
```

默认情况下, 虚拟环境中不包括系统的site-packages, 若要使用请添加参数:

```shell
virtualenv --system-site-packages TestEnv
```

使用virtualenv默认python版本创建虚拟环境

```shell
virtualenv --no-site-packages ubuntu_env
```

就可以在当前目录创建一个env目录(虚拟环境名称，这个文件夹就是保存 Python 虚拟环境)，你会注意到，virtualenv会把python，setuptools和pip给你安装上。

自定义python版本创建虚拟环境
　　1. 安装需要版本的python
　　2. 指定virtualenv中的python版本
```shell
virtualenv --no-site-packages --python=2.7 env
```

**Note：**
　　1. 创建virtualenv虚拟环境之前，系统中必须要安装有对应版本的python，并且卸载之后当前虚拟环境就无效了。系统中可以同时存在python2和python3，通过环境变量中的系统变量path（不是用户变量）控制cmd或者系统中使用哪个版本的python，哪个版本的路径在前面就优先使用哪个版本。
　　2. –no-site-packages表示不包括系统全局的Python安装包，这样会更令环境更干净
　　3. –python=python2.7指定Python的版本未系统已经安装了的Python2.7
　　4. env是建立的虚拟环境名称
　　5. 没有安装python2.7或者使用命令virtualenv --no-site-packages --python=python2.7 env会出现The executable python does notexist 错误

**注意：**　

　　安装的库的位置在虚拟环境的 env/Lib/site-packages/目录里，而不是在系统的python的Lib/site-packages目录里，这样你就知道为什么虚拟环境是分开的了吧。
　　Note ：virtualenv 创建的虚拟环境与主机的 Python 环境完全无关，你主机配置的库不能在 virtualenv 中直接使用。你需要在虚拟环境中利用 pip install 再次安装配置后才能使用。

**关于创建一个虚拟环境，你也可以这样做！**

```shell
1、为一个工程创建一个虚拟环境：
$ cd my_project_dir
$ virtualenv venv　　#venv为虚拟环境目录名，目录名自定义　　
	virtualenv venv 将会在当前的目录中创建一个文件夹，包含了Python可执行文件，以及 pip 库的一份拷贝，这样就能安装其他包了。
	虚拟环境的名字（此例中是 venv ）可以是任意的；若省略名字将会把文件均放在当前目录。
	在任何你运行命令的目录中，这会创建Python的拷贝，并将之放在叫做 venv 的文件中。

2、你可以选择使用一个Python解释器：
$ virtualenv -p /usr/bin/python2.7 venv　# -p参数指定Python解释器程序路径
	这将会使用 /usr/bin/python2.7中的Python解释器。
```

**虚拟环境激活****，若想使用就需要激活创建的虚拟环境！**
进入虚拟环境目录 执行source ./bin/activate激活虚拟环境:

```shell
# 相对路径方式：~/TestEnv$ source bin/activate
(TestEnv) ~/TestEnv$ python -V 
Python 2.7.11 # 绝对路径方式
$ source venv/bin/activate　# 绝对路径
```

 **从现在起，任何你使用pip安装的包将会放在 venv 文件夹中，与全局安装的Python隔绝开。像平常一样安装包，比如：**

```shell
pip install requests
```

**使用requirements.txt安装版本包(requirements.txt文件下保存的都是各个依赖包的版本信息)**

```shell
pip install -r requirements.txt
```

　　**进入环境env1，执行pip freeze > requirements.txt将包依赖信息保存在requirements.txt文件中。　　最好手动调整一下顺序，比如numpy和scipy要在matplotlib前面安装；另外如果想安装最新版本的，再将后面的版本号==1.9.1什么的删除。　　然后进入目的虚拟环境env2，执行pip install -r requirements.txt，pip就会自动从网上下载并安装所有包。　　虚拟环境env2如果是env1的拷贝，最好先pip uninstall -ry requirements.txt，再pip install -r requirements.txt**

如果你在虚拟环境中暂时完成了工作，则可以停用它：

**退出虚拟环境:**

```shell
# 在环境下，相对退出<br>(TestEnv) ~/TestEnv$ deactivate
~/TestEnv$ #走绝对路径
$ .venv/bin/deactivate
```

这将会回到系统默认的Python解释器，包括已安装的库也会回到默认的。

**要删除一个虚拟环境，只需删除它的文件夹。**（执行 rm -rf venv ）。
　　这里virtualenv 有些不便，因为virtual的启动、停止脚本都在特定文件夹，可能一段时间后，你可能会有很多个虚拟环境散落在系统各处，你可能忘记它们的名字或者位置。

### virtualenvwrapper　

　　鉴于virtualenv不便于对虚拟环境集中管理，所以推荐直接使用virtualenvwrapper。 virtualenvwrapper提供了一系列命令使得和虚拟环境工作变得便利。它把你所有的虚拟环境都放在一个地方。
1、安装virtualenvwrapper(确保virtualenv已安装)

```shell
pip install virtualenvwrapper
pip install virtualenvwrapper-win　#Windows使用该命令
```

2、安装完成后，在~/.bashrc写入以下内容

```shell
export WORKON_HOME=~/Envs
source /usr/local/bin/virtualenvwrapper.sh　`
```

　　第一行：virtualenvwrapper存放虚拟环境目录
　　第二行：virtrualenvwrapper会安装到python的bin目录下，所以该路径是python安装目录下bin/virtualenvwrapper.sh

```shell
source ~/.bashrc　　#读入配置文件，立即生效
```

 **virtualenvwrapper基本使用**

1.创建虚拟环境　mkvirtualenv

```shell
mkvirtualenv venv
```

这样会在WORKON_HOME变量指定的目录下新建名为venv的虚拟环境。
若想指定python版本，可通过"--python"指定python解释器

```shell
mkvirtualenv --python=/usr/local/python3.5.3/bin/python venv
```

\2. 基本命令 　
　　查看当前的虚拟环境目录

```shell
[root@localhost ~]# workon
py2
py3
```

　　切换到虚拟环境

```shell
[root@localhost ~]# workon py3
(py3) [root@localhost ~]#
```

　　退出虚拟环境

```shell
(py3) [root@localhost ~]# deactivate
[root@localhost ~]#
```

　　删除虚拟环境

```shell
rmvirtualenv venv
```