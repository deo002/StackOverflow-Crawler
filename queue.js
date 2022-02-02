module.exports = function Queue() {
    var head, tail;
    return Object.freeze({
        enqueue(value) {
            const link = { value, next: undefined };
            tail = head ? tail.next = link : head = link;
        },
        dequeue() {
            if (head) {
                const value = head.value;
                head = head.next;
                return value;
            }
        },
        peek() { return head?.value },
        empty() { return head ? false : true }
    });
}