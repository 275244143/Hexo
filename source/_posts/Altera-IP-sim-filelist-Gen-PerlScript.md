---
title: Altera IP sim filelist Gen PerlScript
author: 神秘人
tags:
  - Perl
  - FPGA
categories:
  - 验证
mathjax: false
date: 2020-06-22 18:29:37
---

### 服务器未备份，损失惨重，自动化查找了~

```perl 
#! /usr/bin/env perl

use 5.10.1;
use warnings;
use strict;
use autodie;
use File::Basename;
use Cwd qw(realpath);

my $PATH = shift // "./RTL";
-d "$PATH/simflist" or mkdir "$PATH/simflist";

my @sim_files = `find $PATH -name "ncsim_files.tcl" -print`;

my $regx = qr{.*\\"(\$QSYS_SIMDIR/.*?)\\".*};

for my $file (@sim_files) {
  my @datas = ();
  chomp $file;
  my ($filename,$dirname,$suffixname) = fileparse($file,".tcl");
  my @path_names = split /\//,$dirname;
  my $ip_name = $path_names[3];
  my $QSYS_SIMDIR = qq{$PATH/ip/$ip_name/sim};
  my $filelist_name = $dirname.$filename.".simflist";
  open my $r_fileh, "<", $file;
  open my $w_fileh, ">", $filelist_name;
  while(<$r_fileh>) {
     my ($pre_match_filename) = ($_ =~ /$regx/);
     if (defined($pre_match_filename)) {
       my $match_filename = $pre_match_filename;
       $match_filename =~ s/\$QSYS_SIMDIR/$QSYS_SIMDIR/;
       my $abs_filename = realpath($match_filename);
       push @datas,($abs_filename ? $abs_filename : $pre_match_filename);
     }
  }
  print $w_fileh $_."\n" for @datas;
  system(qq{mv $filelist_name $PATH/simflist/${ip_name}_$filename.simflist });
  close($r_fileh);
  close($w_fileh);
}
```
