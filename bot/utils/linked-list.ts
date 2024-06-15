export default class LinkedList<T> {
    public length: number = 0;
    private head : Node<T> | undefined = undefined; 
    private tail : Node<T> | undefined = undefined; 
    

    constructor(items : Array<T> | T = []) {
        if (Array.isArray(items)) {
            items.forEach(
                element => {
                    this.append(element);
                }
            )
        } else this.append(items);
    }

    prepend(item: T): void {
        this.head = new Node(item, undefined, this.head)
        if (this.head.next)
            this.head.next.prev =  this.head;

        this.length++;
    }

    insertAt(item: T, idx: number): void {
        let node = this.getNode(idx); 

        if (!node) return;

        let newNode = new Node(item, node, node.next);
        if (node.next)
            node.next.prev = newNode; 

        node.next = newNode;
        
        if (idx === this.length-1)
            this.tail = newNode;

        this.length++; 
    }

    append(item: T): void {
        this.tail = new Node(item, this.tail)
        if (this.length === 0)
            this.head = this.tail;
        else if (this.tail.prev)
                this.tail.prev.next = this.tail;

        this.length++; 
    }

    
    remove(item: T): T | undefined {
        let node : Node<T> | undefined = this.head;

        let i = 0; 
        for (; i < this.length; i++)
            if (node) { 
                if (node.item === item) break;
                node = node.next;
            } else break;
        
        if (!node) return undefined;

        return this.removeNode(i, node)
        
    }
    get(idx: number): T | undefined {
        let node = this.getNode(idx); 
        if (!node) return undefined; 
        
        return node.item;
    }
    
    removeAt(idx: number): T | undefined {
        let node = this.getNode(idx); 

        if (!node) return undefined; 
        return this.removeNode(idx, node)
    }

    removeFilter(func : (value : T) => boolean) { 
        let node : Node<T> | undefined = this.head;

        let i = 0; 
        for (; i < this.length; i++)
        if (node) { 
            if (func(node.item)) break;
            node = node.next;
        } else break;
        
        if (!node) return undefined;

        return this.removeNode(i, node)

    }

    private getNode(index : number) : Node<T> | undefined { 
        if (index < 0 || index >= this.length) return undefined;
        
        let node : Node<T> | undefined; 

        if (index <= this.length / 2) {
            node = this.head;
            for (let i = 0; i < index; i++) {
                if (node)
                    node = node.next
                else break;
            }
        } else { // faster going in reverse!
            node = this.tail; 
            for (let i = this.length-1; i >= index+1; i--) {
                if (node)
                    node = node.prev
                else break;
            }
        }
        
        return node; 
    }

    private removeNode(index : number, node : Node<T>) : T {
        if (index === 0) {
            this.head = node.next
        } 

        if (index === this.length - 1) { 
            this.tail = node.prev || this.head
        }

        if (node.prev) {
            node.prev.next = node.next;
        }

        if (node.next)
            node.next.prev = node.prev;

        this.length--;
        return node.item; 
    }
}

class Node<T> { 
    item : T;
    next : Node<T> | undefined
    prev : Node<T> | undefined

    constructor(item : T, prev : Node<T> | undefined, next : Node<T> | undefined = undefined) {
        this.item = item
        this.prev = prev
        this.next = next; 
    }
}