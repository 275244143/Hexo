---
title: Perl Deparse
author: 神秘人
tags:
  - UVM
  - SystemVerilog
categories:
  - 验证
  - perl
mathjax: false
date: 2021-04-01 19:29:20
---

### Trick 1

The most interesting use of this module is as a 'beautifier' for Perl code. In some cases, it can even help
in converting obfuscated Perl to less-obfuscated Perl. Consider this little program, named strip.pl,
which obviously does not follow good coding style:
($text=shift)||die "$0: missing argument!\n";for
(@ARGV){s-$text--g;print;if(length){print "\n"}}
B::Deparse converts it to this, a much more readable, form:

```perl
> > perl -MO=Deparse strip.pl
> die "$0: missing argument!\n" unless $text = shift @ARGV;
> foreach$_(@ARGV){
> s/$text//g;
> print $_;
> if (length $_) {
> print "\n";
> }
> }
```
> B::Deparse also have several options to control its output. For example, -p to add parentheses even
> where they are optional, or –l to include line numbers from the original script. These options are
> documented in the pod documentation included with the module.

### Trick 2

```perl
#!/usr/bin/perl
#B_Lint.pl
use warnings;
use strict;
$count = @file = <>;
for (@file) {
if (/^\d\d\d/ and $& > 300) {
print
} else {
summarize($_);
}
}
```

B::Lint reports:
> perl -MO=Lint,all test
> Implicit use of $_ in foreach at test line 4
> Implicitmatchon$_attestline5
> Use of regexp variable $& at test line 5
> Useof$_attestline5
> Useof$_attestline8
> Undefined subroutine summarize called at test line 8
> test syntax OK