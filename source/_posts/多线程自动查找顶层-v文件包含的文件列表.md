---
title: 多线程自动查找顶层.v文件包含的文件列表
author: 神秘人
tags:
  - RTL
  - Verilog
  - SystemVerilog
categories:
  - 验证
mathjax: false
date: 2020-05-29 19:27:57
---


### 下面代码就是流水账，不是最佳的，一堆可以优化，凑合用。


```python
#! /usr/bin/env python
# -*- coding: utf-8 -*-
import logging
import sys
import re
import os
import time
import subprocess
import commands
from Queue import deque
from threading import Thread,Lock
logging.basicConfig(level=10,
                    format='%(filename)s[line:%(lineno)d] %(levelname)s %(message)s',
                    filename=r'rtl_filelist_gen.log',filemode="w")


def work(workid):
    global lock
    global dq
    global file
    global file_found
    lock.acquire()
    mod = dq.popleft()
    print "Work%0d:Find modules:%s in file:%s"%(workid,mod,file)
    lock.release()
    #慢
    #find_file_list = 'find %0s -name "*.v" -exec egrep -nl "\s*module\s*\<%0s\>\s*" {} \;'%(sys.argv[2],mod)
    #快
    find_file_list = 'ag -t -U -G ".+\.s?vo?$" -l --silent "\s*module\s*\\b%0s\\b\s*" %0s'%(mod,sys.argv[2])
    mod_file_l = commands.getoutput(find_file_list).split()
    flag = 0
    if len(mod_file_l) > 1:
        for file in mod_file_l:
            if "/sim/" in file:
                lock.acquire()
                file_found.append(file)
                lock.release()
                flag = 1
                break
        if flag == 0:
            lock.acquire()
            print "Work%0d:Error:found too many module %s file:%s"%(workid,mod,mod_file_l)
            logging.error("Work%0d:Error:found too many module %s file:%s"%(workid,mod,mod_file_l))
            lock.release()
    elif len(mod_file_l) == 1:
        lock.acquire()
        file_found.append(mod_file_l[0])
        lock.release()
    else:
        lock.acquire()
        print "Work%0d:Error:Can't found module %s file num: 0"%(workid,mod)
        logging.error("Work%0d:Can't found module %s file"%(workid,mod))
        lock.release()
    lock.acquire()
    file_found = deque(set(file_found))
    lock.release()

def getModuleName(filepath):
    sub = subprocess.Popen("vhier %s"%(filepath), shell=True, stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
    sub.wait()
    outstr = sub.stdout.read()
    outstr = outstr.split("\n")
    module_list = []
    for i in outstr:
        res_list = re.split("find",i)
        if len(res_list) == 2:
            module_list.append(res_list[-1].strip())
    return list(set(module_list))

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print "Usage: ./filegen.py /path/to/top.v searchpath"
        sys.exit(1)

    starttime = time.time()
    all_files = []
    all_mods_list = []
    file_found = deque([sys.argv[1]])

    while len(file_found):
        file = file_found.popleft()
        all_files.append(file)
        mods = getModuleName(file)
        uniq_mods = []

        for i in mods:
            if i not in all_mods_list:
                all_mods_list.append(i)
                uniq_mods.append(i)

        dq = deque(uniq_mods)
        print "|=======>:Start parallel find file:%s and it has modules:%s"%(file,list(dq))
        lock = Lock()
        jobs = []
        for i in range(len(dq)):
            p = Thread(target=work,args=(i,))
            jobs.append(p)
            p.start()
        for p in jobs:
            p.join()

    all_files = list(set(all_files))
    all_files.sort()
    with open("rtl_filelist.f","w") as f:
        for i in all_files:
            f.write(i+"\n")

    os.system("sort rtl_filelist_gen.log | uniq > rtl_filelist_lost.log")
    os.system("rm rtl_filelist_gen.log")

    endtime = time.time()
    dtime = endtime - starttime
    print "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@"
    print "@@@@@@@@@@Found Almost Filelist@ElapsedTime %.6s s@@@@@@@@@@"%(dtime)
    print "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@"
```