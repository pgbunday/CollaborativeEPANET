interface Node<T> {
    prev: Node<T> | null,
    next: Node<T> | null,
    data: T,
}

export default class Queue<T> {
    head: Node<T> | null
    tail: Node<T> | null

    constructor() {
        this.head = null;
        this.tail = null;
    }
    enqueue(data: T) {
        // Empty queue: initialize to one node, same for head and tail
        if (this.head == null) {
            this.head = {
                next: null,
                prev: null,
                data,
            };
            this.tail = this.head;
        } else {
            // At least one node
            const newNode: Node<T> = {
                next: this.head,
                data,
                prev: null,
            };
            this.head.prev = newNode;
            this.head = newNode;
        }
    }
    dequeue(): T | null {
        if (this.tail == null) {
            return null;
        } else {
            const retNode = this.tail;
            const prevNode = retNode.prev;
            // There is no previous node: queue will be empty, so clear variables
            if (prevNode == null) {
                this.head = null;
                this.tail = null;
            } else {
                prevNode.next = null;
                this.tail = prevNode;
            }
            return retNode.data;
        }
    }
}