---
title: Perl匹配打印
author: 神秘人
tags:
  - Perl
  - Regx
categories:
  - 脚本
mathjax: false
date: 2020-06-24 17:54:48
---

### Perl匹配打印功能，当然是抄的，然后修改~

```perl 

#! /usr/bin/env perl

use 5.10.1;
use warnings;
use strict;

my $pattern = shift @ARGV;
my $regex = eval { qr/$pattern/ };
die "Check your pattern! $@" if $@;

while( <> ) {
  if( m/$regex/ ) {
    print "$_";
    foreach my $i (0..$#-) {
      if($i == 0) {
        print "\t\t\$&: ", substr($_, $-[$i], $+[$i] - $-[$i]), "\n";
      }
      else {
        print "\t\t\$$i: ", substr($_, $-[$i], $+[$i] - $-[$i]), "\n";
      }
    }
  }
}

```

```shell
$perldoc -t perl|perl perl-grep.pl "\b(\S)(\S)\S\1\b"                                                                        lixu@fpga-rs
    For ease of access, the Perl manual has been split up into several
		$&: ease
		$1: e
		$2: a
        perl5100delta       Perl changes in version 5.10.0
		$&: .10.
		$1: .
		$2: 1
    in the /usr/share/perl5 directory (or else in the man subdirectory of
		$&: else
		$1: e
		$2: l

```

