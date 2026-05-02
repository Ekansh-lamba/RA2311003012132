const Log = require("../../logging_middleware/index");

const PRIORITY_MAP = {
  placement: 3,
  result: 2,
  event: 1,
};

function getPriorityScore(type) {
  return PRIORITY_MAP[type] !== undefined ? PRIORITY_MAP[type] : 0;
}

class MinHeap {
  constructor() {
    this.heap = [];
  }

  _score(item) {
    return [getPriorityScore(item.type), new Date(item.createdAt).getTime()];
  }

  _less(a, b) {
    const [ap, at] = this._score(a);
    const [bp, bt] = this._score(b);
    if (ap !== bp) return ap < bp;
    return at < bt;
  }

  _swap(i, j) {
    [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
  }

  _bubbleUp(i) {
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (this._less(this.heap[i], this.heap[parent])) {
        this._swap(i, parent);
        i = parent;
      } else {
        break;
      }
    }
  }

  _sinkDown(i) {
    const n = this.heap.length;
    while (true) {
      let smallest = i;
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      if (left < n && this._less(this.heap[left], this.heap[smallest])) smallest = left;
      if (right < n && this._less(this.heap[right], this.heap[smallest])) smallest = right;
      if (smallest !== i) {
        this._swap(i, smallest);
        i = smallest;
      } else {
        break;
      }
    }
  }

  push(item) {
    this.heap.push(item);
    this._bubbleUp(this.heap.length - 1);
  }

  pop() {
    const top = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this._sinkDown(0);
    }
    return top;
  }

  peek() {
    return this.heap[0];
  }

  size() {
    return this.heap.length;
  }
}

function getTopN(notifications, n) {
  const heap = new MinHeap();

  for (const notification of notifications) {
    if (heap.size() < n) {
      heap.push(notification);
    } else if (heap.size() > 0) {
      const min = heap.peek();
      const minScore = getPriorityScore(min.type);
      const minTime = new Date(min.createdAt).getTime();
      const curScore = getPriorityScore(notification.type);
      const curTime = new Date(notification.createdAt).getTime();
      if (
        curScore > minScore ||
        (curScore === minScore && curTime > minTime)
      ) {
        heap.pop();
        heap.push(notification);
      }
    }
  }

  return heap.heap.sort((a, b) => {
    const ap = getPriorityScore(a.type);
    const bp = getPriorityScore(b.type);
    if (bp !== ap) return bp - ap;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

async function getPriorityInbox(userId, limit) {
  await Log("backend", "info", "service", "getPriorityInbox called");
  const notificationService = require("./notificationService");
  const all = await notificationService.getNotificationsByUserId(userId);
  const n = parseInt(limit, 10) || 10;
  const result = getTopN(all, n);
  await Log("backend", "info", "service", "getPriorityInbox succeeded");
  return result;
}

module.exports = { getTopN, getPriorityInbox };
