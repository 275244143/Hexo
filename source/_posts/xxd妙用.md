---
title: xxd妙用
author: 神秘人
tags:
  - shell
  - Linux
categories:
  - Linux
mathjax: false
date: 2019-10-11 11:43:30
---
####  Bin文件生成技巧~
```shell
xxd -c 16 -u -g 1 ./x.bin 
00000000: 40 53 F6 6C AB 52 55 73 FA 52 97 0C FE 25 90 6F  @S.l.RUs.R...%.o
00000010: D9 75 D6 0B B2 75 58 00 00 00 00 00              .u...uX.....
```

```shell
% xxd -c 16 -g 1 -i ./x.bin > x.h
% cat x.h 
unsigned char __configure_IBS_28_bin[] = {
  0x40, 0x53, 0xf6, 0x6c, 0xab, 0x52, 0x55, 0x73, 0xfa, 0x52, 0x97, 0x0c, 0xfe, 0x25, 0x90, 0x6f,
  0xd9, 0x75, 0xd6, 0x0b, 0xb2, 0x75, 0x58, 0x00, 0x00, 0x00, 0x00, 0x00
};
unsigned int __configure_IBS_28_bin_len = 28;

```

