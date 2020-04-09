---
title: SV实现的链表(我是搬运工)
author: 神秘人
tags:
  - UVM
  - SystemVerilog
categories:
  - 验证
mathjax: false
date: 2020-04-09 15:53:00
---



```verilog 


`ifndef LIST_VH
`define LIST_VH

virtual class BaseNode #(type T = int);

	typedef BaseNode#(T) this_type;
	
	protected BaseNode#(T) n_prev,n_next;


	// Item constructor
	function new();
	endfunction : new


	function BaseNode#(T) prev();
		return n_prev;
	endfunction : prev


	function BaseNode#(T) next();
		return n_next;
	endfunction : next


	function void assign_prev(BaseNode#(T) n);
		$cast(n_prev,n);
	endfunction : assign_prev


	function void assign_next(BaseNode#(T) n);
		$cast(n_next,n);
	endfunction : assign_next


	pure virtual function T _value();
	
	pure virtual function int empty_node();

endclass

class Node #(type T = int) extends BaseNode#(T);

	protected T value;


	// ************************************


	// Item constructor
	function new(T v_in);
		value = v_in;
	endfunction : new


	// Returns node value.
	virtual function T _value();
		return value;
	endfunction : _value


	virtual function int empty_node();
		return 0;
	endfunction

endclass : Node


class EndNode #(type T = int) extends BaseNode#(T);

	// Item constructor
	function new();
	endfunction : new


	// Returns node value.
	function T _value();
		T value;
		assert(0);
		return value;
	endfunction : _value


	virtual function int empty_node();
		return 1;
	endfunction

endclass: EndNode



class List_Iterator#(type T = int);

	protected BaseNode#(T) n;


	// ************************************


	// Moves an iterator to the next position on the list (++i)
	function void inc();
		assert(n!=null);
		begin
			BaseNode#(T) n_item;
	
			n_item = n.next();
			n = n.next();
`ifdef DEBUG
			if (n_item.empty_node())
				$display("%m Empty node reached");
`endif
		end
	endfunction : inc


	// Moves an iterator to the previous position on the list (--i)
	function void dec();
		assert(n!=null);
		begin
			BaseNode#(T) n_item;
	
			n_item = n.prev();
			n = n.prev();
`ifdef DEBUG
			if (n_item.empty_node())
				$display("%m Empty node reached");
