---
title: python2&3-sv-dpi
author: 神秘人
tags:
  - UVM
  - SystemVerilog
  - Python2
  - Python3
  - DPI
categories:
  - 验证
mathjax: false
password: 2212114
abstract: 欢迎光临~
message: ~友情QQ红包，发送密码~
date: 2020-11-25 19:14:40
---
### Python3x和Python2x和SV-DPI交互
* 首先必须确保动态链接库找得到：

 系统文件： /etc/ld.so.conf  配置如下

  /usr/local/lib
  /usr/lib64
  /usr/lib
  /mnt/data0/python3.8/lib
  include ld.so.conf.d/*.conf

  一定要注意顺序，否则各种找不到动态链接库库so。

*  配置好后，运行:
```shell
sudo ldconfig -v
```
* demo sv文件
```verilog
package cmd_dpi_pkg;

    import uvm_pkg::*;
    `include "uvm_macros.svh"

    import "DPI-C" context c_cmd = function string sv_cmd (string cmd);
    import "DPI-C" context c_exec = function string sv_exec (string cmd);
    
endpackage 
```
* python文件
```python
#!/usr/bin/env python

import sys
import subprocess

def py_cmd(cmd):
    try:
        return subprocess.getoutput("%0s" % cmd)
    except Exception:
        sys.exit(1)


def py_exec(cmd):
    mcmd = '''%0s''' % (cmd)
    try:
        ret = eval(mcmd, globals(), globals())
        return str(ret)
    except Exception:
        try:
            exec(mcmd, globals(), globals())
            return ""
        except Exception:
            return "__ERROR__"
            sys.exit(1)
```

* c文件
```c
#define PY_SSIZE_T_CLEAN
#include <Python.h>
char *c_exec(const char *cmd);
char *c_cmd(const char *cmd);
char *c_exec(const char *cmd) {
  PyObject *pName = NULL;
  PyObject *pModule = NULL;
  PyObject *pDict = NULL;
  PyObject *pFunc = NULL;
  PyObject *pRetVal = NULL;
  PyObject *pArg = NULL;

  char *c_ret;
  Py_Initialize();

  if (!Py_IsInitialized()) {
    printf("Python can't initialize!");
    return 0;
  }
  PyRun_SimpleString("import sys;");
  PyRun_SimpleString(
      "if sys.path.count('./DPI/pycode') : sys.path.remove('./DPI/pycode')");
  PyRun_SimpleString("sys.path.append('./DPI/pycode')");
 //python3x
  pName = PyUnicode_FromString("my_cmd");
  pModule = PyImport_Import(pName);
 //python2x
 //pName = PyString_FromString("my_cmd");   
 //pModule = PyImport_Import(pName);  
  
  if (!pModule) {
    printf("can't find my_cmd.py\n");
    return 0;
  }
  pDict = PyModule_GetDict(pModule);
  if (!pDict) {
    printf("can't find pDict!");
    return 0;
  }
  pFunc = PyDict_GetItemString(pDict, "py_exec");
  if (!pFunc || !PyCallable_Check(pFunc)) {
    printf("can't find function [py_exec]");
  }

  pArg = Py_BuildValue("(s)", cmd);
  pRetVal = PyEval_CallObject(pFunc, pArg);
  PyArg_Parse(pRetVal, "s", &c_ret);
  return c_ret;
  Py_Finalize();
}

char *c_cmd(const char *cmd) {
  PyObject *pName = NULL;
  PyObject *pModule = NULL;
  PyObject *pDict = NULL;
  PyObject *pFunc = NULL;
  PyObject *pRetVal = NULL;
  PyObject *pArg = NULL;

  char *c_ret;
  Py_Initialize();

  if (!Py_IsInitialized()) {
    printf("Python can't initialize!");
    return 0;
  }
  PyRun_SimpleString("import sys;");
  PyRun_SimpleString(
      "if sys.path.count('./DPI/pycode') : sys.path.remove('./DPI/pycode')");
  PyRun_SimpleString("sys.path.append('./DPI/pycode')");
  //python3x
  pName = PyUnicode_FromString("my_cmd");
  pModule = PyImport_Import(pName);
  //python2x
 //pName = PyString_FromString("my_cmd");   
 //pModule = PyImport_Import(pName);  
  if (!pModule) {
    printf("can't find my_cmd.py\n");
    return 0;
  }
  pDict = PyModule_GetDict(pModule);
  if (!pDict) {
    printf("can't find pDict!");
    return 0;
  }
  pFunc = PyDict_GetItemString(pDict, "py_cmd");
  if (!pFunc || !PyCallable_Check(pFunc)) {
    printf("can't find function [py_cmd]");
  }

  pArg = Py_BuildValue("(s)", cmd);
  pRetVal = PyEval_CallObject(pFunc, pArg);
  PyArg_Parse(pRetVal, "s", &c_ret);
  return c_ret;
  Py_Finalize();
}
int main() {
  char *ret2 = c_cmd("ls");
  printf("test:%s\n", ret2);
  c_exec("a=[i for i in range(100)]");
  char *ret = c_exec("str(a)");
  printf("test:%s\n", ret);
}
```

* 编译为动态链接库
```shell 
g++ -std=c99 -I/mnt/data0/ies152/tools/include -I/mnt/data0/python3.8/include/python3.8 -L/mnt/data0/python3.8/lib -lpython3.8 -g -x c my_cmd.c -o my_cmd.so  -shared -fPIC -Wall
```
* 编译测试C程序
```shell
gcc -std=c99 -I/mnt/data0/ies152/tools/include -I/mnt/data0/python3.8/include/python3.8 -L/mnt/data0/python3.8/lib -lpython3.8 -Wall -o my_cmd
-g my_cmd.c
```

* 仿真运行
```shell
irun -sv test.sv -sv_lib my_cmd.so
```
或者
```shell
irun -sv test.sv my_cmd.c -I/mnt/data0/ies152/tools/include -I/mnt/data0/python3.8/include/python3.8 -L/mnt/data0/python3.8/lib -lpython3.8
```
*** 重点
被坑了多次，导入各种库时，py文件和so生成的文件绝对不要放在一个位置，否则ncsim找不到库~
所以：在DPI 文件夹下面的pycode放py文件，DPI文件下放C文件和so文件,相关脚本运行仿真必须在DPI上一层，否则找不到py文件。

#### SV-EXPORT
* svdpi_export.c
```c
extern void sv_uvm_info(const char *tag, const char *msg);
void c_uvm_info(const char *tag, const char *msg);

//如下必须设置svdpi的scope，不然找不到dpi export sv函数
void c_uvm_info(const char *tag, const char *msg) {
  svScope gscope = svGetScopeFromName("macros_pkg::");
  svSetScope(gscope);
  sv_uvm_info(tag, msg);
}
```
* macros_pkg.sv
```verilog
package macro_pkg;
	export "DPI-C" function sv_uvm_info;
	function void sv_uvm_info(string tag, string msg);
    	`uvm_info(tag,msg,UVM_NONE);
	endfunction
endpackage
```
* python3使用导出的SV-C函数
```python
svdpi = cdll.LoadLibrary("./DPI/svdpi_export.so")
uvm_info = svdpi.c_uvm_info
def py_EthPktGen(cmd, show=0, pfile="scapy"):
    llist = []
    cnt = 0
    try:
        pkt_cmd = eval(cmd)
        if show >= 1:
            mstr = "[Py_EthPktGen_Cmd]:------>:[%0s]" % (cmd)
        allpkt = [p for p in pkt_cmd]
        ##############################################################
        for pkt in allpkt:
            cnt += 1
            if show == 1:
                pkt.show2()
                hexdump(pkt)
            elif show == 2:
                pkt.show()
            elif show == 3:
                ls(pkt)
            elif show == 4:
                mstr = "Pkt[%0d] Len:->%0d" % (cnt, len(pkt))
            elif show == 5:
                pkt.pdfdump("%0s_%0d" % (pfile, cnt))
            ##############################################################
            pkt = bytes(pkt)
            mlist = []
            for i in pkt:
                mlist.append("%02x" % (i))
            llist.append(":".join(mlist))
        #重点str在python3默认是unicode~，必须转为bytes~
        #uvm_info(b"py_EthPktGen", bytes("#".join(llist), 'ascii'))
        return "#".join(llist)
    except Exception:
        mstr = (
            "Line:"
            + str(sys._getframe().f_lineno)
            + "-->:Error:\n"
            + traceback.format_exc()
        )
        mstr = mstr + "\nCmd string is:" + cmd
        sys.exit(1)
```
* ncsim仿真输出到log
```shell
<<UVM_INFO>> ./TB/CBB/macros_pkg.sv(2560) @ 0.001625 ms: reporter [py_EthPktGen] 11:11:11:11:11:11:22:22:22:22:22:22:08:00:45:00:00:33:00:01:40:00:01:06:73:bf:01:01:01:01:02:02:02:02:22:22:11:11:00:00:00:00:00:00:00:00:50:ff:20:00:87:65:00:00:c2:a5:c2:a5:c2:a5:c2:a5:c2:a5:01
```

