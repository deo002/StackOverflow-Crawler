module.exports = class Node {
    constructor(data) {
        this.referenceCount = 1;
        this.upvotes = 0;
        this.answers = 0;
    }
}