`endif
		end
	endfunction : dec


	// Returns the implementation item of the current iterator
	function BaseNode#(T) node_item();
		return n;
	endfunction : node_item


	// Constructor.
	function new(BaseNode#(T) n_item);
		n = n_item;
	endfunction : new


	// Changes the iterator so that it refers to the next element in the list.
	function void next();
		assert(n!=null);
		n = n.next();
	endfunction : next


	// Changes the iterator so that it refers to the previous element in the list.
	function void prev();
		assert(n!=null);
		n = n.prev();
	endfunction : prev


	// Compares two iterators and returns 1 if both iterators refer to the same list element.
	//Otherwise, it returns 0.
	function int eq( List_Iterator#(T) iter );
		assert(iter!=null);
		return (n == iter.n);
	endfunction : eq


	// The negation of eq(); it compares two iterators and returns 0 if both iterators refer to
	//the same list element. Otherwise, it returns 1.
	function int neq( List_Iterator#(T) iter );
		assert(iter!=null);
		return !(n == iter.n);
	endfunction : neq


	// Returns the data stored in the element at the given iterator location.
	function T data();
		assert(n!=null);
		return n._value();
	endfunction : data

endclass


class List#(parameter type T=int);


	BaseNode #(T) head, tail;
	EndNode #(T) posttail;


	// ************************************


	// Returns an iterator pointing to the beginning of the list
	function 	List_Iterator#(T) start();
		List_Iterator#(T) i_item = new(head);
		return i_item;
	endfunction : start


	// Returns an iterator pointing to the end of the list
	function List_Iterator#(T) finish();
		//List_Iterator#(T) i_item = new(null);
		List_Iterator#(T) i_item = new(posttail);
		return i_item;
	endfunction : finish


	// Constructor
	function new();
	endfunction


	// Returns the number of elements stored in the list.
	function int size();
		List_Iterator#(T) i_item;
		List_Iterator#(T) i_end;
		int k;
	
		i_item = start();
		i_end = finish();
		while(!i_item.eq(i_end))
		begin
			++k;
			i_item.inc();
		end
		return k;
	endfunction : size


	// Returns 1 if the number elements stored in the list is zero and 0 otherwise.
	function int empty();
		return head==null;
	endfunction : empty


	// Inserts the specified value at the front of the list.
	function void push_front( T value );
		Node#(T) n_item = new(value);
		if (tail == null)
		begin
			EndNode#(T) e_item=new;
	
			tail = n_item;
			posttail = e_item;
	
			head=tail;
	
			head.assign_next(posttail);
			head.assign_prev(posttail);
	
			posttail.assign_prev(head);
			posttail.assign_next(head);
		end
		else
		begin
			head.assign_prev(n_item);
			n_item.assign_next(head);
		end
		head = n_item;
	endfunction : push_front


	// Inserts the specified value at the end of the list.
	function void push_back(T value );
		Node#(T) n_item = new(value);
		if (head == null)
		begin
			EndNode #(T) e_item=new;
	
			head = n_item;
			posttail = e_item;
	
			head.assign_next(posttail);
			head.assign_prev(posttail);
			posttail.assign_prev(head);
			posttail.assign_next(head);
			tail=head;
		end
		else
		begin
			tail.assign_next(n_item);
			n_item.assign_prev(tail);
			n_item.assign_next(posttail);
			posttail.assign_prev(n_item);
		end
		tail = n_item;
	endfunction : push_back


	// Returns the data stored in the first element of the list (valid only if the list is not empty).
	function T front();
		assert (head!=null);
		return head._value();
	endfunction : front


	// Returns the data stored in the last element of the list (valid only if the list is not empty).
	function T back();
		assert(tail!=null);
		return tail._value();
	endfunction : back


	// Removes the first element of the list. If the list is empty, this method is illegal and can generate an error.
	function void pop_front();
		assert(head != null);
		head = head.next();
		posttail.assign_next(head);
		if (head==null)
			tail = null;
	endfunction : pop_front


	// Returns the data stored in the last element of the list (valid only if the list is not empty).
	function void pop_back();
		assert(tail != null);
	
		begin : body
			tail = tail.prev();
			tail.assign_next(posttail);
			posttail.assign_prev(tail);
			if (tail==null)
				head = null;
		end : body
	endfunction : pop_back


	// Inserts the given data (value) into the list at the position specified by the iterator
	// (before the element, if any, that was previously at the iterator's position). If the iterator is not a valid position
	// within the list, then this operation is illegal and can generate an error.
	function void insert( List_Iterator#(T) position, T value );
		assert(position!=null);
	
		begin : body
			BaseNode#(T) n_item;
			n_item= position.node_item();
	
			if (n_item==null)
			begin : front_insert
				push_back(value);
			end : front_insert
			else if (n_item == head)
			begin : back_insert
				push_front(value);
			end : back_insert
			else
			begin : middle_insert
				List_Iterator#(T) i_item;
				BaseNode#(T) n_item1,n_item2;
				Node#(T) _n = new(value);
	
				n_item1 = _n;
				n_item1.assign_next(n_item);
				n_item1.assign_prev( n_item.prev());
				n_item2 = n_item.prev();
				n_item2.assign_next(n_item1);
				n_item.assign_prev(n_item1);
			end : middle_insert
		end : body
	endfunction : insert


	// Inserts the items from the range [first, last) before the position i_pos. If the last iterator refers to
	// an element before the first iterator, the range wraps around the end of the list.
	function void insert_range (List_Iterator#(T) position, List_Iterator#(T) first, List_Iterator#(T) last);
		assert(position!=null);
		assert(first!=null);
		assert(last!=null);
	
		if (! first.eq(last))
		begin : if_block
			List_Iterator#(T) i_item;
			BaseNode#(T) n_item;
			i_item = first;
			insert(position,first.data());
			first.inc();
			while (! i_item.eq(last))
			begin
				n_item = i_item.node_item();
				if (!n_item.empty_node())
					insert(position,i_item.data());
				i_item.inc();
			end
		end : if_block
	endfunction : insert_range


	// Removes from the list the element at the specified position. After erase() returns, the position iterator becomes invalid.
	function void erase( List_Iterator#(T) position );
		assert(position!=null);
	
		begin : body
			BaseNode#(T) n_item, n_pos;
	
			n_pos = position.node_item();
			if (!(n_pos==head))
			begin
				n_item = n_pos.prev();
				n_item.assign_next(n_pos.next());
			end
			else
			begin
				head = n_pos.next();
			end
			if (n_pos.next())
			begin
				n_item = n_pos.next();
				n_item.assign_prev(n_pos.prev());
			end
			else
			begin
				assert(n_pos==tail);
				tail = n_pos.prev();
			end
		end : body
	endfunction : erase


	// Erases the range of items [first, last). If the last iterator refers to an element
	// before the first iterator, the range wraps around the end of the list.
	function void erase_range(List_Iterator#(T) first, List_Iterator#(T) last);
	
		assert(first!=null);
		assert(last!=null);
		assert(!first.eq(last));
	
		if (! first.eq(last))
		begin : if_block
			List_Iterator#(T) i_item, i_pos;
			BaseNode#(T) n_item;
	
			i_item = first;
			i_pos = i_item;
			erase(i_pos);
			i_item.inc();
			while (! i_item.eq(last))
			begin
				i_pos = i_item;
				n_item = i_item.node_item();
				if (!n_item.empty_node())
					erase(i_pos);
`ifdef DEBUG
				else
					$display("%m Empty node reached");
`endif
				i_item.inc();
			end
		end : if_block
	endfunction : erase_range


	// Assigns to the list object the elements that lie in the range specified by the [first,last) iterators.
	// After this method returns, the modified list shall have a size equal to the range specified by first and last.
	function void set( List_Iterator#(T) first, last );
			assert(first!=null);
			assert(last!=null);
	
			begin : body
				List_Iterator#(T) i_item;
	
				this.clear();
	
				if (!first.eq(last))
				begin : copy_loop
					i_item = first;
	
					while(! i_item.eq(last))
					begin
						this.push_back(i_item.data());
						i_item.inc();
					end
				end : copy_loop
			end : body
	endfunction : set


	// Swaps the contents of two lists
	function void swap( List#(T) lst );
		assert(lst!=null);
	
		begin : body
			BaseNode#(T) head_temp,tail_temp;
			EndNode#(T) posttail_temp;
	
			head_temp = this.head;
			tail_temp = this.tail;
			posttail_temp = this.posttail;
			this.head = lst.head;
			this.tail = lst.tail;
			this.posttail = lst.posttail;
			lst.head = head_temp;
			lst.tail = tail_temp;
			lst.posttail = posttail_temp;
		end : body
	endfunction : swap


	// Erases all of the list's elements.
	function void clear();
		head = null;
		tail = null;
		posttail = null;
	endfunction : clear


endclass

`endif

```