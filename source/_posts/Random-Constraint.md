---
title: Random Constraint
author: 神秘人
tags:
  - UVM
  - SystemVerilog
categories:
  - 验证
mathjax: false
date: 2020-03-30 14:28:23
---

(转)

### Constrained random thoughts on SystemVerilog, e and more

Simulation is currently the dominant functional verification technique, with constrained random verification the most widely used methodology. While producing random data is a big part of it, letting the solver blindly generate stimulus isn't going to be very efficient. Constraints are needed to guide the stimulus toward interesting scenarios.

A good constrained random test suite contains a mixture of tests with varying degrees of randomness. This is achieved by progressively adding constraints to tests to reduce their randomness. This is best explained with an example.

Let's assume we're verifying a device that can handle read and write accesses to locations in its address map. These accesses can either be done in secure mode or in non-secure mode. We model an access using a UVM sequence item:

```verilog
class sequence_item extends uvm_sequence_item;

  typedef enum {
    READ,
    WRITE
  } direction_e;

  typedef enum {
    SECURE,
    NONSECURE
  } sec_mode_e;

  rand direction_e direction;
  rand bit [31:0] address;
  rand sec_mode_e sec_mode;

  // ...
endclass
```

Not all accesses are legal and illegal accesses would be rejected by the device.

Only certain address ranges are mapped, while accesses to unmapped addresses are illegal. If we were to write a test that only accesses mapped addresses, we would have to add the following constraints to generated items:

```verilog
constraint only_mapped_addresses {
  address inside {
      [CODE_START_ADDR:CODE_END_ADDR],
      [SRAM_START_ADDR:SRAM_END_ADDR],
      [PERIPHERAL_START_ADDR:PERIPHERAL_END_ADDR] };
}
```

Our device also only allows writes to aligned addresses. For a 32-bit bus, this would mean that the lowest two address bits have to be 0:

```verilog
constraint only_writes_to_aligned_addresses {
  direction == WRITE;
  address[1:0] == 0;
}
```

Lastly, certain ranges of our device's address map are restricted to secure code. Let's assume that the address map is split into 16 regions of 256 MB each. Within each of these regions, the lower half is reserved for secure accesses. This means that bit 27 of the address is always 0 for a secure access:

```verilog
constraint only_secure_accesses_to_lower_half_of_range {
  sec_mode == SECURE;
  address[27] == 0;
}
```

The test suite for this device would contain a random test where unconstrained items are generated. One test would be directed toward generating accesses to mapped addresses, another test would only perform writes to aligned addresses, while another test would perform only secure accesses. At the same time, we would also need tests that lie at the intersection of the three features, so we would want tests that do pairwise combinations: aligned writes to mapped addresses, aligned writes in secure mode and secure access to mapped addresses. Finally, we also need a test that combines all three and only does secure writes to mapped addresses.

