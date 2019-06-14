---
title: Constraints和Covergroups保持同步
author: 神秘人
tags:
  - UVM
  - SystemVerilog
categories:
  - 验证
mathjax: false
date: 2019-06-13 10:25:06
password: 2101120
abstract: 欢迎光临~
message: ~友情QQ红包，发送密码~
---

###  Constraints和Covergroups保持同步

In the old days, people had to write all of their tests by hand. With chips getting bigger and bigger, it became clear that this painstaking process couldn't scale. Constrained random verification was invented to help us verification engineers deal with the increasing complexity of our DUTs. By describing the kind of stimulus we want to drive and letting the random generator do its thing we can verify more with less effort. Random tests are nice and all, mostly because they are easier to write, but this all comes at a price. It's much more difficult to say what a random test is really doing without letting it run. We typically write coverage to log what we are actually stimulating.

Constraints and coverage are two sides of the same coin; they both represent the legal state space. By writing constraints we decide what we want to stimulate, whereas coverage describes what we want to observe. The two should be in sync, since if we aren't driving something, it doesn't make any sense to try to observe it.

Let's look at a very basic example of an item with two integer fields and some constraints set on them:

```verilog
class item;
  rand bit[2:0] x, y;

  constraint x_always_smaller {
    x < y;
  }

  constraint never_same_parity {
    x % 2 == 0 <-> y % 2 == 1;
  }

  constraint if_2_then_5 {
    x == 2 -> y == 5;
  }
endclass
```

We only want to generate pairs with *x* always smaller than *y*, both having different parities and if *x* is 2 we want *y* to be 5. These constraints range from very general to very specific.

As mentioned above, generating random items isn't going to help us much if we can't prove for certain that we've driven all legal values. We'll need to cover the values of *x* and *y* and ignore any illegal combinations. Specifying ignore bins used to be a very daunting task, as the language wasn't particularly rich in features. Things have gotten much better with the *IEEE 1800-2012*standard. Here's how our coverage collector could look like:

```verilog
class cov_collector;
  covergroup cov with function sample(bit[2:0] x, bit[2:0] y);
    coverpoint x;
    coverpoint y;

    cross x, y {
      function CrossQueueType create_x_greater_ignore_bins();
        for (int i = 0; i < 8; i++)
          for (int j = 0; j < 8; j++)
            if (i >= j)
              create_x_greater_ignore_bins.push_back('{ i, j });
      endfunction

      function CrossQueueType create_same_parity_ignore_bins();
        for (int i = 0; i < 8; i++)
          for (int j = 0; j < 8; j++)
            if (i % 2 == j % 2)
              create_same_parity_ignore_bins.push_back('{ i, j });
      endfunction

      function CrossQueueType create_if_2_and_not_5_ignore_bins();
        for (int i = 0; i < 8; i++)
          if (i != 5)
            create_if_2_and_not_5_ignore_bins.push_back('{ 2, i });
      endfunction

      ignore_bins x_greater = create_x_greater_ignore_bins();
      ignore_bins same_parity = create_same_parity_ignore_bins();
      ignore_bins if_2_and_not_5 = create_if_2_and_not_5_ignore_bins();
    }
  endgroup

  // ...
endclass
```

Writing this **covergroup** without expressions would have been a true test of one's patience. Previously we would have had to explicitly write out all of the values we wanted to ignore, since it wasn't possible to specify any relationships between values. The new language constructs are definitely a step in the right direction.

To make it all a bit easier to follow it makes sense to create one set of ignore bins for each constraint. With some looping and expression checking we can ignore all of the value pairs that would be restricted by each constraint. This way, we can ensure that everything is in sync. The unfortunate part, however, is that we get a lot of redundancy between the two classes. We've described our state space (the legal values of *x* and *y*) twice: once as the expressions inside the constraints and once again as the same expressions (albeit in negative form) inside the ignore bins. Should we want to add a new constraint or modify one of the existing ones, we'd need to modify both classes. Thus, the constraints and the coverage form a very fragile equilibrium.

Randomization can be used for more than just driving stimulus.  Shows how the constraint solver can be used in reverse gear to extract metadata from a collected packet. Constraints can also be leveraged as checkers, for example, to make sure that a collected packet contained a legal combination of fields. Using the constraint solver for these tasks means that we don't need to duplicate information inside the checking code.

We can integrate this idea into our coverage problem. We could just loop over all combinations of *x* and *y* and use the constraint solver to figure out if a certain combination is legal or not:

```verilog
class better_cov_collector;
  covergroup cov with function sample(bit[2:0] x, bit[2:0] y);
    coverpoint x;
    coverpoint y;

    cross x, y {
      function CrossQueueType create_ignore_bins();
        item it = new();
        for (int i = 0; i < 8; i++)
          for (int j = 0; j < 8; j++) begin
            if (!it.randomize() with { x == i; y == j; })
              create_ignore_bins.push_back('{ i, j });
          end
      endfunction

      ignore_bins ignore = create_ignore_bins();
    }
  endgroup

  // ...
endclass
```

Now we can modify the constraints on our items as much as we like and our ignore bins will stay in sync. This is one of the few cases where we want randomization to fail. One small problem with that is that modern simulators have features where it is possible to stop or break on randomization failures. This will interfere with our code and might become really annoying. Turning such features off isn't an option either, since they can provide real benefit for cases where we actually overconstrain a randomization call.

We can adapt our code to use the inline constraint checker language feature:

```verilog
function CrossQueueType create_ignore_bins();
  item it = new();
  for (int i = 0; i < 8; i++)
    for (int j = 0; j < 8; j++) begin
      it.x = i;
      it.y = j;
      if (!it.randomize(null))
        create_ignore_bins.push_back('{ i, j });
    end
endfunction
```

By calling *randomize(null)* we are turning off randomization for all fields inside our item and checking whether the values that we assigned to them conform to the constraints. This way, the simulator can distinguish that this isn't a regular randomization call and wouldn't need to break if it failed. I know of at least one simulator that doesn't do this, though. If yours also breaks here, it might be nice to open a support case with the vendor to check if they wouldn't want to implement this differentiation inside their tool.

While this approach works for cross-coverage, it wont work for regular coverpoints, since there it isn't possible to specify ignore bins using functions. For example, in our case it isn't possible to cover the value 7 for *x*, because *x* always has to be smaller than y. Such a language feature might be a nice addition in the next version of the standard.

One thing we still need to do is update our bin generating function if the ranges for our fields change. In our current example, if we would change the type of *x* and *y* to *bit [15:0]* we would need to change the endpoints of all the loops. If *SystemVerilog*(better)supported reflection we could figure out these endpoints automatically.

The approach we've looked at above, while not 100% bulletproof, is still very useful because it avoids the need for error prone manual modifications to the coverage code. When working with *SystemVerilog*, it keeps our coverage definitions in sync and it makes refining constraints a breeze. 