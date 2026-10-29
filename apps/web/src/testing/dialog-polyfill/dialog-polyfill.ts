// jsdom has <dialog> but not its methods. This stand-in keeps the parts the
// UI relies on: showModal opens it, close closes it and fires "close".

export function installDialogPolyfill() {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.open = false;
    this.dispatchEvent(new Event("close"));
  };
}
