---
title: VCD中快速查找信号命
author: 神秘人
tags:
  - Perl
  - 脚本
categories:
  - 验证
mathjax: false
date: 2020-06-05 15:30:55
---

###  Verdi打开太慢了~~~

```perl 
#!/usr/bin/env perl
=pod

=head1 快速查找verilog中层次化信号.

=cut
package FindSigPkg;

use warnings;
use strict;
use threads;
use threads::shared;
use Thread qw(async cond_wait cond_signal);
use Verilog::VCD;
use constant CPU_NUM => 2;
our $VERSION = 1.0.0;

my $start_time = time();
my $wait_var :shared = 0;

async {
  use Term::Pulse;
  pulse_start(name => 'Parsing', rotate => 0, time => 1);
  lock $wait_var ;
  cond_wait $wait_var until $wait_var == 1;
  pulse_stop();
}

my $red = qq(\033[0;31m);
my $end = qq(\033[0m);
local $" = qq(\n);
my @vcd_sigs = Verilog::VCD::list_sigs( shift );
@vcd_sigs = sort @vcd_sigs;
my $search_pattern = shift;
my $mod_regex = qr/$search_pattern/;

my @share_vcd_sigs :shared;
my @work_jobs;
my $cut_num = int($#vcd_sigs / CPU_NUM) + 1;


foreach (0..CPU_NUM-1) {
    my $begin = $_ * $cut_num;
    my $end = ($_ + 1) * $cut_num - 1;
    $end = $#vcd_sigs if $end >= $#vcd_sigs;
    push @work_jobs, threads->create( \&find_worker, @vcd_sigs[$begin..$end] );
}

foreach (0..CPU_NUM-1) {
  $work_jobs[$_]->join();
}

async {
  lock $wait_var;
  $wait_var = 1;
  cond_signal $wait_var;
}

@share_vcd_sigs = sort @share_vcd_sigs;
print "@share_vcd_sigs\n";
my $elapsed_time = time() - $start_time;
print "Time elapsed: $elapsed_time s\n";


sub find_worker {
  my (@sigs) = @_;
  @sigs = map { s/($mod_regex)/$red$1$end/g;$_ } grep { /$mod_regex/o } (@sigs);
  lock(@share_vcd_sigs);
  @share_vcd_sigs = (@share_vcd_sigs,@sigs);
}

1;

```

```shell
findsig.pl test.vcd test_dbg

=> tile_gen[2].tile_ctrl_inst.test_dbg_out[47:0]
```