(While a real test suite would definitely need a lot more classes of tests, this post isn't focused on verification planning, but on the mechanical aspects of implementing a robust constraint management strategy, so please ignore the simplicity of the example.)

It might be the case that these behaviors will get tweaked over time as the project moves forward or as a new derivative of the device is developed. The address map might change as regions are moved, removed or resized, or new regions are added. The bus width might change, which would change which addresses are aligned, or we could get a feature request to implement writes of other granularities (e.g. half-word). The definition of secure regions could also change or they could become configurable via special function registers. Any of these changes should be easy to handle and shouldn't require massive changes to the verification code.

Let's skip the obvious idea of putting all constraints into the sequence item class and activating/deactivating them selectively based on the test. This won't scale for real projects, where we would have many more constraints, which would make the code unreadable.

## Using mixins

The mixin approach is flexible, because it allows us to handle each aspect individually. Instead of having all constraints in a single class, we can have one mixin for each constrained feature.

We need one for mapped addresses:

```verilog
class only_mapped_addresses_mixin #(type T = sequence_item) extends T;

  constraint only_mapped_addresses {
    address inside {
        [CODE_START_ADDR:CODE_END_ADDR],
        [SRAM_START_ADDR:SRAM_END_ADDR],
        [PERIPHERAL_START_ADDR:PERIPHERAL_END_ADDR] };
  }

  // ...
endclass
```

We also need one for writes:

```verilog
class only_legal_writes_mixin #(type T = sequence_item) extends T;

  constraint only_writes_to_aligned_addresses {
    direction == WRITE;
    address[1:0] == 0;
  }

  // ...
endclass
```

Finally, we need a mixin for secure accesses:

```verilog
class only_legal_secure_accesses_mixin #(type T = sequence_item) extends T;

  constraint only_secure_accesses_to_lower_half_of_range {
    sec_mode == SECURE;
    address[27] == 0;
  }

  // ...
endclass
```

Assuming that we have a random test that starts regular sequence items, we would use these mixins to write our more directed tests by replacing the original sequence item type with one with constraints mixed in.

The test that only accesses mapped addresses would do the following factory override:

```verilog
class test_mapped_addresses extends test_all_random;

  protected virtual function void set_factory_overrides();
    sequence_item::type_id::set_type_override(
        only_mapped_addresses_mixin #(sequence_item)::get_type());
  endfunction

  // ...
endclass
```

The other two feature tests would look similar, but would use their respective mixins.

To only perform writes to mapped addresses we would need to chain the two mixins:

```verilog
class test_legal_writes_to_mapped_addresses extends test_all_random;

  protected virtual function void set_factory_overrides();
    sequence_item::type_id::set_type_override(
        only_legal_writes_mixin #(only_mapped_addresses_mixin #(sequence_item))::get_type());
  endfunction

  // ...
endclass
```

Of course, we would do the same to handle the other two pairs.

Similarly, we could use the same principle to combine all three features:

```verilog
class test_legal_writes_to_mapped_addresses_in_secure_mode extends test_all_random;

  protected virtual function void set_factory_overrides();
    sequence_item::type_id::set_type_override(
        only_legal_writes_mixin #(
            only_mapped_addresses_mixin #(
                only_legal_secure_accesses_mixin #(sequence_item)))::get_type());
  endfunction

  // ...
endclass
```

The mixin approach comes with some issues, though.

Constraints are always polymorphic, so we have to be very careful to use unique constraint names across all mixins. Applying two different mixins that use the same constraint name would result in only the outer mixin's constraints being applied, because it would override the constraint defined in the inner mixin. It's very easy to run into this issue when using copy/paste to define a new mixin and forgetting to change the name of the constraint. Frustration will follow, as the code looks right, but leads to unexpected results. Moreover, the more mixins are used in the code base, the easier it is for constraint name collisions to happen.

Chaining of mixins is not particularly readable. It is bearable for one or two levels, but the more levels there are, the worse it's going to get.

Finally, using mixins will cause the number of types in our code to explode. Each mixin on top of a class will create a new type. From a coding standpoint this isn't such a big deal, as we won't be referencing those types directly. The more types we have, though, the longer our compile times are going to get. Also, note that for the compiler *mixin1 #(mixin2 #(some_class))* is a distinct type from *mixin2 #(mixin1 #(some_class))*, regardless if it results in the "same" class. It's very easy to use *mixin1 #(mixin2 #(some_class))* in one test, but use *mixin3 #(mixin2 #(mixin1 #(some_class)))* in another, which would make the compiler "see" an extra type.

The mixin pattern uses inheritance, which doesn't match the call to action in the post title, so obviously we're not going to stop here.

## Using aspect oriented programming

It's much easier to write our test family using aspect oriented programming (AOP). AOP allows us to alter the definition of a class from a different file. Even though SystemSystemverilog doesn't support AOP, I'd still like to show an example in e, as it can provide us with some hints into how we could improve the mixin-base solution.

(Please note that the following code may not be idiomatic, so don't take it as a reference on how to handle constraints in e.)

Our sequence item definition would look similar:

```
<'
struct sequence_item like any_sequence_item {

  direction: direction_e;
  address: uint(bits: 32);
  sec_mode: sec_mode_e;

};
'>
```

In our test that only does mapped accesses, we would tell the compiler to add the constraint to the sequence item:

```
<'
import test_all_random;

extend sequence_item {
  keep address in [CODE_START_ADDR..CODE_END_ADDR] or
      address in [SRAM_START_ADDR..SRAM_END_ADDR] or
      address in [PERIPHERAL_START_ADDR..PERIPHERAL_END_ADDR];
};
'>
```

This does not result in a new type. It tweaks the existing *sequence_item* type for the duration of that test.

If we would like to reuse the constraint in the test that only writes to mapped addresses, we could put the extension into its own file. We could do the same for the other extensions that handle the other features. This would allow each test to load the relevant extension files. For example, for legal writes to mapped addresses we would have:

```
<'
import test_all_random;
import constraints/only_legal_writes;
import constraints/only_mapped_addresses;
'>
```

The file structure is similar to what we had when we used mixins, but the code is much cleaner.

Pay special attention to the natural language description of what we are doing: in *test_mapped_addresses* we are adding the constraint to the *sequence_item* type.

## Using constraint objects

Regular object oriented programming doesn't allow us to change type definitions. What we can do, however, is build our code in such a way as to allow it to be extended when it is being used.

Back in 2015, there was an presented how to add constraints using composition. It showed how to add additional constraints to an instance of an object without changing the type of that object. This is done by encapsulating the constraints into their own objects which extend the behavior of the original object's *randomize()* function. Have a quick look at the paper before proceeding, to understand the exact way this is done.

While the paper shows how to add constraints to object instances, we can extend the approach to add constraints globally, to all instances of a type. If we look back at the AOP case from before, this would be conceptually similar to what we were doing there. We would be emulating the addition of constraints to the *sequence_item* type.

The paper makes an attempt at global constraints in its final section, by using the UVM configuration DB. While that approach works, I feel that it is not expressive enough. A better API, consisting of a static function to add constraints globally, would make the code much more readable than a very verbose config DB *set(...)* call.

To get the extensibility we want, we have to set up the necessary infrastructure for it. If the sequence item class is under our control, we can modify it directly. Alternatively, if the sequence item is part of an external UVC package, we can define a sub-class which contains the necessary code.

We'll assume that *sequence_item* can't be changed and we'll create a new *constrained_sequence_item* class. We would either use this sub-class in our sequences directly or use a factory override.

To execute code that affects all instances, the sequence item class needs a static function through which constraints are added:

```verilog
class constrained_sequence_item extends sequence_item;

  static function void add_global_constraint(abstract_constraint c);
    // ...
  endfunction

  // ...
endclass
```

The *abstract_constraint* class would be the base class for our constraints and would provide us with a reference to the object that is being randomized:

```verilog
virtual class abstract_constraint;

  protected sequence_item object;

  function void set_object(sequence_item object);
    this.object = object;
  endfunction

endclass
```

The code to handle global constraints is similar to the one presented in the paper. We store all global constraints in a static array:

```verilog
class constrained_sequence_item extends sequence_item;

  local static rand abstract_constraint global_constraints[$];

  static function void add_global_constraint(abstract_constraint c);
     global_constraints.push_back(c);
  endfunction

  // ...
endclass
```

Before randomizing a sequence item instance, we have to set up the constraint objects to point to it:

```verilog
class constrained_sequence_item extends sequence_item;

  function void pre_randomize();
    foreach (global_constraints[i])
      global_constraints[i].set_object(this);
  endfunction

  // ...
endclass
```

With the infrastructure set up, we can move on. We encapsulate the constraints for our features into their own constraint classes:

```verilog
class only_mapped_addresses_constraint extends abstract_constraint #(sequence_item);

  constraint c {
    object.address inside {
        [CODE_START_ADDR:CODE_END_ADDR],
        [SRAM_START_ADDR:SRAM_END_ADDR],
        [PERIPHERAL_START_ADDR:PERIPHERAL_END_ADDR] };
  }

endclass
class only_legal_writes_constraint extends abstract_constraint #(sequence_item);

  constraint c {
    object.direction == sequence_item::WRITE;
    object.address[1:0] == 0;
  }

endclass
class only_legal_secure_accesses_constraint extends abstract_constraint #(sequence_item);

  constraint c {
    object.sec_mode == sequence_item::SECURE;
    object.address[27] == 0;
  }

endclass
```

In the test that only accesses mapped addresses we would make sure to add the required constraints:

```verilog
class test_mapped_addresses extends test_all_random;

  protected virtual function void add_constraints();
    only_mapped_addresses_constraint c = new();
    constrained_sequence_item::add_global_constraint(c);
  endfunction

  // ...
endclass
```

The *add_constraints()* function should be called before any sequence items are started. A good place to call it from is the *end_of_elaboration_phase(...)* function.

In the other feature oriented tests we would simply add their respective constraints.

For the test that does writes to mapped addresses we just need to make sure that both constraints are added. We could do this by extending the random test and making two *add_global_constraint(...)* calls, one for each constraint object:

```verilog
class test_legal_writes_to_mapped_addresses extends test_random;

  protected virtual function void add_constraints();
    only_legal_writes_constraint c0 = new();
    only_mapped_addresses_constraint c1 = new();
    constrained_sequence_item::add_global_constraint(c0);
    constrained_sequence_item::add_global_constraint(c1);
  endfunction

  // ...
endclass
```

We could also extend the test that only does legal writes and add the constraints for mapped addresses:

```verilog
class test_legal_writes_to_mapped_addresses extends test_legal_writes;

  protected virtual function void add_constraints();
    only_mapped_addresses_constraint c = new();
    super.add_constraints();
    constrained_sequence_item::add_global_constraint(c);
  endfunction

  // ...
endclass
```

Of course, this approach can be used to handle all combinations of constraints.

Adding constraints dynamically has the same advantages as the mixin approach we looked at earlier.

It doesn't suffer from the same readability issue, because we don't rely on long parameterization chains. It suffers from a bit too much verboseness due to the multiple *add_global_constraint(...)* calls, though this could be improved by adding a variant of the function that accepts a list of constraint objects.

This approach also avoids the type explosion issue that mixins have and is potentially faster to compile.

There is a bit of boilerplate code required for the infrastructure. This can be extracted into a reusable library.

The first thing we need to do is to make the abstract constraint class parameterizable:

```verilog
virtual class abstract_constraint #(type T = int);

  protected T object;

  function void set_object(T object);
    this.object = object;
  endfunction

endclass
```

The package should expose a macro to handle the constraint infrastructure:

```verilog
`define constraints_utils(TYPE) \
  static function void add_global_constraint(constraints::abstract_constraint #(TYPE) c); \
  // ...
```

There was a subtle issue with the simplistic infrastructure code we looked at before. It wasn't able to handle randomization of multiple instances at the same time (for example, when randomizing an array of sequence items). As this is a more exotic use case, the problem won't show up immediately. It's a simple fix to make, but it would be very annoying to have to make it in mutiple projects. Even when the code might look deceptively simple and have us think it's not worth the hassle to put into an own library, doing so makes it easier to implement and propagate fixes for such issues.

The macro makes the definition of *constrained_sequence_item* much cleaner:

```verilog
class constrained_sequence_item extends sequence_item;

  `constraints_utils(sequence_item)

  // ...
endclass
```

