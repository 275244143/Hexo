---
title: Perl拆解One-Liner
author: 神秘人
tags:
  - Perl
categories:
  - 脚本
mathjax: false
date: 2020-06-29 16:26:12
---



### Perl一行式如何定位问题？

```perl
perl -MO=Deparse -paF: -le 'print $F[2]'
```

```shell
输出：
BEGIN { $/ = "\n"; $\ = "\n"; }
LINE: while (defined($_ = <ARGV>)) {
    chomp $_;
    our(@F) = split(/:/, $_, 0);
    print $F[2];
}
continue {
    print $_;
}
-e syntax OK

```

###  -MO=Deparse选项可以反编译perl过程，挺有意思的。